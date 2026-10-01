<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Building2 from '@lucide/svelte/icons/building-2';
  import FolderTree from '@lucide/svelte/icons/folder-tree';
  import Globe2 from '@lucide/svelte/icons/globe-2';
  import Info from '@lucide/svelte/icons/info';
  import LogOut from '@lucide/svelte/icons/log-out';
  import Monitor from '@lucide/svelte/icons/monitor';
  import Moon from '@lucide/svelte/icons/moon';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import StoreIcon from '@lucide/svelte/icons/store';
  import Sun from '@lucide/svelte/icons/sun';
  import X from '@lucide/svelte/icons/x';
  import { app } from '$lib/stores/app.svelte';
  import { t } from '$lib/i18n/ui.svelte';
  import { LOCALES, LOCALE_LABEL, type Locale } from '$lib/i18n/locale';
  import type { Store, UserProfile } from '$lib/types';
  import pkg from '../../../package.json';
  import CatalogManager from '../list/CatalogManager.svelte';
  import StoreEditor from '../list/StoreEditor.svelte';

  let { onClose, onSignOut }: { onClose: () => void; onSignOut: () => void } = $props();
  let view = $state<'main' | 'markets' | 'about'>('main');
  let catalogTab = $state<'companies' | 'categories' | null>(null);
  let editingStore = $state<Store | undefined>(undefined);
  let showStoreEditor = $state(false);

  const stores = $derived(app.state.stores.slice().sort((a, b) => a.name.localeCompare(b.name)));

  function setTheme(theme: UserProfile['theme']) {
    if (!app.state.profile) return;
    app.state.profile.theme = theme;
    app.persist();
  }

  function openStore(store?: Store) {
    editingStore = store;
    showStoreEditor = true;
  }
</script>

<div class="fixed inset-0 z-[60] grid place-items-center p-4" style="background: rgba(0,0,0,.5)"
  onclick={onClose} role="presentation">
  <section class="card-elev w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4"
    onclick={(event) => event.stopPropagation()} aria-labelledby="settings-title">
    <header class="flex items-center gap-3">
      {#if view !== 'main'}
        <button type="button" onclick={() => (view = 'main')} title={t('settings.back')}
          class="size-9 rounded-full grid place-items-center hover:bg-[var(--bg)]">
          <ArrowLeft size={19} class={app.state.locale === 'ar' ? 'rotate-180' : ''} />
        </button>
      {/if}
      <h2 id="settings-title" class="flex-1 text-lg font-bold">
        {view === 'markets' ? t('settings.marketList') : view === 'about' ? t('settings.about') : t('settings.title')}
      </h2>
      <button type="button" onclick={onClose} title={t('common.close')}
        class="size-9 rounded-full grid place-items-center text-muted hover:bg-[var(--bg)]"><X size={19} /></button>
    </header>

    {#if view === 'main'}
      <label class="flex items-center gap-3 border-b pb-4" style="border-color: var(--border);">
        <Globe2 size={20} class="text-muted shrink-0" />
        <span class="flex-1 font-medium">{t('settings.language')}</span>
        <select value={app.state.locale}
          onchange={(event) => app.setLocale(event.currentTarget.value as Locale)}
          class="h-10 max-w-48 rounded-lg border px-3 bg-transparent" style="border-color: var(--border);">
          {#each LOCALES as locale}<option value={locale}>{LOCALE_LABEL[locale]}</option>{/each}
        </select>
      </label>

      <div class="space-y-2 border-b pb-4" style="border-color: var(--border);">
        <div class="font-medium">{t('settings.theme')}</div>
        <div class="grid grid-cols-3 rounded-lg border p-1" style="border-color: var(--border);">
          {#each [
            { id: 'system', label: t('setup.themeSystem'), icon: Monitor },
            { id: 'light', label: t('setup.themeLight'), icon: Sun },
            { id: 'dark', label: t('setup.themeDark'), icon: Moon },
          ] as option (option.id)}
            <button type="button" onclick={() => setTheme(option.id as UserProfile['theme'])}
              aria-pressed={app.state.profile?.theme === option.id}
              class:active={app.state.profile?.theme === option.id}
              class="h-10 rounded-md inline-flex items-center justify-center gap-2 text-sm">
              <option.icon size={17} /> <span>{option.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <nav class="divide-y" style="border-color: var(--border);">
        <button type="button" onclick={() => (catalogTab = 'categories')} class="setting-row">
          <FolderTree size={20} /> <span>{t('settings.categoryList')}</span>
        </button>
        <button type="button" onclick={() => (catalogTab = 'companies')} class="setting-row">
          <Building2 size={20} /> <span>{t('settings.companyList')}</span>
        </button>
        <button type="button" onclick={() => (view = 'markets')} class="setting-row">
          <StoreIcon size={20} /> <span>{t('settings.marketList')}</span>
        </button>
        <button type="button" onclick={() => (view = 'about')} class="setting-row">
          <Info size={20} /> <span>{t('settings.about')}</span>
        </button>
      </nav>

      <button type="button" onclick={onSignOut}
        class="w-full h-11 rounded-lg border inline-flex items-center justify-center gap-2 text-red-600"
        style="border-color: var(--border);"><LogOut size={18} /> {t('nav.signOut')}</button>
    {:else if view === 'markets'}
      <button type="button" onclick={() => openStore()}
        class="w-full h-11 rounded-lg text-white inline-flex items-center justify-center gap-2 font-medium"
        style="background: var(--accent);"><Plus size={18} /> {t('stores.new')}</button>
      <ul class="divide-y" style="border-color: var(--border);">
        {#each stores as store (store.id)}
          <li class="flex items-center gap-3 py-3">
            <span class="size-9 rounded-md grid place-items-center overflow-hidden" style="background: {store.brand?.bg ?? 'var(--bg)'}; color: {store.brand?.fg ?? 'inherit'};">
              {store.icon.kind === 'emoji' ? store.icon.value : store.brand?.initials ?? '🏪'}
            </span>
            <span class="flex-1 min-w-0 truncate font-medium">{store.name}</span>
            {#if store.enabled === false}<span class="text-xs text-muted">{t('stores.hide')}</span>{/if}
            <button type="button" onclick={() => openStore(store)} title={t('stores.edit')}
              class="size-9 rounded-full grid place-items-center text-muted hover:bg-[var(--bg)]"><Pencil size={17} /></button>
          </li>
        {/each}
      </ul>
    {:else}
      <div class="space-y-4 py-2">
        <div>
          <div class="text-2xl font-bold">Tu Compra</div>
          <div class="text-sm text-muted">v{pkg.version}</div>
        </div>
        <dl class="divide-y" style="border-color: var(--border);">
          <div class="flex justify-between gap-4 py-3"><dt class="text-muted">{t('settings.creator')}</dt><dd class="font-medium">maestrea</dd></div>
          <div class="flex justify-between gap-4 py-3"><dt class="text-muted">{t('settings.participant')}</dt><dd class="font-medium">{app.state.profile?.username}</dd></div>
        </dl>
      </div>
    {/if}
  </section>
</div>

{#if catalogTab}
  <CatalogManager initialTab={catalogTab} onClose={() => (catalogTab = null)} />
{/if}
{#if showStoreEditor}
  <StoreEditor store={editingStore} onClose={() => (showStoreEditor = false)} />
{/if}

<style>
  .setting-row { width: 100%; min-height: 3.25rem; display: flex; align-items: center; gap: .75rem; text-align: start; }
  .setting-row :global(svg) { color: var(--muted); flex: none; }
  .active { background: var(--accent); color: white; }
</style>
