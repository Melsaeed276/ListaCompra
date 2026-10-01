<script lang="ts">
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { app } from '$lib/stores/app.svelte';
  import { base } from '$lib/base';
  import { t } from '$lib/i18n/ui.svelte';
  import { unitLabel } from '$lib/i18n/units';
  import type { Company, ListItem, Product, Store, Unit } from '$lib/types';
  import ProductIcon from '../ui/ProductIcon.svelte';
  import IconDisplay from '../ui/IconDisplay.svelte';

  let { store, item, product, company }:
    { store: Store; item: ListItem; product?: Product; company?: Company } = $props();

  const UNITS: Unit[] = ['unidad', 'kg', 'g', 'l', 'ml', 'paquete', 'docena', 'caja'];
  const productName = $derived(product?.name ?? '?');
  const storeImage = $derived(
    store.icon.kind === 'image'
      ? store.icon.value.startsWith('data:') ? store.icon.value : base(store.icon.value)
      : '',
  );

  function step(delta: number) {
    app.setItemQty(store.id, item.id, item.qty + delta);
  }
</script>

<li class={`flex items-center gap-3 py-3 flex-wrap ${item.done ? 'product-done' : ''}`}>
  <button
    type="button"
    onclick={() => app.toggleItem(store.id, item.id)}
    title={item.done
      ? t('all.markPending', { product: productName })
      : t('all.markDone', { product: productName })}
    aria-label={item.done
      ? t('all.markPending', { product: productName })
      : t('all.markDone', { product: productName })}
    class="size-9 shrink-0 rounded-full border-2 grid place-items-center transition"
    style={item.done
      ? 'background: var(--accent); border-color: var(--accent); color: white;'
      : 'border-color: var(--border);'}
  >{item.done ? '✓' : ''}</button>

  <ProductIcon {product} px={30} />

  <div class="flex-1 min-w-[9rem]">
    <div class="flex items-center gap-2 min-w-0">
      <div class="product-name font-medium truncate">{productName}</div>
      {#if item.priority === 'high'}
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style="background: #fee2e2; color: #b91c1c;">↑ {t('list.priority.high')}</span>
      {:else if item.priority === 'low'}
        <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style="background: var(--bg); color: var(--muted);">↓ {t('list.priority.low')}</span>
      {/if}
    </div>
    {#if item.note}
      <p class="mt-0.5 line-clamp-2 text-xs text-muted">{item.note}</p>
    {/if}
    {#if company}
      <span class="mt-1 me-2 inline-flex items-center gap-1 text-xs font-medium" style="color: var(--accent);">
        <IconDisplay icon={company.icon} px={16} />{company.name}
      </span>
    {/if}
    <a
      href={`#/lista/${encodeURIComponent(store.id)}`}
      title={t('all.openStore', { store: store.name })}
      class="mt-1 inline-flex max-w-full items-center gap-1.5 text-xs text-muted hover:underline"
    >
      {#if store.icon.kind === 'image'}
        <img src={storeImage} alt="" class="size-4 object-contain shrink-0" />
      {:else if store.icon.kind === 'emoji'}
        <span aria-hidden="true">{store.icon.value}</span>
      {:else}
        <span aria-hidden="true">🏪</span>
      {/if}
      <span class="truncate">{store.name}</span>
    </a>
  </div>

  <div class="flex items-center gap-1.5 ms-auto">
    <button
      type="button"
      onclick={() => step(-1)}
      aria-label={t('all.decrease', { product: productName })}
      class="size-7 rounded-full border grid place-items-center hover:bg-[var(--bg)]"
      style="border-color: var(--border);"
    >−</button>
    <input
      type="number"
      min="0.1"
      step="0.1"
      value={item.qty}
      aria-label={t('all.quantity', { product: productName })}
      oninput={(event) => app.setItemQty(
        store.id,
        item.id,
        parseFloat(event.currentTarget.value) || 0,
      )}
      class="w-14 text-center text-sm rounded-md border px-1 py-0.5 bg-transparent"
      style="border-color: var(--border);"
    />
    <button
      type="button"
      onclick={() => step(1)}
      aria-label={t('all.increase', { product: productName })}
      class="size-7 rounded-full border grid place-items-center hover:bg-[var(--bg)]"
      style="border-color: var(--border);"
    >+</button>
    <select
      value={item.unit}
      aria-label={t('all.unit', { product: productName })}
      onchange={(event) => app.setItemUnit(store.id, item.id, event.currentTarget.value as Unit)}
      class="max-w-24 text-xs rounded-md border px-1.5 py-1 bg-transparent"
      style="border-color: var(--border);"
    >
      {#each UNITS as unit}<option value={unit}>{unitLabel(unit, app.state.locale)}</option>{/each}
    </select>
    <button
      type="button"
      onclick={() => app.removeItem(store.id, item.id)}
      title={t('list.remove')}
      aria-label={`${t('list.remove')}: ${productName}`}
      class="size-8 rounded-full grid place-items-center text-muted hover:text-red-500 hover:bg-[var(--bg)] transition"
    >
      <Trash2 size={17} aria-hidden="true" />
    </button>
  </div>
</li>
