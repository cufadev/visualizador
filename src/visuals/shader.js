// Superficie WebGL para los modos con shader: un cuadrilatero a pantalla completa y un
// fragment shader por modo. El shader recibe el audio como uniforms y texturas.
const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

const HEADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uHigh, uLevel, uBeat;
uniform sampler2D uSpec; // espectro logaritmico, 1 canal
uniform sampler2D uPal;  // paleta activa
vec3 pal(float v) { return texture2D(uPal, vec2(clamp(v, 0.0, 1.0), 0.5)).rgb; }
float spec(float x) { return texture2D(uSpec, vec2(clamp(x, 0.0, 1.0), 0.5)).r; }
// salida con alpha premultiplicado: lo oscuro deja ver el video de fondo
vec4 emit(vec3 c) { c = clamp(c, 0.0, 1.0); return vec4(c, max(c.r, max(c.g, c.b))); }
`;

export class ShaderSurface {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.progs = new Map();
    this.time = 0;
    this.specBytes = null;
  }

  init() {
    if (this.gl) return true;
    const gl = this.canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) return false;
    this.gl = gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.specTex = this._texture(0);
    this.palTex = this._texture(1);
    return true;
  }

  _texture(unit) {
    const gl = this.gl;
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  setPalette(rgba) {
    if (!this.gl) {
      this._pendingPal = rgba;
      return;
    }
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.palTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  }

  resize(w, h, dpr) {
    const c = this.canvas;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    if (this.gl) this.gl.viewport(0, 0, c.width, c.height);
  }

  // Compila (una sola vez) el programa del modo. Lanza si el shader tiene errores.
  use(mode) {
    const gl = this.gl;
    let prog = this.progs.get(mode.id);
    if (!prog) {
      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
        return sh;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, HEADER + mode.frag));
      gl.bindAttribLocation(prog, 0, 'p');
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      prog.u = {};
      for (const n of ['uRes', 'uTime', 'uBass', 'uMid', 'uHigh', 'uLevel', 'uBeat', 'uSpec', 'uPal']) {
        prog.u[n] = gl.getUniformLocation(prog, n);
      }
      this.progs.set(mode.id, prog);
    }
    if (this._pendingPal) {
      this.setPalette(this._pendingPal);
      this._pendingPal = null;
    }
    gl.useProgram(prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.current = prog;
  }

  draw(f) {
    const gl = this.gl;
    const u = this.current.u;
    const n = f.spectrum.length;
    if (!this.specBytes || this.specBytes.length !== n) this.specBytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) this.specBytes[i] = Math.round(f.spectrum[i] * 255);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.specTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, n, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.specBytes);

    // el tiempo avanza mas rapido con la energia, asi el movimiento sigue la musica
    this.time += f.dt * (0.6 + f.level * 1.4);
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uBass, f.bass);
    gl.uniform1f(u.uMid, f.mid);
    gl.uniform1f(u.uHigh, f.high);
    gl.uniform1f(u.uLevel, f.level);
    gl.uniform1f(u.uBeat, f.beat);
    gl.uniform1i(u.uSpec, 0);
    gl.uniform1i(u.uPal, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
