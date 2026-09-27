<script lang="ts">
  // Bandera dibujada en SVG (no emoji): se ve igual en todos los sistemas,
  // incluido Windows, que NO renderiza los emojis de bandera.
  import { DEFAULT_LOCALE, type Locale } from '$lib/i18n/locale';
  let { locale = DEFAULT_LOCALE }: { locale?: Locale } = $props();
</script>

<svg viewBox="0 0 60 42" width="26" height="18" role="img" aria-label={locale}
  class="shadow-sm" style="border-radius: 4px; display: block;">
  <defs><clipPath id="flag-clip"><rect width="60" height="42" rx="5" /></clipPath></defs>
  <g clip-path="url(#flag-clip)">
    {#if locale === 'es'}
      <rect width="60" height="42" fill="#AA151B" />
      <rect y="10.5" width="60" height="21" fill="#F1BF00" />
    {:else if locale === 'fr'}
      <rect width="60" height="42" fill="#FFFFFF" />
      <rect width="20" height="42" fill="#0055A4" />
      <rect x="40" width="20" height="42" fill="#EF4135" />
    {:else if locale === 'de'}
      <rect width="60" height="14" fill="#000000" />
      <rect y="14" width="60" height="14" fill="#DD0000" />
      <rect y="28" width="60" height="14" fill="#FFCE00" />
    {:else if locale === 'en'}
      <rect width="60" height="42" fill="#012169" />
      <path d="M0,0 L60,42 M60,0 L0,42" stroke="#FFFFFF" stroke-width="8" />
      <path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" stroke-width="4" />
      <rect x="25" width="10" height="42" fill="#FFFFFF" />
      <rect y="16" width="60" height="10" fill="#FFFFFF" />
      <rect x="27" width="6" height="42" fill="#C8102E" />
      <rect y="18" width="60" height="6" fill="#C8102E" />
    {:else if locale === 'us'}
      {#each Array.from({ length: 13 }) as _, i}
        <rect y={(i * 42) / 13} width="60" height={42 / 13} fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />
      {/each}
      <rect width="27" height="22.6" fill="#3C3B6E" />
      {#each [4, 10, 16, 22] as cx}
        {#each [4, 10, 16] as cy}
          <circle {cx} {cy} r="1.1" fill="#FFFFFF" />
        {/each}
      {/each}
    {:else if locale === 'br'}
      <rect width="60" height="42" fill="#009C3B" />
      <polygon points="30,4 55,21 30,38 5,21" fill="#FFDF00" />
      <circle cx="30" cy="21" r="8.5" fill="#002776" />
    {:else if locale === 'tr' || locale === 'ar'}
      <rect width="60" height="42" fill="#E30A17" />
      <circle cx="25" cy="21" r="10.5" fill="#FFFFFF" />
      <circle cx="28" cy="21" r="8.5" fill="#E30A17" />
      <polygon points="38,15.5 39.8,19 43.7,19.5 40.9,22.2 41.6,26 38,24.2 34.4,26 35.1,22.2 32.3,19.5 36.2,19" fill="#FFFFFF" />
    {/if}
  </g>
</svg>
