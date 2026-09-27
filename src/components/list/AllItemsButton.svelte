<script lang="ts">
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import { app } from '$lib/stores/app.svelte';
  import { t } from '$lib/i18n/ui.svelte';

  const pending = $derived.by(() => {
    const storeIds = new Set(app.state.stores.map((store) => store.id));
    return Object.values(app.state.lists).reduce(
      (total, list) => storeIds.has(list.storeId)
        ? total + list.items.filter((item) => !item.done).length
        : total,
      0,
    );
  });

  const label = $derived(t('all.openCount', { n: pending }));
</script>

<a
  href="#/all"
  title={label}
  aria-label={label}
  class="relative shrink-0 size-9 rounded-full border grid place-items-center hover:bg-[var(--bg)] transition"
  style="border-color: var(--border);"
>
  <ListChecks size={18} strokeWidth={2} aria-hidden="true" />
  {#if pending > 0}
    <span
      class="absolute -top-1.5 -end-1.5 min-w-5 h-5 px-1 rounded-full text-[10px] font-bold grid place-items-center text-white"
      style="background: var(--accent);"
      aria-hidden="true"
    >{pending > 99 ? '99+' : pending}</span>
  {/if}
</a>
