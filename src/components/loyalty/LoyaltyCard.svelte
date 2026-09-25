<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Muestra la tarjeta de fidelización a pantalla completa para pasarla por el
  // lector de la caja: fondo blanco, código grande y recordatorio de subir el
  // brillo (los lectores necesitan contraste).

  import type { Store } from '$lib/types';
  import LoyaltyCode from './LoyaltyCode.svelte';

  let { store, onClose }: { store: Store; onClose: () => void } = $props();
</script>

{#if store.loyalty}
  <div class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 p-6"
    style="background: #FFFFFF;" onclick={onClose} role="presentation">

    <button onclick={onClose}
      class="absolute top-4 end-4 text-3xl leading-none"
      style="color:#666;" aria-label={t('common.close')}>×</button>

    <p class="text-sm font-semibold" style="color:#111;">{store.name}</p>

    <div class="w-full max-w-sm flex justify-center" onclick={(e) => e.stopPropagation()} role="presentation">
      <LoyaltyCode card={store.loyalty} big />
    </div>

    <p class="text-xs text-center max-w-xs" style="color:#666;">
      {t('loyalty.brightness')}<br />
      {t('loyalty.tapOutside')}
    </p>
  </div>
{/if}
