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
    b.setAttribute('aria-pressed', String(!!on));
    b.onclick = onClick;
    return b;
  }

  let typing = false; // no redibujar mientras se escribe, para no perder el foco

  function render() {
    if (typing) return;
    const s = state;
    body.replaceChildren();

    const quick = el('div', 'r-quick');
    quick.append(
      toggleBtn('Blackout', s.blackout, () => send('blackout', !s.blackout), 'big'),
      (() => {
        const b = el('button', 'r-btn big', 'Flash');
        b.onclick = () => send('flash');
        return b;
      })(),
    );
    body.append(quick);

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
      nb.onclick = () => send('nextPreset');
      gm.append(nb);
    }
    body.append(gm);

    const gc = group('Color');
    const chips = el('div', 'r-chips');
    s.palettes.forEach((p) => {
      const b = el('button', 'r-chip');
      b.style.background = p.css;
      b.setAttribute('aria-label', p.name);
      b.setAttribute('aria-pressed', String(s.palette === p.id));
      b.onclick = () => send('palette', p.id);
      chips.append(b);
    });
    gc.append(chips);
    body.append(gc);

    const gs = group(`Sensibilidad ${s.sensitivity.toFixed(1)}×`);
    const range = el('input', 'r-range');
    Object.assign(range, { type: 'range', min: '0.2', max: '4', step: '0.1', value: String(s.sensitivity) });
    let last = 0;
    range.oninput = () => {
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
    input.onfocus = () => (typing = true);
    input.onblur = () => {
      typing = false;
    };
    const row = el('div', 'r-row');
    const sendBtn = el('button', 'r-btn', 'Mostrar');
    sendBtn.onclick = () => {
      send('text', input.value);
      send('textOn', true);
    };
    row.append(sendBtn, toggleBtn('Ocultar', !s.textOn, () => send('textOn', false)));
    gt.append(input, row);
    body.append(gt);

    const go = group('Capas');
    const row2 = el('div', 'r-row');
    if (s.hasLogo) row2.append(toggleBtn('Logo', s.logoOn, () => send('logoOn', !s.logoOn)));
    row2.append(el('span'));
    const bg = toggleBtn('Fondo de video', s.bgOn, () => send('bgToggle'));
    row2.append(bg);
    go.append(row2);
    body.append(go);
  }

}
