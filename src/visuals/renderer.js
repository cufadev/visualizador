// Bucle de dibujo: arma el "cuadro" con los datos de audio y delega en el modo activo.
import { createBars } from './modes/bars.js';
import { createRadial } from './modes/radial.js';
import { createSpiral } from './modes/spiral.js';
import { createScope } from './modes/scope.js';
import { createRings } from './modes/rings.js';
import { createWaterfall } from './modes/waterfall.js';
import { createTunnel } from './modes/tunnel.js';
import { createPlasma } from './modes/plasma.js';
import { createKaleido } from './modes/kaleido.js';
import { createMilkdrop } from './modes/milkdrop.js';
import { getPalette, getPaletteRGBA } from './palettes.js';
import { ShaderSurface } from './shader.js';

// Duracion y curva compartidas por la transicion de modo (CSS, ver --ease) y la de color
const FADE_MS = 600;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export class Renderer {
  constructor({ fxCanvas, glCanvas, shCanvas, xfadeCanvas, engine, onMilkError }) {
    this.fx = fxCanvas;
    this.gl = glCanvas;
    this.shCanvas = shCanvas;
    this.xfade = xfadeCanvas;
    this.surface = '2d'; // cual de las tres capas esta activa: '2d' | 'sh' | 'gl'
    this.fx.classList.add('on');
    this.sh = new ShaderSurface(shCanvas);
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
      createTunnel(),
      createPlasma(),
      createKaleido(),
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
    // transicion de paleta: se mezcla la tabla vieja con la nueva cuadro a cuadro
    this.palCurrent = getPaletteRGBA('brasa');
    this.palFrom = this.palCurrent;
    this.palTarget = this.palCurrent;
    this.palLut = new Array(256).fill('rgb(0 0 0)');
    this.palT = 1;
    this.palId = 'brasa';
    this.palStarted = false;
    this.blendColor = (v) => this.palLut[v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0];
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
    this.sh.resize(w, h, Math.min(dpr, 1.5));
  }

  setPalette(id) {
    const target = getPaletteRGBA(id);
    this.palId = id;
    // la primera vez (al arrancar) y con movimiento reducido se cambia de golpe
    if (!this.palStarted || reducedMotion()) {
      this.palStarted = true;
      this.palCurrent = target.slice();
      this.palTarget = target;
      this.palT = 1;
      this.frame.color = getPalette(id);
      this.sh.setPalette(target);
      return;
    }
    this.palFrom = this.palCurrent.slice(); // parte de lo que se ve ahora, aunque haya otra transicion en curso
    this.palTarget = target;
    this.palT = 0;
    this.frame.color = this.blendColor;
  }

  _tickPalette(dt) {
    if (this.palT >= 1) return;
    this.palT = Math.min(1, this.palT + (dt * 1000) / FADE_MS);
    const k = easeOutExpo(this.palT);
    const cur = this.palCurrent;
    for (let i = 0; i < 1024; i++) cur[i] = this.palFrom[i] + (this.palTarget[i] - this.palFrom[i]) * k;
    if (this.palT >= 1) {
      this.frame.color = getPalette(this.palId); // vuelve a la tabla exacta
      this.sh.setPalette(this.palTarget);
      return;
    }
    for (let i = 0; i < 256; i++) this.palLut[i] = `rgb(${cur[i * 4] | 0} ${cur[i * 4 + 1] | 0} ${cur[i * 4 + 2] | 0})`;
    this.sh.setPalette(cur);
  }

  // Deja una copia del cuadro actual encima y la desvanece mientras el modo nuevo empieza debajo
  _snapshot(canvas) {
    const x = this.xfade;
    x.width = canvas.width;
    x.height = canvas.height;
    x.getContext('2d').drawImage(canvas, 0, 0);
    x.style.transition = 'none';
    x.style.opacity = '1';
    void x.offsetWidth; // aplica el estado inicial antes de animar
    x.style.transition = '';
    x.style.opacity = '0';
  }

  setSensitivity(v) {
    this.engine.sensitivity = v;
    this.frame.gain = v;
  }

  // Devuelve false si el modo no pudo iniciarse (por ejemplo, sin WebGL)
  async setMode(id) {
    const mode = this.modes.find((m) => m.id === id) || this.modes[0];
    if (mode.frag) {
      if (!this.sh.init()) return false;
      try {
        this.sh.use(mode);
      } catch (err) {
        console.error('Shader', mode.id, err);
        return false;
      }
    }
    if (mode.gl) {
      await this.engine.ensureContext();
      const ok = await mode.init();
      if (!ok) return false;
      mode.resize(this.frame.w, this.frame.h);
    }
    mode.reset?.();
    const next = mode.gl ? 'gl' : mode.frag ? 'sh' : '2d';
    const animate = this.modeStarted && !reducedMotion();
    // misma capa (barras -> radial, tunel -> plasma): no hay otra capa para fundir, se funde una copia
    if (animate && next === this.surface && next !== 'gl') this._snapshot(next === 'sh' ? this.shCanvas : this.fx);
    this.mode = mode;
    // capas distintas: cada una anima su opacidad por CSS, una entra mientras la otra sale
    this.gl.classList.toggle('on', next === 'gl');
    this.shCanvas.classList.toggle('on', next === 'sh');
    this.fx.classList.toggle('on', next === '2d');
    this.surface = next;
    this.modeStarted = true;
    this.g.clearRect(0, 0, this.frame.w, this.frame.h);
    return true;
  }

  render(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const e = this.engine;
    e.update(dt, now);
    this._tickPalette(dt);

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

    if (this.mode.frag) {
      this.sh.draw(f);
      return;
    }

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
