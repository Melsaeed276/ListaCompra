// Web component registrado en HA como panel lateral ("tucompra-panel").
//
// Su única responsabilidad: incrustar la SPA (servida como estático por la
// integración) en un <iframe> y entregarle, vía postMessage, el token de
// acceso del usuario logueado en HA. Con ese token la SPA llama a
// /api/tucompra/* autenticada como ese usuario — sin login propio.
//
// HA inyecta en este elemento:
//   - la propiedad `hass` (se actualiza al refrescarse el token), y
//   - la propiedad `panel` (con `panel.config.static` = STATIC_PATH).

class TuCompraPanel extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._iframe = null;
    this._static = "/tucompra_static";
  }

  set hass(hass) {
    this._hass = hass;
    // Cada vez que HA nos pasa un hass nuevo (p.ej. token renovado), lo
    // reenviamos al iframe para que la SPA siga autenticada.
    this._postToken();
  }

  set panel(panel) {
    if (panel && panel.config && panel.config.static) {
      this._static = panel.config.static;
    }
  }

  connectedCallback() {
    if (this._iframe) return;

    const iframe = document.createElement("iframe");
    // Anti-caché: el index.html es diminuto y así siempre trae la versión
    // recién instalada (los assets van con hash y sí se cachean).
    iframe.src = `${this._static}/app/index.html?v=${Date.now()}`;
    iframe.title = "Tu Compra";
    iframe.style.cssText =
      "border:0;width:100%;height:100%;display:block;background:transparent;";
    iframe.setAttribute("allow", "clipboard-write; camera");
    iframe.addEventListener("load", () => {
      this._postToken();
      this._fit();
    });

    this.style.cssText = "display:block;width:100%;height:100%;";
    this.appendChild(iframe);
    this._iframe = iframe;

    // Altura: `height:100%` solo funciona si el padre tiene altura definida, y
    // el layout del panel de HA cambia entre versiones (basta con que un
    // ancestro pase a `height:auto` para que esto colapse a unos pocos píxeles).
    // Se mide la altura disponible de verdad —del borde superior del panel al
    // fondo de la ventana— y se fija en píxeles, que no depende del padre.
    this._fit();
    // Al conectar, el elemento aún no tiene su posición definitiva: se repite
    // tras el primer pintado (y una vez más, por si HA anima el layout).
    requestAnimationFrame(() => {
      this._fit();
      setTimeout(() => this._fit(), 250);
    });
    this._onResize = () => this._fit();
    window.addEventListener("resize", this._onResize);
    // orientationchange y el teclado virtual mueven el viewport sin disparar
    // 'resize' en algunos navegadores móviles.
    window.visualViewport?.addEventListener("resize", this._onResize);
    // Si HA recoloca el panel (abrir/cerrar la barra lateral, cambios de
    // layout), reajustamos sin esperar a un resize de ventana.
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this._fit());
      if (this.parentElement) this._ro.observe(this.parentElement);
    }

    // Mensajes de la SPA hacia el wrapper. No exigimos que event.source sea
    // exactamente iframe.contentWindow: en el WebView del companion de Android
    // esa comparación puede fallar. Los mensajes van con un tipo propio
    // (namespaced) y las acciones son inocuas, así que basta con el tipo.
    window.addEventListener("message", (event) => {
      const type = event.data && event.data.type;
      if (type === "tucompra-request-token") {
        this._postToken();
      } else if (type === "tucompra-toggle-menu") {
        // Abre/cierra la barra lateral de HA. El evento burbujea (bubbles +
        // composed) hasta home-assistant-main, que lo gestiona en cualquier
        // layout (barra fija en escritorio, cajón lateral en móvil).
        this.dispatchEvent(
          new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }),
        );
      } else if (type === "tucompra-title" && event.origin === window.location.origin
        && event.source === iframe.contentWindow && typeof event.data.title === "string") {
        iframe.title = event.data.title;
      }
    });
  }

  disconnectedCallback() {
    if (this._onResize) {
      window.removeEventListener("resize", this._onResize);
      window.visualViewport?.removeEventListener("resize", this._onResize);
    }
    this._ro?.disconnect();
  }

  /** Fija la altura del panel a lo que de verdad queda de pantalla. */
  _fit() {
    if (!this._iframe) return;
    const top = this.getBoundingClientRect().top;
    const viewport = window.visualViewport?.height || window.innerHeight;
    const h = Math.round(viewport - top);
    // Si el elemento aún no está colocado (top absurdo o altura ridícula), se
    // deja el 100% del CSS en vez de escribir una altura peor.
    if (!Number.isFinite(h) || h < 200) return;
    this.style.height = `${h}px`;
    this._iframe.style.height = `${h}px`;
  }

  _postToken() {
    if (!this._iframe || !this._hass) return;
    const auth = this._hass.auth || {};
    // `accessToken` (getter) es la vía preferida; caemos a data.access_token.
    const token =
      auth.accessToken ||
      (auth.data && auth.data.access_token) ||
      null;
    if (!token) return;
    const hassUrl =
      (auth.data && auth.data.hassUrl) || window.location.origin;
    // Idioma y país de HA para localizar el catálogo y mostrar la bandera.
    const language = this._hass.locale?.language || this._hass.language || null;
    const country =
      (this._hass.config && this._hass.config.country)
      || (this._hass.config?.time_zone === "Europe/Istanbul" ? "TR" : null);
    // targetOrigin = mismo origen: la SPA se sirve desde el propio HA.
    this._iframe.contentWindow.postMessage(
      { type: "tucompra-token", token, hassUrl, language, country },
      window.location.origin,
    );
  }
}

if (!customElements.get("tucompra-panel")) {
  customElements.define("tucompra-panel", TuCompraPanel);
}
