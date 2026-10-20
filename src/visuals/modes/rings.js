// Tres anillos (graves, medios, agudos) y ondas que se expanden en cada beat.
const TAU = Math.PI * 2;

export function createRings() {
  let ripples = [];
  return {
    id: 'rings',
    name: 'Anillos',
    icon: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9"/>',
    reset() {
      ripples = [];
    },
    draw(g, f) {
      const cx = f.w / 2;
      const cy = f.h / 2;
      const base = Math.min(cx, cy);
      g.globalCompositeOperation = 'lighter';

      if (f.beatFired) ripples.push({ r: base * 0.1, a: 0.9 });
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += f.dt * base * 0.9;
        rp.a -= f.dt * 0.55;
        if (rp.a <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        g.globalAlpha = rp.a;
        g.lineWidth = 2 + rp.a * 5;
        g.strokeStyle = f.color(0.55 + rp.a * 0.45);
        g.beginPath();
        g.arc(cx, cy, rp.r, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;

      const rings = [
        { r: 0.28, v: f.bass },
        { r: 0.5, v: f.mid },
        { r: 0.72, v: f.high },
      ];
      rings.forEach((ring, i) => {
        const pulse = Math.sin(f.t * 0.002 + i * 1.3) * 0.03;
        const radius = base * ring.r * (0.88 + ring.v * 0.3 + pulse + f.beat * 0.04);
        g.lineWidth = 4 + ring.v * 24;
        g.strokeStyle = f.color(0.25 + ring.v * 0.75);
        g.beginPath();
        g.arc(cx, cy, radius, 0, TAU);
        g.stroke();
      });
      g.globalCompositeOperation = 'source-over';
    },
  };
}
