
const HOLD_MS = 300, DRAG_PX = 6;
const TAU = 0.12;
const KEYS = ['azim', 'elev'];

export function createMouse({ enabled, next, prev, click, hold, canDrag, redraw, hintFor }) {
  const cur = Object.fromEntries(KEYS.map(k => [k, 0])), tgt = { ...cur };
  let down = null, running = false, tPrev = 0, returning = false;

  function tick(t) {
    const dt = Math.min(0.1, Math.max(0, (t - tPrev) / 1000)); tPrev = t;
    let settled = true;
    for (const k of KEYS) {
      const d = tgt[k] - cur[k];
      if (Math.abs(d) < 1e-3) cur[k] = tgt[k];
      else { cur[k] += d * (1 - Math.exp(-dt / (returning ? 3 * TAU : TAU))); settled = false; }
    }
    redraw();
    if (settled) { running = false; returning = false; } else requestAnimationFrame(tick);
  }
  const kick = () => { if (!running) { running = true; tPrev = performance.now(); requestAnimationFrame(tick); } };
  function release() {
    if (KEYS.every(k => tgt[k] === 0 && cur[k] === 0)) return;
    for (const k of KEYS) tgt[k] = 0;
    returning = true; kick();
  }

  const ours = e => !e.target.closest || !e.target.closest('#index, #offer, button, a');
  addEventListener('pointerdown', e => {
    if (e.button !== 0 || !ours(e) || !enabled()) return;
    down = { x: e.clientX, y: e.clientY, base: { ...tgt }, drag: null, held: false,
      timer: setTimeout(() => { if (down && !down.drag && hold(true, down.x, down.y)) down.held = true; }, HOLD_MS) };
  });
  addEventListener('pointermove', e => {
    if (!down || down.held) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > DRAG_PX) { down.moved = true; down.drag = canDrag(); clearTimeout(down.timer); }
    if (!down.drag) return;
    returning = false;
    if (down.drag === 'turn') {
      tgt.azim = Math.max(-20, Math.min(20, down.base.azim + 60 * dx / innerWidth));
      tgt.elev = Math.max(-15, Math.min(15, down.base.elev + 40 * dy / innerHeight));
    } else if (typeof down.drag === 'function') {
      down.drag(dx, dy); return;
    }
    kick();
  });
  addEventListener('pointerup', e => {
    if (!down) return;
    clearTimeout(down.timer);
    const d = down; down = null;
    if (d.held) { hold(false); return; }
    if (d.moved) return;
    if (!ours(e) || !enabled()) return;
    if (!click(e.clientX, e.clientY)) { release(); next(); }
  });
  addEventListener('contextmenu', e => {
    if (!enabled() || !ours(e)) return;
    e.preventDefault(); release(); prev();
  });
  addEventListener('keydown', e => { if (!e.metaKey && !e.ctrlKey && !e.altKey && !['Shift', 'u', 'U', 'h', 'H', 'c', 'C'].includes(e.key)) release(); });
  addEventListener('blur', () => { if (down) { clearTimeout(down.timer); if (down.held) hold(false); down = null; } });

  const hintEl = document.getElementById('hint');
  addEventListener('pointermove', () => { if (hintEl && enabled()) hintEl.textContent = hintFor(); });

  function apply(scene, s) {
    if (KEYS.every(k => cur[k] === 0)) return s;
    const o = { ...s };
    if (Number.isFinite(s.fov) && s.fov > 5 && (cur.azim || cur.elev)) {
      o.azim = s.azim + cur.azim;
      o.elev = Math.max(-80, Math.min(80, s.elev + cur.elev));
    }
    return o;
  }
  return { apply, release, active: () => running || KEYS.some(k => cur[k] !== 0) };
}
