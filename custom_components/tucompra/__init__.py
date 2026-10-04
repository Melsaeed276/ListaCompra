"""Tu Compra — listas de la compra multi-tienda, 100% local en Home Assistant.

Registra:
  * un panel lateral que sirve la SPA (Astro/Svelte) dentro de HA,
  * los estáticos de la SPA y su wrapper de autenticación,
  * una API REST autenticada con el propio usuario de HA.

Sin servicios externos: los datos viven en `.storage/tucompra`.
"""
from __future__ import annotations

import json
import logging
import mimetypes
from datetime import timedelta
from pathlib import Path

import voluptuous as vol

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.helpers.event import async_track_time_interval

from .api import async_register_views
from .const import (
    DOMAIN,
    LOOKUP_ENABLED,
    PANEL_ICON,
    PANEL_URL_PATH,
    STATIC_PATH,
)
from .store import TuCompraStore
from .todo_sync import TodoSync
from .routing import resolve_locale

_LOGGER = logging.getLogger(__name__)

# Versión del manifest (el release la fija = tag). Se usa como cache-buster del
# wrapper del panel: así cada actualización carga un wrapper fresco, que a su vez
# refresca la SPA, sin que el usuario tenga que limpiar caché.
_VERSION = json.loads(
    (Path(__file__).parent / "manifest.json").read_text(encoding="utf-8")
).get("version", "0")
_APP_NAMES = json.loads(
    (Path(__file__).parent / "app_names.json").read_text(encoding="utf-8")
)

ADD_ITEM_SCHEMA = vol.Schema(
    {
        vol.Required("name"): cv.string,
        vol.Optional("quantity", default=1): vol.Coerce(float),
        vol.Optional("unit"): cv.string,
        vol.Optional("share_id"): cv.string,
    }
)

# Config opcional. `tucompra:` a secas sigue valiendo y deja la app 100% local.
# `product_lookup: true` es lo ÚNICO que permite una petición saliente (a Open
# Food Facts, para traducir un código de barras a producto).
CONFIG_SCHEMA = vol.Schema(
    {
        DOMAIN: vol.Any(
            None,
            vol.Schema({vol.Optional("product_lookup", default=False): cv.boolean}),
        )
    },
    extra=vol.ALLOW_EXTRA,
)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Arranque de la integración (config: solo la línea `tucompra:` en YAML)."""
    store = TuCompraStore(hass)
    await store.async_load()
    hass.data[DOMAIN] = store
    store.todo_sync = TodoSync(hass, store)

    async def _sync_todo(_now):
        for share_id in list(store.shares):
            await store.todo_sync.sync(share_id)

    cancel_todo = async_track_time_interval(hass, _sync_todo, timedelta(seconds=12))
    hass.bus.async_listen_once('homeassistant_stop', lambda _event: cancel_todo())

    conf = config.get(DOMAIN) or {}
    hass.data[LOOKUP_ENABLED] = bool(conf.get("product_lookup", False))
    if hass.data[LOOKUP_ENABLED]:
        _LOGGER.info(
            "Tu Compra: búsqueda de productos por código de barras ACTIVADA "
            "(consulta Open Food Facts; es la única petición saliente)"
        )

    # El escáner de iOS usa un decodificador WebAssembly, y Safari EXIGE que el
    # .wasm se sirva como application/wasm o se niega a instanciarlo. Python no
    # siempre trae esa extensión en su tabla de tipos, así que la registramos.
    mimetypes.add_type("application/wasm", ".wasm")

    # Sirve el wrapper (tucompra-panel.js) y el build de la SPA (panel/app).
    panel_dir = Path(__file__).parent / "panel"
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_PATH, str(panel_dir), False)]
    )

    async_register_views(hass)

    async def _handle_add_item(call: ServiceCall) -> dict:
        async with store.lock:
            result = await store.async_add_named_item(
                name=call.data["name"],
                quantity=call.data.get("quantity", 1),
                unit=call.data.get("unit"),
                share_id=call.data.get("share_id"),
            )
        if result.get('ok'):
            await store.todo_sync.sync(result['share_id'])
        _LOGGER.debug("add_item(%s) → %s", call.data.get("name"), result)
        return result

    hass.services.async_register(
        DOMAIN,
        "add_item",
        _handle_add_item,
        schema=ADD_ITEM_SCHEMA,
        supports_response=SupportsResponse.OPTIONAL,
    )

    # Panel lateral: HA carga el web component `tucompra-panel`, que a su vez
    # incrusta la SPA en un iframe y le pasa el token de acceso del usuario.
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name="tucompra-panel",
        module_url=f"{STATIC_PATH}/tucompra-panel.js?v={_VERSION}",
        sidebar_title=_APP_NAMES[resolve_locale(hass.config.language, hass.config.country)],
        sidebar_icon=PANEL_ICON,
        require_admin=False,
        config={"static": STATIC_PATH},
        embed_iframe=False,
    )

    _LOGGER.info("Tu Compra: panel y API registrados en %s", PANEL_URL_PATH)
    return True
