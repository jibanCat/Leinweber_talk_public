
const NAV = new Set([' ', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'r', 'R', 'Escape',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', 's', 'S']);
const KEYS = ['px', 'py', 'cmp', 'emph', 'hide', 'iso'];
const TAU = { px: 0.45, py: 0.45, cmp: 0.18, emph: 0.15, hide: 0.15, iso: 0.25 };

export function createInteraction({ enabled, pick, redraw, caption }) {
  const cur = Object.fromEntries(KEYS.map(k => [k, 0])), tgt = { ...cur };
  let hover = -1, iso = null, scrub = 0, holdC = false, lastMove = -1e9, running = false, tPrev = 0;

  function kick() { if (!running) { running = true; tPrev = performance.now(); requestAnimationFrame(tick); } }
  function tick(t) {
    const dt = Math.min(0.1, Math.max(0, (t - tPrev) / 1000)); tPrev = t;
    if (t - lastMove > 1400) { tgt.px = 0; tgt.py = 0; }
    let settled = true;
    for (const k of KEYS) {
      const d = tgt[k] - cur[k];
      if (Math.abs(d) < 1e-3) cur[k] = tgt[k];
      else { cur[k] += d * (1 - Math.exp(-dt / TAU[k])); settled = false; }
    }
    if (cur.iso === 0 && tgt.iso === 0) iso = null;
    caption(iso && cur.iso > 0 ? iso : null, cur.iso);
    redraw();
    if (settled) running = false; else requestAnimationFrame(tick);
  }
  function release() {
    for (const k of KEYS) tgt[k] = 0;
    scrub = 0; holdC = false; hover = -1;
    kick();
  }

  addEventListener('mousemove', e => {
    if (!enabled()) return;
    tgt.px = (e.clientX / innerWidth) * 2 - 1; tgt.py = (e.clientY / innerHeight) * 2 - 1;
    lastMove = performance.now();
    const b = pick(e.clientX, e.clientY);
    hover = b ? b.index : -1;
    kick();
  });
  function holdAt(on, x, y) {
    if (!on) { if (tgt.iso > 0) { tgt.iso = 0; kick(); } return true; }
    const b = enabled() ? pick(x, y) : null;
    if (!b) return false;
    iso = b; tgt.iso = 1; kick(); return true;
  }
  addEventListener('wheel', e => {
    if (!enabled()) return;
    e.preventDefault();
    scrub = Math.max(0, Math.min(1, scrub + (e.deltaY + e.deltaX) / 500));
    tgt.cmp = Math.max(scrub, holdC ? 1 : 0);
    kick();
  }, { passive: false });
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (NAV.has(e.key)) { release(); return; }
    if (e.repeat || !enabled()) return;
    if (e.key === 'h' || e.key === 'H') { if (e.shiftKey) tgt.hide = 1; else tgt.emph = 1; kick(); }
    else if (e.key === 'c' || e.key === 'C') { holdC = true; tgt.cmp = 1; kick(); }
  });
  addEventListener('keyup', e => {
    if (e.key === 'h' || e.key === 'H') { tgt.emph = 0; tgt.hide = 0; kick(); }
    else if (e.key === 'c' || e.key === 'C') { holdC = false; tgt.cmp = scrub; kick(); }
  });
  addEventListener('blur', () => { tgt.emph = 0; tgt.hide = 0; holdC = false; tgt.cmp = scrub; kick(); });

  function apply(s) {
    if (hover < 0 && !iso && KEYS.every(k => cur[k] === 0)) return s;
    const o = { ...s };
    o.azim = s.azim + 2.5 * cur.px;
    o.elev = s.elev - 1.5 * cur.py;
    if (cur.cmp > 0) {
      const other = s.sparse < 0.5 ? { sparse: 1, gone: 1, keptInk: 1 } : { sparse: 0 };
      for (const k in other) o[k] = s[k] + (other[k] - s[k]) * cur.cmp;
    }
    if (cur.emph > 0) { o.comb = Math.max(o.comb, cur.emph); o.emph = cur.emph; }
    if (cur.hide > 0) { o.comb *= 1 - cur.hide; o.keptInk *= 1 - cur.hide; }
    if (iso) { o.iso = cur.iso; o.isoY = iso.y; o.isoZ = iso.z; o.isoIdx = iso.index; }
    o.hover = hover;
    return o;
  }
  return { apply, release, holdAt, active: () => running || hover >= 0 || !!iso };
}
