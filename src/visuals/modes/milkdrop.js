// Presets estilo Milkdrop (Winamp) via Butterchurn. Se carga recien al elegir el modo,
// asi el arranque normal no paga el peso de la libreria ni de los presets.
export function createMilkdrop({ glCanvas, engine, onError }) {
  let viz = null;
  let presets = null;
  let names = [];
  let current = '';
  let loading = null;
  let lastSwitch = 0;

  async function init() {
    if (viz) return true;
    if (!loading) {
      loading = (async () => {
        const [bc, pk] = await Promise.all([import('butterchurn'), import('butterchurn-presets')]);
        // los paquetes son UMD: segun el empaquetado el export real puede venir un nivel mas adentro
        const unwrap = (m, key) => (m[key] ? m : m.default?.[key] ? m.default : m.default?.default);
        const butterchurn = unwrap(bc, 'createVisualizer');
        const pack = unwrap(pk, 'getPresets');
        presets = pack.getPresets();
        names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        viz = butterchurn.createVisualizer(engine.ctx, glCanvas, {
          width: Math.round(window.innerWidth * dpr),
          height: Math.round(window.innerHeight * dpr),
          pixelRatio: 1,
        });
        viz.connectAudio(engine.tap);
      })();
    }
    try {
      await loading;
      return true;
    } catch (err) {
      loading = null;
      onError?.(err);
      return false;
    }
  }

  return {
    id: 'milkdrop',
    name: 'Milkdrop',
    icon: '<path d="M12 3c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10z"/>',
    gl: true,
    init,
    get names() {
      return names;
    },
    get current() {
      return current;
    },
    setPreset(name, blend = 2.5) {
      if (!viz || !presets[name]) return;
      current = name;
      viz.loadPreset(presets[name], blend);
      lastSwitch = performance.now();
    },
    next() {
      if (!names.length) return '';
      const i = Math.floor(Math.random() * names.length);
      this.setPreset(names[i]);
      return names[i];
    },
    resize(w, h) {
      if (!viz) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      glCanvas.width = Math.round(w * dpr);
      glCanvas.height = Math.round(h * dpr);
      viz.setRendererSize(glCanvas.width, glCanvas.height);
    },
    render(auto) {
      if (!viz) return;
      if (auto && performance.now() - lastSwitch > 30000) this.next();
      viz.render();
    },
  };
}
