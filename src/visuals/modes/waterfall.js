// Espectrograma: el tiempo corre de derecha a izquierda, graves abajo y agudos arriba.
import { BANDS } from '../../audio/engine.js';

const COLS = 320;
const COLS_PER_SECOND = 40;

export function createWaterfall() {
  const off = document.createElement('canvas');
  off.width = COLS;
  off.height = BANDS;
  const og = off.getContext('2d');
  let acc = 0;
  return {
    id: 'waterfall',
    name: 'Cascada',
    icon: '<path d="M3 17c3-4 5-4 8 0s5 4 10-2M3 11c3-4 5-4 8 0s5 4 10-2M3 5c3-4 5-4 8 0s5 4 10-2"/>',
    reset() {
      og.clearRect(0, 0, COLS, BANDS);
    },
    draw(g, f) {
      acc += f.dt * COLS_PER_SECOND;
      while (acc >= 1) {
        acc -= 1;
        og.globalCompositeOperation = 'copy';
        og.drawImage(off, -1, 0);
        og.globalCompositeOperation = 'source-over';
        const s = f.spectrum;
        for (let i = 0; i < BANDS; i++) {
          const v = Math.pow(s[i], 1.8); // curva para que el fondo quede oscuro y solo brillen los picos
          if (v < 0.02) continue;
          og.globalAlpha = Math.min(1, v * 1.4);
          og.fillStyle = f.color(0.15 + v * 0.85);
          og.fillRect(COLS - 1, BANDS - 1 - i, 1, 1);
        }
        og.globalAlpha = 1;
      }
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.9;
      g.drawImage(off, 0, f.h * 0.08, f.w, f.h * 0.84);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },
  };
}
