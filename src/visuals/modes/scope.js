// Osciloscopio con la forma de onda real, disparado en un cruce por cero para que no tiemble.
export function createScope() {
  return {
    id: 'scope',
    name: 'Onda',
    icon: '<path d="M2 12h3l2-6 3 12 3-9 2 6 2-3h5"/>',
    trail: 0.3,
    draw(g, f) {
      const w = f.wave;
      const points = 1024;
      let start = 0;
      for (let i = 1; i < w.length - points; i++) {
        if (w[i - 1] < 0 && w[i] >= 0) {
          start = i;
          break;
        }
      }
      const mid = f.h / 2;
      const amp = f.h * 0.38 * f.gain;
      const step = f.w / (points - 1);
      const color = f.color(0.35 + f.level * 0.65);

      const path = () => {
        g.beginPath();
        for (let i = 0; i < points; i++) {
          const y = mid - Math.max(-1, Math.min(1, w[start + i] * 3)) * amp;
          if (i === 0) g.moveTo(0, y);
          else g.lineTo(i * step, y);
        }
      };

      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = color;
      g.globalAlpha = 0.22;
      g.lineWidth = 12 + f.beat * 8;
      path();
      g.stroke();
      g.globalAlpha = 1;
      g.lineWidth = 2.5;
      path();
      g.stroke();
      g.globalCompositeOperation = 'source-over';
    },
  };
}
