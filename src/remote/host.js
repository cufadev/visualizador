// Lado pantalla del control remoto. Publica el estado (cifrado) y recibe las ordenes de los
// celulares, que se validan contra una tabla fija antes de ejecutarse.
import { validateCommand } from './protocol.js';
import { newSecret, importSecret, seal, open } from './crypto.js';
import { createRelay, brokerList } from './relay.js';

const PUBLIC_URL = 'https://cufadev.github.io/visualizador/';
const MAX_SESSIONS = 20;

export function createRemoteHost({ getState, getContext, exec, onCount, onStatus }) {
  let relay = null;
  let key = null;
  let secret = '';
  let room = '';
  let seq = 0;
  let beat = 0;
  let countTimer = 0;
  let pushTimer = 0;
  const sessions = new Map(); // id de sesion del celular -> { n, last }

  const recount = () => {
    const now = Date.now();
    onCount([...sessions.values()].filter((s) => now - s.last < 15000).length);
  };

  async function publishState() {
    if (!relay) return;
    seq = Math.max(seq + 1, Date.now());
    relay.publish(await seal(key, { t: 'state', seq, ...getState() }), { retain: true });
  }

  async function handleRaw(str) {
    if (!str || !key) return;
    const msg = await open(key, str);
    if (!msg || typeof msg.s !== 'string' || !Number.isFinite(msg.n)) return;
    let ss = sessions.get(msg.s);
    if (!ss) {
      if (sessions.size >= MAX_SESSIONS) return;
      ss = { n: 0, last: 0 };
      sessions.set(msg.s, ss);
    }
    if (msg.n <= ss.n) return; // repetido (llego por dos brokers) o viejo
    ss.n = msg.n;
    ss.last = Date.now();
    if (msg.t === 'hello') {
      publishState();
      recount();
    } else if (msg.t === 'hb') {
      recount();
    } else if (msg.t === 'cmd') {
      const cmd = validateCommand(msg, getContext());
      if (cmd) exec(cmd.c, cmd.v);
    }
  }

  // El celular no necesita que esta pagina lo sirva: si estamos en localhost o en un archivo,
  // el QR apunta igual a la version publicada.
  function baseUrl() {
    const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    return local ? PUBLIC_URL : location.origin + location.pathname;
  }

  function currentUrl() {
    const u = new URL(baseUrl());
    u.searchParams.set('remote', room);
    u.hash = `k=${secret}`;
    return u.toString();
  }

  async function start() {
    if (relay) return currentUrl();
    secret = sessionStorage.getItem('visual:rsecret') || newSecret(16);
    room = sessionStorage.getItem('visual:rroom') || newSecret(6);
    sessionStorage.setItem('visual:rsecret', secret);
    sessionStorage.setItem('visual:rroom', room);
    key = await importSecret(secret);
    relay = createRelay({ room, brokers: brokerList(), role: 'host', onRaw: handleRaw, onStatus });
    try {
      await relay.open();
    } catch (err) {
      relay = null;
      throw err;
    }
    publishState();
    beat = setInterval(publishState, 5000); // el celular lo usa para saber que la pantalla sigue ahi
    countTimer = setInterval(recount, 3000);
    return currentUrl();
  }

  function stop() {
    clearInterval(beat);
    clearInterval(countTimer);
    clearTimeout(pushTimer);
    relay?.close({ clearRetained: true });
    relay = null;
    sessions.clear();
    ['visual:rsecret', 'visual:rroom'].forEach((k) => sessionStorage.removeItem(k));
    onCount(0);
  }

  // Avisar a los celulares que algo cambio (juntando cambios seguidos)
  function push() {
    if (!relay) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(publishState, 120);
  }

  return { start, stop, push, get active() { return !!relay; }, get brokersUp() { return relay?.up ?? 0; } };
}
