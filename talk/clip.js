const DRIFT = 0.12;
const LIVE_RATE = [0.07, 1.6];
const REST_MS = 150;

export function createClip(video) {
  let lastT = null, lastWall = 0, rest = 0;
  const len = () => (video.duration > 0 && Number.isFinite(video.duration) ? video.duration : 0);
  const timeOf = t => Math.min(Math.max(0, len() - 0.04), Math.max(0, t * len()));
  const seekTo = x => { if (Math.abs(video.currentTime - x) > 0.02) video.currentTime = x; };
  let target = 0;
  const probe = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  return {
    render(s) {
      const D = len();
      if (!s || !D) return;
      const t = Math.min(1, Math.max(0, s.t || 0)), now = performance.now(), x = timeOf(t);
      target = x;
      const rate = lastT !== null && now > lastWall ? ((t - lastT) * D) / ((now - lastWall) / 1000) : 0;
      const live = t > 0 && t < 1 && lastT !== null && t > lastT && now - lastWall < 250 && rate > LIVE_RATE[0] && rate < LIVE_RATE[1];
      lastT = t; lastWall = now;
      clearTimeout(rest);
      if (live) {
        rest = setTimeout(() => { if (!video.paused) video.pause(); seekTo(target); }, REST_MS);
        const r = Math.min(LIVE_RATE[1], Math.max(0.0625, rate));
        if (Math.abs(video.playbackRate - r) > 0.03 * r) video.playbackRate = r;
        if (video.paused) { seekTo(x); video.play().catch(() => {}); }
        else if (Math.abs(video.currentTime - x) > DRIFT) video.currentTime = x;
        return;
      }
      if (!video.paused) video.pause();
      seekTo(x);
    },
    readRaw() { return new TextEncoder().encode(`clip:${target.toFixed(3)}`); },
    readPixel(x, y) {
      const r = video.getBoundingClientRect(), dpr = devicePixelRatio || 1, X = x / dpr - r.left, Y = y / dpr - r.top;
      if (!probe || !len() || X < 0 || Y < 0 || X >= r.width || Y >= r.height) return [12, 18, 27, 255];
      probe.width = 1; probe.height = 1;
      const g = probe.getContext('2d', { willReadFrequently: true });
      g.drawImage(video, (X / r.width) * video.videoWidth, (Y / r.height) * video.videoHeight, 1, 1, 0, 0, 1, 1);
      return Array.from(g.getImageData(0, 0, 1, 1).data);
    },
    playing() { return !video.paused && len() > 0; },
    idle() { clearTimeout(rest); if (!video.paused) video.pause(); lastT = null; },
    settle() {
      if (!len()) return new Promise(r => { video.addEventListener('loadeddata', () => r(), { once: true }); setTimeout(r, 4000); });
      if (!video.seeking && video.readyState >= 2) return Promise.resolve();
      const late = ms => new Promise(r => setTimeout(r, ms));
      const shown = video.requestVideoFrameCallback ? new Promise(r => video.requestVideoFrameCallback(() => r())) : Promise.resolve();
      const seeked = new Promise(r => video.addEventListener('seeked', () => r(), { once: true }));
      return Promise.race([seeked, late(20000)]).then(() => Promise.race([shown, late(1000)]));
    },
  };
}
