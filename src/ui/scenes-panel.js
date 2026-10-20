// Lista de escenas: guardar, aplicar, sobrescribir y borrar.
import { get, set, on } from '../state.js';
import { saveScene, overwriteScene, removeScene, MAX_SCENES } from '../scenes.js';
import { $, toast } from './dom.js';

const ICON_SAVE = '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/>';
const ICON_DEL = '<path d="M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>';

export function createScenesPanel({ panel, background }) {
  const list = $('#scenes');
  const empty = $('#scenes-empty');
  const nameInput = $('#scene-name');

  async function recall(i) {
    const scene = get('scenes')[i];
    if (!scene) return;
    const keys = ['palette', 'sensitivity', 'dim', 'milkPreset', 'text', 'textOn', 'textSize', 'textPos', 'textPulse', 'textMarquee', 'logoOn', 'logoSize', 'logoPos', 'logoOpacity', 'logoPulse'];
    keys.forEach((k) => k in scene && set(k, scene[k]));
    set('activeScene', i);
    const bg = scene.bg || { source: 'none' };
    if (bg.source === 'youtube') panel.useYouTube(bg.url);
    else panel.setBackground(bg.source === 'local' && background.hasLocal ? 'local' : 'none');
    await panel.selectMode(scene.mode);
    if (scene.mode === 'milkdrop' && scene.milkPreset) panel.setPreset(scene.milkPreset);
  }

  function step(d) {
    const n = get('scenes').length;
    if (!n) return;
    const cur = get('activeScene');
    recall(cur < 0 ? (d > 0 ? 0 : n - 1) : (cur + d + n) % n);
  }

  function render() {
    const scenes = get('scenes');
    const active = get('activeScene');
    list.replaceChildren();
    scenes.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'scene';
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'scene-go';
      go.setAttribute('aria-pressed', String(i === active));
      go.append(document.createTextNode(s.name));
      const k = document.createElement('kbd');
      k.textContent = `⇧${i + 1}`;
      go.append(k);
      go.addEventListener('click', () => recall(i));
      const mk = (icon, label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'icon-btn';
        b.title = label;
        b.setAttribute('aria-label', `${label}: ${s.name}`);
        b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
        b.addEventListener('click', fn);
        return b;
      };
      row.append(
        go,
        mk(ICON_SAVE, 'Sobrescribir con lo actual', () => {
          overwriteScene(i);
          toast(`"${s.name}" actualizada`);
        }),
        mk(ICON_DEL, 'Borrar escena', () => removeScene(i)),
      );
      list.append(row);
    });
    empty.hidden = scenes.length > 0;
    $('#btn-scene-save').disabled = scenes.length >= MAX_SCENES;
  }

  function save() {
    const i = saveScene(nameInput.value || `Escena ${get('scenes').length + 1}`);
    if (i < 0) return toast(`Máximo ${MAX_SCENES} escenas`);
    set('activeScene', i);
    nameInput.value = '';
    toast('Escena guardada');
  }
  $('#btn-scene-save').addEventListener('click', save);
  nameInput.addEventListener('keydown', (e) => e.key === 'Enter' && save());
  on('scenes', render);
  on('activeScene', render);
  render();

  return { recall, step };
}
