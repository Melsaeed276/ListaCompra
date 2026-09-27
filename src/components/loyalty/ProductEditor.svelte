<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Editor de producto. Dos modos según de dónde venga:
  //
  //  - Custom (escaneado o creado con Enter, id 'custom-*'): se edita todo y se
  //    puede borrar.
  //  - Del seed: solo la imagen. Nombre, categoría y unidad los rehace
  //    refreshSeed() en cada arranque, así que editarlos aquí sería mentir: se
  //    perderían al recargar. La imagen sí persiste porque va en la capa
  //    productIcons, aparte del producto.

  import { app } from '$lib/stores/app.svelte';
  import { unitLabel } from '$lib/i18n/units';
  import { fileToStorableDataUrl } from '$lib/image';
  import { normalizeProductUrl } from '$lib/product-link';
  import type { Category, ItemPriority, Product, Unit } from '$lib/types';
  import ProductIcon from '../ui/ProductIcon.svelte';
  import PhotoCapture from '../ui/PhotoCapture.svelte';
  import ImageCrop from '../ui/ImageCrop.svelte';

  let capturing = $state(false);
  let cropping = $state(false);

  let { product, categories, storeId, storeName, itemId, onClose }: {
    product: Product;
    categories: Category[];
    storeId: string;
    storeName: string;
    itemId?: string;
    onClose: () => void;
  } = $props();

  const UNITS: Unit[] = ['unidad', 'kg', 'g', 'l', 'ml', 'paquete', 'docena', 'caja'];

  /** Los del seed se rehacen en cada arranque: de ellos solo la imagen es tuya. */
  const isCustom = $derived(product.id.startsWith('custom-'));

  let name = $state(product.name);
  let categoryId = $state(product.categoryId);
  let unit = $state<Unit>(product.defaultUnit);
  let onlyHere = $state(product.storeId === storeId);
  let emoji = $state(product.icon.kind === 'emoji' ? product.icon.value : '🏷️');
  // Imagen actual: la que haya puesto el usuario, o la que trajo Open Food Facts.
  let photo = $state(product.icon.kind === 'image' ? product.icon.value : '');
  let imgError = $state('');
  const editedItem = $derived(
    itemId ? app.state.lists[storeId]?.items.find((item) => item.id === itemId) : undefined,
  );
  const isOnlineItem = $derived(
    !!itemId && !!app.state.stores.find((candidate) => candidate.id === storeId)?.online,
  );
  let productUrl = $state(
    itemId ? app.state.lists[storeId]?.items.find((item) => item.id === itemId)?.url ?? '' : '',
  );
  let showLinkField = $state(!!productUrl);
  let linkError = $state('');
  let note = $state(editedItem?.note ?? '');
  let priority = $state<ItemPriority>(editedItem?.priority ?? 'normal');

  const inLists = $derived(app.countItemsOf(product.id));

  /** Sube una imagen y la deja como icono. Igual límite que el logo de tienda:
   *  se guarda como dataURL dentro del estado, que se sincroniza con HA. */
  async function handleImage(e: Event) {
    imgError = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';   // permite volver a elegir el mismo fichero
    if (!file) return;
    try {
      // No se comprueba el tamaño de entrada: una foto de móvil son varios MB y
      // se redimensiona igualmente por debajo del límite del estado.
      photo = await fileToStorableDataUrl(file);
    } catch {
      imgError = t('product.imgError');
    }
  }

  /** Devuelve el producto a su icono original (emoji del seed o foto de OFF). */
  function resetIcon() {
    app.setProductIcon(product.id, null);
    const orig = app.state.products.find((p) => p.id === product.id);
    photo = orig?.icon.kind === 'image' ? orig.icon.value : '';
    emoji = orig?.icon.kind === 'emoji' ? orig.icon.value : '🏷️';
  }

  function save() {
    const normalizedUrl = isOnlineItem ? normalizeProductUrl(productUrl) : '';
    if (normalizedUrl === null) {
      linkError = t('list.invalidLink');
      return;
    }

    const icon = photo
      ? ({ kind: 'image', value: photo } as const)
      : ({ kind: 'emoji', value: emoji || '🏷️' } as const);

    // updateProduct PRIMERO: reemplaza el producto conservando su icono original
    // (la foto de Open Food Facts o el emoji del seed) en state.products.
    if (isCustom) {
      const clean = name.trim();
      if (clean.length < 2) return;
      app.updateProduct({
        ...product,
        name: clean,
        categoryId,
        defaultUnit: unit,
        ...(onlyHere ? { storeId } : { storeId: undefined }),
      });
    }

    // setProductIcon AL FINAL: su refreshSeed aplica el icono elegido ENCIMA del
    // producto ya actualizado. Si fuese antes, updateProduct lo pisaría con el
    // icono original y la foto no se vería hasta el siguiente arranque. El icono
    // va SIEMPRE al override (también en los custom) para que "volver al
    // original" recupere la foto de OFF en vez de haberla machacado.
    app.setProductIcon(product.id, icon);
    if (itemId) {
      app.setItemDetails(storeId, itemId, {
        note,
        priority,
        ...(isOnlineItem ? { url: normalizedUrl || undefined } : {}),
      });
    }
    onClose();
  }

  function confirmDelete() {
    const extra = inLists > 0 ? `\n\n${t('product.inLists', { n: inLists })}` : '';
    if (!confirm(t('product.confirmDeleteFull', { name: product.name, extra }))) return;
    app.removeProduct(product.id);
    onClose();
  }
