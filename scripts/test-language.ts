import assert from 'node:assert/strict';
import { APP_NAMES, LOCALES, preferredLocale, localeDirection } from '../src/lib/i18n/locale';
import { translate } from '../src/lib/i18n/ui';
import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { compileModule } from 'svelte/compiler';

assert.equal(preferredLocale('ar', 'en', 'TR'), 'ar');
assert.equal(preferredLocale('tr', 'en', 'GB'), 'tr');
assert.equal(preferredLocale(undefined, 'tr-TR', 'TR'), 'tr');
assert.equal(preferredLocale(undefined, '', 'TR'), 'tr');
assert.equal(preferredLocale('invalid', 'ar', 'TR'), 'ar');
assert.equal(preferredLocale(undefined, 'en', 'US'), 'us');
assert.equal(preferredLocale(undefined, '', ''), 'en');
assert.equal(localeDirection('ar'), 'rtl');
for (const locale of LOCALES) {
  assert.ok(APP_NAMES[locale]);
  assert.ok(translate(locale, 'setup.haNote').includes(APP_NAMES[locale]));
}
console.log('Language selection and localized names passed');

const bundle = await build({
  entryPoints: ['src/lib/stores/app.svelte.ts'], bundle: true, write: false,
  platform: 'node', format: 'esm',
  plugins: [{ name: 'svelte-runes', setup(builder) {
    builder.onLoad({ filter: /\.svelte\.ts$/ }, async ({ path }) => {
      const source = await transform(await readFile(path, 'utf8'), { loader: 'ts' });
      return { contents: compileModule(source.code, { filename: path, generate: 'server' }).js.code, loader: 'js' };
    });
  } }],
});
const { app } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
app.hydrate();
app.setLocale('tr');
const productId = app.state.products[0].id;
app.addOrBumpItem('tr-a101', productId);
app.setLocale('ar');
assert.ok(app.state.stores.some((store: { id: string }) => store.id === 'tr-a101'));
assert.ok(app.state.products.some((product: { id: string }) => product.id === productId));
assert.equal(app.state.lists['tr-a101'].items.length, 1);
app.setLocale('tr');
assert.equal(app.state.stores.filter((store: { id: string }) => store.id === 'tr-a101').length, 1);
console.log('Existing lists survive language changes');
