// Fuente sintetica para probar visuales sin microfono. Va solo al analizador,
// nunca a los parlantes (no se conecta a ctx.destination).
export function startDemo(ctx, out) {
  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  bus.connect(out);

  const bpm = 118;
  const eighth = 60 / bpm / 2;
  const noise = ctx.createBuffer(1, ctx.sampleRate / 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const env = (g, t, peak, decay) => {
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  };

  function kick(t) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    env(g, t, 1, 0.4);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.45);
  }

  function noiseHit(t, type, freq, peak, decay) {
    const s = ctx.createBufferSource();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    s.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    env(g, t, peak, decay);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
    s.stop(t + decay + 0.05);
  }

  function bass(t, freq) {
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + eighth);
    env(g, t, 0.4, eighth * 0.95);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + eighth);
  }

  function pad(t, freqs) {
    const dur = eighth * 16;
    for (const fr of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = fr;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 1);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(bus);
      o.start(t);
      o.stop(t + dur);
    }
  }

  const line = [55, 55, 82.4, 55, 73.4, 73.4, 98, 73.4];
  const chords = [
    [220, 261.6, 329.6],
    [196, 246.9, 293.7],
  ];
  let next = ctx.currentTime + 0.1;
  let step = 0;

  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.25) {
      const s = step % 16;
      if (s % 4 === 0) kick(next);
      if (s === 4 || s === 12) noiseHit(next, 'bandpass', 1800, 0.5, 0.18);
      noiseHit(next, 'highpass', 7000, s % 2 ? 0.22 : 0.12, s % 2 ? 0.12 : 0.04);
      bass(next, line[s % line.length]);
      if (s === 0) pad(next, chords[(step / 16) % 2]);
      next += eighth;
      step++;
    }
  }, 60);

  return () => {
    clearInterval(timer);
    bus.disconnect();
  };
}
