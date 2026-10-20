// Plasma: ondas superpuestas que se deforman con graves, medios y agudos.
export function createPlasma() {
  return {
    id: 'plasma',
    name: 'Plasma',
    icon: '<path d="M3 8c3-3 6 3 9 0s6 3 9 0M3 14c3-3 6 3 9 0s6 3 9 0M3 20c3-3 6 3 9 0s6 3 9 0"/>',
    frag: `
void main() {
  vec2 p = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  p.x *= uRes.x / uRes.y;
  float t = uTime * 0.45;
  float v = 0.0;
  v += sin(p.x * 3.0 + t + uBass * 3.0);
  v += sin(p.y * 4.0 + t * 1.3 + sin(p.x * 2.0 + t) * 1.5);
  v += sin(length(p) * 5.0 - t * 2.0 + uMid * 4.0);
  v += sin(length(p - vec2(sin(t), cos(t * 1.2))) * 6.0 + uHigh * 5.0);
  v = v * 0.25 + 0.5;
  float e = spec(abs(p.x) * 0.55);
  float lum = clamp(0.06 + uLevel * 0.4 + e * 0.5 + uBeat * 0.2, 0.0, 0.9);
  gl_FragColor = emit(pal(v * 0.78) * lum * smoothstep(0.15, 0.85, v + 0.25));
}`,
  };
}
