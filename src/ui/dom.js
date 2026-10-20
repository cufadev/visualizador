export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Pinta la parte llena del slider (la variable --fill la usa el CSS)
export function setFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  input.style.setProperty('--fill', `${((input.value - min) / (max - min)) * 100}%`);
}

let toastTimer = 0;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

export function friendlyError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permiso denegado. Habilitá el micrófono desde el candado de la barra de direcciones, o probá con la demo.';
    case 'NotFoundError':
      return 'No se encontró ninguna entrada de audio.';
    case 'NotReadableError':
      return 'La entrada está en uso por otro programa.';
    default:
      return err?.message || 'No se pudo abrir la entrada de audio.';
  }
}
