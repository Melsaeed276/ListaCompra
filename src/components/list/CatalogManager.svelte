<script lang="ts">
  import Building2 from '@lucide/svelte/icons/building-2';
  import FolderTree from '@lucide/svelte/icons/folder-tree';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { app } from '$lib/stores/app.svelte';
  import { t } from '$lib/i18n/ui.svelte';
  import { fileToStorableDataUrl } from '$lib/image';
  import type { Category, Company, IconRef } from '$lib/types';
  import IconDisplay from '../ui/IconDisplay.svelte';

  let { typeId, initialTab = 'companies', onClose }:
    { typeId?: string; initialTab?: 'companies' | 'categories'; onClose: () => void } = $props();
  let tab = $state<'companies' | 'categories'>(initialTab);
  let editingCompany = $state<Company | null>(null);
  let editingCategory = $state<Category | null>(null);
  let name = $state('');
  let icon = $state('🏷️');
  let companyIconKind = $state<IconRef['kind']>('emoji');
  let companyImage = $state('');
  let categoryTypeId = $state(typeId ?? app.state.storeTypes[0]?.id ?? 'supermercado');
  let error = $state('');

  const companies = $derived(
    (app.state.companies ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
  );
  const categories = $derived(
    app.state.categories
      .filter((category) => category.typeId === (typeId ?? categoryTypeId))
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)),
  );

  function slug(value: string) {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
  }

  function resetForm() {
    editingCompany = null;
    editingCategory = null;
    name = '';
    icon = '🏷️';
    companyIconKind = 'emoji';
    companyImage = '';
    error = '';
  }

  function editCompany(company: Company) {
    editingCompany = company;
    editingCategory = null;
    name = company.name;
    const current = typeof company.icon === 'string'
      ? { kind: 'emoji' as const, value: company.icon }
      : company.icon;
    companyIconKind = current?.kind === 'image' ? 'image' : 'emoji';
    icon = current?.kind === 'emoji' ? current.value : '🏢';
    companyImage = current?.kind === 'image' ? current.value : '';
    error = '';
  }

  function editCategory(category: Category) {
    editingCategory = category;
    editingCompany = null;
    name = category.name;
    icon = category.icon.kind === 'emoji' ? category.icon.value : '📁';
    categoryTypeId = category.typeId;
    error = '';
  }

  function save() {
    const clean = name.trim();
    if (clean.length < 2) return;
    if (tab === 'companies') {
      app.upsertCompany({
        id: editingCompany?.id ?? `company-${slug(clean)}-${Date.now().toString(36)}`,
        name: clean,
        icon: companyIconKind === 'image' && companyImage
          ? { kind: 'image', value: companyImage }
          : { kind: 'emoji', value: icon.trim() || '🏢' },
      });
    } else {
      app.upsertCategory({
        id: editingCategory?.id ?? `custom-category-${slug(clean)}-${Date.now().toString(36)}`,
        name: clean,
        typeId: editingCategory?.typeId ?? categoryTypeId,
        icon: { kind: 'emoji', value: icon.trim() || '📁' },
        order: editingCategory?.order ?? 998,
      });
    }
    resetForm();
  }

  function removeCategory(category: Category) {
    error = app.removeCategory(category.id) ? '' : t('catalog.categoryInUse');
  }

  async function handleCompanyImage(event: Event) {
    error = '';
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      companyImage = await fileToStorableDataUrl(file);
      companyIconKind = 'image';
    } catch {
      error = t('product.imgError');
    }
  }
</script>

