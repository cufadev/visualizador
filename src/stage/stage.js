// Capas del escenario por encima del visualizador: texto, logo, blackout y flash.
import { get, on } from '../state.js';
import { $ } from '../ui/dom.js';

const LOGO_KEY = 'visual:logo';
const MAX_LOGO_BYTES = 1_500_000;

export function createStage({ engine, renderer }) {
  const textEl = $('#stage-text');
  const track = $('.st-track', textEl);
  const span = $('span', track);
  const logo = $('#logo');
  const blackoutEl = $('#blackout');
  const flashEl = $('#flash');
  let frameCount = 0;

  // ---------- texto ----------
  function applyText() {
    const text = get('text');
    span.textContent = text;
    textEl.hidden = !(get('textOn') && text.trim());
    textEl.dataset.pos = get('textPos');
    textEl.style.setProperty('--ts', get('textSize'));
    textEl.classList.toggle('marquee', get('textMarquee'));
  }
  ['text', 'textOn', 'textPos', 'textSize', 'textMarquee'].forEach((k) => on(k, applyText));
  applyText();

  // ---------- logo ----------
  function applyLogo() {
    logo.hidden = !(get('logoOn') && logo.getAttribute('src'));
    logo.dataset.pos = get('logoPos');
    logo.style.height = `${get('logoSize')}vh`;
    logo.style.opacity = String(get('logoOpacity'));
  }
  ['logoOn', 'logoPos', 'logoSize', 'logoOpacity'].forEach((k) => on(k, applyLogo));

  function setLogoSrc(src) {
    if (src) logo.src = src;
    else logo.removeAttribute('src');
    applyLogo();
  }

  try {
    const saved = localStorage.getItem(LOGO_KEY);
    if (saved) setLogoSrc(saved);
  } catch {
    // sin almacenamiento: el logo no se recuerda
  }
  applyLogo();

  // Devuelve { ok, persisted } o lanza si no es una imagen valida
  function loadLogo(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Elegí un archivo de imagen (PNG, SVG, JPG)'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.onload = () => {
        setLogoSrc(reader.result);
        let persisted = false;
        try {
          if (String(reader.result).length <= MAX_LOGO_BYTES) {
            localStorage.setItem(LOGO_KEY, reader.result);
            persisted = true;
          } else {
            localStorage.removeItem(LOGO_KEY);
          }
        } catch {
          // cuota llena
        }
        resolve({ persisted });
      };
      reader.readAsDataURL(file);
    });
  }

  function clearLogo() {
    setLogoSrc('');
    try {
      localStorage.removeItem(LOGO_KEY);
    } catch {
      // nada que borrar
    }
  }

  // ---------- blackout y flash ----------
  let black = false;
  function setBlackout(v) {
    black = typeof v === 'boolean' ? v : !black;
    blackoutEl.classList.toggle('on', black);
    return black;
  }
  function flash() {
    flashEl.classList.remove('go');
    void flashEl.offsetWidth; // reinicia la animacion
    flashEl.classList.add('go');
  }

  // ---------- por cuadro ----------
  function update() {
    frameCount++;
    if (!textEl.hidden) {
      span.style.transform = get('textPulse') ? `scale(${1 + engine.beat * 0.07 + engine.bass * 0.03})` : '';
      if (frameCount % 6 === 0) {
        const c = renderer.frame.color;
        span.style.color = c(0.92);
        span.style.textShadow = '0 0.04em 0.5em rgba(0, 0, 0, 0.65), 0 0.02em 0.12em rgba(0, 0, 0, 0.5)';
      }
    }
    if (!logo.hidden) {
      const s = get('logoPulse') ? 1 + engine.bass * 0.1 + engine.beat * 0.08 : 1;
      logo.style.setProperty('--s', s.toFixed(3));
    }
  }

  return { update, loadLogo, clearLogo, hasLogo: () => !!logo.getAttribute('src'), setBlackout, isBlackout: () => black, flash };
}
