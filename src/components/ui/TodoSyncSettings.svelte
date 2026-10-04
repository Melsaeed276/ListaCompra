<script lang="ts">
  import { onMount } from 'svelte';
  import Link from '@lucide/svelte/icons/link';
  import Unlink from '@lucide/svelte/icons/unlink';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import { app } from '$lib/stores/app.svelte';
  import { TODO_LABELS } from '$lib/i18n/todo';
  import { DEFAULT_LOCALE } from '$lib/i18n/locale';
  import { getTodoSync, setTodoSync, syncStatus, type TodoSyncSettings } from '$lib/sync.svelte';

  const labels = $derived(TODO_LABELS[app.state.locale ?? DEFAULT_LOCALE]);
  let settings = $state<TodoSyncSettings | null>(null);
  let selected = $state('');
  let busy = $state(false);
  let error = $state('');

  async function refresh() {
    if (!syncStatus.inHA) return;
    busy = true;
    error = '';
    try {
      settings = await getTodoSync();
      selected = settings.entity_id;
    } catch (cause) { error = (cause as Error).message; }
    finally { busy = false; }
  }

  async function save(entityId: string) {
    busy = true;
    error = '';
    try { await setTodoSync(entityId); }
    catch (cause) { error = (cause as Error).message; }
    finally {
      const saveError = error;
      await refresh();
      error ||= saveError;
      busy = false;
    }
  }

  onMount(() => { void refresh(); });
</script>

<div class="space-y-4">
  {#if !syncStatus.inHA}
    <p class="text-sm text-muted" role="status">{labels.local}</p>
  {:else}
    <label class="block space-y-2">
      <span class="font-medium">{labels.list}</span>
      <select bind:value={selected} disabled={busy || !settings?.can_edit}
        class="w-full h-11 rounded-lg border px-3 bg-transparent" style="border-color: var(--border);">
        <option value="">{labels.none}</option>
        {#if settings?.entity_id && !settings.entities.some((entity) => entity.entity_id === settings?.entity_id)}
          <option value={settings.entity_id}>{settings.entity_id}</option>
        {/if}
        {#each settings?.entities ?? [] as entity (entity.entity_id)}
          <option value={entity.entity_id}>{entity.name} ({entity.entity_id})</option>
        {/each}
      </select>
    </label>
    {#if busy}<p class="text-sm text-muted" role="status">{labels.loading}</p>{/if}
    {#if settings && !settings.entities.length}<p class="text-sm text-muted">{labels.empty}</p>{/if}
    {#if settings && !settings.can_edit}<p class="text-sm text-muted">{labels.owner}</p>{/if}
    {#if settings?.entity_id}
      <dl class="text-sm space-y-2">
        <div><dt class="text-muted">{labels.linked}</dt><dd dir="ltr">{settings.entity_id}</dd></div>
        {#if settings.last_sync}
          <div><dt class="text-muted">{labels.lastSync}</dt><dd>{new Date(settings.last_sync).toLocaleString(app.state.locale === 'br' ? 'pt-BR' : app.state.locale === 'us' ? 'en-US' : app.state.locale)}</dd></div>
        {/if}
      </dl>
    {/if}
    {#if error || settings?.error}
      <p role="alert" class="text-sm text-red-600 break-words">{labels.failed}: {error || settings?.error}</p>
    {/if}
    <div class="flex flex-wrap gap-2">
      <button type="button" onclick={() => save(selected)}
        disabled={busy || !settings?.can_edit || !selected}
        class="h-11 px-4 rounded-lg inline-flex items-center gap-2 text-white disabled:opacity-50" style="background: var(--accent);">
        <Link size={18} /> {labels.connect}
      </button>
      {#if settings?.entity_id}
        <button type="button" onclick={() => save('')} disabled={busy || !settings.can_edit}
          class="h-11 px-3 rounded-lg border inline-flex items-center gap-2 disabled:opacity-50" style="border-color: var(--border);">
          <Unlink size={18} /> {labels.disconnect}
        </button>
      {/if}
      <button type="button" onclick={refresh} disabled={busy} title={labels.refresh} aria-label={labels.refresh}
        class="size-11 rounded-lg border grid place-items-center disabled:opacity-50" style="border-color: var(--border);">
        <RefreshCw size={18} />
      </button>
    </div>
  {/if}
</div>
