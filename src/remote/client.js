// Pantalla del celular: se conecta a la pantalla por los brokers de enlace, muestra su estado y manda ordenes.
import '../styles/remote.css';
import { newSecret, importSecret, seal, open } from './crypto.js';
import { createRelay, brokerList } from './relay.js';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export async function startRemote(hostId) {
  const root = document.getElementById('remote');
  root.replaceChildren();
  const head = el('header', 'r-head');
  const dot = el('span', 'r-dot');
  const status = el('span', 'r-status', 'Conectando…');
  head.append(el('strong', '', 'VISUAL'), dot, status);
  const body = el('main', 'r-body');
  root.append(head, body);

  let state = null;
  let relay = null;
  let key = null;
  let lastSeq = 0;
  let lastState = 0;
  let lastN = 0;
  const sid = newSecret(6);
  const nextN = () => (lastN = Math.max(lastN + 1, Date.now()));
  const sealed = (obj) => seal(key, { ...obj, s: sid, n: nextN() });

  const send = async (c, v) => {
    if (relay) relay.publish(await sealed({ t: 'cmd', c, v }));
  };

  function fail(msg, hint) {
    root.querySelector('.r-dock')?.remove();
    dot.className = 'r-dot off';
    status.textContent = msg;
    body.replaceChildren();
    const retry = el('button', 'r-btn wide', 'Reintentar');
    retry.onclick = () => location.reload();
    body.append(el('p', 'r-note', hint || 'Revisá que la pantalla de VISUAL siga abierta con el control remoto activado, y que los dos tengan internet.'), retry);
  }

  const secret = location.hash.match(/k=([\w-]+)/)?.[1];
  try {
    if (!secret) throw new Error('sin clave');
    key = await importSecret(secret);
  } catch {
    return fail('Link incompleto', 'Este link no tiene la clave de conexión. Escaneá de nuevo el QR que muestra la pantalla de VISUAL.');
  }

  relay = createRelay({
    room: hostId,
    brokers: brokerList(new URLSearchParams(location.search).get('b')),
    role: 'client',
    onStatus: () => {},
    onRaw: async (str) => {
      const m = str && (await open(key, str));
      if (m?.t === 'state' && m.seq > lastSeq) {
        lastSeq = m.seq;
        lastState = Date.now();
        state = m;
        render();
      }
    },
  });
  try {
    await relay.open();
  } catch {
    return fail('Sin conexión', 'No se pudo llegar a los servidores de enlace. Probá cambiar entre wifi y datos móviles.');
  }

  // avisar que estamos y mantener el latido mientras la pestaña esté abierta
  relay.publish(await sealed({ t: 'hello' }));
  setInterval(async () => relay.publish(await sealed({ t: 'hb' })), 5000);
  // reintentar el saludo hasta recibir el primer estado
  const hello = setInterval(async () => {
    if (state) return clearInterval(hello);
    relay.publish(await sealed({ t: 'hello' }));
  }, 2500);

  const watchdog = setInterval(() => {
    const age = Date.now() - lastState;
    if (!state) {
      status.textContent = 'Buscando la pantalla…';
      dot.className = 'r-dot';
      if (age > 20000 && Date.now() - startedAt > 20000) {
        clearInterval(watchdog);
        fail('La pantalla no responde');
      }
    } else if (age > 12000) {
      dot.className = 'r-dot off';
      status.textContent = 'Pantalla sin respuesta';
    } else {
      dot.className = 'r-dot on';
      status.textContent = 'Conectado';
    }
  }, 1000);
  const startedAt = Date.now();

  // ---------- interfaz ----------
  function group(title) {
    const g = el('section', 'r-group');
    g.append(el('h2', '', title));
    return g;
  }
  function toggleBtn(label, on, onClick, cls = '') {
    const b = el('button', `r-btn ${cls}`, label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(!!on));
    b.onclick = onClick;
    return b;
  }

  // Barra fija abajo: lo que se usa en pleno show tiene que estar siempre a mano
  const dock = el('div', 'r-dock');
  const blackBtn = el('button', 'r-btn big', 'Blackout');
  blackBtn.type = 'button';
  blackBtn.onclick = () => send('blackout', !state?.blackout);
  const flashBtn = el('button', 'r-btn big', 'Flash');
  flashBtn.type = 'button';
  flashBtn.onclick = () => send('flash');
  dock.append(blackBtn, flashBtn);
  dock.hidden = true; // aparece con el primer estado recibido
  root.append(dock);

  // vibracion corta en cada toque (donde el navegador la permita)
  root.addEventListener('click', (e) => e.target.closest('.r-btn, .r-chip') && navigator.vibrate?.(10));

  // No redibujar mientras el dedo esta en un slider o se escribe: el estado vuelve de la
  // pantalla y reemplazar los controles a mitad del gesto lo corta.
  let typing = false;
  let dragging = false;
  let pending = 0;
  const busy = () => typing || dragging;
  const renderSoon = (ms = 250) => {
    clearTimeout(pending);
    pending = setTimeout(() => (busy() ? renderSoon(ms) : render()), ms);
  };
  root.addEventListener('pointerup', () => {
    if (dragging) {
      dragging = false;
      renderSoon(150);
    }
  });
  root.addEventListener('pointercancel', () => (dragging = false));

  function render() {
    if (busy()) return renderSoon();
    const s = state;
    dock.hidden = false;
    body.replaceChildren();
    blackBtn.setAttribute('aria-pressed', String(!!s.blackout));

    if (s.scenes.length) {
      const g = group('Escenas');
      const grid = el('div', 'r-grid');
      s.scenes.forEach((name, i) => grid.append(toggleBtn(name, s.activeScene === i, () => send('scene', i))));
      g.append(grid);
      body.append(g);
    }

    const gm = group('Modo');
    const grid = el('div', 'r-grid');
    s.modes.forEach((m) => grid.append(toggleBtn(m.name, s.mode === m.id, () => send('mode', m.id))));
    gm.append(grid);
    if (s.mode === 'milkdrop') {
      const nb = el('button', 'r-btn wide', 'Otro preset');
      nb.type = 'button';
      nb.onclick = () => send('nextPreset');
      gm.append(nb);
    }
    body.append(gm);

    const gc = group('Color');
    const chips = el('div', 'r-chips');
    s.palettes.forEach((p) => {
      const b = el('button', 'r-chip');
      b.type = 'button';
      b.style.background = p.css;
      b.title = p.name;
      b.setAttribute('aria-label', p.name);
      b.setAttribute('aria-pressed', String(s.palette === p.id));
      b.onclick = () => send('palette', p.id);
      chips.append(b);
    });
    gc.append(chips);
    body.append(gc);

    const gs = group('Sensibilidad');
    const readout = el('output', 'r-readout', `${s.sensitivity.toFixed(1)}×`);
    gs.firstChild.append(readout);
    const range = el('input', 'r-range');
    Object.assign(range, { type: 'range', min: '0.2', max: '4', step: '0.1', value: String(s.sensitivity) });
    range.setAttribute('aria-label', 'Sensibilidad');
    range.onpointerdown = () => (dragging = true);
    let last = 0;
    range.oninput = () => {
      readout.textContent = `${Number(range.value).toFixed(1)}×`;
      const now = Date.now();
      if (now - last > 80) {
        last = now;
        send('sensitivity', Number(range.value));
      }
    };
    range.onchange = () => send('sensitivity', Number(range.value));
    gs.append(range);
    body.append(gs);

    const gt = group('Texto en pantalla');
    const input = el('input', 'r-input');
    Object.assign(input, { type: 'text', maxLength: 120, placeholder: 'Escribí algo…', value: s.text });
    input.setAttribute('aria-label', 'Texto en pantalla');
    input.onfocus = () => (typing = true);
    input.onblur = () => {
      typing = false;
      renderSoon(400); // con demora: si el toque cae en "Enviar", el click tiene que llegar primero
    };
    const row = el('div', 'r-row');
    const sendBtn = el('button', 'r-btn', 'Enviar');
    sendBtn.type = 'button';
    sendBtn.onclick = () => {
      send('text', input.value);
      send('textOn', true);
      input.blur();
    };
    row.append(sendBtn, toggleBtn('Texto visible', s.textOn, () => send('textOn', !s.textOn)));
    gt.append(input, row);
    body.append(gt);

    const layers = [];
    if (s.hasLogo) layers.push(toggleBtn('Logo', s.logoOn, () => send('logoOn', !s.logoOn)));
    layers.push(toggleBtn('Fondo de video', s.bgOn, () => send('bgToggle')));
    const go = group('Capas');
    const row2 = el('div', 'r-row');
    layers.forEach((b) => row2.append(b));
    go.append(row2);
    body.append(go);
  }

  // mantener la pantalla del celular encendida mientras dura el show
  let wake = null;
  const keepAwake = async () => {
    try {
      wake = await navigator.wakeLock?.request('screen');
    } catch {
      // no disponible o rechazado: el celular se apagara por su cuenta
    }
  };
  keepAwake();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && keepAwake());
}
