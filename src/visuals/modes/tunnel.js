// Tunel: anillos que avanzan hacia vos y rayos cuyo brillo sigue el espectro.
export function createTunnel() {
  return {
    id: 'tunnel',
    name: 'Túnel',
    icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
    frag: `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float depth = 1.0 / (r + 0.07);
  float z = depth * 0.35 + uTime * 0.9;
  float m = abs(fract(a / 6.28318 + 0.5 + uTime * 0.02) * 2.0 - 1.0); // simetrico: graves arriba/abajo
  float s = spec(m);
  float ring = pow(abs(sin(z * 3.14159)), 5.0);
  float spoke = pow(abs(sin(a * 8.0 + uTime * 0.4 + depth * 0.2)), 10.0);
  float v = ring * (0.15 + s * 0.95) + spoke * (0.1 + uMid * 0.4) * s;
  v *= smoothstep(0.02, 0.4, r);
  v += uBeat * 0.22 * exp(-r * 3.5);
  float tone = clamp(v * 0.45 + s * 0.3, 0.0, 0.9);
  gl_FragColor = emit(pal(tone) * clamp(v * 0.85, 0.0, 1.0));
}`,
  };
}