</script>

<div class="fixed inset-0 z-[60] grid place-items-center p-4"
  style="background: rgba(0,0,0,.5)" onclick={onClose} role="presentation">
  <div class="card-elev w-full max-w-md p-6 space-y-4 pop-in max-h-[90vh] overflow-y-auto [scrollbar-gutter:stable]"
    onclick={(e) => e.stopPropagation()} role="presentation">

    <header class="flex items-start justify-between">
      <h2 class="text-lg font-bold">✏️ {t('product.editTitle')}</h2>
      <button onclick={onClose} class="text-2xl leading-none text-muted hover:text-current">×</button>
    </header>

    <!-- Icono -->
    <div class="flex items-center gap-3">
      <div class="size-14 grid place-items-center rounded-xl border" style="border-color: var(--border);">
        <ProductIcon product={{ ...product, icon: photo ? { kind: 'image', value: photo } : { kind: 'emoji', value: emoji } }} px={40} />
      </div>
      <div class="flex-1 space-y-1.5">
        {#if !photo}
          <label class="block">
            <span class="text-xs text-muted">{t('product.emoji')}</span>
            <input type="text" bind:value={emoji} maxlength="4"
              class="mt-1 w-20 rounded-lg border px-2 py-1 text-center text-xl bg-transparent"
              style="border-color: var(--border);" />
          </label>
        {/if}
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <!-- Cualquier producto puede llevar imagen propia, también los del seed
               y los escaneados. Dos entradas: la cámara PROPIA (getUserMedia, no
               <input capture>, que el WebView de Android ignora) o un archivo. -->
          <button type="button" onclick={() => (capturing = true)}
            class="text-xs" style="color: var(--accent);">📷 {t('product.takePhoto')}</button>
          <label class="text-xs cursor-pointer" style="color: var(--accent);">
            🖼️ {photo ? t('product.changeImage') : t('product.useImage')}
            <input type="file" accept="image/*" class="hidden" onchange={handleImage} />
          </label>
          {#if photo}
            <!-- Recorte a demanda: la cámara pilla el entorno alrededor. -->
            <button type="button" onclick={() => (cropping = true)}
              class="text-xs" style="color: var(--accent);">✂️ {t('crop.action')}</button>
            <button type="button" onclick={() => (photo = '')}
              class="text-xs text-muted hover:underline">{t('product.removePhoto')}</button>
          {/if}
          {#if app.hasCustomIcon(product.id)}
            <button type="button" onclick={resetIcon}
              class="text-xs text-muted hover:underline">{t('product.resetIcon')}</button>
          {/if}
        </div>
        {#if imgError}<p class="text-xs text-red-500">{imgError}</p>{/if}
      </div>
    </div>

    {#if isCustom}
      <label class="block">
        <span class="text-sm font-medium">{t('product.name')}</span>
        <input type="text" bind:value={name}
          class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);" />
      </label>

      <label class="block">
        <span class="text-sm font-medium">{t('product.section')}</span>
        <select bind:value={categoryId}
          class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);">
          {#each categories as c (c.id)}
            <option value={c.id}>{c.icon.kind === 'emoji' ? c.icon.value : '📁'} {c.name}</option>
          {/each}
        </select>
      </label>

      <label class="block">
        <span class="text-sm font-medium">{t('product.defaultUnit')}</span>
        <select bind:value={unit}
          class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);">
          {#each UNITS as u}<option value={u}>{unitLabel(u, app.state.locale)}</option>{/each}
        </select>
      </label>

      <label class="flex items-start gap-2 rounded-xl border p-3 cursor-pointer"
        style="border-color: var(--border);">
        <input type="checkbox" bind:checked={onlyHere} class="mt-0.5" />
        <span class="text-xs">
          <strong>{t('product.onlyIn', { store: storeName })}</strong>
          <span class="block text-muted">{t('product.onlyHereNote')}</span>
        </span>
      </label>
    {:else}
      <!-- Del seed: solo la imagen es editable. Se dice, en vez de enseñar
           campos que al recargar volverían a su valor original. -->
      <p class="text-xs text-muted rounded-xl bg-[var(--bg)] p-3"
        style="border: 1px solid var(--border);">
        {t('product.seedNote', { name: product.name })}
      </p>
    {/if}

    {#if itemId}
      <label class="block">
        <span class="text-sm font-medium">{t('list.productNote')}</span>
        <textarea bind:value={note} rows="2" maxlength="240"
          placeholder={t('list.productNotePlaceholder')}
          class="mt-1 w-full resize-none rounded-xl border px-4 py-2 bg-transparent"
          style="border-color: var(--border);"></textarea>
      </label>

      <fieldset>
        <legend class="mb-1 text-sm font-medium">{t('list.priority')}</legend>
        <div class="grid grid-cols-3 overflow-hidden rounded-xl border"
          style="border-color: var(--border);">
          {#each ['low', 'normal', 'high'] as value (value)}
            <button type="button" onclick={() => (priority = value as ItemPriority)}
              class="px-2 py-2 text-sm font-medium transition"
              class:text-white={priority === value}
              style={priority === value ? 'background: var(--accent);' : ''}>
              {t(`list.priority.${value}`)}
            </button>
          {/each}
        </div>
      </fieldset>
    {/if}

    {#if isOnlineItem}
      {#if showLinkField}
        <label class="block">
          <span class="text-sm font-medium">{t('list.productLink')}</span>
          <input type="text" inputmode="url" bind:value={productUrl}
            placeholder={t('list.productLinkPlaceholder')}
            class="mt-1 w-full rounded-xl border px-4 py-2 bg-transparent"
            style="border-color: var(--border);" />
          {#if linkError}<span class="mt-1 block text-xs text-red-600">{linkError}</span>{/if}
        </label>
      {:else}
        <button type="button" onclick={() => (showLinkField = true)}
          class="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium"
          style="border-color: var(--border); color: var(--accent);">
          <span aria-hidden="true">🔗</span>
          {t('list.addProductLink')}
        </button>
      {/if}
    {/if}

    {#if product.barcode}
      <p class="text-[11px] text-muted">
        {t('product.barcodeLabel')} <span class="font-mono">{product.barcode}</span>
        — {t('product.barcodeNote')}
      </p>
    {/if}

    {#if inLists > 0}
      <p class="text-[11px] text-muted">{t('product.inListsNow', { n: inLists })}</p>
    {/if}

    <div class="flex gap-2 pt-1">
      <!-- Borrar solo los custom: uno del seed reaparecería en el siguiente
           arranque, así que el botón prometería algo que no ocurre. -->
      {#if isCustom}
        <button onclick={confirmDelete}
          class="rounded-xl border px-4 py-2.5 text-sm font-medium"
          style="border-color: #dc2626; color: #dc2626;">🗑️ {t('product.delete')}</button>
      {/if}
      <button onclick={save} disabled={isCustom && name.trim().length < 2}
        class="flex-1 rounded-xl py-2.5 font-semibold text-white disabled:opacity-50"
        style="background: var(--accent);">{t('product.save')}</button>
    </div>
  </div>
</div>

{#if capturing}
  <PhotoCapture
    onCapture={(url) => { photo = url; imgError = ''; }}
    onClose={() => (capturing = false)} />
{/if}

{#if cropping && photo}
  <ImageCrop src={photo}
    onDone={(url) => { photo = url; cropping = false; }}
    onClose={() => (cropping = false)} />
{/if}
