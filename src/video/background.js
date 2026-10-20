// Fondo de video: archivo local (recomendado en vivo, no depende de internet) o YouTube.
const YT_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/;

export function parseYouTubeId(url) {
  const m = String(url || '').trim().match(YT_ID);
  return m ? m[1] : null;
}

export class Background {
  constructor({ video, frame, veil }) {
    this.video = video;
    this.frame = frame;
    this.veil = veil;
    this.source = 'none';
    this.objectUrl = null;
    this.hasLocal = false;
    this.ytId = null;
  }

  setDim(v) {
    this.veil.style.opacity = String(v);
  }

  _show(which) {
    this.video.classList.toggle('on', which === 'local');
    this.frame.classList.toggle('on', which === 'youtube');
    this.veil.classList.toggle('on', which !== 'none');
  }

  setSource(source) {
    this.source = source;
    if (source === 'local' && this.hasLocal) {
      this._show('local');
      this.video.play().catch(() => {});
    } else if (source === 'youtube' && this.ytId) {
      this._show('youtube');
    } else {
      this._show('none');
    }
    if (source !== 'local') this.video.pause();
  }

  loadFile(file) {
    if (!file) return false;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.video.src = this.objectUrl;
    this.video.muted = true;
    this.video.loop = true;
    this.hasLocal = true;
    return true;
  }

  loadYouTube(url) {
    const id = parseYouTubeId(url);
    if (!id) return false;
    this.ytId = id;
    this.frame.src =
      `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1` +
      `&playlist=${id}&modestbranding=1&rel=0&playsinline=1`;
    return true;
  }

  togglePlay() {
    if (this.source !== 'local' || !this.hasLocal) return null;
    if (this.video.paused) {
      this.video.play().catch(() => {});
      return true;
    }
    this.video.pause();
    return false;
  }
}
