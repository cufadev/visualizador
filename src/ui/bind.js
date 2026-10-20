// Enlaces genericos entre un control del panel y una clave del estado.
import { get, set, on } from '../state.js';
import { $, $$, setFill } from './dom.js';

export function bindRange(sel, key, fmt, apply) {
  const input = $(sel);
  const out = input.closest('.field').querySelector('output');
  const paint = () => {
    setFill(input);
    if (out) out.textContent = fmt(Number(input.value));
  };
  input.value = get(key);
  paint();
  input.addEventListener('input', () => set(key, Number(input.value)));
  on(key, (v) => {
    input.value = v;
    paint();
    apply?.(v);
  });
  apply?.(get(key));
}

// Botones con data-v: uno queda activo segun el valor del estado
export function bindSeg(sel, key) {
  const btns = $$(`${sel} button`);
  const paint = () => btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(get(key)))));
  btns.forEach((b) => b.addEventListener('click', () => set(key, b.dataset.v)));
  on(key, paint);
  paint();
}

export function bindCheck(sel, key) {
  const input = $(sel);
  input.checked = !!get(key);
  input.addEventListener('change', () => set(key, input.checked));
  on(key, (v) => (input.checked = !!v));
}

export function bindSelect(sel, key) {
  const input = $(sel);
  input.value = get(key);
  input.addEventListener('change', () => set(key, input.value));
  on(key, (v) => (input.value = v));
}
