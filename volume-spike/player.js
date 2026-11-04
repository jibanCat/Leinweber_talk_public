
import { selftest } from './selftest.js';

export function startPlayer({ STEPS, LAST, pose, renderer, beat, canvas, flags, hashOf, parseHash, onKey, onChange, through }) {
  const { TEST, SELFTEST, DEBUG } = flags;
  const debugEl = document.getElementById('debug');
  let k = 0, s = 1;
  let anim = null;
  const thru = kk => !!(through && kk > 0 && kk < LAST && through(kk));
  let vnow = 0;
  let pausedAt = null, lost = 0;
  const raw = () => (TEST ? vnow : performance.now());
  const now = () => (pausedAt ?? raw()) - lost;
  function pause() { if (pausedAt === null) pausedAt = raw(); else { lost += raw() - pausedAt; pausedAt = null; } }
  const label = kk => (hashOf ? hashOf(kk) : `#b${beat}.${kk}`);
  let dirty = true;

  function writeHash() {
    if (s === 1) history.replaceState(null, '', `${location.pathname}${location.search}${label(k)}`);
  }
  function arrive(kk, ss) {
    anim = null;
    if (ss === 0 && kk > 0) { k = kk - 1; s = 1; } else { k = kk; s = ss; }
    writeHash();
  }
  function seek(kk, ss) {
    kk = Math.max(0, Math.min(LAST, kk));
    ss = kk === 0 ? 1 : Math.max(0, Math.min(1, ss));
    arrive(kk, ss);
  }
  function advance(t) {
    while (anim) {
      const dir = anim.to > anim.from ? 1 : -1;
      const x = anim.from + dir * (t - anim.t0) / (STEPS[anim.k].dur * 1000);
      if (!((dir > 0 && x >= anim.to) || (dir < 0 && x <= anim.to))) { k = anim.k; s = x; return; }
      const done = anim, end = done.t0 + Math.abs(done.to - done.from) * STEPS[done.k].dur * 1000;
      arrive(done.k, done.to);
      if (dir > 0 && thru(done.k)) { anim = { k: done.k + 1, from: 0, to: 1, t0: end, p0: done.p0 }; k = done.k + 1; s = 0; }
      else if (dir < 0 && thru(done.k - 1)) { anim = { k: done.k - 1, from: 1, to: 0, t0: end, p0: done.p0 }; k = done.k - 1; s = 1; }
      else return;
    }
  }
  function landPress(dir) {
    if (dir > 0) while (thru(k)) k += 1;
    else while (thru(k)) k -= 1;
    s = 1; writeHash();
  }
  const BOUNCE = TEST && !/[?&]bounce\b/.test(location.search) ? 0 : 350;
  function next() {
    const t = now(); advance(t);
    if (anim && anim.to === 1 && t - (anim.p0 ?? anim.t0) < BOUNCE) return;
    if (anim) { const fwd = anim.to === 1; arrive(anim.k, anim.to); landPress(fwd ? 1 : -1); }
    else if (k < LAST) { anim = { k: k + 1, from: 0, to: 1, t0: t, p0: t }; k += 1; s = 0; }
  }
  function prev() {
    const t = now(); advance(t);
    if (anim && anim.to === 1) anim = { k: anim.k, from: s, to: 0, t0: t, p0: t };
    else if (anim) { arrive(anim.k, 0); landPress(-1); }
    else if (k > 0) { anim = { k, from: 1, to: 0, t0: t, p0: t }; }
  }
  function reset() { anim = null; k = 0; s = 1; writeHash(); }

  function readHash() {
    if (parseHash) { const r = parseHash(location.hash); if (r) seek(r[0], r[1]); return; }
    const m = new RegExp(`^#b${beat}\\.(\\d+)(?:@([0-9.]+))?$`).exec(location.hash);
    if (m) seek(parseInt(m[1], 10), m[2] !== undefined ? parseFloat(m[2]) : 1);
  }
  readHash();
  addEventListener('hashchange', () => { if (location.hash !== label(k)) { readHash(); dirty = true; } });

  const draw = () => renderer.render(pose(k, s));
  let frames = 0, fpsT = performance.now(), fps = 0;
  function loop() {
    const before = `${k}:${s}`;
    advance(now());
    const moved = `${k}:${s}` !== before;
    if (dirty || anim || moved) { draw(); dirty = false; if (onChange) onChange(k, s, !!anim); }
    if (DEBUG) {
      frames++;
      const t = performance.now();
      if (t - fpsT > 500) { fps = frames * 1000 / (t - fpsT); frames = 0; fpsT = t; }
      debugEl.textContent = `${label(k)}  s=${s.toFixed(3)}${anim ? '  ▶' : ''}${pausedAt !== null ? '  ❚❚' : ''}   ${fps.toFixed(0)} fps\n` +
        (renderer.debugLines ? renderer.debugLines() : '');
      dirty = true;
    }
    requestAnimationFrame(loop);
  }

  const api = { seek: (kk, ss = 1) => { seek(kk, ss); dirty = true; }, next, prev, reset, pause,
    pos: () => ({ k, s, animating: !!anim, paused: pausedAt !== null }), redraw: () => { dirty = true; } };
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (onKey && onKey(e, api)) { e.preventDefault(); dirty = true; return; }
    if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
    else if (e.key === 'r' || e.key === 'R') reset();
    else if (DEBUG && (e.key === 'l' || e.key === 'L') && renderer.loseContext) renderer.loseContext();
    else return;
    e.preventDefault();
    dirty = true;
  });
  addEventListener('resize', () => { dirty = true; });
  renderer.onRestore(() => { dirty = true; });
  if (DEBUG) debugEl.hidden = false;

  if (!TEST) { requestAnimationFrame(loop); return api; }

  const frame = () => { draw(); return renderer.readHash(); };
  window.__spike = {
    LAST, durations: STEPS.map(x => (x ? x.dur : 0)), through: thru,
    seek: (kk, ss) => { seek(kk, ss); return frame(); },
    key: name => { ({ next, prev, reset, pause })[name](); return frame(); },
    tick: ms => { vnow += ms; advance(now()); return frame(); },
    pos: () => ({ k, s, animating: !!anim, paused: pausedAt !== null }),
    state: () => pose(k, s),
    pixel: (x, y) => { draw(); return renderer.readPixel(x, y); },
    hash: frame,
    raw: () => { draw(); return Array.from(renderer.readRaw()); },
  };
  window.__selftest = () => selftest(window.__spike);
  window.__spikeReady = true;
  if (SELFTEST) {
    const r = selftest(window.__spike);
    const n = st => r.filter(x => st(x)).length;
    const el = document.getElementById('msg');
    el.style.cssText = 'top:24px;left:24px;transform:none;max-width:none;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre';
    el.textContent = `determinism self-test on this GPU: ${n(x => x.exact)}/${r.length} exact first time, ` +
      `${n(x => x.unstable)} same state but unstable renderer, ${n(x => !x.sameState)} DIFFERENT STATE\n\n` +
      r.map(x => `${x.exact ? 'exact   ' : x.sameState ? 'unstable' : 'DIFFERS '} ${x.name}${x.exact ? '' : `   (${x.pixels} px, max ${x.maxDiff}/255)`}`).join('\n');
    el.hidden = false;
    canvas.style.visibility = 'hidden';
  }
  return api;
}
