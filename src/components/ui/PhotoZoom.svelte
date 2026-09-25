<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Amplía la foto de un producto. El icono en la lista es pequeño a propósito
  // (caben más productos), así que al tocarlo se ve en grande para identificar
  // el envase de un vistazo en el súper.
  import type { Product } from '$lib/types';
  import { base } from '$lib/base';

  let { product, onClose }: { product: Product; onClose: () => void } = $props();

  const src = $derived(
    product.icon.value.startsWith('data:') ? product.icon.value : base(product.icon.value),
  );
</script>

<div class="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 p-6"
  style="background: rgba(0,0,0,.9)" onclick={onClose} role="presentation">

  <button onclick={onClose} class="absolute top-4 end-4 text-3xl leading-none"
    style="color: #ddd;" aria-label={t('photo.close')}>×</button>

  <img {src} alt={product.name}
    class="max-w-full max-h-[70vh] object-contain rounded-xl bg-white p-2" />

  <p class="text-sm font-medium text-center" style="color: #fff;">{product.name}</p>
  <p class="text-xs" style="color: #999;">{t('photo.tapClose')}</p>
</div>
