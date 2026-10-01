<script lang="ts">
  import { base } from '$lib/base';
  import type { IconRef } from '$lib/types';

  let { icon, fallback = '🏢', px = 20 }:
    { icon?: IconRef | string; fallback?: string; px?: number } = $props();

  const normalized = $derived(
    typeof icon === 'string' ? { kind: 'emoji' as const, value: icon } : icon,
  );
  const src = $derived(
    normalized?.kind === 'image'
      ? normalized.value.startsWith('data:') ? normalized.value : base(normalized.value)
      : '',
  );
</script>

{#if normalized?.kind === 'image' && src}
  <img {src} alt="" loading="lazy" class="object-contain shrink-0" style="width:{px}px;height:{px}px;" />
{:else}
  <span aria-hidden="true">{normalized?.kind === 'emoji' ? normalized.value : fallback}</span>
{/if}
