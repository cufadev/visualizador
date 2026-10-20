// Pantalla del celular: se conecta al host por WebRTC, muestra su estado y manda ordenes.
import '../styles/remote.css';

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

  let conn = null;
  let state = null;
  const send = (c, v) => conn?.open && conn.send({ t: 'cmd', c, v });

  function fail(msg) {
    dot.className = 'r-dot off';
    status.textContent = msg;
    body.replaceChildren();
    const retry = el('button', 'r-btn wide', 'Reintentar');
    retry.onclick = () => location.reload();
    body.append(el('p', 'r-note', 'Revisá que la pantalla de VISUAL siga abierta con el control remoto activado, y que los dos tengan internet.'), retry);
  }

  let Peer;
  try {
    ({ Peer } = await import('peerjs'));
  } catch {
    return fail('No se pudo cargar la conexión');
  }
  const peer = new Peer();
  const timeout = setTimeout(() => !conn?.open && fail('No se pudo conectar'), 15000);
  peer.on('error', () => fail('No se pudo conectar'));
  peer.on('open', () => {
    conn = peer.connect(hostId, { reliable: true });
    conn.on('open', () => {
      clearTimeout(timeout);
      dot.className = 'r-dot on';
      status.textContent = 'Conectado';
    });
    conn.on('data', (m) => {
      if (m?.t === 'state') {
        state = m;
        render();
      }
    });
    conn.on('close', () => fail('Se cortó la conexión'));
    conn.on('error', () => fail('Se cortó la conexión'));
  });

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

  status.textContent = 'Conectando…';
}
