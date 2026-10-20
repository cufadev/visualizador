// Controles de texto y logo.
import { get, set, on } from '../state.js';
import { $, toast } from './dom.js';
import { bindRange, bindSeg, bindCheck, bindSelect } from './bind.js';

export function createStagePanel({ stage }) {
  // ---------- texto ----------
  const input = $('#text-input');
  input.value = get('text');
  const show = () => {
    set('text', input.value);
    set('textOn', true);
  };
  input.addEventListener('input', () => set('text', input.value));
  input.addEventListener('keydown', (e) => e.key === 'Enter' && show());
  $('#btn-text').addEventListener('click', () => (get('textOn') ? set('textOn', false) : show()));
  const syncTextBtn = () => ($('#btn-text').textContent = get('textOn') ? 'Ocultar' : 'Mostrar');
  on('textOn', syncTextBtn);
  on('text', (v) => input.value !== v && (input.value = v));
  syncTextBtn();
  bindRange('#text-size', 'textSize', (v) => `${Math.round((v / 22) * 100)}%`);
  bindSeg('#text-pos', 'textPos');
  bindCheck('#text-pulse', 'textPulse');
  bindCheck('#text-marquee', 'textMarquee');

  // ---------- logo ----------
  const file = $('#logo-file');
  const clearBtn = $('#btn-logo-clear');
  const syncLogo = () => (clearBtn.hidden = !stage.hasLogo());
  $('#btn-logo').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    try {
      const { persisted } = await stage.loadLogo(file.files[0]);
      set('logoOn', true);
      $('#logo-on').checked = true;
      if (!persisted) toast('El logo es grande: no se va a recordar al cerrar. Probá con uno más liviano.');
    } catch (err) {
      toast(err.message);
    }
    file.value = '';
    syncLogo();
  });
  clearBtn.addEventListener('click', () => {
    stage.clearLogo();
    set('logoOn', false);
    syncLogo();
  });
  bindCheck('#logo-on', 'logoOn');
  bindCheck('#logo-pulse', 'logoPulse');
  bindRange('#logo-size', 'logoSize', (v) => `${v}%`);
  bindRange('#logo-opacity', 'logoOpacity', (v) => `${Math.round(v * 100)}%`);
  bindSelect('#logo-pos', 'logoPos');
  syncLogo();
}
