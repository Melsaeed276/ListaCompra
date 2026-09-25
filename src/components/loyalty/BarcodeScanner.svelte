<script lang="ts">
  import { t } from '$lib/i18n/ui.svelte';
  // Escáner de códigos con la cámara. Dos motores:
  //  - Chrome/Edge: BarcodeDetector nativo (rápido, ~30 ms por lectura).
  //  - Safari/iOS y Firefox: no existe esa API → zxing-wasm DIRECTAMENTE.
  //
  // Antes usábamos el polyfill 'barcode-detector', pero envuelve los fallos en
  // un "Barcode detection service unavailable" que oculta la causa real. Al
  // llamar a zxing sin intermediarios podemos instanciar el módulo a propósito
  // (getZXingModule) y enseñar el error de verdad si algo va mal.
  //
  // El .wasm se empaqueta con el panel y lo sirve tu HA: sin peticiones a
  // terceros y funciona sin conexión.

  import { onDestroy, untrack } from 'svelte';
  import type { LoyaltyFormat } from '$lib/types';

  let { onDetected, onClose, continuous = false, feedback = '' }: {
    onDetected: (code: string, format: LoyaltyFormat) => void;
    onClose: () => void;
    continuous?: boolean;
    feedback?: string;
  } = $props();

  type Hit = { value: string; format: LoyaltyFormat };

  const hasNative = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  // Nombres de formato de cada motor → los nuestros.
  const NATIVE_FMT: Record<string, LoyaltyFormat> = {
    qr_code: 'qr', ean_13: 'ean13', ean_8: 'ean8',
    code_128: 'code128', code_39: 'code39', upc_a: 'upca',
  };
  const ZXING_FMT: Record<string, LoyaltyFormat> = {
    QRCode: 'qr', 'EAN-13': 'ean13', 'EAN-8': 'ean8',
    Code128: 'code128', Code39: 'code39', 'UPC-A': 'upca',
  };
  const NATIVE_LIST = Object.keys(NATIVE_FMT);
  const ZXING_LIST = Object.keys(ZXING_FMT);

  let videoEl: HTMLVideoElement | null = $state(null);
  let error = $state('');
  let torchOn = $state(false);
  let torchAvailable = $state(false);

  // Diagnóstico
  let engine = $state('');
  let videoRes = $state('');
  let facing = $state('');
  let capsList = $state('');
  let wasmInfo = $state('');
  let detectError = $state('');
  let decodeMs = $state(0);
  let ticks = $state(0);

  // Selección de cámara: muchos móviles exponen varias traseras (principal,
  // gran angular, macro). La principal a menudo NO enfoca de cerca, que es justo
  // lo que hace falta para un código de barras. Adivinar cuál sirve no es
  // fiable (las etiquetas varían por fabricante), así que se elige a mano.
  let devices = $state<MediaDeviceInfo[]>([]);
  let deviceId = $state('');
  const DEVICE_KEY = 'tucompra:scanCamera';
  // Se guarda también la etiqueta: Android rota los deviceId entre sesiones, y
  // cuando el ID guardado ya no existe la restricción {exact} falla, cae al
  // facingMode y vuelve a la principal sin decir nada. Con la etiqueta se
  // recupera la cámara elegida aunque le hayan cambiado el ID.
  const LABEL_KEY = 'tucompra:scanCameraLabel';
  let savedLabel = '';

  let stream: MediaStream | null = null;
  let track: MediaStreamTrack | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let readFrame: (() => Promise<Hit[]>) | null = null;

  // Anti-falsos positivos y anti-repetición.
  let lastSeen = '';
  let lastAccepted = '';
  let lastAcceptedAt = 0;
  const COOLDOWN_MS = 2500;

  let canvasEl: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;

  /** Abre la cámara: la elegida a mano si la hay, si no la trasera. Con `ideal`
   *  el navegador puede dar la frontal, así que primero se exige. */
  async function openCamera(): Promise<MediaStream> {
    const hi = { width: { ideal: 1920 }, height: { ideal: 1080 } };
    const attempts: MediaStreamConstraints[] = [];
    if (deviceId) attempts.push({ video: { deviceId: { exact: deviceId }, ...hi } });
    attempts.push(
      { video: { facingMode: { exact: 'environment' }, ...hi } },
      { video: { facingMode: { ideal: 'environment' }, ...hi } },
      { video: hi },
      { video: true },
    );
    let last: unknown;
    for (const c of attempts) {
      try { return await navigator.mediaDevices.getUserMedia(c); } catch (e) { last = e; }
    }
    throw last ?? new Error('sin cámara');
  }

  /** Lista las cámaras. Las etiquetas solo llegan con permiso concedido, por eso
   *  se hace DESPUÉS de abrir el stream. */
  async function listCameras() {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      devices = all.filter((d) => d.kind === 'videoinput');
      const actual = String((track?.getSettings?.() as any)?.deviceId ?? '');

      // ¿El ID guardado sigue existiendo? Si no (Android los rota), buscamos la
      // cámara por su etiqueta y cambiamos a ella.
      const idVive = !!deviceId && devices.some((d) => d.deviceId === deviceId);
      if (!idVive && savedLabel) {
        const porEtiqueta = devices.find((d) => d.label === savedLabel);
        if (porEtiqueta && porEtiqueta.deviceId !== actual) {
          await switchCamera(porEtiqueta.deviceId);
          return;
        }
      }
      // Sin elección guardada (o irrecuperable): reflejamos la que se abrió, para
      // que el desplegable muestre la real.
      if (!idVive) deviceId = actual;
    } catch {}
  }

  async function switchCamera(id: string) {
    deviceId = id;
    savedLabel = devices.find((d) => d.deviceId === id)?.label ?? '';
    try {
      localStorage.setItem(DEVICE_KEY, id);
      if (savedLabel) localStorage.setItem(LABEL_KEY, savedLabel);
    } catch {}
    stop();
    stopped = false;
    ticks = 0;
    detectError = '';
    await start();
  }

  /** Prepara el motor de lectura y devuelve la función que analiza un fotograma. */
  async function setupEngine(): Promise<() => Promise<Hit[]>> {
    if (hasNative) {
      engine = 'nativo';
      // @ts-expect-error — BarcodeDetector no está en los tipos del DOM.
      const det = new window.BarcodeDetector({ formats: NATIVE_LIST });
      return async () => {
        const codes = await det.detect(videoEl!);
        return codes
          .filter((c: any) => c?.rawValue)
          .map((c: any) => ({ value: String(c.rawValue), format: NATIVE_FMT[c.format] ?? 'code128' }));
      };
    }

    engine = 'WASM';
    const [zx, wasm] = await Promise.all([
      import('zxing-wasm/reader'),
      // Subpath EXPORTADO del paquete (no la ruta interna dist/…).
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ]);
    const wasmUrl = (wasm as { default: string }).default;

    try {
      const r = await fetch(wasmUrl, { method: 'HEAD' });
      wasmInfo = `${r.status} ${r.headers.get('content-type') ?? '(sin tipo)'}`;
    } catch (e) {
      wasmInfo = `no accesible: ${String((e as Error)?.message ?? e).slice(0, 60)}`;
    }

    zx.setZXingModuleOverrides({
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasmUrl : prefix + path,
    });
    // Instanciamos a propósito: así, si el WASM no arranca, vemos el motivo real
    // en vez de un error genérico en cada fotograma.
    await zx.getZXingModule();

    return async () => {
      if (!videoEl?.videoWidth) return [];
      if (!canvasEl) {
        canvasEl = document.createElement('canvas');
        ctx = canvasEl.getContext('2d', { willReadFrequently: true });
      }
      if (!ctx) return [];
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const img = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      const res = await zx.readBarcodesFromImageData(img, {
        tryHarder: true,
        formats: ZXING_LIST as any,
      });
      return res
        .filter((r: any) => r?.text)
        .map((r: any) => ({ value: String(r.text), format: ZXING_FMT[r.format] ?? 'code128' }));
    };
  }

  async function start() {
    if (!videoEl) return;
    try {
      stream = await openCamera();
      videoEl.srcObject = stream;
      await videoEl.play();
      videoRes = `${videoEl.videoWidth}×${videoEl.videoHeight}`;

      track = stream.getVideoTracks()[0] ?? null;
      await listCameras();
      if (track) {
        const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
        capsList = Object.keys(caps).join(', ') || t('scan.noCaps');
        facing = String((track.getSettings?.() as any)?.facingMode ?? '—');
        torchAvailable = 'torch' in caps || Object.keys(caps).length === 0;
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          try {
            // @ts-expect-error — focusMode no está en los tipos estándar.
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          } catch {}
        }
      }
    } catch (e) {
      error = t('scan.errorCamera');
      detectError = String((e as Error)?.message ?? e).slice(0, 140);
      return;
    }

    try {
      readFrame = await setupEngine();
    } catch (e) {
      // Fallo al preparar el decodificador: se dice, no se oculta.
      error = t('scan.errorEngine');
      detectError = String((e as Error)?.message ?? e).slice(0, 200);
      return;
    }

    tick();
  }

  async function tick() {
    if (stopped || !readFrame) return;
    try {
      const t0 = performance.now();
      const hits = await readFrame();
      decodeMs = Math.round(performance.now() - t0);
      ticks++;
      detectError = '';

      const hit = hits[0];
      if (hit) {
        const now = Date.now();
        const onCooldown = hit.value === lastAccepted && now - lastAcceptedAt < COOLDOWN_MS;
        if (!onCooldown) {
          if (hit.value === lastSeen) {
            // Segunda lectura idéntica → la damos por buena.
            lastAccepted = hit.value;
            lastAcceptedAt = now;
            lastSeen = '';
            onDetected(hit.value, hit.format);
            if (!continuous) { stop(); return; }
          } else {
            lastSeen = hit.value;
          }
        }
      }
    } catch (e) {
      detectError = String((e as Error)?.message ?? e).slice(0, 200);
    }
    timer = setTimeout(tick, 120);
  }

  async function toggleTorch() {
    if (!track) return;
    const next = !torchOn;
    try {
      // @ts-expect-error — torch no está en los tipos estándar.
      await track.applyConstraints({ advanced: [{ torch: next }] });
      torchOn = next;
    } catch (e) {
      torchOn = false;
      torchAvailable = false;
      detectError = `Linterna no soportada: ${String((e as Error)?.message ?? e).slice(0, 80)}`;
    }
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    track = null;
  }

  /** Arranque único. Va dentro de `untrack` porque `start()` lee `deviceId` y
   *  `listCameras()` lo escribe: sin untrack el efecto se auto-invalida y vuelve
   *  a abrir la cámara en bucle (parpadeo + "no se pudo abrir"). El guard cubre
   *  el caso de que `videoEl` cambie de nodo. */
  let booted = false;
  $effect(() => {
    if (!videoEl || booted) return;
    booted = true;
    untrack(() => {
      try {
        deviceId = localStorage.getItem(DEVICE_KEY) ?? '';
        savedLabel = localStorage.getItem(LABEL_KEY) ?? '';
      } catch {}
      start();
    });
  });
  onDestroy(stop);

  function close() { stop(); onClose(); }
