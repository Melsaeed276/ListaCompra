import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { compileModule } from 'svelte/compiler';

const bundle = await build({
  stdin: { contents: `export { app } from './src/lib/stores/app.svelte';
    export * from './src/lib/sync.svelte';`, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'svelte-runes', setup(builder) {
    builder.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const source = await transform(await readFile(path, 'utf8'), { loader: 'ts' });
      return { contents: compileModule(source.code, { filename: path, generate: 'server' }).js.code, loader: 'js' };
    });
  } }],
});

let tokenListener: (event: unknown) => void = () => {};
Object.assign(globalThis, {
  window: {
    location: { origin: 'http://test.local' },
    addEventListener: (name: string, callback: typeof tokenListener) => { if (name === 'message') tokenListener = callback; },
    removeEventListener: () => {},
    parent: { postMessage: () => queueMicrotask(() => tokenListener({ data: {
      type: 'tucompra-token', token: 'test-only', hassUrl: 'http://test.local', language: 'tr', country: 'TR',
    } })) },
  },
  document: { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} },
});

let remote: any = null;
let hold = false;
let release: () => void = () => {};
let started: () => void = () => {};
let failNextPush = false;
let poll: () => Promise<void> | void = () => {};
globalThis.setInterval = ((callback: typeof poll) => {
  poll = callback;
  return 1;
}) as typeof setInterval;
const requests: any[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  let data: any;
  if (url.endsWith('/me')) data = { user_id: 'a', name: 'Test', is_admin: true, preferences: { locale: 'tr' }, person: null };
  else if (url.endsWith('/shares')) data = { shares: [{ id: 'personal:a', name: 'Test', owner: 'a', members: ['a'], updatedAt: 0 }] };
  else if (init?.method === 'POST') {
    if (failNextPush) {
      failNextPush = false;
      throw new Error('Temporary connection failure');
    }
    const body = JSON.parse(String(init.body));
    requests.push(body);
    if (hold) {
      hold = false;
      started();
      await new Promise<void>((resolve) => { release = resolve; });
    }
    remote = body.snapshot;
    data = { snapshot: remote, updatedAt: remote.updatedAt };
  } else data = { snapshot: remote, updatedAt: remote?.updatedAt ?? 0 };
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

const client = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
client.app.hydrate();
await client.hydrateAuth();
assert.equal(client.syncStatus.enabled, true);
const product = client.app.state.products[0];
client.app.addOrBumpItem('tr-a101', product.id);
await Promise.resolve();
await client.pushNow();
assert.equal(remote.lists['tr-a101'].items.length, 1);

hold = true;
const waiting = new Promise<void>((resolve) => { started = resolve; });
const firstPush = client.pushNow();
await waiting;
const row = client.app.state.lists['tr-a101'].items[0];
client.app.setItemQty('tr-a101', row.id, 3);
client.schedulePush();
const queuedPush = client.pushNow();
release();
await Promise.all([firstPush, queuedPush]);
assert.equal(remote.lists['tr-a101'].items[0].qty, 3);
assert.equal(client.app.state.lists['tr-a101'].items[0].qty, 3);
assert.ok(requests.at(-1).baseLists['tr-a101']);
const custom = client.app.createFreeProduct('BİM retry product', 'supermercado');
client.app.addItem('tr-bim', { productId: custom.id, qty: 1, unit: 'unidad' });
await new Promise((resolve) => setTimeout(resolve, 0));
failNextPush = true;
await client.pushNow();
assert.equal(client.syncStatus.connected, false);
assert.equal(Object.hasOwn(remote.lists, 'tr-bim'), false);
poll();
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(remote.lists['tr-bim']?.items.length, 1, 'Polling must retry an unsent market item');
assert.ok(remote.customProducts.some((p: any) => p.id === custom.id));
assert.equal(client.syncStatus.connected, true);
assert.equal(client.syncStatus.lastError, '');
await client.stopSync();
console.log('Client sync: queued edits, baselines and failed-save recovery passed');
