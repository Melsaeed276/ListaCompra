<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Modal de creación/edición de tienda. En modo creación genera un id
  // basado en slug del nombre.

  import { app } from '$lib/stores/app.svelte';
  import { fileToStorableDataUrl } from '$lib/image';
  import type { Store, IconRef, LoyaltyFormat } from '$lib/types';
  import BarcodeScanner from '../loyalty/BarcodeScanner.svelte';
  import LoyaltyCode from '../loyalty/LoyaltyCode.svelte';
  import PhotoCapture from '../ui/PhotoCapture.svelte';
  import ImageCrop from '../ui/ImageCrop.svelte';

  let { store, onClose }: { store?: Store; onClose: () => void } = $props();

  const isEdit = $derived(!!store);

  // Tarjeta de fidelización (se guarda en la tienda → se sincroniza con la lista).
  let loyaltyCode = $state(store?.loyalty?.code ?? '');
  let showScanner = $state(false);
  let showFormatPicker = $state(false);
  let detectedByCamera = $state(false);
  // null ⇒ deducir el formato solo. Al editar respetamos el guardado.
  let manualFormat = $state<LoyaltyFormat | null>(store?.loyalty?.format ?? null);

  const FORMATS: { id: LoyaltyFormat; label: string }[] = [
    { id: 'qr', label: 'QR' },
    { id: 'ean13', label: 'EAN-13' },
    { id: 'ean8', label: 'EAN-8' },
    { id: 'code128', label: 'Code 128' },
    { id: 'code39', label: 'Code 39' },
    { id: 'upca', label: 'UPC-A' },
  ];

  /** Deduce el formato por la forma del código, para que el usuario no tenga
   *  que saber qué es un EAN-13. La cámara lo dice exacto; escribiendo a mano
   *  esto acierta en los casos habituales. */
  function guessFormat(code: string): LoyaltyFormat {
    const c = code.trim();
    if (!c) return 'qr';
    if (/^\d{13}$/.test(c)) return 'ean13';
    if (/^\d{12}$/.test(c)) return 'upca';
    if (/^\d{8}$/.test(c)) return 'ean8';
    if (/^https?:\/\//i.test(c) || c.length > 20) return 'qr';
    return 'code128';
  }

  const loyaltyFormat = $derived(manualFormat ?? guessFormat(loyaltyCode));
  const formatLabel = $derived(
    FORMATS.find((f) => f.id === loyaltyFormat)?.label ?? loyaltyFormat,
  );

  function onScanned(code: string, format: LoyaltyFormat) {
    loyaltyCode = code;
    manualFormat = format;      // la cámara sabe el formato exacto
    detectedByCamera = true;
    showScanner = false;
  }

  function onCodeInput() {
    // Si el usuario reescribe a mano, volvemos a deducir salvo que lo haya
    // elegido él explícitamente en el selector.
    if (detectedByCamera) {
      detectedByCamera = false;
      manualFormat = null;
    }
  }

  let name = $state(store?.name ?? '');
  let typeId = $state(store?.typeId ?? 'supermercado');
  let iconKind = $state<IconRef['kind']>(store?.icon.kind ?? 'emoji');
  let iconEmoji = $state(store?.icon.kind === 'emoji' ? store.icon.value : '🛒');
  let iconImage = $state(store?.icon.kind === 'image' ? store.icon.value : '');
  let bg = $state(store?.brand?.bg ?? '#2aa063');
  let fg = $state(store?.brand?.fg ?? '#FFFFFF');
  let initials = $state(store?.brand?.initials ?? '');
  let online = $state(store?.online ?? false);
  let error = $state('');
  let capturing = $state(false);
  let cropping = $state(false);

  function slug(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tienda';
  }

  async function handleImage(e: Event) {
    error = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      // Se redimensiona por debajo del límite del estado: una foto de móvil son
      // varios MB y con la comprobación de tamaño anterior se rechazaba siempre.
      iconImage = await fileToStorableDataUrl(file);
      iconKind = 'image';
    } catch {
      error = t('product.imgError');
    }
  }

  function buildIcon(): IconRef {
    if (iconKind === 'image' && iconImage) return { kind: 'image', value: iconImage };
    return { kind: 'emoji', value: iconEmoji || '🛒' };
  }

  function save() {
    error = '';
    const cleanName = name.trim();
    if (cleanName.length < 2) { error = t('store.errNameShort'); return; }

    const finalStore: Store = {
      id: store?.id ?? `${slug(cleanName)}-${Date.now().toString(36)}`,
      name: cleanName,
      typeId,
      icon: buildIcon(),
      brand: { bg, fg, initials: initials.trim() || undefined },
      order: store?.order ?? app.state.stores.length,
      enabled: true,
      edited: true,    // marca para que refreshSeed no la sobreescriba
      online,
      loyalty: loyaltyCode.trim()
        ? { code: loyaltyCode.trim(), format: loyaltyFormat }
        : undefined,
    };
    app.upsertStore(finalStore);
    onClose();
  }

  function confirmDelete() {
    if (!store) return;
    if (!confirm(t('store.confirmDelete', { name: store.name }))) return;
    app.removeStore(store.id);
    onClose();
  }
