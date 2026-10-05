"""Contrato de sincronización con un servicio todo simulado."""
import asyncio
from copy import deepcopy
import importlib.util
import json
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

    def shopping_catalog(self):
        self.store.catalog = {'locales': {
            'tr': {'products': [
                {'id': 'milk', 'name': 'Süt', 'categoryId': 'dairy', 'defaultUnit': 'l'},
                {'id': 'sugar', 'name': 'Şeker', 'categoryId': 'pantry', 'defaultUnit': 'kg'},
            ], 'stores': [
                {'id': 'tr-bim', 'name': 'BİM', 'typeId': 'supermercado'},
                {'id': 'tr-ikea', 'name': 'IKEA', 'typeId': 'hogar'},
            ], 'categories': [
                {'id': 'dairy', 'name': 'Süt Ürünleri', 'typeId': 'supermercado'},
                {'id': 'pantry', 'name': 'Temel Gıda', 'typeId': 'supermercado'},
            ]},
            'en': {'products': [
                {'id': 'milk', 'name': 'Milk', 'categoryId': 'dairy', 'defaultUnit': 'l'},
                {'id': 'sugar', 'name': 'Sugar', 'categoryId': 'pantry', 'defaultUnit': 'kg'},
            ]},
        }}
        self.snapshot['companies'] = [{'id': 'eti', 'name': 'ETİ'}]

    def test_market_and_company_tags_roundtrip_and_remote_market_move(self):
        async def check():
            self.shopping_catalog()
            self.add_app('Süt')
            listing = self.snapshot['lists'].pop('market')
            listing['storeId'] = 'tr-bim'
            self.snapshot['lists']['tr-bim'] = listing
            self.snapshot['productCompanies'] = {'custom-app-1': 'eti'}
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            assert self.remote[0]['summary'] == 'Süt [BİM] [ETİ]'
            uid = self.remote[0]['uid']
            self.remote[0]['summary'] = 'IKEA ETI sut'
            await self.bridge.sync('personal:a')
            assert self.remote[0]['uid'] == uid
            assert self.remote[0]['summary'] == 'Süt [IKEA] [ETİ]'
            assert not self.snapshot['lists']['tr-bim']['items']
            item = self.snapshot['lists']['tr-ikea']['items'][0]
            assert item['id'] == 'app-1' and item['qty'] == 2
            product = next(p for p in self.snapshot['customProducts'] if p['id'] == item['productId'])
            assert product['name'] == 'Süt' and product['categoryId'] == 'dairy'
            assert self.snapshot['productCompanies'][product['id']] == 'eti'
            await self.bridge.sync('personal:a')
            assert len(self.rows()) == len(self.remote) == 1
            listing = self.snapshot['lists']['tr-ikea']
            moved = listing['items'].pop()
            moved['note'] = 'Keep the purchase details'
            moved['priority'] = 'high'
            moved['url'] = 'https://example.com/product'
            self.snapshot['lists']['tr-bim']['items'].append(moved)
            await self.bridge.sync('personal:a')
            assert self.remote[0]['uid'] == uid
            assert self.remote[0]['summary'] == 'Süt [BİM] [ETİ]'
            assert len(self.remote) == 1
            assert self.snapshot['lists']['tr-bim']['items'][0]['note'] == 'Keep the purchase details'
        asyncio.run(check())

    def test_ha_keywords_dictionary_categories_and_company_are_structured(self):
        async def check():
            self.shopping_catalog()
            self.snapshot['customCategories'] = [{'id': 'custom-pantry', 'name': 'Kiler', 'typeId': 'supermercado'}]
            self.remote.extend([
                {'uid': 'one', 'summary': 'BIM ETI sut', 'status': 'needs_action'},
                {'uid': 'two', 'summary': 'suger IKEA', 'status': 'needs_action'},
                {'uid': 'three', 'summary': 'Special food [BIM] [Kiler]', 'status': 'completed'},
            ])
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            milk, custom = self.snapshot['lists']['tr-bim']['items']
            product = next(p for p in self.snapshot['customProducts'] if p['id'] == milk['productId'])
            assert product['name'] == 'Süt' and product['categoryId'] == 'dairy'
            assert milk['unit'] == 'l'
            assert self.snapshot['productCompanies'][product['id']] == 'eti'
            assert 'milk' not in self.snapshot.get('productCompanies', {})
            assert self.snapshot['lists']['tr-ikea']['items'][0]['productId'] == 'sugar'
            other = next(p for p in self.snapshot['customProducts'] if p['id'] == custom['productId'])
            assert other['name'] == 'Special food' and other['categoryId'] == 'custom-pantry'
            assert custom['done']
            await self.bridge.sync('personal:a')
            assert len(self.rows()) == len(self.remote) == 3
        asyncio.run(check())

    def test_arabic_and_existing_market_identity_and_unknown_names(self):
        async def check():
            self.shopping_catalog()
            self.store.catalog['locales']['ar'] = {
                'products': [{'id': 'milk', 'name': 'حليب', 'categoryId': 'dairy', 'defaultUnit': 'l'}],
                'stores': [{'id': 'ar-bim', 'name': 'BİM', 'typeId': 'supermercado'},
                           {'id': 'ar-ikea', 'name': 'IKEA', 'typeId': 'hogar'}],
                'categories': [{'id': 'dairy', 'name': 'ألبان', 'typeId': 'supermercado'}],
            }
            self.snapshot['lists']['tr-bim'] = {'storeId': 'tr-bim', 'items': [], 'updatedAt': 1}
            self.remote.extend([
                {'uid': 'one', 'summary': 'BIM حليب ETI', 'status': 'needs_action'},
                {'uid': 'two', 'summary': 'Bimble IKEA', 'status': 'needs_action'},
                {'uid': 'three', 'summary': 'Unknown BIM IKEA', 'status': 'needs_action'},
            ])
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'ar')
            assert 'ar-bim' not in self.snapshot['lists']
            milk = self.snapshot['lists']['tr-bim']['items'][0]
            product = next(p for p in self.snapshot['customProducts'] if p['id'] == milk['productId'])
            assert product['name'] == 'حليب'
            ikea = self.snapshot['lists']['ar-ikea']['items'][0]
            name = next(p['name'] for p in self.snapshot['customProducts'] if p['id'] == ikea['productId'])
            assert name == 'Bimble'
            inbox = self.snapshot['lists'][self.module.INBOX]['items'][0]
            name = next(p['name'] for p in self.snapshot['customProducts'] if p['id'] == inbox['productId'])
            assert name == 'Unknown BIM IKEA'
        asyncio.run(check())

    def test_concurrent_import_keeps_company_association(self):
        self.shopping_catalog()
        incoming = deepcopy(self.snapshot)
        self.snapshot['customProducts'].append({'id': 'custom-todo-new', 'name': 'Süt'})
        self.snapshot['productCompanies'] = {'custom-todo-new': 'eti'}
        merged = self.module.merge_snapshot(self.snapshot, incoming, incoming['lists'])
        assert merged['productCompanies']['custom-todo-new'] == 'eti'
        incoming = deepcopy(self.snapshot)
        incoming['productCompanies'] = {}
        merged = self.module.merge_snapshot(self.snapshot, incoming, incoming['lists'])
        assert not merged['productCompanies']

    def test_exported_dictionary_with_real_turkish_catalog(self):
        async def check():
            self.store.catalog = json.loads((SOURCE.parent / 'catalog.json').read_text())
            self.snapshot['companies'] = deepcopy(self.store.catalog['companies'])
            self.remote.extend([
                {'uid': 'milk', 'summary': 'BIM ETI sut', 'status': 'needs_action'},
                {'uid': 'sugar', 'summary': 'IKEA suger', 'status': 'needs_action'},
                {'uid': 'yogurt', 'summary': 'Torku yogurt A101', 'status': 'needs_action'},
            ])
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            rows = self.bridge._rows(self.snapshot, {'user_id': 'a', 'locale': 'tr'})
            by_market = {row[0]: row for row in rows.values()}
            assert by_market['tr-bim'][2]['name'] == 'Süt'
            assert by_market['tr-bim'][2]['categoryId'] == 'sup-lacteos'
            assert by_market['tr-bim'][2]['icon']['kind'] == 'emoji'
            assert by_market['tr-ikea'][2]['name'] == 'Şeker'
            assert by_market['tr-a101'][2]['name'] == 'Yoğurt'
            assert self.snapshot['productCompanies'][by_market['tr-a101'][2]['id']] == 'company-torku'
            assert self.remote[0]['summary'] == 'Süt [BİM] [ETİ]'
        asyncio.run(check())

    def test_failed_tag_update_does_not_duplicate_import_and_bracket_tags_win(self):
        async def check():
            self.shopping_catalog()
            self.remote.append({'uid': 'one', 'summary': 'Milk BIM', 'status': 'needs_action'})
            original = self.bridge._call
            fail_once = True

            async def flaky(config, action, **data):
                nonlocal fail_once
                if action == 'update_item' and fail_once:
                    fail_once = False
                    raise RuntimeError('Tag update interrupted')
                return await original(config, action, **data)
            self.bridge._call = flaky
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            assert len(self.rows()) == 1
            await self.bridge.sync('personal:a')
            assert len(self.rows()) == 1
            assert self.remote[0]['summary'] == 'Süt [BİM]'
            self.add_app('IKEA table', 'table')
            self.snapshot['lists']['tr-ikea'] = self.snapshot['lists'].pop('market')
            await self.bridge.sync('personal:a')
            table = next(t for t in self.remote if t['summary'].startswith('IKEA table'))
            table['status'] = 'completed'
            await self.bridge.sync('personal:a')
            row = next(r for r in self.bridge._rows(self.snapshot, {'user_id': 'a', 'locale': 'tr'}).values()
                       if r[1]['id'] == 'table')
            assert row[2]['name'] == 'IKEA table'
        asyncio.run(check())

    def test_existing_custom_name_merges_without_dictionary_duplicates(self):
        async def check():
            self.shopping_catalog()
            self.add_app('Milk')
            self.snapshot['lists']['tr-bim'] = self.snapshot['lists'].pop('market')
            self.remote.append({'uid': 'existing', 'summary': 'Milk BIM', 'status': 'needs_action'})
            await self.bridge.configure('personal:a', 'todo.shopping', 'a', 'tr')
            assert len(self.remote) == len(self.rows()) == 1
            assert self.remote[0]['summary'] == 'Milk [BİM]'
        asyncio.run(check())

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
