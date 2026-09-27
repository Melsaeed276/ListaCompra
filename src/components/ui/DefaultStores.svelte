<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Ajuste: tienda por defecto de cada tipo (para el enrutado por voz).
  // Cuando entra un producto por voz (Assist → add_item), su categoría implica
  // un TipoTienda; si hay varias tiendas de ese tipo, aquí se decide a cuál va.
  // Solo lo edita un administrador de HA (fuera de HA, el usuario local manda).

  import { app } from '$lib/stores/app.svelte';
  import { syncStatus } from '$lib/sync.svelte';
  import { localeLanguageTag } from '$lib/i18n/locale';

  let { onClose }: { onClose: () => void } = $props();

  const canEdit = $derived(!syncStatus.inHA || syncStatus.isAdmin);

  // Tipos que tienen ≥2 tiendas activas → son los que necesitan elección.
  const typesWithChoice = $derived.by(() => {
    const enabled = app.state.stores.filter((s) => s.enabled !== false);
    return app.state.storeTypes
      .map((t) => ({
        type: t,
        stores: enabled
          .filter((s) => s.typeId === t.id)
          .slice()
          .sort((a, b) => a.name.localeCompare(
            b.name, localeLanguageTag(app.state.locale), { sensitivity: 'base' },
          )),
      }))
      .filter((x) => x.stores.length >= 2);
  });

  function current(typeId: string): string {
    // Solo el valor explícito; el default implícito (una sola tienda) no aplica
    // aquí porque estos tipos tienen varias.
    return app.state.defaultStores?.[typeId] ?? '';
  }

  function choose(typeId: string, storeId: string) {
    app.setDefaultStore(typeId, storeId || null);
  }
</script>

<div class="fixed inset-0 z-50 grid place-items-center p-4"
  style="background: rgba(0,0,0,.5)" onclick={onClose} role="presentation">
  <div class="card-elev w-full max-w-md p-6 space-y-4 pop-in max-h-[90vh] overflow-y-auto [scrollbar-gutter:stable]"
    onclick={(e) => e.stopPropagation()} role="presentation">

    <header class="flex items-start justify-between">
      <h2 class="text-lg font-bold">🎯 {t('defaults.title')}</h2>
      <button onclick={onClose} class="text-2xl leading-none text-muted hover:text-current">×</button>
    </header>

    <p class="text-xs text-muted">
      {t('defaults.intro')}
    </p>

    {#if !canEdit}
      <div class="rounded-xl bg-[var(--bg)] p-3 text-sm" style="border: 1px solid var(--border);">
        {t('defaults.adminOnly')}
      </div>
    {/if}

    {#if typesWithChoice.length === 0}
      <p class="text-sm text-muted">
        {t('defaults.notNeeded')}
      </p>
    {:else}
      <ul class="space-y-3">
        {#each typesWithChoice as { type, stores } (type.id)}
          <li class="flex items-center gap-3">
            <span class="text-2xl shrink-0">
              {type.icon.kind === 'emoji' ? type.icon.value : '🏪'}
            </span>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm">{type.name}</div>
              <select
                value={current(type.id)}
                disabled={!canEdit}
                onchange={(e) => choose(type.id, e.currentTarget.value)}
                class="mt-1 w-full rounded-lg border px-2 py-1.5 text-sm bg-transparent disabled:opacity-60"
                style="border-color: var(--border);">
                <option value="">{t('defaults.noneAsk')}</option>
                {#each stores as s (s.id)}
                  <option value={s.id}>{s.name}</option>
                {/each}
              </select>
            </div>
          </li>
        {/each}
      </ul>
      <p class="text-xs text-muted">
        {t('defaults.noneNote')}
      </p>
    {/if}
  </div>
</div>
