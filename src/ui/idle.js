// Oculta el panel y el cursor tras unos segundos sin actividad (pantalla limpia para el proyector).
export function initIdle(panel, ms = 3500) {
  let timer = 0;
  const busy = () => panel.matches(':hover') || panel.querySelector(':focus-visible');

  function arm() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (busy()) arm();
      else document.body.classList.add('idle');
    }, ms);
  }

  function wake() {
    document.body.classList.remove('idle');
    arm();
  }

  ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, wake, { passive: true }),
  );
  arm();
}
