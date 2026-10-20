// Boton de grabacion y atajo R.
import { createRecorder } from '../record.js';
import { $, toast, friendlyError } from './dom.js';

export function createRecordPanel({ engine }) {
  const btn = $('#btn-rec');
  let tick = 0;

  const recorder = createRecorder({
    engine,
    onChange: (active, size) => {
      clearInterval(tick);
      btn.classList.toggle('rec-on', active);
      document.body.classList.toggle('recording', active);
      if (active) {
        document.body.classList.add('ui-off'); // que el panel no salga en el video
        const paint = () => {
          const s = recorder.seconds;
          btn.textContent = `● Grabando ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')} (R para cortar)`;
        };
        paint();
        tick = setInterval(paint, 1000);
      } else {
        btn.textContent = 'Empezar a grabar';
        document.body.classList.remove('ui-off');
        toast(`Grabación guardada${size ? ` (${(size / 1048576).toFixed(1)} MB)` : ''}`);
      }
    },
  });

  async function toggle() {
    try {
      if (recorder.active) recorder.stop();
      else await recorder.start();
    } catch (err) {
      if (err?.name !== 'NotAllowedError') toast(friendlyError(err));
    }
  }
  btn.addEventListener('click', toggle);
  return { toggle };
}
