<script lang="ts">
  import ArrowDownAZ from '@lucide/svelte/icons/arrow-down-a-z';
  import LayoutGrid from '@lucide/svelte/icons/layout-grid';
  import Plus from '@lucide/svelte/icons/plus';
  import Search from '@lucide/svelte/icons/search';
  import StoreIcon from '@lucide/svelte/icons/store';
  import { app } from '$lib/stores/app.svelte';
  import { t } from '$lib/i18n/ui.svelte';
  import { localeLanguageTag } from '$lib/i18n/locale';
  import { norm } from '$lib/search';
  import type { Category, ListItem, Product, Store } from '$lib/types';
  import MenuButton from '../ui/MenuButton.svelte';
  import AllItemsRow from './AllItemsRow.svelte';
  import QuickAddItemDialog from './QuickAddItemDialog.svelte';

  type ViewMode = 'category' | 'store' | 'az';
  type Entry = {
    store: Store;
    item: ListItem;
    product?: Product;
    category?: Category;
  };
  type ViewGroup = {
    key: string;
    label: string;
    icon: string;
    items: Entry[];
  };

  let mode = $state<ViewMode>('category');
  let storeFilter = $state('all');
  let query = $state('');
  let showQuickAdd = $state(false);

  const languageTag = $derived(localeLanguageTag(app.state.locale));
  const collator = $derived(new Intl.Collator(languageTag, { sensitivity: 'base' }));

  const entries = $derived.by(() => {
    const stores = new Map(app.state.stores.map((store) => [store.id, store]));
    const products = new Map(app.state.products.map((product) => [product.id, product]));
    const categories = new Map(app.state.categories.map((category) => [category.id, category]));
    const result: Entry[] = [];

    for (const list of Object.values(app.state.lists)) {
      const store = stores.get(list.storeId);
      if (!store) continue;
      for (const item of list.items) {
        const product = products.get(item.productId);
        result.push({
          store,
          item,
          product,
          category: product ? categories.get(product.categoryId) : undefined,
        });
      }
    }
    return result;
  });

  const storesWithItems = $derived.by(() => {
    const stores = new Map<string, Store>();
    for (const entry of entries) stores.set(entry.store.id, entry.store);
    return [...stores.values()].sort((a, b) => collator.compare(a.name, b.name));
  });

  $effect(() => {
    if (storeFilter !== 'all' && !storesWithItems.some((store) => store.id === storeFilter)) {
      storeFilter = 'all';
    }
  });

  const filtered = $derived.by(() => {
    const needle = norm(query);
    return entries.filter((entry) => {
      if (storeFilter !== 'all' && entry.store.id !== storeFilter) return false;
      if (!needle) return true;
      return [entry.product?.name, entry.store.name, entry.category?.name]
        .some((value) => value && norm(value).includes(needle));
    });
  });

  const pending = $derived(filtered.filter((entry) => !entry.item.done));
  const completed = $derived(filtered.filter((entry) => entry.item.done));

  function itemSort(a: Entry, b: Entry) {
    const byProduct = collator.compare(a.product?.name ?? '', b.product?.name ?? '');
    return byProduct || collator.compare(a.store.name, b.store.name);
  }

  function buildGroups(items: Entry[]): ViewGroup[] {
    if (mode === 'az') {
      return items.length === 0
        ? []
        : [{ key: 'az', label: t('all.alphabetical'), icon: '', items: items.slice().sort(itemSort) }];
    }

    const groups = new Map<string, ViewGroup>();
    for (const entry of items) {
      const byCategory = mode === 'category';
      const key = byCategory ? entry.category?.id ?? 'unknown' : entry.store.id;
      const label = byCategory ? entry.category?.name ?? t('list.noCategory') : entry.store.name;
      const icon = byCategory
        ? entry.category?.icon.kind === 'emoji' ? entry.category.icon.value : '📁'
        : entry.store.icon.kind === 'emoji' ? entry.store.icon.value : '🏪';
      const group = groups.get(key) ?? { key, label, icon, items: [] };
      group.items.push(entry);
      groups.set(key, group);
    }

    return [...groups.values()]
      .map((group) => ({ ...group, items: group.items.slice().sort(itemSort) }))
      .sort((a, b) => collator.compare(a.label, b.label));
  }

  const pendingGroups = $derived(buildGroups(pending));
  const completedGroups = $derived(buildGroups(completed));
</script>

