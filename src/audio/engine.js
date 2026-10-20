// Motor de audio: entrada (microfono o demo sintetica), analisis en bandas
// logaritmicas, niveles graves/medios/agudos y deteccion de beat.
import { startDemo } from './demo.js';

export const BANDS = 80;
const F_MIN = 40;
const F_MAX = 16000;
const FFT_SIZE = 2048;
const BASE_GAIN = 1.6; // un micro de notebook llega bajito; la sensibilidad multiplica sobre esto

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.tap = null; // nodo unico al que se conecta cualquier fuente (y Butterchurn)
    this.analyser = null;
    this.freq = null;
    this.waveRaw = null;
    this.wave = new Float32Array(FFT_SIZE);
    this.spectrum = new Float32Array(BANDS);
    this.sensitivity = 1;
    this.bass = 0;
    this.mid = 0;
    this.high = 0;
    this.level = 0;
    this.beat = 0; // pulso que cae de 1 a 0
    this.beatFired = false; // true solo en el cuadro donde se detecto
    this.sourceKind = 'idle'; // 'idle' | 'mic' | 'demo'
    this.sourceLabel = '';
    this._stream = null;
    this._micNode = null;
    this._stopDemo = null;
    this._avgBass = 0;
    this._lastBeat = 0;
    this._lo = new Float32Array(BANDS);
    this._hi = new Float32Array(BANDS);
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      this.tap = this.ctx.createGain();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = FFT_SIZE;
      this.analyser.minDecibels = -85;
      this.analyser.maxDecibels = -15;
      this.analyser.smoothingTimeConstant = this._smoothing ?? 0.6;
      this.tap.connect(this.analyser);
      this.freq = new Uint8Array(this.analyser.frequencyBinCount);
      this.waveRaw = new Float32Array(FFT_SIZE);
      const binHz = this.ctx.sampleRate / FFT_SIZE;
      for (let i = 0; i < BANDS; i++) {
        const f0 = F_MIN * Math.pow(F_MAX / F_MIN, i / BANDS);
        const f1 = F_MIN * Math.pow(F_MAX / F_MIN, (i + 1) / BANDS);
        this._lo[i] = f0 / binHz;
        this._hi[i] = f1 / binHz;
      }
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setSmoothing(v) {
    if (this.analyser) this.analyser.smoothingTimeConstant = v;
    this._smoothing = v;
  }

  async listInputs() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Entrada ${i + 1}` }));
  }

  stopSources() {
    if (this._stopDemo) {
      this._stopDemo();
      this._stopDemo = null;
    }
    if (this._micNode) {
      this._micNode.disconnect();
      this._micNode = null;
    }
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
      this._stream = null;
    }
    this.sourceKind = 'idle';
    this.sourceLabel = '';
  }

  async useMic(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('El navegador no permite usar el micrófono acá (hace falta HTTPS, localhost o abrir el archivo directamente).');
    }
    await this.ensureContext();
    this.stopSources();
    const base = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { ...base, deviceId: { exact: deviceId } } : base,
      });
    } catch (err) {
      // el dispositivo guardado ya no esta (otro puerto USB, otra mesa): probar con el default
      if (deviceId && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: base });
      } else {
        throw err;
      }
    }
    this._stream = stream;
    this._micNode = this.ctx.createMediaStreamSource(stream);
    this._micNode.connect(this.tap);
    this.sourceKind = 'mic';
    this.sourceLabel = stream.getAudioTracks()[0]?.label || 'Micrófono';
    return stream.getAudioTracks()[0]?.getSettings().deviceId || deviceId || '';
  }

  async useDemo() {
    await this.ensureContext();
    this.stopSources();
    this._stopDemo = startDemo(this.ctx, this.tap);
    this.sourceKind = 'demo';
    this.sourceLabel = 'Demo sintética';
  }

  // Se llama una vez por cuadro. dt en segundos, now en ms.
  update(dt, now) {
    this.beatFired = false;
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getFloatTimeDomainData(this.waveRaw);

    const gain = BASE_GAIN * this.sensitivity;
    const bins = this.freq.length;

    // bandas logaritmicas con compensacion de inclinacion (los agudos llegan mas flojos)
    for (let i = 0; i < BANDS; i++) {
      const lo = this._lo[i];
      const hi = this._hi[i];
      let v;
      if (hi - lo <= 1) {
        const pos = (lo + hi) / 2;
        const a = Math.min(bins - 1, Math.floor(pos));
        const b = Math.min(bins - 1, a + 1);
        const k = pos - a;
        v = (this.freq[a] * (1 - k) + this.freq[b] * k) / 255;
      } else {
        let max = 0;
        const end = Math.min(bins - 1, Math.ceil(hi));
        for (let j = Math.floor(lo); j <= end; j++) if (this.freq[j] > max) max = this.freq[j];
        v = max / 255;
      }
      const tilt = 0.85 + 1.15 * (i / BANDS);
      this.spectrum[i] = clamp01(v * gain * tilt);
    }

    // niveles por rango de frecuencia
    const binHz = this.ctx.sampleRate / FFT_SIZE;
    const avg = (f0, f1) => {
      const a = Math.max(1, Math.floor(f0 / binHz));
      const b = Math.min(bins - 1, Math.floor(f1 / binHz));
      let s = 0;
      for (let j = a; j <= b; j++) s += this.freq[j];
      return s / (b - a + 1) / 255;
    };
    this.bass = clamp01(avg(20, 250) * gain);
    this.mid = clamp01(avg(250, 2000) * gain * 1.5);
    this.high = clamp01(avg(2000, 8000) * gain * 2.4);

    // forma de onda y nivel RMS
    let sum = 0;
    for (let i = 0; i < FFT_SIZE; i++) {
      const x = this.waveRaw[i];
      this.wave[i] = x;
      sum += x * x;
    }
    const rms = Math.sqrt(sum / FFT_SIZE);
    const target = clamp01(rms * 4 * gain);
    this.level += (target - this.level) * (target > this.level ? 0.5 : 0.08);

    // beat: la energia de graves supera su promedio reciente
    this._avgBass += (this.bass - this._avgBass) * Math.min(1, dt * 1.6);
    if (this.bass > this._avgBass * 1.3 + 0.07 && now - this._lastBeat > 200) {
      this._lastBeat = now;
      this.beat = 1;
      this.beatFired = true;
    } else {
      this.beat = Math.max(0, this.beat - dt * 3.5);
    }
  }
}
