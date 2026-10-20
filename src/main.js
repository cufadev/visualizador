import './styles/index.css';
import { get, set } from './state.js';
import { AudioEngine } from './audio/engine.js';
import { Renderer } from './visuals/renderer.js';
import { Background } from './video/background.js';
import { createStage } from './stage/stage.js';
import { createPanel } from './ui/panel.js';
import { createStagePanel } from './ui/stage-panel.js';
import { createScenesPanel } from './ui/scenes-panel.js';
import { createRemotePanel } from './ui/remote-panel.js';
import { createRecordPanel } from './ui/record-panel.js';
import { initKeys } from './ui/keys.js';
import { initIdle } from './ui/idle.js';
import { $, friendlyError } from './ui/dom.js';

const remoteId = new URLSearchParams(location.search).get('remote');
if (remoteId) {
  // pantalla del celular: no arranca audio ni visuales, solo el control
  document.body.classList.add('remote-mode');
  import('./remote/client.js').then((m) => m.startRemote(remoteId));
} else {
  boot();
}

function boot() {
  const engine = new AudioEngine();
  engine.setSmoothing(get('smoothing'));

  const renderer = new Renderer({
    fxCanvas: $('#fx'),
    glCanvas: $('#gl'),
    shCanvas: $('#sh'),
    xfadeCanvas: $('#xfade'),
    engine,
    onMilkError: (err) => console.error('Milkdrop:', err),
  });

  const background = new Background({
    video: $('#bg-video'),
    frame: $('#bg-youtube'),
    veil: $('#veil'),
  });

  const stage = createStage({ engine, renderer });
  const panel = createPanel({ engine, renderer, background });
  createStagePanel({ stage });
  const scenes = createScenesPanel({ panel, background });
  const remote = createRemotePanel({ renderer, engine, stage, background, panel, scenes });
  const rec = createRecordPanel({ engine });
  panel.restore();

  initKeys({
    ...panel.actions,
    scene: (i) => scenes.recall(i),
    sceneStep: (d) => scenes.step(d),
    toggleText: () => panel.actions.setTextOn(!get('textOn')),
    toggleLogo: () => panel.actions.setLogoOn(!get('logoOn')),
    blackout: () => {
      stage.setBlackout();
      remote.push();
    },
    flash: () => stage.flash(),
    record: () => rec.toggle(),
  });
  initIdle($('#panel'));

  // ---------- pantalla de inicio ----------
  const startEl = $('#start');
  const startErr = $('#start-error');
  const startSel = $('#start-device');

  // si el permiso ya fue concedido, se pueden listar los micrófonos con su nombre
  navigator.permissions
    ?.query({ name: 'microphone' })
    .then((p) => p.state === 'granted' && panel.refreshDevices())
    .catch(() => {});

  async function begin(kind) {
    startErr.hidden = true;
    try {
      if (kind === 'demo') {
        await engine.useDemo();
      } else {
        const id = await engine.useMic(startSel.value);
        set('deviceId', startSel.value || id);
      }
    } catch (err) {
      startErr.textContent = friendlyError(err);
      startErr.hidden = false;
      return;
    }
    engine.setSmoothing(get('smoothing'));
    await panel.refreshDevices();
    panel.syncSource();
    await panel.selectMode(get('mode'));
    startEl.classList.add('gone');
    startEl.setAttribute('inert', '');
  }

  $('#btn-start').addEventListener('click', () => begin('mic'));
  $('#btn-demo').addEventListener('click', () => begin('demo'));
  $('#btn-start').focus();

  // ---------- bucle ----------
  function loop(now) {
    renderer.render(now);
    stage.update();
    panel.update();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