</script>

<div class="fixed inset-0 z-[60] grid place-items-center p-4"
  style="background: rgba(0,0,0,.85)" onclick={close} role="presentation">
  <!-- scrollbar-gutter: stable reserva el hueco de la barra SIEMPRE. Sin esto,
       al desplegar el diagnóstico el contenido pasa de 95vh, aparece la barra,
       el ancho baja ~15px y el <video> (w-full + aspect-[4/3]) recalcula alto y
       ancho: se ve como un parpadeo de la imagen. -->
  <div class="card-elev w-full max-w-lg p-5 space-y-3 pop-in max-h-[95vh] overflow-y-auto [scrollbar-gutter:stable]"
    onclick={(e) => e.stopPropagation()} role="presentation">

    <header class="flex items-start justify-between">
      <h2 class="text-lg font-bold">📷 {t('scan.title')}</h2>
      <button onclick={close} class="text-2xl leading-none text-muted hover:text-current">×</button>
    </header>

    <div class="relative">
      <video bind:this={videoEl} muted playsinline
        class="w-full rounded-xl bg-black aspect-[4/3] object-cover"></video>
      <div class="pointer-events-none absolute inset-0 grid place-items-center">
        <div class="w-4/5 h-1/3 rounded-lg"
          style="border: 2px solid rgba(255,255,255,.9); box-shadow: 0 0 0 9999px rgba(0,0,0,.35);"></div>
      </div>
      {#if torchAvailable}
        <button onclick={toggleTorch}
          class="absolute bottom-2 end-2 rounded-full px-3 py-1.5 text-sm"
          style="background: rgba(0,0,0,.6); color: white;">
          {torchOn ? `🔦 ${t('scan.torchOff')}` : `🔦 ${t('scan.torch')}`}
        </button>
      {/if}
      {#if feedback}
        <div class="absolute top-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-sm font-medium"
          style="background: rgba(34,197,94,.95); color: white;">{feedback}</div>
      {/if}
    </div>

    <p class="text-xs text-muted text-center">
      {t('scan.hint')}
      {#if continuous}<br />{t('scan.hintChain')}{/if}
    </p>

    {#if devices.length > 1}
      <label class="block">
        <span class="text-[11px] text-muted">{t('scan.camera')}</span>
        <!-- bind:value, no value=: con `value=` Svelte asigna el valor antes de
             que existan los <option>, la asignación se pierde y el desplegable
             muestra siempre la primera cámara aunque deviceId tenga otra. -->
        <select bind:value={deviceId}
          onchange={(e) => switchCamera(e.currentTarget.value)}
          class="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs bg-transparent"
          style="border-color: var(--border);">
          {#each devices as d, i (d.deviceId)}
            <option value={d.deviceId}>{d.label || t('scan.cameraN', { n: i + 1 })}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if error}<p class="text-sm text-red-500">{error}</p>{/if}

    <details class="rounded-xl border p-2" style="border-color: var(--border);">
      <summary class="cursor-pointer text-[11px] text-muted">
        {t('scan.diag')} ({engine || '…'}{videoRes ? ` · ${videoRes}` : ''})
      </summary>
      <!-- Alto acotado con scroll propio: la lista de capacidades es break-all y
           no tiene límite (varía por cámara), así que el panel crecía de forma
           impredecible y el modal, centrado, se recolocaba moviendo el vídeo. -->
      <ul class="mt-1.5 text-[11px] space-y-0.5 max-h-40 overflow-y-auto [scrollbar-gutter:stable]"
        style="color: var(--fg-muted);">
        <li>{t('scan.diagEngine')}: <strong>{engine || t('scan.diagStarting')}</strong></li>
        <li>{t('scan.diagResolution')}: <strong>{videoRes || '—'}</strong> · {t('scan.diagCamera')}: <strong>{facing || '—'}</strong></li>
        <li class="break-all">{t('scan.diagSaved')}: <strong>{savedLabel || '—'}</strong> {deviceId && devices.some((d) => d.deviceId === deviceId) ? '✅' : '⚠️'}</li>
        <li>{t('scan.diagPerRead')}: <strong>{decodeMs} ms</strong> · {t('scan.diagReads')}: <strong>{ticks}</strong></li>
        <li>{t('scan.torch')}: <strong>{torchAvailable ? t('scan.diagTorchYes') : t('scan.diagTorchNo')}</strong></li>
        {#if wasmInfo}<li>WASM: <strong>{wasmInfo}</strong></li>{/if}
        <li class="break-all">{t('scan.diagCaps')}: {capsList || '—'}</li>
        {#if detectError}<li class="break-all" style="color:#dc2626;">{t('scan.diagError')}: {detectError}</li>{/if}
      </ul>
    </details>

    <button onclick={close}
      class="w-full rounded-xl border py-2.5 font-medium hover:bg-[var(--bg)] transition"
      style="border-color: var(--border);">{t('scan.cancel')}</button>
  </div>
</div>