<div class="fixed inset-0 z-[70] grid place-items-center p-4" style="background: rgba(0,0,0,.5)"
  onclick={onClose} role="presentation">
  <div class="card-elev w-full max-w-lg p-5 space-y-4 max-h-[90vh] overflow-y-auto"
    onclick={(event) => event.stopPropagation()} role="presentation">
    <header class="flex items-center justify-between gap-3">
      <h2 class="text-lg font-bold">{t('catalog.manage')}</h2>
      <button type="button" onclick={onClose} class="text-2xl leading-none text-muted">×</button>
    </header>

    <div class="grid grid-cols-2 rounded-lg border p-1" style="border-color: var(--border);">
      <button type="button" onclick={() => { tab = 'companies'; resetForm(); }}
        class:active={tab === 'companies'} class="h-10 rounded-md inline-flex items-center justify-center gap-2">
        <Building2 size={17} /> {t('catalog.companies')}
      </button>
      <button type="button" onclick={() => { tab = 'categories'; resetForm(); }}
        class:active={tab === 'categories'} class="h-10 rounded-md inline-flex items-center justify-center gap-2">
        <FolderTree size={17} /> {t('catalog.categories')}
      </button>
    </div>

    <form onsubmit={(event) => { event.preventDefault(); save(); }} class="space-y-3">
      {#if tab === 'companies'}
        <div class="flex items-center gap-3">
          <div class="size-16 rounded-xl border grid place-items-center overflow-hidden text-3xl bg-white"
            style="border-color: var(--border);">
            <IconDisplay icon={companyIconKind === 'image' && companyImage
              ? { kind: 'image', value: companyImage }
              : { kind: 'emoji', value: icon || '🏢' }} px={48} />
          </div>
          <div class="flex-1 grid grid-cols-2 rounded-lg border p-1 text-xs" style="border-color: var(--border);">
            <button type="button" onclick={() => (companyIconKind = 'emoji')}
              class="rounded-md py-2" class:active={companyIconKind === 'emoji'}>{t('store.logoEmoji')}</button>
            <button type="button" onclick={() => (companyIconKind = 'image')}
              class="rounded-md py-2" class:active={companyIconKind === 'image'}>{t('store.logoImage')}</button>
          </div>
        </div>
        {#if companyIconKind === 'emoji'}
          <label class="block">
            <span class="text-xs text-muted">{t('catalog.icon')}</span>
            <input bind:value={icon} maxlength="4"
              class="mt-1 w-full rounded-lg border px-3 py-2 text-center text-2xl bg-transparent"
              style="border-color: var(--border);" />
          </label>
        {:else}
          <label class="block rounded-lg border px-3 py-2 text-center text-sm cursor-pointer"
            style="border-color: var(--border); color: var(--accent);">
            {t('product.useImage')}
            <input type="file" accept="image/*" class="hidden" onchange={handleCompanyImage} />
          </label>
        {/if}
      {/if}

      <div class="flex items-end gap-2">
        {#if tab === 'categories'}
          <label class="w-16 shrink-0">
            <span class="text-xs text-muted">{t('catalog.icon')}</span>
            <input bind:value={icon} maxlength="4" class="mt-1 w-full rounded-lg border px-2 py-2 text-center bg-transparent"
              style="border-color: var(--border);" />
          </label>
        {/if}
        <label class="flex-1 min-w-0">
          <span class="text-xs text-muted">{t('catalog.name')}</span>
          <input bind:value={name} placeholder={tab === 'companies' ? t('catalog.companyExample') : t('catalog.categoryExample')}
            class="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent" style="border-color: var(--border);" />
        </label>
        <button type="submit" title={editingCompany || editingCategory ? t('catalog.save') : t('catalog.add')}
          class="size-10 rounded-lg grid place-items-center text-white" style="background: var(--accent);">
          {#if editingCompany || editingCategory}<Pencil size={18} />{:else}<Plus size={19} />{/if}
        </button>
      </div>
    </form>

    {#if tab === 'categories' && !typeId}
      <label class="block">
        <span class="text-xs text-muted">{t('store.type')}</span>
        <select bind:value={categoryTypeId} disabled={!!editingCategory}
          class="mt-1 w-full rounded-lg border px-3 py-2 bg-transparent disabled:opacity-60"
          style="border-color: var(--border);">
          {#each app.state.storeTypes as storeType (storeType.id)}
            <option value={storeType.id}>{storeType.name}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if error}<p class="text-sm text-red-600">{error}</p>{/if}

    <ul class="divide-y" style="border-color: var(--border);">
      {#each tab === 'companies' ? companies : categories as entry (entry.id)}
        <li class="flex items-center gap-3 py-3">
          <span class="text-xl w-8 grid place-items-center">
            <IconDisplay icon={entry.icon} fallback={tab === 'companies' ? '🏢' : '📁'} px={28} />
          </span>
          <span class="flex-1 min-w-0 truncate font-medium">{entry.name}</span>
          <button type="button" onclick={() => tab === 'companies'
              ? editCompany(entry as Company)
              : editCategory(entry as Category)}
            title={t('catalog.edit')} class="size-9 rounded-full grid place-items-center text-muted hover:bg-[var(--bg)]">
            <Pencil size={17} />
          </button>
          <button type="button" onclick={() => tab === 'companies'
              ? app.removeCompany(entry.id)
              : removeCategory(entry as Category)}
            title={t('catalog.delete')} class="size-9 rounded-full grid place-items-center text-muted hover:text-red-600 hover:bg-[var(--bg)]">
            <Trash2 size={17} />
          </button>
        </li>
      {:else}
        <li class="py-8 text-center text-sm text-muted">{t('catalog.empty')}</li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .active { background: var(--accent); color: white; }
</style>
