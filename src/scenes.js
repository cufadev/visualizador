// Escenas: una "foto" de los ajustes visuales que se puede guardar y volver a aplicar.
import { get, set } from './state.js';

export const MAX_SCENES = 9;

// Los ajustes de audio (dispositivo, suavizado) no entran: dependen del lugar, no del tema.
const KEYS = [
  'mode', 'palette', 'sensitivity', 'dim', 'milkPreset',
  'text', 'textOn', 'textSize', 'textPos', 'textPulse', 'textMarquee',
  'logoOn', 'logoSize', 'logoPos', 'logoOpacity', 'logoPulse',
];

export function snapshot(name) {
  const scene = { name: name.trim().slice(0, 24) || 'Escena' };
  KEYS.forEach((k) => (scene[k] = get(k)));
  // un video local no se puede guardar (es un archivo del disco); YouTube si
  scene.bg = get('bgSource') === 'youtube' ? { source: 'youtube', url: get('youtubeUrl') } : { source: get('bgSource') };
  return scene;
}

export function saveScene(name) {
  const list = get('scenes');
  if (list.length >= MAX_SCENES) return -1;
  set('scenes', [...list, snapshot(name)]);
  return list.length;
}

export function overwriteScene(i) {
  const list = get('scenes');
  if (!list[i]) return;
  set('scenes', list.map((s, j) => (j === i ? { ...snapshot(s.name) } : s)));
}

export function removeScene(i) {
  const list = get('scenes');
  set('scenes', list.filter((_, j) => j !== i));
  const active = get('activeScene');
  set('activeScene', active === i ? -1 : active > i ? active - 1 : active);
}
