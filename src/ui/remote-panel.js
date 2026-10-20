// Control remoto desde el celular: muestra el QR y mantiene al celular al dia con el estado.
import qrcode from 'qrcode-generator';
import { get, on } from '../state.js';
import { PALETTE_NAMES, paletteCss } from '../visuals/palettes.js';
import { createRemoteHost } from '../remote/host.js';
import { $, toast } from './dom.js';

const WATCH = ['mode', 'palette', 'sensitivity', 'scenes', 'activeScene', 'text', 'textOn', 'logoOn', 'bgSource'];

export function createRemotePanel({ renderer, engine, stage, background, panel, scenes }) {
  const btn = $('#btn-remote');
  const box = $('#remote-box');
  const count = $('#remote-count');
  let url = '';

  const palettes = Object.keys(PALETTE_NAMES);
  const modes = renderer.modes.map((m) => m.id);

  const host = createRemoteHost({
    getContext: () => ({ modes, palettes, scenes: get('scenes').length }),
    getState: () => ({
      mode: get('mode'),
      modes: renderer.modes.map((m) => ({ id: m.id, name: m.name })),
      palette: get('palette'),
      palettes: palettes.map((id) => ({ id, name: PALETTE_NAMES[id], css: paletteCss(id) })),
      sensitivity: get('sensitivity'),
      scenes: get('scenes').map((s) => s.name),
      activeScene: get('activeScene'),
      text: get('text'),
      textOn: get('textOn'),
      logoOn: get('logoOn'),
      hasLogo: stage.hasLogo(),
      bgOn: get('bgSource') !== 'none',
      blackout: stage.isBlackout(),
    }),
    exec: (c, v) => {
      const a = panel.actions;
      switch (c) {
        case 'mode': return panel.selectMode(v);
        case 'palette': return a.setPalette(v);
        case 'sensitivity': return a.setSensitivity(v);
        case 'scene': return scenes.recall(v);
        case 'text': return a.setText(v);
        case 'textOn': return a.setTextOn(v);
        case 'logoOn': return a.setLogoOn(v);
        case 'blackout': stage.setBlackout(v); return host.push();
        case 'flash': return stage.flash();
        case 'nextPreset': return a.nextPreset();
        case 'bgToggle': return a.toggleBackground();
      }
    },
    onCount: (n) => {
      phones = n;
      paintStatus();
    },
    onStatus: (up) => {
      servers = up;
      paintStatus();
    },
  });

  let phones = 0;
  let servers = 0;
  function paintStatus() {
    if (!host.active) return;
    const who = phones ? `${phones} celular${phones > 1 ? 'es' : ''} conectado${phones > 1 ? 's' : ''}` : 'Esperando celulares…';
    count.textContent = servers ? `${who} · enlace activo` : 'Reconectando con el enlace…';
    $('#remote-led').dataset.state = !servers ? 'wait' : phones ? 'on' : 'off';
  }

  WATCH.forEach((k) => on(k, () => host.push()));

  async function toggle() {
    if (host.active) {
      host.stop();
      box.hidden = true;
      btn.textContent = 'Activar control remoto';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Conectando…';
    try {
      url = await host.start();
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      // SVG: se ve nítido a cualquier tamaño y con el margen de 4 módulos que pide el estándar
      const svg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
      $('#remote-qr').src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      paintStatus();
      box.hidden = false;
      btn.textContent = 'Desactivar control remoto';
    } catch {
      btn.textContent = 'Activar control remoto';
      toast('No se pudo conectar con los servidores de enlace. ¿Hay internet?');
    }
    btn.disabled = false;
  }

  btn.addEventListener('click', toggle);
  $('#btn-remote-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link copiado');
    } catch {
      toast(url);
    }
  });

  return { push: () => host.push() };
}
