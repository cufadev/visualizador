// Atajos de teclado. No se disparan mientras se escribe en un campo de texto o un desplegable.
const TYPING = /^(TEXTAREA|SELECT)$/;

function isTyping(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || TYPING.test(el.tagName)) return true;
  return el.tagName === 'INPUT' && !['range', 'checkbox', 'button', 'file'].includes(el.type);
}

export function initKeys(a) {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    const k = e.key.toLowerCase();

    if (e.shiftKey && /^Digit[1-9]$/.test(e.code)) a.scene(Number(e.code.slice(5)) - 1);
    else if (k === 'h') a.toggleUI();
    else if (k === 'm') a.cycleMode(e.shiftKey ? -1 : 1);
    else if (k === 'c') a.cyclePalette(e.shiftKey ? -1 : 1);
    else if (k === 'f') a.fullscreen();
    else if (k === 'v') a.toggleBackground();
    else if (k === 'n') a.nextPreset();
    else if (k === '+' || k === '=') a.sensitivity(0.1);
    else if (k === '-' || k === '_') a.sensitivity(-0.1);
    else if (k === 't') a.toggleText();
    else if (k === 'l') a.toggleLogo();
    else if (k === 'b') a.blackout();
    else if (k === 'x') a.flash();
    else if (k === 'r') a.record();
    else if (k === ',') a.sceneStep(-1);
    else if (k === '.') a.sceneStep(1);
    else if (k === '0') a.modeByIndex(9);
    else if (k >= '1' && k <= '9') a.modeByIndex(Number(k) - 1);
    else if (k === ' ' && e.target === document.body) {
      e.preventDefault();
      a.togglePlay();
    }
  });
}
