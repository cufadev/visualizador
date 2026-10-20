// Mensajes entre la pantalla (host) y el celular (cliente). Todo lo que llega por la red se
// valida contra esta tabla antes de ejecutarse: el celular nunca manda codigo, solo ordenes.
const BOOL = (v) => typeof v === 'boolean';
const MAX_TEXT = 120;

export function validateCommand(msg, ctx) {
  if (!msg || msg.t !== 'cmd' || typeof msg.c !== 'string') return null;
  const v = msg.v;
  switch (msg.c) {
    case 'mode':
      return ctx.modes.includes(v) ? { c: 'mode', v } : null;
    case 'palette':
      return ctx.palettes.includes(v) ? { c: 'palette', v } : null;
    case 'sensitivity':
      return typeof v === 'number' && v >= 0.2 && v <= 4 ? { c: 'sensitivity', v } : null;
    case 'scene':
      return Number.isInteger(v) && v >= 0 && v < ctx.scenes ? { c: 'scene', v } : null;
    case 'text':
      return typeof v === 'string' ? { c: 'text', v: v.slice(0, MAX_TEXT) } : null;
    case 'textOn':
    case 'logoOn':
    case 'blackout':
      return BOOL(v) ? { c: msg.c, v } : null;
    case 'bgToggle':
    case 'flash':
    case 'nextPreset':
      return { c: msg.c };
    default:
      return null;
  }
}
