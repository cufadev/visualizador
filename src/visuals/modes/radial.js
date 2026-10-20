// Barras alrededor de un circulo que gira y late con los graves.
const TAU = Math.PI * 2;

export function createRadial() {
  let rot = 0;
  return {
    id: 'radial',
    name: 'Radial',
    icon: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9L18 18M18 6l-2.1 2.1M8.1 15.9L6 18"/>',
    draw(g, f) {
      const s = f.spectrum;
      const n = s.length;
      const cx = f.w / 2;
      const cy = f.h / 2;
      const base = Math.min(f.w, f.h);
      rot += f.dt * (0.12 + f.bass * 0.5);
      const r0 = base * 0.17 * (1 + f.beat * 0.12 + f.bass * 0.08);
      const maxLen = base * 0.3;
      const total = n * 2; // espejado: el espectro va y vuelve para cerrar el circulo
      g.lineCap = 'round';
      g.lineWidth = Math.max(2, ((TAU * r0) / total) * 0.62);

      for (let i = 0; i < total; i++) {
        const idx = i < n ? i : total - 1 - i;
        const v = s[idx];
        const a = rot + (i / total) * TAU;
        const len = v * maxLen + 3;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        g.strokeStyle = f.color(v * 0.75 + (idx / n) * 0.25);
        g.beginPath();
        g.moveTo(cx + cos * r0, cy + sin * r0);
        g.lineTo(cx + cos * (r0 + len), cy + sin * (r0 + len));
        g.stroke();
      }

      g.lineWidth = 3;
      g.strokeStyle = f.color(0.4 + f.bass * 0.6);
      g.globalAlpha = 0.85;
      g.beginPath();
      g.arc(cx, cy, r0 - 8, 0, TAU);
      g.stroke();
      g.globalAlpha = 1;
    },
  };
}
