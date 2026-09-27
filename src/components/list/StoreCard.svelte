<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  import type { Store } from '$lib/types';
  import { app } from '$lib/stores/app.svelte';
  import { base } from '$lib/base';

  let { store, onEdit }: { store: Store; onEdit: (s: Store) => void } = $props();

  const list = $derived(app.state.lists[store.id]);
  const pending = $derived(list ? list.items.filter((i) => !i.done).length : 0);
  const total = $derived(list?.items.length ?? 0);

  const badgeStyle = $derived(
    store.brand
      ? `background:${store.brand.bg};color:${store.brand.fg};`
      : 'background:var(--bg-elev);color:var(--fg);',
  );

  const isImage = $derived(store.icon.kind === 'image');
  const imgSrc = $derived(
    isImage
      ? store.icon.value.startsWith('data:') ? store.icon.value : base(store.icon.value)
      : '',
  );

  function handleEdit(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onEdit(store);
  }
</script>

<div class="relative">
  <a
    href={`#/lista/${encodeURIComponent(store.id)}`}
    class="card-elev p-3 flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.99] transition aspect-square overflow-hidden"
  >
    <div
      class="size-20 rounded-2xl grid place-items-center font-extrabold shadow-sm overflow-hidden"
      style={badgeStyle}
    >
      {#if isImage}
        <img src={imgSrc} alt={store.name} class="h-16 w-[72px] object-contain" />
      {:else if store.brand?.initials}
        <span class="text-2xl tracking-tight leading-none">{store.brand.initials}</span>
      {:else if store.icon.kind === 'emoji'}
        <span class="text-4xl">{store.icon.value}</span>
      {:else}
        <span class="text-4xl">🏪</span>
      {/if}
    </div>

    <div class="text-center w-full">
      <div class="font-semibold text-sm leading-tight truncate">{store.name}</div>
      {#if total > 0}
        <div class="text-xs text-muted mt-0.5">{t('stores.pending', { pending, total })}</div>
      {/if}
    </div>

    {#if pending > 0}
      <span class="absolute top-2 start-2 size-5 rounded-full text-[10px] font-bold grid place-items-center"
        style="background: var(--accent); color: white;">
        {pending}
      </span>
    {/if}
  </a>

  <!-- Botón ⋯ para editar/borrar (no entra en el <a> para no navegar) -->
  <button
    type="button"
    onclick={handleEdit}
    title={t('stores.editStore')}
    class="absolute top-1.5 end-1.5 size-7 rounded-full grid place-items-center text-base font-bold shadow-sm hover:scale-110 transition"
    style="background: var(--bg-elev); color: var(--fg-muted); border: 1px solid var(--border);"
  >⋯</button>
</div>
