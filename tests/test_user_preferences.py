"""Preferencias personales: aislamiento y persistencia sin depender de HA."""
import ast
import asyncio
from copy import deepcopy
from pathlib import Path


def test_user_locales_survive_reload_and_stay_separate():
    source = Path(__file__).resolve().parents[1] / "custom_components/tucompra/store.py"
    tree = ast.parse(source.read_text())
    store_class = next(node for node in tree.body if isinstance(node, ast.ClassDef))
    methods = [node for node in store_class.body if getattr(node, "name", "") in (
        "user_preferences", "async_set_user_locale", "_async_save",
    )]
    namespace = {"Any": object}
    module = ast.Module(body=[ast.ClassDef(
        name="Preferences", bases=[], keywords=[], body=methods, decorator_list=[],
    )], type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(source), "exec"), namespace)

    class Disk:
        data = None

        async def async_save(self, data):
            self.data = deepcopy(data)

    async def check():
        store = namespace["Preferences"]()
        store._data = {"shares": {"shared:home": {"members": ["a", "b"]}}}
        store._store = Disk()
        await store.async_set_user_locale("a", "tr")
        await store.async_set_user_locale("b", "ar")
        reloaded = namespace["Preferences"]()
        reloaded._data = deepcopy(store._store.data)
        assert reloaded.user_preferences("a") == {"locale": "tr"}
        assert reloaded.user_preferences("b") == {"locale": "ar"}
        assert reloaded.user_preferences("new") == {}
        try:
            await store.async_set_user_locale("a", "invalid")
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid locale accepted")
        assert store.user_preferences("a") == {"locale": "tr"}

    asyncio.run(check())
