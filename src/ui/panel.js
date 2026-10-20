// Panel de control: arma las partes dinamicas y conecta cada control con el estado.
import { get, set, on } from '../state.js';
import { PALETTE_NAMES, paletteCss } from '../visuals/palettes.js';
import { parseYouTubeId } from '../video/background.js';
import { $, $$, setFill, toast, friendlyError } from './dom.js';

export function createPanel({ engine, renderer, background }) {
  const modesEl = $('#modes');
  const palettesEl = $('#palettes');
  const deviceSel = $('#device');
  const startSel = $('#start-device');
  const presetSel = $('#preset');
  const milkBox = $('#milk');
  const beatDot = $('#beat-dot');
  const meters = { level: $('#m-level'), bass: $('#m-bass'), mid: $('#m-mid'), high: $('#m-high') };
  const paletteIds = Object.keys(PALETTE_NAMES);
  const modeIds = renderer.modes.map((m) => m.id);

  // ---------- modos ----------
  renderer.modes.forEach((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.mode = m.id;
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${m.icon}</svg><span>${m.name}</span><kbd>${(i + 1) % 10}</kbd>`;
    b.addEventListener('click', () => selectMode(m.id));
    modesEl.append(b);
  });

  async function selectMode(id) {
    if (!modeIds.includes(id)) id = 'bars';
    const ok = await renderer.setMode(id);
    if (!ok) {
      toast('No se pudo iniciar Milkdrop (¿falta WebGL?)');
      id = 'bars';
      await renderer.setMode(id);
    }
    set('mode', id);
    syncMode();
    if (id === 'milkdrop') prepareMilk();
    return id;
  }

  function syncMode() {
    const id = get('mode');
    $$('.card', modesEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === id)));
    milkBox.hidden = id !== 'milkdrop';
  }

  function prepareMilk() {
    const milk = renderer.milk;
    if (!presetSel.options.length) {
      milk.names.forEach((n) => presetSel.append(new Option(n, n)));
    }
    if (!milk.current) {
      const saved = get('milkPreset');
      const name = milk.names.includes(saved) ? saved : milk.names[Math.floor(Math.random() * milk.names.length)];
      milk.setPreset(name, 0);
    }
    presetSel.value = milk.current;
  }

  presetSel.addEventListener('change', () => {
    renderer.milk.setPreset(presetSel.value);
    set('milkPreset', presetSel.value);
  });
  $('#btn-next').addEventListener('click', nextPreset);
  $('#milk-auto').checked = get('milkAuto');
  $('#milk-auto').addEventListener('change', (e) => {
    set('milkAuto', e.target.checked);
    renderer.milkAuto = e.target.checked;
  });

  function nextPreset() {
    if (get('mode') !== 'milkdrop') return;
    const name = renderer.milk.next();
    presetSel.value = name;
    set('milkPreset', name);
    toast(name);
  }

  // ---------- paletas ----------
  paletteIds.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.palette = id;
    b.innerHTML = `<i style="background:${paletteCss(id)}"></i>${PALETTE_NAMES[id]}`;
    b.addEventListener('click', () => set('palette', id));
    palettesEl.append(b);
  });
  on('palette', (id) => {
    renderer.setPalette(id);
    syncPalette();
  });
  function syncPalette() {
    $$('.swatch', palettesEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === get('palette'))));
  }

  // ---------- sliders ----------
  function bindRange(sel, key, fmt, apply) {
    const input = $(sel);
    const out = $(`${sel}-out`) || input.closest('.field').querySelector('output');
    const paint = () => {
      setFill(input);
      out.textContent = fmt(Number(input.value));
    };
    input.value = get(key);
    paint();
    input.addEventListener('input', () => {
      set(key, Number(input.value));
      paint();
      apply?.(Number(input.value));
    });
    on(key, (v) => {
      input.value = v;
      paint();
      apply?.(v);
    });
  }
  bindRange('#sens', 'sensitivity', (v) => `${v.toFixed(1)}×`, (v) => renderer.setSensitivity(v));
  bindRange('#smooth', 'smoothing', (v) => v.toFixed(2), (v) => engine.setSmoothing(v));
  bindRange('#dim', 'dim', (v) => `${Math.round(v * 100)}%`, (v) => background.setDim(v));

  // ---------- entrada de audio ----------
  async function refreshDevices() {
    const list = await engine.listInputs();
    for (const sel of [deviceSel, startSel]) {
      sel.replaceChildren(new Option('Predeterminada', ''));
      list.forEach((d) => sel.append(new Option(d.label, d.id)));
      sel.value = list.some((d) => d.id === get('deviceId')) ? get('deviceId') : '';
    }
  }
  navigator.mediaDevices?.addEventListener?.('devicechange', () => {
    if (engine.ctx) refreshDevices();
  });

  deviceSel.addEventListener('change', async () => {
    try {
      const id = await engine.useMic(deviceSel.value);
      set('deviceId', deviceSel.value || id);
      syncSource();
      toast(engine.sourceLabel);
    } catch (err) {
      toast(friendlyError(err));
    }
  });

  const sourceBtn = $('#btn-source');
  sourceBtn.addEventListener('click', async () => {
    try {
      if (engine.sourceKind === 'demo') await engine.useMic(get('deviceId'));
      else await engine.useDemo();
      syncSource();
    } catch (err) {
      toast(friendlyError(err));
    }
  });

  function syncSource() {
    $('#chip-src').textContent = engine.sourceLabel || 'Sin entrada';
    sourceBtn.textContent = engine.sourceKind === 'demo' ? 'Volver al micrófono' : 'Probar con demo';
    deviceSel.disabled = engine.sourceKind === 'demo';
  }

  // ---------- fondo ----------
  const segButtons = $$('#bg-seg button');
  const localBox = $('#bg-local');
  const ytBox = $('#bg-yt');
  const fileInput = $('#video-file');
  const ytInput = $('#yt-url');
  let lastBg = 'none';

  function setBackground(source) {
    if (source !== 'none') lastBg = source;
    background.setSource(source);
    set('bgSource', source);
    segButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.source === source)));
    localBox.hidden = source !== 'local';
    ytBox.hidden = source !== 'youtube';
  }
  segButtons.forEach((b) => b.addEventListener('click', () => setBackground(b.dataset.source)));

  $('#btn-file').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!background.loadFile(file)) return;
    $('#file-name').textContent = file.name;
    setBackground('local');
  });

  // YouTube rechaza (error 153) los embeds que llegan sin Referer, y un archivo abierto
  // con doble click (file://) nunca lo manda. Hace falta servirlo por http://localhost.
  const fromFile = location.protocol === 'file:';
  if (fromFile) {
    $('#yt-hint').textContent =
      'YouTube no funciona abriendo el archivo con doble click (error 153). Abrilo con iniciar.sh, o usá un video local.';
    $('#yt-hint').style.color = 'var(--danger)';
  }

  function loadYouTube() {
    if (fromFile) {
      toast('Abrí la app con iniciar.sh para usar YouTube, o elegí un video local');
      return;
    }
    if (!background.loadYouTube(ytInput.value)) {
      toast('Ese link de YouTube no es válido');
      return;
    }
    set('youtubeUrl', ytInput.value.trim());
    setBackground('youtube');
  }
  $('#btn-yt').addEventListener('click', loadYouTube);
  ytInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadYouTube();
  });

  // ---------- secciones colapsables ----------
  $$('.sec').forEach((sec) => {
    const id = sec.dataset.sec;
    const h2 = $('h2', sec);
    const label = h2.innerHTML;
    const body = document.createElement('div');
    body.className = 'sec-body';
    const inner = document.createElement('div');
    inner.className = 'sec-inner';
    while (h2.nextSibling) inner.append(h2.nextSibling);
    body.append(inner);
    sec.append(body);
    h2.innerHTML = `<button type="button" class="sec-toggle">${label}<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>`;
    const btn = $('button', h2);
    const apply = (collapsed) => {
      sec.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      body.toggleAttribute('inert', collapsed);
    };
    apply(get('collapsed').includes(id));
    btn.addEventListener('click', () => {
      const list = get('collapsed');
      const collapsed = !list.includes(id);
      set('collapsed', collapsed ? [...list, id] : list.filter((x) => x !== id));
      apply(collapsed);
    });
  });

  function useYouTube(url) {
    if (location.protocol === 'file:') return;
    ytInput.value = url;
    if (background.loadYouTube(url)) {
      set('youtubeUrl', url);
      setBackground('youtube');
    }
  }

  function setPreset(name) {
    if (!renderer.milk.names.includes(name)) return;
    renderer.milk.setPreset(name);
    presetSel.value = name;
    set('milkPreset', name);
  }

  // ---------- panel ----------
  $('#btn-hide').addEventListener('click', toggleUI);
  function toggleUI() {
    const off = document.body.classList.toggle('ui-off');
    if (off) toast('Panel oculto: H para volver');
  }

  // ---------- inicio ----------
  function restore() {
    syncPalette();
    renderer.setPalette(get('palette'));
    renderer.setSensitivity(get('sensitivity'));
    renderer.milkAuto = get('milkAuto');
    background.setDim(get('dim'));
    ytInput.value = get('youtubeUrl');
    if (location.protocol !== 'file:' && parseYouTubeId(ytInput.value)) background.loadYouTube(ytInput.value);
    // un video local no se puede recordar entre sesiones
    const saved = get('bgSource');
    setBackground(saved === 'youtube' && background.ytId ? 'youtube' : 'none');
  }

  // ---------- por cuadro ----------
  function update() {
    meters.level.style.transform = `scaleX(${engine.level})`;
    meters.bass.style.transform = `scaleX(${engine.bass})`;
    meters.mid.style.transform = `scaleX(${engine.mid})`;
    meters.high.style.transform = `scaleX(${engine.high})`;
    beatDot.style.opacity = String(0.25 + engine.beat * 0.75);
    beatDot.style.transform = `scale(${1 + engine.beat * 0.5})`;
  }

  // ---------- acciones para los atajos ----------
  const actions = {
    toggleUI,
    nextPreset,
    cycleMode: (d) => selectMode(modeIds[(modeIds.indexOf(get('mode')) + d + modeIds.length) % modeIds.length]),
    modeByIndex: (i) => modeIds[i] && selectMode(modeIds[i]),
    setPalette: (id) => paletteIds.includes(id) && set('palette', id),
    setSensitivity: (v) => set('sensitivity', Math.min(4, Math.max(0.2, Math.round(v * 10) / 10))),
    setText: (v) => set('text', String(v).slice(0, 120)),
    setTextOn: (v) => set('textOn', !!v),
    setLogoOn: (v) => set('logoOn', !!v),
    cyclePalette: (d) => {
      const next = paletteIds[(paletteIds.indexOf(get('palette')) + d + paletteIds.length) % paletteIds.length];
      set('palette', next);
      toast(PALETTE_NAMES[next]);
    },
    sensitivity: (d) => {
      const v = Math.min(4, Math.max(0.2, Math.round((get('sensitivity') + d) * 10) / 10));
      set('sensitivity', v);
    },
    fullscreen: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    },
    toggleBackground: () => {
      if (get('bgSource') !== 'none') setBackground('none');
      else if (lastBg === 'local' && background.hasLocal) setBackground('local');
      else if (lastBg === 'youtube' && background.ytId) setBackground('youtube');
      else toast('Todavía no cargaste un video de fondo');
    },
    togglePlay: () => {
      const playing = background.togglePlay();
      if (playing !== null) toast(playing ? 'Video en reproducción' : 'Video en pausa');
    },
  };

  return { actions, update, restore, selectMode, refreshDevices, syncSource, syncMode, setBackground, useYouTube, setPreset };
}
