// Bucle de dibujo: arma el "cuadro" con los datos de audio y delega en el modo activo.
import { createBars } from './modes/bars.js';
import { createRadial } from './modes/radial.js';
import { createSpiral } from './modes/spiral.js';
import { createScope } from './modes/scope.js';
import { createRings } from './modes/rings.js';
import { createWaterfall } from './modes/waterfall.js';
import { createMilkdrop } from './modes/milkdrop.js';
import { getPalette } from './palettes.js';

export class Renderer {
  constructor({ fxCanvas, glCanvas, engine, onMilkError }) {
    this.fx = fxCanvas;
    this.gl = glCanvas;
    this.g = fxCanvas.getContext('2d');
    this.engine = engine;
    this.milk = createMilkdrop({ glCanvas, engine, onError: onMilkError });
    this.modes = [
      createBars(),
      createRadial(),
      createSpiral(),
      createScope(),
      createRings(),
      createWaterfall(),
      this.milk,
    ];
    this.mode = this.modes[0];
    this.milkAuto = true;
    this.last = performance.now();
    this.frame = {
      w: 0, h: 0, dt: 0.016, t: 0, gain: 1,
      spectrum: engine.spectrum, wave: engine.wave,
      bass: 0, mid: 0, high: 0, level: 0, beat: 0, beatFired: false,
      color: getPalette('brasa'),
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.fx.width = Math.round(w * dpr);
    this.fx.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.frame.w = w;
    this.frame.h = h;
    this.milk.resize(w, h);
  }

  setPalette(id) {
    this.frame.color = getPalette(id);
  }

  setSensitivity(v) {
    this.engine.sensitivity = v;
    this.frame.gain = v;
  }

  // Devuelve false si el modo no pudo iniciarse (por ejemplo, sin WebGL)
  async setMode(id) {
    const mode = this.modes.find((m) => m.id === id) || this.modes[0];
    if (mode.gl) {
      await this.engine.ensureContext();
      const ok = await mode.init();
      if (!ok) return false;
      mode.resize(this.frame.w, this.frame.h);
    }
    mode.reset?.();
    this.mode = mode;
    this.gl.classList.toggle('on', !!mode.gl);
    this.fx.classList.toggle('off', !!mode.gl);
    this.g.clearRect(0, 0, this.frame.w, this.frame.h);
    return true;
  }

  render(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const e = this.engine;
    e.update(dt, now);

    if (this.mode.gl) {
      this.mode.render(this.milkAuto);
      return;
    }

    const f = this.frame;
    f.dt = dt;
    f.t = now;
    f.bass = e.bass;
    f.mid = e.mid;
    f.high = e.high;
    f.level = e.level;
    f.beat = e.beat;
    f.beatFired = e.beatFired;

    const g = this.g;
    if (this.mode.trail) {
      // en vez de borrar, se desvanece lo anterior y queda una estela sobre el fondo
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = `rgba(0,0,0,${this.mode.trail})`;
      g.fillRect(0, 0, f.w, f.h);
      g.globalCompositeOperation = 'source-over';
    } else {
      g.clearRect(0, 0, f.w, f.h);
    }
    this.mode.draw(g, f);
  }
}
