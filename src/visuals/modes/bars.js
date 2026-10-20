// Barras espejadas sobre el eje central, con picos que caen despacio.
export function createBars() {
  let peaks = null;
  return {
    id: 'bars',
    name: 'Barras',
    icon: '<path d="M5 14v-4M9 18V6M13 15V9M17 19V5M21 13v-2"/>',
    draw(g, f) {
      const s = f.spectrum;
      const n = s.length;
      if (!peaks || peaks.length !== n) peaks = new Float32Array(n);
      const mid = f.h / 2;
      const maxH = f.h * 0.42;
      const slot = f.w / n;
      const bw = slot * 0.72;
      const round = typeof g.roundRect === 'function';

      for (let i = 0; i < n; i++) {
        const v = s[i];
        const hh = Math.max(2, v * maxH * (1 + f.beat * 0.08));
        const x = i * slot + (slot - bw) / 2;
        g.fillStyle = f.color(v * 0.75 + (i / n) * 0.25);
        if (round) {
          g.beginPath();
          g.roundRect(x, mid - hh, bw, hh * 2, Math.min(bw / 2, 8));
          g.fill();
        } else {
          g.fillRect(x, mid - hh, bw, hh * 2);
        }

        peaks[i] = Math.max(peaks[i] - f.dt * 0.35, v);
        if (peaks[i] > 0.04) {
          const py = peaks[i] * maxH + 7;
          g.fillStyle = 'rgba(255,255,255,0.8)';
          g.fillRect(x, mid - py - 3, bw, 3);
          g.fillRect(x, mid + py, bw, 3);
        }
      }

      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.fillRect(0, mid - 0.5, f.w, 1);
    },
  };
}