{#snippet groupList(groups: ViewGroup[])}
  <div class="space-y-3">
    {#each groups as group (group.key)}
      <section class="card-elev p-4">
        {#if mode !== 'az'}
          <h3 class="font-semibold mb-1 flex items-center gap-2">
            <span aria-hidden="true">{group.icon}</span>
            <span class="truncate">{group.label}</span>
            <span class="text-xs text-muted ms-auto">{group.items.length}</span>
          </h3>
        {/if}
        <ul class="divide-y" style="border-color: var(--border);">
          {#each group.items as entry (`${entry.store.id}:${entry.item.id}`)}
            <AllItemsRow store={entry.store} item={entry.item} product={entry.product} />
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{/snippet}

<div class="space-y-4">
  <header class="flex items-center gap-2 min-w-0">
    <MenuButton />
    <a href="#/" class="text-sm text-muted hover:underline shrink-0">
      <span class="back-arrow">←</span> {t('nav.stores')}
    </a>
    <h1 class="text-xl font-bold truncate ms-1">{t('all.title')}</h1>
    <button
      type="button"
      onclick={() => (showQuickAdd = true)}
      class="ms-auto shrink-0 h-9 rounded-lg px-3 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:brightness-95"
      style="background: var(--accent);"
      title={t('all.addItem')}
    >
      <Plus size={18} aria-hidden="true" />
      <span class="hidden sm:inline">{t('all.addItem')}</span>
    </button>
  </header>

  <div class="card-elev p-3 space-y-3">
    <div class="relative">
      <Search
        size={17}
        aria-hidden="true"
        class="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="search"
        bind:value={query}
        placeholder={t('all.search')}
        aria-label={t('all.search')}
        class="w-full rounded-lg border py-2.5 ps-10 pe-3 bg-transparent"
        style="border-color: var(--border);"
      />
    </div>

    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div
        class="grid grid-cols-3 rounded-lg border p-1"
        style="border-color: var(--border);"
        role="group"
        aria-label={t('all.groupBy')}
      >
        <button
          type="button"
          onclick={() => (mode = 'category')}
          aria-pressed={mode === 'category'}
          class:mode-active={mode === 'category'}
          class="h-9 px-3 rounded-md text-sm inline-flex items-center justify-center gap-1.5 transition"
        ><LayoutGrid size={16} aria-hidden="true" /> {t('all.byCategory')}</button>
        <button
          type="button"
          onclick={() => (mode = 'store')}
          aria-pressed={mode === 'store'}
          class:mode-active={mode === 'store'}
          class="h-9 px-3 rounded-md text-sm inline-flex items-center justify-center gap-1.5 transition"
        ><StoreIcon size={16} aria-hidden="true" /> {t('all.byStore')}</button>
        <button
          type="button"
          onclick={() => (mode = 'az')}
          aria-pressed={mode === 'az'}
          class:mode-active={mode === 'az'}
          class="h-9 px-3 rounded-md text-sm inline-flex items-center justify-center gap-1.5 transition"
        ><ArrowDownAZ size={16} aria-hidden="true" /> {t('all.alphabetical')}</button>
      </div>

      <select
        bind:value={storeFilter}
        aria-label={t('all.filterStore')}
        class="h-10 min-w-44 rounded-lg border px-3 bg-transparent text-sm"
        style="border-color: var(--border);"
      >
        <option value="all">{t('all.allStores')}</option>
        {#each storesWithItems as store (store.id)}
          <option value={store.id}>{store.name}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if entries.length === 0}
    <p class="text-center text-muted py-16">{t('all.empty')}</p>
  {:else if pending.length === 0 && completed.length === 0}
    <p class="text-center text-muted py-16">{t('all.noMatches')}</p>
  {:else}
    <section class="space-y-3" aria-labelledby="pending-heading">
      <h2 id="pending-heading" class="text-sm font-semibold uppercase tracking-wider text-muted">
        {t('all.pending')} <span class="ms-1">{pending.length}</span>
      </h2>
      {#if pending.length > 0}
        {@render groupList(pendingGroups)}
      {:else}
        <p class="text-sm text-muted py-4">{t('all.noPending')}</p>
      {/if}
    </section>

    {#if completed.length > 0}
      <details class="border-t pt-1" style="border-color: var(--border);">
        <summary class="cursor-pointer px-4 py-3 font-semibold flex items-center gap-2 select-none">
          <span>{t('all.completed')}</span>
          <span class="text-xs text-muted">{completed.length}</span>
        </summary>
        <div class="px-3 pb-3">
          {@render groupList(completedGroups)}
        </div>
      </details>
    {/if}
  {/if}
</div>

{#if showQuickAdd}
  <QuickAddItemDialog
    initialStoreId={storeFilter === 'all' ? undefined : storeFilter}
    onClose={() => (showQuickAdd = false)}
  />
{/if}

<style>
  .mode-active {
    background: var(--accent);
    color: white;
  }
  :global(html[dir='rtl']) .back-arrow {
    display: inline-block;
    transform: scaleX(-1);
  }
</style>