</script>

<div class="fixed inset-0 z-50 grid place-items-center p-4"
  style="background: rgba(0,0,0,.5)" onclick={onClose} role="presentation">
  <div class="card-elev w-full max-w-md p-6 space-y-4 pop-in max-h-[90vh] overflow-y-auto [scrollbar-gutter:stable]"
    onclick={(e) => e.stopPropagation()} role="presentation">

    <header class="flex items-start justify-between">
        <h2 class="text-lg font-bold">{isEdit ? `✏️ ${t('stores.editStore')}` : `➕ ${t('stores.new')}`}</h2>
        <button onclick={onClose} class="text-2xl leading-none text-muted hover:text-current">×</button>
      </header>

      <!-- Preview -->
      <div class="flex items-center gap-3">
        <div class="size-16 rounded-2xl grid place-items-center font-extrabold shadow-sm overflow-hidden"
          style="background:{bg};color:{fg};">
          {#if iconKind === 'image' && iconImage}
            <img src={iconImage} alt="" class="h-12 w-14 object-contain" />
          {:else if initials}
            <span class="text-xl">{initials}</span>
          {:else}
            <span class="text-3xl">{iconEmoji}</span>
          {/if}
        </div>
        <div class="text-sm">
          <div class="font-semibold">{name || t('store.noName')}</div>
          <div class="text-xs text-muted">{t('store.preview')}</div>
        </div>
      </div>

      <label class="block">
        <span class="text-sm font-medium">{t('store.name')}</span>
        <input type="text" bind:value={name} placeholder={t('store.namePlaceholder')}
          class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);" />
      </label>

      <label class="block">
        <span class="text-sm font-medium">{t('store.type')}</span>
        <select bind:value={typeId}
          class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);">
          {#each app.state.storeTypes as t}
            <option value={t.id}>
              {t.icon.kind === 'emoji' ? t.icon.value : ''} {t.name}
            </option>
          {/each}
        </select>
      </label>

      <label class="flex items-start gap-3 rounded-xl border p-3 cursor-pointer"
        style="border-color: var(--border);">
        <input type="checkbox" bind:checked={online} class="mt-0.5" />
        <span class="text-sm">
          <strong>{t('store.online')}</strong>
          <span class="block text-xs text-muted">{t('store.onlineNote')}</span>
        </span>
      </label>

      <fieldset class="rounded-xl border p-3 space-y-2" style="border-color: var(--border);">
        <legend class="text-sm font-medium px-2">{t('store.logo')}</legend>
        <div class="flex gap-2 text-xs">
          <button type="button" onclick={() => (iconKind = 'emoji')}
            class="flex-1 rounded-lg border py-1.5"
            style={iconKind === 'emoji'
              ? 'background: var(--accent); color: white; border-color: var(--accent);'
              : 'border-color: var(--border);'}>{t('store.logoEmoji')}</button>
          <button type="button" onclick={() => (iconKind = 'image')}
            class="flex-1 rounded-lg border py-1.5"
            style={iconKind === 'image'
              ? 'background: var(--accent); color: white; border-color: var(--accent);'
              : 'border-color: var(--border);'}>{t('store.logoImage')}</button>
        </div>

        {#if iconKind === 'emoji'}
          <input type="text" bind:value={iconEmoji} maxlength="4"
            class="w-full rounded-lg border px-3 py-2 text-center text-2xl bg-transparent"
            style="border-color: var(--border);" />
        {:else}
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <button type="button" onclick={() => (capturing = true)}
              class="text-xs" style="color: var(--accent);">📷 {t('product.takePhoto')}</button>
            <label class="text-xs cursor-pointer" style="color: var(--accent);">
              🖼️ {t('product.useImage')}
              <input type="file" accept="image/*" class="hidden" onchange={handleImage} />
            </label>
            {#if iconKind === 'image' && iconImage}
              <button type="button" onclick={() => (cropping = true)}
                class="text-xs" style="color: var(--accent);">✂️ {t('crop.action')}</button>
            {/if}
          </div>
          {#if iconImage}
            <p class="text-[10px] text-muted">{t('store.logoLoaded', { kb: Math.round(iconImage.length / 1024) })}</p>
          {/if}
        {/if}
      </fieldset>

      <fieldset class="rounded-xl border p-3 space-y-2" style="border-color: var(--border);">
        <legend class="text-sm font-medium px-2">{t('store.brandColors')}</legend>
        <div class="grid grid-cols-3 gap-2 items-center text-xs">
          <label class="flex items-center gap-1">
            <input type="color" bind:value={bg} class="size-8 rounded cursor-pointer" />
            {t('store.colorBg')}
          </label>
          <label class="flex items-center gap-1">
            <input type="color" bind:value={fg} class="size-8 rounded cursor-pointer" />
            {t('store.colorText')}
          </label>
          <input type="text" bind:value={initials} maxlength="3" placeholder={t('store.initials')}
            class="rounded-lg border px-2 py-1 text-center bg-transparent"
            style="border-color: var(--border);" />
        </div>
      </fieldset>

      <fieldset class="rounded-xl border p-3 space-y-2" style="border-color: var(--border);">
        <legend class="text-sm font-medium px-2">🎟️ {t('store.loyalty')}</legend>

        <!-- Escanear es la vía recomendada: la cámara detecta el formato sola. -->
        <button type="button" onclick={() => (showScanner = true)}
          class="w-full rounded-xl py-2.5 font-semibold text-white transition"
          style="background: var(--accent);">📷 {t('store.loyaltyScan')}</button>

        <p class="text-[11px] text-muted text-center">{t('store.loyaltyManual')}</p>

        <input type="text" bind:value={loyaltyCode} oninput={onCodeInput}
          placeholder={t('store.loyaltyPlaceholder')}
          class="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
          style="border-color: var(--border);" />

        {#if loyaltyCode.trim()}
          <div class="flex items-center justify-between gap-2 text-[11px]">
            <span class="text-muted">
              {#if detectedByCamera}
                {t('store.formatDetected')} <strong>{formatLabel}</strong>
              {:else}
                {t('store.format')} <strong>{formatLabel}</strong> {t('store.formatAuto')}
              {/if}
            </span>
            <div class="flex gap-2 shrink-0">
              <button type="button" onclick={() => (showFormatPicker = !showFormatPicker)}
                class="text-muted hover:underline">{t('store.change')}</button>
              <button type="button" onclick={() => { loyaltyCode = ''; manualFormat = null; detectedByCamera = false; }}
                class="text-muted hover:underline">{t('store.removeLower')}</button>
            </div>
          </div>

          {#if showFormatPicker}
            <select value={loyaltyFormat}
              onchange={(e) => { manualFormat = e.currentTarget.value as LoyaltyFormat; detectedByCamera = false; }}
              class="w-full rounded-lg border px-2 py-1.5 text-xs bg-transparent"
              style="border-color: var(--border);">
              {#each FORMATS as f}<option value={f.id}>{f.label}</option>{/each}
            </select>
          {/if}

          <div class="flex justify-center pt-1">
            <LoyaltyCode card={{ code: loyaltyCode.trim(), format: loyaltyFormat }} />
          </div>
        {/if}

        <p class="text-[10px] text-muted">
          {t('store.loyaltyNote')}
        </p>
      </fieldset>

      {#if error}<p class="text-sm text-red-500">{error}</p>{/if}

      <div class="flex gap-2 pt-2">
        {#if isEdit}
          <button onclick={confirmDelete}
            class="rounded-xl border px-4 py-2.5 text-sm font-medium"
            style="border-color: #dc2626; color: #dc2626;">🗑️ {t('store.delete')}</button>
        {/if}
        <button onclick={save}
          class="flex-1 rounded-xl py-2.5 font-semibold text-white"
          style="background: var(--accent);">
          {isEdit ? t('store.save') : t('store.create')}
        </button>
      </div>
  </div>
</div>

{#if showScanner}
  <BarcodeScanner onDetected={onScanned} onClose={() => (showScanner = false)} />
{/if}

{#if capturing}
  <PhotoCapture
    onCapture={(url) => { iconImage = url; iconKind = 'image'; error = ''; }}
    onClose={() => (capturing = false)} />
{/if}

{#if cropping && iconImage}
  <ImageCrop src={iconImage}
    onDone={(url) => { iconImage = url; iconKind = 'image'; cropping = false; }}
    onClose={() => (cropping = false)} />
{/if}
