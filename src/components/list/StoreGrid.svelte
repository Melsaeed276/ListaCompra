<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  import { app } from '$lib/stores/app.svelte';
  import StoreCard from './StoreCard.svelte';
  import StoreEditor from './StoreEditor.svelte';
  import QuickAddItemDialog from './QuickAddItemDialog.svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import type { Store } from '$lib/types';
  import { localeLanguageTag } from '$lib/i18n/locale';

  let editing = $state<Store | undefined>(undefined);
  let showQuickAdd = $state(false);

  // Orden: 1º por nº de artículos en lista (desc), 2º alfabético.
  // "Otros" siempre al final independientemente del resto.
  const visibleStores = $derived(
    app.state.stores
      .filter((s) => s.enabled !== false)
      .sort((a, b) => {
        const aOtros = /^otros$/i.test(a.name.trim());
        const bOtros = /^otros$/i.test(b.name.trim());
        if (aOtros !== bOtros) return aOtros ? 1 : -1;
        const aCount = (app.state.lists[a.id]?.items ?? []).length;
        const bCount = (app.state.lists[b.id]?.items ?? []).length;
        if (bCount !== aCount) return bCount - aCount;
        return a.name.localeCompare(b.name, localeLanguageTag(app.state.locale), { sensitivity: 'base' });
      }),
  );

  function openEdit(s: Store) {
    editing = s;
  }

  function closeEditor() {
    editing = undefined;
  }
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pb-24">
  {#each visibleStores as store (store.id)}
    <StoreCard {store} onEdit={openEdit} />
  {/each}
</div>

<button
  type="button"
  onclick={() => (showQuickAdd = true)}
  title={t('all.addItem')}
  aria-label={t('all.addItem')}
  class="fixed bottom-6 end-6 z-40 h-14 px-5 rounded-full font-bold text-white text-base flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition"
  style="background: var(--accent); box-shadow: 0 12px 28px -6px var(--accent);"
>
  <Plus size={24} aria-hidden="true" />
  <span class="hidden sm:inline">{t('all.addItem')}</span>
</button>

{#if editing}
  <StoreEditor store={editing} onClose={closeEditor} />
{/if}

{#if showQuickAdd}
  <QuickAddItemDialog onClose={() => (showQuickAdd = false)} />
{/if}
