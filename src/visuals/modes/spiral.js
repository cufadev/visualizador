// Espiral de frecuencias con estela; en cada beat salen particulas del centro.
const TAU = Math.PI * 2;
const MAX_PARTICLES = 420;

export function createSpiral() {
  let rot = 0;
  let particles = [];
  return {
    id: 'spiral',
    name: 'Espiral',
    icon: '<path d="M12 12m0 0a1.5 1.5 0 1 1 1.5 1.5a3 3 0 1 1-3-3a4.5 4.5 0 1 1 4.5 4.5a6 6 0 1 1-6-6"/>',
    trail: 0.16,
    reset() {
      particles = [];
    },
    draw(g, f) {
      const s = f.spectrum;
      const n = s.length;
      const cx = f.w / 2;
      const cy = f.h / 2;
      const maxR = Math.min(cx, cy) * 0.85;
      rot += f.dt * (0.3 + f.bass * 1.2);

      if (f.beatFired) {
        const count = 12 + Math.floor(f.bass * 30);
        for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
          const a = Math.random() * TAU;
          const sp = 90 + Math.random() * 380 * (0.5 + f.bass);
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            size: 1.5 + Math.random() * 3.5,
            life: 1,
            decay: 0.5 + Math.random() * 0.7,
            hue: Math.random(),
          });
        }
      }

      for (let i = 0; i < n; i++) {
        const v = s[i];
        if (v < 0.04) continue;
        const a = (i / n) * TAU * 3.2 + rot;
        const r = (i / n) * maxR * (0.35 + v * 0.65);
        g.fillStyle = f.color(v * 0.7 + (i / n) * 0.3);
        g.beginPath();
        g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.5 + v * 7, 0, TAU);
        g.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * f.dt;
        p.y += p.vy * f.dt;
        p.life -= p.decay * f.dt;
        if (p.life <= 0 || p.x < 0 || p.x > f.w || p.y < 0 || p.y > f.h) {
          particles.splice(i, 1);
          continue;
        }
        g.globalAlpha = p.life;
        g.fillStyle = f.color(0.45 + p.hue * 0.55);
        g.beginPath();
        g.arc(p.x, p.y, p.size * (0.4 + p.life * 0.6), 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  };
}
