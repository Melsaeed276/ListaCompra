"""Puente bidireccional por share; los UID y baselines viven solo en HA."""
from __future__ import annotations

import logging
import re
import time
import unicodedata
import uuid
from copy import deepcopy

_LOGGER = logging.getLogger(__name__)
INBOX = 'todo-inbox'


def normalized(text):
    text = unicodedata.normalize('NFKD', text.casefold().replace('ı', 'i'))
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return ' '.join(re.findall(r'\w+', text))


def named_keyword(text, records):
    """Coincide palabras completas; nombres ambiguos no se interpretan."""
    tokens = list(re.finditer(r'[\w\u0300-\u036f\u064b-\u065f]+', text))
    words = [normalized(token.group()) for token in tokens]
    matches = []
    seen = set()
    for record in records:
        name = normalized(record.get('name', ''))
        if not name or name in seen:
            continue
        seen.add(name)
        parts = name.split()
        for index in range(len(words) - len(parts) + 1):
            if words[index:index + len(parts)] == parts:
                matches.append((record, tokens[index].start(), tokens[index + len(parts) - 1].end()))
    # Un nombre largo tiene prioridad sobre otro contenido en el mismo tramo.
    matches = [match for match in matches if not any(
        other[1] <= match[1] and other[2] >= match[2] and other[2] - other[1] > match[2] - match[1]
        for other in matches)]
    if len({m[0]['id'] for m in matches}) != 1:
        return None
    return next((match for match in matches
                 if match[1] > 0 and match[2] < len(text)
                 and text[match[1] - 1] == '[' and text[match[2]] == ']'), matches[0])


def strip_keyword(text, match):
    if not match:
        return text
    _, start, end = match
    if start > 0 and end < len(text) and text[start - 1] == '[' and text[end] == ']':
        start -= 1
        end += 1
    return ' '.join((text[:start] + ' ' + text[end:]).split()).strip(' ,:;-')


def merge_snapshot(server, incoming, base_lists):
    """Aplica cambios del cliente sin perder altas/ediciones recibidas de todo."""
    if not isinstance(server, dict):
        return incoming
    result = deepcopy(incoming)
    base_lists = base_lists if isinstance(base_lists, dict) else {}
    now = max(int(time.time() * 1000), server.get('updatedAt', 0) + 1)
    for store_id, remote_list in server.get('lists', {}).items():
        local_list = result['lists'].get(store_id)
        base = base_lists.get(store_id, {})
        if local_list is None:
            if store_id not in base_lists:
                result['lists'][store_id] = deepcopy(remote_list)
            continue
        base_items = {item['id']: item for item in base.get('items', [])}
        remote_items = {item['id']: item for item in remote_list.get('items', [])}
        local_items = {item['id']: item for item in local_list.get('items', [])}
        merged = []
        for item_id in dict.fromkeys([*local_items, *remote_items]):
            original = base_items.get(item_id)
            local = local_items.get(item_id)
            remote = remote_items.get(item_id)
            chosen = remote if local == original else local
            if chosen is not None:
                merged.append(deepcopy(chosen))
        local_list.update(items=merged, updatedAt=now)
    for key in ('customProducts', 'customStores'):
        local_ids = {row['id'] for row in result.get(key, [])}
        # Solo conserva los registros importados, no restaura catálogos borrados.
        result.setdefault(key, []).extend(deepcopy(row) for row in server.get(key, [])
                                         if row['id'] not in local_ids
                                         and (row['id'] == INBOX or row['id'].startswith('custom-todo-')))
    incoming_products = {p['id'] for p in incoming.get('customProducts', [])}
    company_ids = {c['id'] for c in result.get('companies', [])}
    for product_id, company_id in server.get('productCompanies', {}).items():
        if (product_id.startswith('custom-todo-') and product_id not in incoming_products
                and company_id in company_ids):
            result.setdefault('productCompanies', {})[product_id] = company_id
    result['updatedAt'] = now
    return result


def fields(item):
    return {'summary': item['summary'], 'status': item['status']}


