// Caleidoscopio: pliega el plano en 8 sectores y le aplica un fractal que late con los graves.
export function createKaleido() {
  return {
    id: 'kaleido',
    name: 'Caleidoscopio',
    icon: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
    frag: `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float t = uTime * 0.25;
  float r = length(uv);
  float a = atan(uv.y, uv.x) + t * 0.5;
  float seg = 6.28318 / 8.0;
  a = abs(mod(a, seg) - seg * 0.5);
  vec2 q = r * vec2(cos(a), sin(a)) * (1.6 - uBass * 0.35);
  float acc = 0.0;
  for (int i = 0; i < 6; i++) {
    q = abs(q) / max(dot(q, q), 0.0001) - vec2(0.78 + 0.1 * sin(t) + uMid * 0.12, 0.62);
    acc += exp(-length(q) * 2.2);
  }
  float s = spec(r * 1.1);
  float v = clamp(acc * 0.55, 0.0, 1.0);
  float lum = clamp(0.32 + s * 0.7 + uBeat * 0.25, 0.0, 1.0);
  gl_FragColor = emit(pal(fract(v * 0.5 + t * 0.2) * 0.8) * v * lum);
}`,
  };
}
