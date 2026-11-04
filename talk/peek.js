const RAMP = 0.3;
export function createPeek({ enabled, redraw }) {
  let cur = 0, tgt = 0, running = false, tPrev = 0;
  function tick(t) {
    const dt = Math.min(0.1, Math.max(0, (t - tPrev) / 1000)); tPrev = t;
    const step = dt / RAMP;
    cur = tgt > cur ? Math.min(tgt, cur + step) : Math.max(tgt, cur - step);
    redraw();
    if (cur !== tgt) requestAnimationFrame(tick); else running = false;
  }
  const to = v => { tgt = v; if (!running) { running = true; tPrev = performance.now(); requestAnimationFrame(tick); } };
  addEventListener('keydown', e => {
    if ((e.key === 'u' || e.key === 'U') && !e.repeat && enabled()) to(1);
    else if (e.key !== 'u' && e.key !== 'U' && cur + tgt > 0) to(0);
  });
  addEventListener('keyup', e => { if (e.key === 'u' || e.key === 'U') to(0); });
  return {
    apply: s => { if (cur === 0) return s; const e = cur * cur * (3 - 2 * cur); return { ...s, mask: s.mask * (1 - e), cut: s.cut * (1 - e) }; },
    active: () => cur !== 0,
    hold: v => to(v),
  };
}