class TodoSync:
    def __init__(self, hass, store):
        self.hass = hass
        self.store = store

    def status(self, share_id):
        config = self.store.shares[share_id].get('todoSync', {})
        return {key: config.get(key, default) for key, default in (
            ('entity_id', ''), ('last_sync', 0), ('error', ''),
        )}

    async def authorize(self, entity_id, user_id):
        from homeassistant.auth.permissions.const import POLICY_CONTROL, POLICY_READ

        state = self.hass.states.get(entity_id)
        user = await self.hass.auth.async_get_user(user_id)
        if (not entity_id.startswith('todo.') or state is None
                or state.state in ('unavailable', 'unknown')
                or int(state.attributes.get('supported_features', 0)) & 7 != 7):
            raise ValueError('To-do list unavailable or not editable')
        if (not user or not user.is_active or not all(
            user.permissions.check_entity(entity_id, policy)
            for policy in (POLICY_READ, POLICY_CONTROL)
        )):
            raise ValueError('To-do list access denied')

    async def entities(self, user_id):
        result = []
        for state in self.hass.states.async_all('todo'):
            try:
                await self.authorize(state.entity_id, user_id)
            except ValueError:
                continue
            result.append({'entity_id': state.entity_id,
                           'name': state.attributes.get('friendly_name', state.entity_id)})
        return result

    async def configure(self, share_id, entity_id, user_id, locale='en'):
        async with self.store.lock:
            share = self.store.shares[share_id]
            if entity_id:
                await self.authorize(entity_id, user_id)
                if any(sid != share_id and other.get('todoSync', {}).get('entity_id') == entity_id
                       for sid, other in self.store.shares.items()):
                    raise ValueError('To-do list already connected to another list space')
                current = share.get('todoSync', {})
                if current.get('entity_id') == entity_id:
                    current['user_id'] = user_id
                    current['locale'] = locale
                else:
                    share['todoSync'] = {'entity_id': entity_id, 'user_id': user_id,
                                         'locale': locale, 'links': {}}
                await self.store._async_save()
                await self._sync(share_id)
            else:
                share.pop('todoSync', None)
                await self.store._async_save()
        return self.status(share_id)

    async def sync(self, share_id):
        async with self.store.lock:
            await self._sync(share_id)

    async def _call(self, config, action, **data):
        from homeassistant.core import Context

        return await self.hass.services.async_call(
            'todo', action, {'entity_id': config['entity_id'], **data},
            blocking=True, return_response=action == 'get_items',
            context=Context(user_id=config['user_id']),
        )

    async def _read(self, config):
        response = await self._call(config, 'get_items')
        data = (response or {}).get(config['entity_id'], {})
        if not isinstance(data.get('items'), list):
            raise ValueError('Invalid to-do response')
        return {str(row['uid']): row for row in data['items']
                if row.get('uid') and row.get('summary')
                and row.get('status') in ('needs_action', 'completed')}

    def _rows(self, snapshot, config):
        products = {}
        for catalog in self.store.catalog.get('locales', {}).values():
            products.update({p['id']: p for p in catalog.get('products', [])})
        preferences = getattr(self.store, 'user_preferences', lambda _id: {})(config['user_id'])
        locale = preferences.get('locale', config.get('locale', 'en'))
        products.update({p['id']: p for p in self.store.catalog.get('locales', {}).get(locale, {}).get('products', [])})
        products.update({p['id']: p for p in snapshot.get('customProducts', [])})
        result = {}
        for store_id, listing in snapshot.get('lists', {}).items():
            for item in listing.get('items', []):
                product = products.get(item.get('productId'))
                if product and product.get('name'):
                    result[item['id']] = (store_id, item, product)
        return result

    def _catalog(self, snapshot, config):
        preferences = getattr(self.store, 'user_preferences', lambda _id: {})(config['user_id'])
        locale = preferences.get('locale', config.get('locale', 'en'))
        locales = self.store.catalog.get('locales', {})
        selected = locales.get(locale, {})
        products = {p['id']: p for p in selected.get('products', [])}
        stores = {}
        # Conserva mercados utilizados por otros miembros/idiomas del share.
        for catalog in locales.values():
            for store in catalog.get('stores', []):
                if store['id'] in snapshot.get('lists', {}):
                    stores[store['id']] = store
        for store in selected.get('stores', []):
            stores.setdefault(store['id'], store)
        stores.update({s['id']: s for s in snapshot.get('customStores', [])})
        products.update({p['id']: p for p in snapshot.get('customProducts', [])})
        categories = {c['id']: c for c in selected.get('categories', [])}
        for category_id, override in snapshot.get('categoryOverrides', {}).items():
            if category_id in categories:
                categories[category_id] = {**categories[category_id], **override}
        categories.update({c['id']: c for c in snapshot.get('customCategories', [])})
        companies = snapshot.get('companies', self.store.catalog.get('companies', []))
        return products, stores, categories, companies

    def _parse(self, text, snapshot, config, row=None):
        products, stores, categories, companies = self._catalog(snapshot, config)
        market = named_keyword(text, list(stores.values()))
        clean = strip_keyword(text, market)
        company = named_keyword(clean, companies)
        clean = strip_keyword(clean, company)
        category = named_keyword(clean, list(categories.values()))
        remaining = strip_keyword(clean, category)
        if category and remaining:
            clean = remaining
        else:
            category = None
        # No convierte una entrada compuesta solo por etiquetas en producto vacío.
        if not clean or not normalized(clean):
            clean, market, company, category = text.strip(), None, None, None
        query = normalized(clean)
        aliases = (
            ('sut', 'milk', 'leche', 'lait', 'milch', 'leite', 'حليب'),
            ('seker', 'sugar', 'suger', 'azucar', 'sucre', 'zucker', 'acucar', 'سكر'),
        )
        names = next((group for group in aliases if query in group), (query,))
        product = next((p for p in products.values() if normalized(p.get('name', '')) == query), None)
        if product is None:
            product = next((p for p in products.values()
                            if not p['id'].startswith('custom-') and normalized(p.get('name', '')) in names), None)
        if product is None:
            product = next((p for catalog in self.store.catalog.get('locales', {}).values()
                            for p in catalog.get('products', [])
                            if normalized(p.get('name', '')) in names), None)
        if product:
            product = products.get(product['id'], product)
        # Una actualización de estado mantiene el producto y sus metadatos.
        if row and row[2].get('categoryId') and normalized(row[2]['name']) == normalized(clean):
            product = row[2]
        category_id = category[0]['id'] if category else (product or {}).get('categoryId')
        category_id = category_id or (row[2].get('categoryId') if row else None) or 'otr-otros'
        store_id = market[0]['id'] if market else (row[0] if row else None)
        if not store_id:
            type_id = categories.get(category_id, {}).get('typeId')
            suggested = (product or {}).get('storeId') or snapshot.get('defaultStores', {}).get(type_id)
            store_id = suggested if suggested in stores and stores[suggested].get('enabled', True) else INBOX
        company_id = company[0]['id'] if company else None
        if row and company_id is None:
            company_id = snapshot.get('productCompanies', {}).get(row[2]['id'])
        return {'name': (product or {}).get('name', clean), 'product': product,
                'store_id': store_id, 'category_id': category_id, 'company_id': company_id,
                'explicit_market': bool(market), 'explicit_company': bool(company)}

    def _app_fields(self, row, snapshot, config):
        _, stores, _, companies = self._catalog(snapshot, config)
        summary = row[2]['name']
        market = stores.get(row[0])
        if market and row[0] != INBOX:
            summary += f" [{market['name']}]"
        company_id = snapshot.get('productCompanies', {}).get(row[2]['id'])
        company = next((c for c in companies if c['id'] == company_id), None)
        if company:
            summary += f" [{company['name']}]"
        return {'summary': summary,
                'status': 'completed' if row[1].get('done') else 'needs_action'}

    @staticmethod
    def _touch(share, snapshot, store_id):
        now = max(int(time.time() * 1000), snapshot.get('updatedAt', 0) + 1,
                  snapshot['lists'][store_id].get('updatedAt', 0) + 1)
        snapshot['lists'][store_id]['updatedAt'] = now
        snapshot['updatedAt'] = now
        share['updatedAt'] = now

    def _import(self, share, snapshot, remote, config, row=None):
        now = int(time.time() * 1000)
        parsed = self._parse(remote['summary'], snapshot, config, row)
        store_id = parsed['store_id']
        if row is None:
            item = {'id': uuid.uuid4().hex, 'qty': 1,
                    'unit': (parsed['product'] or {}).get('defaultUnit', 'unidad'), 'addedAt': now}
            product = None
        else:
            old_store, item, product = row
            if old_store != store_id:
                snapshot['lists'][old_store]['items'] = [i for i in snapshot['lists'][old_store]['items']
                                                       if i['id'] != item['id']]
                self._touch(share, snapshot, old_store)
        if store_id == INBOX:
            stores = snapshot.setdefault('customStores', [])
            if not any(s['id'] == INBOX for s in stores):
                stores.append({'id': INBOX, 'name': 'Inbox', 'typeId': 'otros',
                               'icon': {'kind': 'emoji', 'value': '📥'}, 'edited': True})
        listing = snapshot.setdefault('lists', {}).setdefault(
            store_id, {'storeId': store_id, 'items': [], 'updatedAt': 0})
        if not any(i['id'] == item['id'] for i in listing['items']):
            listing['items'].append(item)
        if (product is None or product['name'] != parsed['name']
                or product.get('categoryId') != parsed['category_id']
                or snapshot.get('productCompanies', {}).get(product['id']) != parsed['company_id']):
            product = deepcopy(parsed['product'] or product or {
                'defaultUnit': 'unidad', 'icon': {'kind': 'emoji', 'value': '🏷️'}})
            product.setdefault('icon', {'kind': 'emoji', 'value': '🏷️'})
            if (not parsed['product'] or parsed['company_id']
                    or product.get('categoryId') != parsed['category_id']):
                product.update(id=f'custom-todo-{uuid.uuid4().hex}', name=parsed['name'],
                               categoryId=parsed['category_id'])
                snapshot.setdefault('customProducts', []).append(product)
            if parsed['company_id']:
                snapshot.setdefault('productCompanies', {})[product['id']] = parsed['company_id']
        item['productId'] = product['id']
        item['done'] = remote['status'] == 'completed'
        if item['done']:
            item['doneAt'] = now
        else:
            item.pop('doneAt', None)
        self._touch(share, snapshot, store_id)
        return store_id, item, product

    async def _sync(self, share_id):
        share = self.store.shares.get(share_id)
        config = share.get('todoSync') if share else None
        if not config:
            return
        initial = deepcopy(share)
        try:
            if config['user_id'] not in share.get('members', []):
                raise ValueError('Connecting user is no longer a list member')
            await self.authorize(config['entity_id'], config['user_id'])
            remote = await self._read(config)
            snapshot = share.get('snapshot')
            if not isinstance(snapshot, dict):
                snapshot = {'lists': {}, 'customProducts': [], 'customStores': [], 'updatedAt': 0}
                share['snapshot'] = snapshot
            links = config.setdefault('links', {})
            rows = self._rows(snapshot, config)
            all_ids = {item['id'] for listing in snapshot.get('lists', {}).values()
                       for item in listing.get('items', [])}

            for uid, link in list(links.items()):
                previous_link = deepcopy(link)
                row = rows.get(link['item_id'])
                todo = remote.get(uid)
                if row is None and link['item_id'] in all_ids:
                    continue
                if row is None:
                    if todo:
                        await self._call(config, 'remove_item', item=uid)
                        remote.pop(uid)
                    del links[uid]
                elif todo is None:
                    listing = snapshot['lists'][row[0]]
                    listing['items'] = [item for item in listing['items'] if item['id'] != link['item_id']]
                    self._touch(share, snapshot, row[0])
                    rows.pop(link['item_id'])
                    del links[uid]
                else:
                    app_fields = self._app_fields(row, snapshot, config)
                    legacy_fields = {'summary': row[2]['name'], 'status': app_fields['status']}
                    # Si ambos lados cambiaron entre polls, gana la edición de la app.
                    app_changed = app_fields != link['app'] and legacy_fields != link['app']
                    if not app_changed and fields(todo) != link['remote']:
                        row = self._import(share, snapshot, todo, config, row)
                        rows[link['item_id']] = row
                        app_fields = self._app_fields(row, snapshot, config)
                    if fields(todo) != app_fields:
                        await self._call(config, 'update_item', item=uid, rename=app_fields['summary'],
                                         status=app_fields['status'])
                        todo.update(app_fields)
                    link.update(app=app_fields, remote=fields(todo))
                if uid not in links or link != previous_link:
                    await self.store._async_save()

            linked_ids = {link['item_id'] for link in links.values()}
            pending = config.setdefault('pending_adds', {})
            for item_id, row in rows.items():
                if item_id in linked_ids:
                    continue
                current = self._app_fields(row, snapshot, config)
                # El primer enlace fusiona coincidencias una a una, sin colapsar duplicados.
                creation = pending.get(item_id)
                if creation:
                    uid = next((uid for uid, todo in remote.items() if uid not in creation['before']
                                and uid not in links and todo['summary'] == creation['summary']), None)
                    if uid is None:
                        raise ValueError('Created to-do item has not appeared yet')
                else:
                    uid = None
                    for candidate_uid, todo in remote.items():
                        if candidate_uid in links or todo['status'] != current['status']:
                            continue
                        parsed = self._parse(todo['summary'], snapshot, config)
                        company_id = snapshot.get('productCompanies', {}).get(row[2]['id'])
                        if (normalized(parsed['name']) == normalized(row[2]['name'])
                                and (not parsed['explicit_market'] or parsed['store_id'] == row[0])
                                and (not parsed['explicit_company'] or parsed['company_id'] == company_id)):
                            uid = candidate_uid
                            break
                if uid is None:
                    before = set(remote)
                    await self._call(config, 'add_item', item=current['summary'])
                    pending[item_id] = {'before': list(before), 'summary': current['summary']}
                    await self.store._async_save()
                    remote = await self._read(config)
                    uid = next((uid for uid, todo in remote.items() if uid not in before
                                and todo['summary'] == current['summary']), None)
                    if uid is None:
                        raise ValueError('Created to-do item has not appeared yet')
                # Guarda el UID antes de otra llamada para poder reintentar sin duplicar.
                links[uid] = {'item_id': item_id, 'app': fields(remote[uid]),
                              'remote': fields(remote[uid])}
                pending.pop(item_id, None)
                await self.store._async_save()
                if fields(remote[uid]) != current:
                    await self._call(config, 'update_item', item=uid, rename=current['summary'],
                                     status=current['status'])
                    remote[uid].update(current)
                links[uid] = {'item_id': item_id, 'app': current, 'remote': fields(remote[uid])}
                await self.store._async_save()

            for uid, todo in remote.items():
                if uid not in links:
                    row = self._import(share, snapshot, todo, config)
                    current = self._app_fields(row, snapshot, config)
                    links[uid] = {'item_id': row[1]['id'], 'app': current,
                                  'remote': fields(todo)}
                    await self.store._async_save()
                    if fields(todo) != current:
                        await self._call(config, 'update_item', item=uid, rename=current['summary'],
                                         status=current['status'])
                        todo.update(current)
                    links[uid] = {'item_id': row[1]['id'], 'app': current,
                                  'remote': fields(todo)}
            config['error'] = ''
            changed = share != initial
            config['last_sync'] = int(time.time() * 1000)
        except Exception as error:
            config['error'] = str(error)
            _LOGGER.warning('Tu Compra: todo sync failed for %s: %s', share_id, error)
            changed = share != initial
        if changed:
            await self.store._async_save()
