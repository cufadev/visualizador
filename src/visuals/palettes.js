// Paletas como degradados de varias paradas, precalculadas en una tabla de 256 colores.
const STOPS = {
  brasa: ['#2a0a02', '#b3200a', '#ff4e01', '#ffb347', '#fff4d6'],
  aurora: ['#0b3d4a', '#12b5a3', '#7c5cff', '#ff5fa8', '#ffe3f1'],
  hielo: ['#06122b', '#1b4dff', '#38c6ff', '#b8f0ff', '#ffffff'],
  neon: ['#3a0066', '#ff2bd6', '#6a5cff', '#00e5ff', '#e8ffff'],
  toxico: ['#0b2a0b', '#1f9d2f', '#8cff2e', '#f4ff4a', '#ffffff'],
  atardecer: ['#1b0b3a', '#7a1fa2', '#ff3d6e', '#ff9a3c', '#ffe9a8'],
  winamp: ['#0a3d0a', '#22d422', '#d6e61e', '#ff9a00', '#ff1d1d'],
  mono: ['#2a2a2a', '#7d7d7d', '#cfcfcf', '#ffffff', '#ffffff'],
  espectro: null, // arcoiris por tono, se calcula aparte
};

export const PALETTE_NAMES = {
  brasa: 'Brasa',
  aurora: 'Aurora',
  hielo: 'Hielo',
  neon: 'Neón',
  toxico: 'Tóxico',
  atardecer: 'Atardecer',
  winamp: 'Winamp',
  mono: 'Mono',
  espectro: 'Espectro',
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function buildLut(id) {
  const lut = new Array(256);
  if (id === 'espectro') {
    for (let i = 0; i < 256; i++) lut[i] = `hsl(${Math.round((i / 255) * 300)} 95% 56%)`;
    return lut;
  }
  const stops = STOPS[id].map(hex);
  for (let i = 0; i < 256; i++) {
    const p = (i / 255) * (stops.length - 1);
    const a = Math.min(stops.length - 2, Math.floor(p));
    const k = p - a;
    const c = stops[a].map((v, j) => Math.round(v + (stops[a + 1][j] - v) * k));
    lut[i] = `rgb(${c[0]} ${c[1]} ${c[2]})`;
  }
  return lut;
}

const luts = {};
export function getPalette(id) {
  if (!(id in PALETTE_NAMES)) id = 'brasa';
  luts[id] ||= buildLut(id);
  const lut = luts[id];
  // v entre 0 y 1
  return (v) => lut[v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0];
}

// Degradado CSS para las muestras del panel
export function paletteCss(id) {
  if (id === 'espectro') {
    return 'linear-gradient(90deg, hsl(0 95% 56%), hsl(60 95% 56%), hsl(120 95% 56%), hsl(200 95% 56%), hsl(300 95% 56%))';
  }
  return `linear-gradient(90deg, ${STOPS[id].join(', ')})`;
}

// Paleta como textura RGBA de 256x1 para los shaders
function hslToRgb(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function getPaletteRGBA(id) {
  if (!(id in PALETTE_NAMES)) id = 'brasa';
  const out = new Uint8Array(256 * 4);
  const stops = id === 'espectro' ? null : STOPS[id].map(hex);
  for (let i = 0; i < 256; i++) {
    let c;
    if (!stops) {
      c = hslToRgb(Math.round((i / 255) * 300), 0.95, 0.56);
    } else {
      const p = (i / 255) * (stops.length - 1);
      const a = Math.min(stops.length - 2, Math.floor(p));
      const k = p - a;
      c = stops[a].map((v, j) => Math.round(v + (stops[a + 1][j] - v) * k));
    }
    out.set([c[0], c[1], c[2], 255], i * 4);
  }
  return out;
}
