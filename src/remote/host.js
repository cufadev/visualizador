// Lado pantalla del control remoto: abre un punto WebRTC (PeerJS) y deja que los celulares
// que escanean el QR manden ordenes. PeerJS solo se usa para conectarse; despues los datos
// van directo entre los dos dispositivos.
import { validateCommand } from './protocol.js';

const MAX_CONTROLLERS = 4;

function newId() {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return 'visual-' + [...a].map((x) => (x % 36).toString(36)).join('');
}

export function createRemoteHost({ getState, getContext, exec, onCount }) {
  let peer = null;
  const conns = new Set();
  let pushTimer = 0;

  function send(conn) {
    if (conn.open) conn.send({ t: 'state', ...getState() });
  }

  function handle(msg) {
    const cmd = validateCommand(msg, getContext());
    if (cmd) exec(cmd.c, cmd.v);
  }

  async function start() {
    if (peer) return currentUrl();
    const { Peer } = await import('peerjs');
    let id = sessionStorage.getItem('visual:peer') || newId();
    await new Promise((resolve, reject) => {
      peer = new Peer(id);
      peer.on('open', resolve);
      peer.on('error', (err) => {
        if (!peer?.open) {
          peer.destroy();
          peer = null;
          reject(err);
        }
      });
    });
    sessionStorage.setItem('visual:peer', id);
    peer.on('connection', (conn) => {
      if (conns.size >= MAX_CONTROLLERS) {
        conn.close();
        return;
      }
      conn.on('open', () => {
        conns.add(conn);
        onCount(conns.size);
        send(conn);
      });
      conn.on('data', handle);
      const drop = () => {
        conns.delete(conn);
        onCount(conns.size);
      };
      conn.on('close', drop);
      conn.on('error', drop);
    });
    return currentUrl();
  }

  function currentUrl() {
    const u = new URL(location.href);
    u.search = '';
    u.hash = '';
    u.searchParams.set('remote', peer.id);
    return u.toString();
  }

  function stop() {
    conns.forEach((c) => c.close());
    conns.clear();
    peer?.destroy();
    peer = null;
    onCount(0);
  }

  // Avisar a los celulares que algo cambio (con un pequeño retraso para juntar cambios)
  function push() {
    if (!conns.size) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => conns.forEach(send), 120);
  }

  return { start, stop, push, get active() { return !!peer; } };
}
