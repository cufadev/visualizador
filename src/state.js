// Ajustes de la app con persistencia en localStorage y suscripcion por clave.
const STORAGE_KEY = 'visual:v3';

const defaults = {
  mode: 'bars',
  palette: 'brasa',
  sensitivity: 1,
  smoothing: 0.6,
  dim: 0.35,
  bgSource: 'none',
  youtubeUrl: '',
  deviceId: '',
  milkAuto: true,
  milkPreset: '',
  collapsed: ['entrada', 'respuesta', 'color', 'fondo', 'texto', 'logo', 'remoto', 'grabar', 'atajos'],
  text: '',
  textOn: false,
  textSize: 8, // en vw
  textPos: 'center', // 'top' | 'center' | 'bottom'
  textPulse: true,
  textMarquee: false,
  logoOn: false,
  logoSize: 24, // en vh
  logoPos: 'center', // 'center' | 'tl' | 'tr' | 'bl' | 'br'
  logoOpacity: 1,
  logoPulse: true,
  scenes: [],
  activeScene: -1,
};

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // modo privado o almacenamiento bloqueado: la app sigue sin recordar
  }
}

const data = { ...defaults, ...load() };
const listeners = new Map();

export function get(key) {
  return data[key];
}

export function set(key, value) {
  if (data[key] === value) return;
  data[key] = value;
  save();
  (listeners.get(key) || []).forEach((fn) => fn(value));
}

export function on(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}
