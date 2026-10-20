// Grabacion de la salida. Se usa la captura de pestaña del navegador porque es lo unico que
// incluye todas las capas tal como se ven (video, visuales, texto, logo, incluso YouTube).
// El audio se toma directo del motor, asi queda lo que escucha el micrófono.
export function createRecorder({ engine, onChange }) {
  let recorder = null;
  let display = null;
  let dest = null;
  let chunks = [];
  let startedAt = 0;

  const pickMime = () =>
    ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';

  async function start() {
    if (recorder) return;
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('Este navegador no permite grabar la pantalla');
    }
    display = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    });
    const tracks = [...display.getVideoTracks()];
    if (engine.ctx && engine.tap) {
      dest = engine.ctx.createMediaStreamDestination();
      engine.tap.connect(dest);
      tracks.push(...dest.stream.getAudioTracks());
    }
    const mimeType = pickMime();
    recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mimeType || undefined, videoBitsPerSecond: 8_000_000 });
    chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = finish;
    // si el usuario corta desde la barra del navegador ("dejar de compartir")
    display.getVideoTracks()[0].addEventListener('ended', () => stop());
    startedAt = Date.now();
    recorder.start(1000);
    onChange(true);
  }

  function finish() {
    const blob = new Blob(chunks, { type: recorder?.mimeType || 'video/webm' });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `visual-${stamp}.webm`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    if (dest) {
      engine.tap.disconnect(dest);
      dest = null;
    }
    display?.getTracks().forEach((t) => t.stop());
    display = null;
    recorder = null;
    onChange(false, blob.size);
  }

  function stop() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  return {
    start,
    stop,
    get active() {
      return !!recorder;
    },
    get seconds() {
      return recorder ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    },
  };
}
