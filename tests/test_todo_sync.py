"""Contrato de sincronización con un servicio todo simulado."""
import asyncio
from copy import deepcopy
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest
import sys
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'custom_components/tucompra/todo_sync.py'


class TodoSyncTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location('todo_sync', SOURCE)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.module = module
        self.remote = []
        self.calls = []
        self.fail = False
        self.disk = None
        self.store = SimpleNamespace(
            shares={'personal:a': {'owner': 'a', 'members': ['a'], 'snapshot': {
                'lists': {'market': {'storeId': 'market', 'items': [], 'updatedAt': 1}},
                'customProducts': [], 'customStores': [], 'updatedAt': 1,
            }}}, catalog={'locales': {}}, lock=asyncio.Lock(),
        )

        async def save():
            self.disk = deepcopy(self.store.shares)
        self.store._async_save = save
        outer = self

        class Bridge(module.TodoSync):
            async def authorize(self, entity_id, user_id):
                if entity_id != 'todo.shopping' or user_id != 'a':
                    raise ValueError('Forbidden entity')

            async def _call(self, config, action, **data):
                if outer.fail:
                    raise RuntimeError('Unavailable')
                outer.calls.append((action, data))
                if action == 'get_items':
                    return {config['entity_id']: {'items': deepcopy(outer.remote)}}
                if action == 'add_item':
                    outer.remote.append({'uid': f'uid-{len(outer.calls)}',
                                         'summary': data['item'], 'status': 'needs_action'})
                elif action == 'update_item':
                    row = next(x for x in outer.remote if x['uid'] == data['item'])
                    row['summary'] = data.get('rename', row['summary'])
                    row['status'] = data.get('status', row['status'])
                elif action == 'remove_item':
                    outer.remote[:] = [x for x in outer.remote if x['uid'] != data['item']]
        self.bridge = Bridge(SimpleNamespace(), self.store)

    @property
    def snapshot(self):
        return self.store.shares['personal:a']['snapshot']

    def rows(self):
        return [row for lst in self.snapshot['lists'].values() for row in lst['items']]

    def add_app(self, name='Milk', item_id='app-1'):
        self.snapshot['customProducts'].append({'id': f'custom-{item_id}', 'name': name})
        self.snapshot['lists']['market']['items'].append({
            'id': item_id, 'productId': f'custom-{item_id}', 'qty': 2,
            'unit': 'l', 'done': False, 'addedAt': 1,
        })

    async def connect(self):
        await self.bridge.configure('personal:a', 'todo.shopping', 'a')

    def test_bidirectional_add_and_idempotency(self):
        async def check():
            self.remote.append({'uid': 'external', 'summary': 'Eggs', 'status': 'needs_action'})
            self.add_app()
            await self.connect()
            assert len(self.rows()) == len(self.remote) == 2
            assert any(product.get('categoryId') == 'otr-otros'
                       for product in self.snapshot['customProducts'])
            self.add_app('Bread', 'app-2')
            self.remote.append({'uid': 'external-2', 'summary': 'ETİ', 'status': 'completed'})
            await self.bridge.sync('personal:a')
            await self.bridge.sync('personal:a')
            assert len(self.rows()) == len(self.remote) == 4
            assert any(row['done'] for row in self.rows())
            assert self.rows()[0]['qty'] == 2
        asyncio.run(check())

    def test_updates_and_deletions_both_directions(self):
        async def check():
            self.add_app()
            await self.connect()
            self.rows()[0]['done'] = True
            await self.bridge.sync('personal:a')
            assert self.remote[0]['status'] == 'completed'
            self.remote[0].update(summary='Süt', status='needs_action', due='2026-10-10')
            await self.bridge.sync('personal:a')
            assert not self.rows()[0]['done']
            product = next(p for p in self.snapshot['customProducts'] if p['id'] == self.rows()[0]['productId'])
            assert product['name'] == 'Süt'
            self.remote.clear()
            await self.bridge.sync('personal:a')
            assert not self.rows()
            self.add_app('Bread', 'app-2')
            await self.bridge.sync('personal:a')
            self.snapshot['lists']['market']['items'].clear()
            await self.bridge.sync('personal:a')
            assert not self.remote
        asyncio.run(check())

    def test_duplicates_restart_disconnect_and_unavailable(self):
        async def check():
            self.add_app('Milk', 'a')
            self.add_app('Milk', 'b')
            self.remote.append({'uid': 'existing', 'summary': 'Milk', 'status': 'needs_action'})
            await self.connect()
            assert len(self.rows()) == len(self.remote) == 2
            self.store.shares = deepcopy(self.disk)
            await self.bridge.sync('personal:a')
            assert len(self.remote) == 2
            self.fail = True
            before = deepcopy(self.snapshot)
            await self.bridge.sync('personal:a')
            assert self.snapshot == before
            assert self.bridge.status('personal:a')['error']
            self.fail = False
            await self.bridge.configure('personal:a', '', 'a')
            assert len(self.remote) == 2
            assert not self.bridge.status('personal:a')['entity_id']
        asyncio.run(check())

    def test_invalid_entity_and_cross_share_reuse_rejected(self):
        async def check():
            with self.assertRaises(ValueError):
                await self.bridge.configure('personal:a', 'sensor.bad', 'a')
            await self.connect()
            self.store.shares['other'] = {'owner': 'a', 'members': ['a'], 'snapshot': None}
            with self.assertRaises(ValueError):
                await self.bridge.configure('other', 'todo.shopping', 'a')
        asyncio.run(check())

    def test_concurrent_snapshot_preserves_remote_additions_updates_and_deletions(self):
        self.add_app()
        baseline = deepcopy(self.snapshot['lists'])
        incoming = deepcopy(self.snapshot)
        self.snapshot['lists']['market']['items'][0]['done'] = True
        self.snapshot['lists']['market']['items'].append({'id': 'remote-new', 'productId': 'custom-a'})
        incoming['lists']['market']['items'].append({'id': 'local-new', 'productId': 'custom-b'})
        merged = self.module.merge_snapshot(self.snapshot, incoming, baseline)
        by_id = {item['id']: item for item in merged['lists']['market']['items']}
        assert by_id['app-1']['done']
        assert 'local-new' in by_id and 'remote-new' in by_id
        self.snapshot['lists']['market']['items'].clear()
        merged = self.module.merge_snapshot(self.snapshot, incoming, baseline)
        assert [item['id'] for item in merged['lists']['market']['items']] == ['local-new']

    def test_seed_language_and_orphan_do_not_delete_remote(self):
        async def check():
            self.store.catalog = {'locales': {
                'en': {'products': [{'id': 'seed', 'name': 'Milk'}]},
                'ar': {'products': [{'id': 'seed', 'name': 'حليب'}]},
                'tr': {'products': [{'id': 'seed', 'name': 'Süt'}]},
            }}
            self.add_app()
            self.rows()[0]['productId'] = 'seed'
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            assert self.remote[0]['summary'] == 'Süt'
            self.rows()[0]['productId'] = 'missing-product'
            await self.bridge.sync('personal:a')
            assert len(self.remote) == 1
        asyncio.run(check())

    def test_remote_rename_keeps_other_rows_and_due_metadata(self):
        async def check():
            self.add_app()
            same_product = deepcopy(self.rows()[0])
            same_product['id'] = 'second'
            self.snapshot['lists']['market']['items'].append(same_product)
            await self.connect()
            self.remote[0].update(summary='New name', due='2026-10-10', description='Keep this')
            await self.bridge.sync('personal:a')
            assert self.rows()[0]['productId'] != self.rows()[1]['productId']
            self.rows()[0]['done'] = True
            await self.bridge.sync('personal:a')
            assert self.remote[0]['due'] == '2026-10-10'
            assert self.remote[0]['description'] == 'Keep this'
            assert self.remote[1]['summary'] == 'Milk'
        asyncio.run(check())

    def test_retry_after_successful_create_does_not_duplicate_completed_item(self):
        async def check():
            self.add_app()
            self.rows()[0]['done'] = True
            original = self.bridge._call
            reads = 0

            async def flaky(config, action, **data):
                nonlocal reads
                if action == 'get_items':
                    reads += 1
                    if reads == 2:
                        raise RuntimeError('Read failed after create')
                return await original(config, action, **data)
            self.bridge._call = flaky
            await self.connect()
            assert len(self.remote) == 1
            await self.bridge.sync('personal:a')
            assert len(self.remote) == 1
            assert self.remote[0]['status'] == 'completed'
        asyncio.run(check())

    def test_entity_permissions_and_features(self):
        async def check():
            state = SimpleNamespace(state='0', attributes={'supported_features': 7})
            permissions = SimpleNamespace(check_entity=lambda _entity, policy: policy == 'read')
            user = SimpleNamespace(is_active=True, permissions=permissions)

            async def get_user(_id):
                return user
            hass = SimpleNamespace(states=SimpleNamespace(get=lambda _id: state),
                                   auth=SimpleNamespace(async_get_user=get_user))
            bridge = self.module.TodoSync(hass, self.store)
            with patch.dict(sys.modules, {'homeassistant.auth.permissions.const': SimpleNamespace(
                POLICY_CONTROL='control', POLICY_READ='read',
            )}):
                with self.assertRaises(ValueError):
                    await bridge.authorize('todo.shopping', 'a')
                permissions.check_entity = lambda _entity, _policy: True
                await bridge.authorize('todo.shopping', 'a')
                state.attributes['supported_features'] = 1
                with self.assertRaises(ValueError):
                    await bridge.authorize('todo.shopping', 'a')
                state.attributes['supported_features'] = 7
                state.state = 'unavailable'
                with self.assertRaises(ValueError):
                    await bridge.authorize('todo.shopping', 'a')
        asyncio.run(check())


if __name__ == '__main__':
    unittest.main()
