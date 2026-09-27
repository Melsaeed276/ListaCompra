<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Buscador de productos de esta tienda, para editarlos o ponerles imagen.
  //
  // De entrada solo enseña los tuyos (escaneados o creados con Enter), que son
  // pocos. Los del catálogo de fábrica se alcanzan buscando: son ~760 en un
  // supermercado y listarlos todos dejaba el WebView de Android inservible.

  import { app } from '$lib/stores/app.svelte';
  import { rankMatches } from '$lib/search';
  import type { Category, Product } from '$lib/types';
  import ProductIcon from '../ui/ProductIcon.svelte';
  import ProductEditor from './ProductEditor.svelte';
  import { localeLanguageTag } from '$lib/i18n/locale';

  let { categories, storeId, storeName, onClose }: {
    categories: Category[];
    storeId: string;
    storeName: string;
    onClose: () => void;
  } = $props();

  let editing = $state<Product | null>(null);
  let query = $state('');

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? t('product.noSection');

  // Cuántas filas se pintan como mucho. Un supermercado tiene ~760 productos y
  // renderizarlos todos deja el WebView de Android inservible: parece que el
  // diálogo "no hace nada". Esto es un buscador, no un volcado del catálogo.
  const LIMIT = 60;

  /** Todos los de esta tienda: de los del seed no se cambia el nombre, pero sí
   *  se les pone imagen, y este es el único acceso al editor. */
  const pool = $derived.by(() => {
    const catIds = new Set(categories.map((c) => c.id));
    return app.state.products.filter(
      (p) => catIds.has(p.categoryId) && (!p.storeId || p.storeId === storeId),
    );
  });

  const byName = (a: Product, b: Product) =>
    a.name.localeCompare(b.name, localeLanguageTag(app.state.locale), { sensitivity: 'base' });

  /** Sin búsqueda: solo los tuyos (escaneados o creados), que son pocos y los
   *  que se suelen querer tocar. Con búsqueda: cualquiera del catálogo. */
  const matches = $derived.by(() => {
    const q = query.trim();
    if (!q) return pool.filter((p) => p.id.startsWith('custom-')).slice().sort(byName);
    return rankMatches(pool, q);
  });

  const mine = $derived(matches.slice(0, LIMIT));
  const hidden = $derived(Math.max(0, matches.length - LIMIT));
</script>

<div class="fixed inset-0 z-50 grid place-items-center p-4"
  style="background: rgba(0,0,0,.5)" onclick={onClose} role="presentation">
  <div class="card-elev w-full max-w-md p-6 space-y-4 pop-in max-h-[90vh] overflow-y-auto [scrollbar-gutter:stable]"
    onclick={(e) => e.stopPropagation()} role="presentation">

    <header class="flex items-start justify-between">
      <h2 class="text-lg font-bold">🏷️ {t('product.myProducts')}</h2>
      <button onclick={onClose} class="text-2xl leading-none text-muted hover:text-current">×</button>
    </header>

    <p class="text-xs text-muted">
      {t('product.customIntro', { store: storeName })}
    </p>

    <input type="text" bind:value={query} placeholder={t('product.searchAny')}
      class="w-full rounded-xl border px-4 py-2 text-sm bg-transparent"
      style="border-color: var(--border);" />

    {#if mine.length === 0 && !query}
      <p class="text-sm text-muted py-6 text-center">
        {t('product.customEmptyHere')}<br />
        {t('product.customScanHint')}
      </p>
    {:else}

      {#if mine.length === 0}
        <p class="text-sm text-muted py-4 text-center">{t('product.noneMatch', { q: query })}</p>
      {:else}
        <ul class="divide-y" style="border-color: var(--border);">
          {#each mine as p (p.id)}
            <li class="flex items-center gap-3 py-2.5">
              <ProductIcon product={p} px={28} />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm truncate">{p.name}</div>
                <div class="text-[11px] text-muted truncate">
                  {catName(p.categoryId)}
                  {#if p.storeId === storeId} · {t('product.onlyHereTag')}{/if}
                </div>
              </div>
              <button onclick={() => (editing = p)}
                class="text-muted hover:text-current text-lg shrink-0"
                title={t('product.edit')}>✏️</button>
            </li>
          {/each}
        </ul>
        {#if hidden > 0}
          <p class="text-[11px] text-muted text-center">{t('product.moreResults', { n: hidden })}</p>
        {/if}
      {/if}
    {/if}
  </div>
</div>

{#if editing}
  <ProductEditor product={editing} {categories} {storeId} {storeName}
    onClose={() => (editing = null)} />
{/if}
