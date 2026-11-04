import { SCENE, IMG, imgSrc } from './look.js';
const INK = SCENE.ink, SOFT = SCENE.soft, MUTED = SCENE.muted, GROUND = SCENE.ground, ACC = SCENE.accent;
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));
export const MAP_DUR = 12.0;
const ROWS = 480, FOLLOWED = 154;
const ORDER = (() => {
  let a = 382; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const o = Array.from({ length: ROWS }, (_, i) => i).filter(i => i !== FOLLOWED);
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
})();
const LAND0 = 1.8, LAND = 4.6, FADE = 0.35, FLASHED = 24;
const landAt = j => LAND0 + LAND * ((j + 1) / ORDER.length) ** 0.35;

export function createMap(canvas) {
  const g = canvas.getContext('2d');
  let last = 1, tauPic = null, gasPic = null;
  const load = (src, set) => { const im = new Image(); im.decoding = 'async';
    im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im)).then(b => { set(b); draw(last); }, () => { set(im); draw(last); });
    im.src = imgSrc(src); };
  load('media/map_tau.jpg', b => { tauPic = b; }); load('media/expansion_box.jpg', b => { gasPic = b; });
  function draw(p) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    const vh = H / 100, vw = W / 100, u = Math.min(vh, 0.5625 * vw);
    const font = (px, it) => `${it ? 'italic ' : ''}${Math.round(px)}px ${SERIF}`;
    const text = (s, x, y, o = {}) => { if (!((o.alpha ?? 1) > 0)) return; g.save(); g.font = font(o.px || 2.4 * u, o.italic); g.fillStyle = o.color || INK; g.globalAlpha = o.alpha ?? 1;
      g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic';
      if (o.halo) { g.lineJoin = 'round'; g.strokeStyle = o.haloColor || SCENE.halo; g.lineWidth = 0.6 * u; g.strokeText(s, x, y); }
      g.fillText(s, x, y); g.restore(); };
    const s = clamp01(p) * MAP_DUR;
    const side = Math.min(64 * vh, 41 * vw), y0 = 22 * vh, L = { x0: 50 * vw - side - 2 * vw, y0, s: side }, R = { x0: 50 * vw + 2 * vw, y0, s: side };
    const aF = ramp(s, 0, 0.6), aOne = ramp(s, 0.6, 1.4), aAll = ramp(s, 6.6, 7.2), aGas = ramp(s, 7.6, 9.0), aSay = ramp(s, 9.6, 10.6);
    const rowY = (F, iy) => F.y0 + (1 - (iy + 0.5) / ROWS) * F.s;
    for (const [F, a] of [[L, aF], [R, aGas]]) { g.save(); g.globalAlpha = a; g.strokeStyle = SCENE.frame; g.lineWidth = Math.max(1, 0.12 * u); g.strokeRect(F.x0, F.y0, F.s, F.s); g.restore(); }
    if (tauPic) {
      const yF = rowY(L, FOLLOWED), hRow = L.s / ROWS, sh = tauPic.height / ROWS;
      g.save(); g.globalAlpha = aOne; g.drawImage(tauPic, 0, (1 - (FOLLOWED + 1) / ROWS) * tauPic.height, tauPic.width, sh * 2, L.x0, yF - hRow, L.s, 2 * hRow); g.restore();
      if (s >= landAt(ORDER.length - 1) + FADE) g.drawImage(tauPic, L.x0, L.y0, L.s, L.s);
      else if (s > LAND0) {
        g.save();
        for (let j = 0; j < ORDER.length; j++) {
          const a = ramp(s, landAt(j), landAt(j) + FADE); if (!(a > 0)) continue;
          const iy = ORDER[j], ys = (1 - (iy + 1) / ROWS), k = j < FLASHED ? 1 + 3 * (1 - ramp(s, landAt(j) + 0.3, landAt(j) + 1.2)) : 1;
          g.globalAlpha = a; g.drawImage(tauPic, 0, ys * tauPic.height, tauPic.width, sh, L.x0, L.y0 + ys * L.s - 0.5 * (k - 1) * hRow, L.s, k * hRow + 0.6);
        }
        g.restore();
        g.save(); g.strokeStyle = IMG.ink; g.lineWidth = Math.max(1.5, 0.18 * u);
        for (let j = 0; j < FLASHED; j++) {
          const f = s > landAt(j) ? 1 - ramp(s, landAt(j), landAt(j) + 0.9) : 0; if (!(f > 0)) continue;
          const y = rowY(L, ORDER[j]); g.globalAlpha = 0.9 * f;
          g.beginPath(); g.moveTo(L.x0 - 1.1 * u, y); g.lineTo(L.x0 - 0.2 * u, y); g.moveTo(L.x0 + L.s + 0.2 * u, y); g.lineTo(L.x0 + L.s + 1.1 * u, y); g.stroke();
        }
        g.restore();
      }
    }
    if (gasPic && aGas > 0) { g.save(); g.globalAlpha = aGas; g.drawImage(gasPic, R.x0, R.y0, R.s, R.s); g.restore(); }
    for (const [F, a] of [[L, aOne * (1 - 0.6 * ramp(s, 2.2, 3.0)) + 0.6 * aGas], [R, aGas]]) {
      const y = rowY(F, FOLLOWED);
      g.save(); g.globalAlpha = a; g.strokeStyle = ACC; g.lineWidth = Math.max(1.5, 0.22 * u); g.setLineDash([0.8 * u, 0.6 * u]);
      g.beginPath(); g.moveTo(F.x0 - 1.4 * u, y); g.lineTo(F.x0, y); g.moveTo(F.x0 + F.s, y); g.lineTo(F.x0 + F.s + 1.4 * u, y); g.stroke(); g.restore();
    }
    text('one spectrum: the light we followed', L.x0, rowY(L, FOLLOWED) + 3.0 * u, { px: 2.2 * u, color: INK, halo: true, haloColor: IMG.halo, alpha: aOne * (1 - ramp(s, 2.0, 2.6)) });
    let n = 1; for (let j = 0; j < ORDER.length && s >= landAt(j); j++) n++;
    text(`spectra side by side: ${n}`, L.x0, L.y0 - 1.2 * u, { px: 2.2 * u, color: SOFT, italic: true, alpha: ramp(s, 1.8, 2.4) * (1 - aAll) });
    text('480 spectra: what the light sees', L.x0, L.y0 - 1.2 * u, { px: 2.4 * u, color: INK, alpha: aAll });
    text('the simulation’s gas: where the hydrogen is', R.x0, R.y0 - 1.2 * u, { px: 2.4 * u, color: INK, alpha: aGas });
    text('the spectra map the cosmic hydrogen (shifted a little along each line by the gas’s own motion)', 50 * vw, y0 + side + 4.4 * u, { px: 2.3 * u, color: SOFT, italic: true, align: 'center', alpha: aSay });
    text('one slice of a PRIYA run (Bird et al. 2023), z = 3: 480 sightlines, 120 Mpc/h across · left: each row a sightline’s absorption, 1 − e^−τ · right: its gas', 8 * vw, 97.0 * vh, { px: 1.6 * u, color: MUTED, italic: true, alpha: aF });
  }
  return {
    render(st) { last = st && Number.isFinite(st.p) ? st.p : 1; draw(last); },
    settle() { return tauPic && gasPic ? Promise.resolve() : new Promise(r => { const k = setInterval(() => { if (tauPic && gasPic) { clearInterval(k); r(); } }, 50); setTimeout(() => { clearInterval(k); r(); }, 5000); }); },
    readRaw() { return new TextEncoder().encode(`map:${last.toFixed(4)}`); },
    readPixel(x, y) { return Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data); },
  };
}
