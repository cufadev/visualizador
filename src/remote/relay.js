// Transporte: brokers MQTT publicos por WebSocket seguro. A diferencia de WebRTC no necesita
// conexion directa entre dispositivos, asi que funciona con datos moviles, wifi con
// aislamiento de clientes o cualquier NAT. Se conecta a todos los brokers de la lista a la
// vez y usa los que respondan; los mensajes duplicados los descarta quien los recibe.
import mqtt from 'mqtt';

export const DEFAULT_BROKERS = [
  'wss://test.mosquitto.org:8081/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

export function brokerList(extra) {
  let custom = extra || '';
  try {
    custom ||= localStorage.getItem('visual:broker') || '';
  } catch {
    // sin almacenamiento
  }
  return /^wss?:\/\//.test(custom) ? [custom, ...DEFAULT_BROKERS] : DEFAULT_BROKERS;
}

// role: 'host' (la pantalla) o 'client' (el celular)
export function createRelay({ room, brokers, role, onRaw, onStatus }) {
  const base = `visual/v1/${room}`;
  const subTopic = role === 'host' ? `${base}/up` : `${base}/down`;
  const pubTopic = role === 'host' ? `${base}/down` : `${base}/up`;
  const clients = [];

  const up = () => clients.filter((c) => c._up).length;

  function open(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      brokers.forEach((url) => {
        const c = mqtt.connect(url, {
          clientId: 'visual-' + Math.random().toString(16).slice(2, 12),
          connectTimeout: 8000,
          reconnectPeriod: 4000,
          keepalive: 30,
          clean: true,
        });
        c._up = false;
        c.on('connect', () => {
          c._up = true;
          c.subscribe(subTopic, { qos: 0 });
          onStatus?.(up(), brokers.length);
          if (!settled) {
            settled = true;
            resolve();
          }
        });
        c.on('close', () => {
          c._up = false;
          onStatus?.(up(), brokers.length);
        });
        c.on('error', () => {});
        c.on('message', (_topic, payload) => onRaw(payload.toString()));
        clients.push(c);
      });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          close();
          reject(new Error('Sin conexión con los servidores de enlace'));
        }
      }, timeoutMs);
    });
  }

  function publish(str, { retain = false } = {}) {
    clients.forEach((c) => c._up && c.publish(pubTopic, str, { qos: 0, retain }));
  }

  function close({ clearRetained = false } = {}) {
    if (clearRetained) clients.forEach((c) => c._up && c.publish(pubTopic, '', { qos: 0, retain: true }));
    clients.forEach((c) => c.end(true));
    clients.length = 0;
  }

  return { open, publish, close, get up() { return up(); } };
}
