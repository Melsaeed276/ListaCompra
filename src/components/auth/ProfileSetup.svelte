<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  import { APP_NAMES, DEFAULT_LOCALE } from '$lib/i18n/locale';
  // Setup inicial: sólo nombre de usuario y tema. La sincronización entre
  // dispositivos la aporta Home Assistant (usuario logueado en HA).

  import { app } from '$lib/stores/app.svelte';

  let username = $state('');
  let theme = $state<'light' | 'dark' | 'system'>('system');
  let error = $state('');

  const usernameClean = $derived(username.trim());
  const isCompanion = $derived(/@MOVIL$/i.test(usernameClean));
  const valid = $derived(usernameClean.length >= 2);

  function submit() {
    error = '';
    if (!valid) {
      error = t('setup.errName');
      return;
    }
    app.setProfile({
      username: usernameClean,
      companion: isCompanion,
      theme,
      createdAt: Date.now(),
    });
  }
</script>

<div class="mx-auto w-full max-w-md p-6 pop-in">
  <div class="card-elev p-8 space-y-6">
    <header class="text-center space-y-1">
      <div class="text-5xl">🛒</div>
      <h1 class="text-2xl font-bold">{APP_NAMES[app.state.locale ?? DEFAULT_LOCALE]}</h1>
      <p class="text-sm text-muted">{t('setup.title')}</p>
    </header>

    <label class="block">
      <span class="text-sm font-medium">{t('setup.nameLabel')}</span>
      <input type="text" bind:value={username} placeholder={t('setup.namePlaceholder')}
        onkeydown={(e) => e.key === 'Enter' && submit()}
        class="mt-1 w-full rounded-xl border px-4 py-2.5 bg-transparent"
        style="border-color: var(--border);" autocomplete="username" autofocus />
      {#if isCompanion}
        <span class="text-xs text-muted mt-1 block">{t('setup.companion')}</span>
      {/if}
    </label>

    <label class="block">
      <span class="text-sm font-medium">{t('setup.theme')}</span>
      <select bind:value={theme}
        class="mt-1 w-full rounded-xl border px-4 py-2.5 bg-transparent"
        style="border-color: var(--border);">
        <option value="system">{t('setup.themeSystem')}</option>
        <option value="light">{t('setup.themeLight')}</option>
        <option value="dark">{t('setup.themeDark')}</option>
      </select>
    </label>

    {#if error}<p class="text-sm text-red-500">{error}</p>{/if}

    <button type="button" onclick={submit} disabled={!valid}
      class="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50 transition"
      style="background: var(--accent);">
      {t('setup.start')}
    </button>

    <p class="text-xs text-muted text-center">{t('setup.haNote')}</p>
  </div>
</div>
