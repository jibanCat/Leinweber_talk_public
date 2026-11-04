import { SCENE, IMG, imgSrc, INKVIEW } from './look.js';
const INK = SCENE.ink, SOFT = SCENE.soft, MUTED = SCENE.muted, GROUND = SCENE.ground, AXIS = SCENE.axis;
const HYDROGEN = SCENE.accent, DESI = SCENE.desi, SLATE = SCENE.slate;
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
export const GAP_DUR = [8.0, 6.0, 4.0, 5.0, 6.0, 6.0];
const KR = [0.005, 30], PR = [0.001, 6000], LR = [-0.28, 0.52];
const PAIRS = [[40, 90], [120, 35], [205, 140], [300, 60], [380, 210], [455, 90], [540, 35], [610, 140], [700, 60],
  [760, 210], [860, 90], [930, 35], [1010, 140], [1085, 60], [1150, 210], [1240, 90]];
const SHOWN = [{ i: 330, sep: 11 }, { i: 100, sep: 224 }];
const COUNT_N = 40, COUNT_T = [1.2, 5.6], COUNT_BINS = 9, COUNT_R = [0.4, 50];
const frac = x => x - Math.floor(x), LR0 = Math.log(COUNT_R[0]), LR1 = Math.log(COUNT_R[1]);
const COUNTED = Array.from({ length: COUNT_N }, (_, q) => {
  const f = frac(q * 0.6180339887 + 0.13), lr = LR0 + f * (LR1 - LR0);
  return { r: Math.exp(lr), bin: Math.min(COUNT_BINS - 1, Math.floor(COUNT_BINS * f)), at: frac(q * 0.7548776662 + 0.29), t0: COUNT_T[0] + ((COUNT_T[1] - COUNT_T[0]) * q) / COUNT_N };
});
const BIN_N = Array.from({ length: COUNT_BINS }, (_, b) => COUNTED.filter(c => c.bin === b).length);
const binR = b => Math.exp(LR0 + ((b + 0.5) / COUNT_BINS) * (LR1 - LR0)), binEdge = b => Math.exp(LR0 + (b / COUNT_BINS) * (LR1 - LR0));

export function createGap(canvas) {
  const g = canvas.getContext('2d');
  let last = 6, pk = null, pts = null, row = null, gas = null, warm = null, nu = null;
  const interpT = (q, k) => { const K = q.k, i0 = K.findIndex(x => x >= k); if (i0 < 0) return q.T2[q.T2.length - 1]; if (i0 === 0) return q.T2[0]; const w = (Math.log(k) - Math.log(K[i0 - 1])) / (Math.log(K[i0]) - Math.log(K[i0 - 1])); return q.T2[i0 - 1] * (1 - w) + q.T2[i0] * w; };
  const load = (src, set) => { const im = new Image(); im.decoding = 'async';
    im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => (typeof createImageBitmap === 'function' ? createImageBitmap(im) : im)).then(b => { set(b); draw(last); }, () => { set(im); draw(last); });
    im.src = src; };
  function draw(p) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = Math.round(innerWidth * dpr), H = Math.round(innerHeight * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    g.fillStyle = GROUND; g.fillRect(0, 0, W, H);
    const vh = H / 100, vw = W / 100, u = Math.min(vh, 0.5625 * vw);
    const font = (px, it) => `${it ? 'italic ' : ''}${Math.round(px)}px ${SERIF}`;
    const measure = (s, o = {}) => { g.save(); g.font = font(o.px || 2.4 * u, o.italic); const w = g.measureText(s).width; g.restore(); return w; };
    const text = (s, x, y, o = {}) => { if (!((o.alpha ?? 1) > 0)) return 0; g.save(); g.font = font(o.px || 2.4 * u, o.italic); g.fillStyle = o.color || INK; g.globalAlpha = o.alpha ?? 1;
      g.textAlign = o.align || 'left'; g.textBaseline = 'alphabetic'; if (o.rotate) { g.translate(x, y); g.rotate(o.rotate); x = 0; y = 0; }
      if (o.box) { const w = g.measureText(s).width, x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x, px = o.px || 2.4 * u;
        g.save(); g.globalAlpha = 0.82 * (o.alpha ?? 1); g.fillStyle = GROUND; g.fillRect(x0 - 0.5 * u, y - 0.85 * px, w + u, 1.15 * px); g.restore(); }
      if (o.halo) { g.lineJoin = 'round'; g.strokeStyle = o.haloColor || SCENE.halo; g.lineWidth = 0.6 * u; g.strokeText(s, x, y); }
      g.fillText(s, x, y); g.restore(); return measure(s, o); };
    const line = (pts_, o) => { if (!(o.alpha > 0) || pts_.length < 2) return; g.save(); g.strokeStyle = o.color; g.globalAlpha = o.alpha; g.lineWidth = o.lw;
      g.lineJoin = 'round'; g.lineCap = 'round'; if (o.dash) g.setLineDash(o.dash); g.beginPath(); pts_.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.restore(); };
    const dot = (x, y, r, o) => { if (!(o.alpha > 0)) return; g.save(); g.globalAlpha = o.alpha; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI);
      if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = o.lw || Math.max(1, 0.25 * u); g.stroke(); } g.restore(); };

    const sA = clamp01(p) * GAP_DUR[0], sB = clamp01(p - 1) * GAP_DUR[1];
    const s1 = clamp01(p - 2) * GAP_DUR[2], sW = clamp01(p - 3) * GAP_DUR[3], s2 = clamp01(p - 4) * GAP_DUR[4], s3 = clamp01(p - 5) * GAP_DUR[5];
    const aLow = ramp(sA, 0, 1.0), slide = 1;
    const aAx = ramp(sA, 0.4, 1.2), cDraw = clamp01((sA - 6.0) / 1.4);
    const aBars = ramp(sA, 1.2, 1.6) * (1 - ramp(sB, 0.2, 1.0));
    const hiN = ramp(sB, 1.0, 1.5) * (1 - ramp(sB, 2.3, 2.7)), hiF = ramp(sB, 2.3, 2.8) * (1 - ramp(sB, 3.6, 4.0));
    const aMark = [ramp(sB, 1.2, 1.7), ramp(sB, 2.5, 3.0)];
    const a3D = ramp(sB, 3.8, 4.5), sweep = smooth(clamp01((sB - 4.0) / 1.4)), aBand = ramp(sB, 4.0, 4.5);
    const aPts = ramp(s1, 0.2, 1.0), aFrame = ramp(s1, 0.4, 1.4), aLoupe = ramp(s1, 0.8, 2.0), aAgree = ramp(s1, 1.8, 2.8);
    const aWarm = ramp(sW, 0.2, 1.2), aLimit = ramp(sW, 0.8, 1.8), aNu = ramp(sW, 2.4, 3.4), why = 1 - ramp(s2, 0, 0.8);
    const aCl = ramp(s2, 0.2, 2.0), aRing = ramp(s2, 1.2, 2.0), aAlike = ramp(s2, 1.8, 3.0), mv = ramp(s2, 3.0, 4.8), aMv = ramp(s2, 4.2, 5.2);
    const aFind = ramp(s3, 0.0, 1.0), mask = ramp(s3, 0.7, 1.9), aModel = ramp(s3, 1.5, 2.5), wings = ramp(s3, 1.9, 3.1), back = ramp(s3, 2.6, 4.4);
    const moved = mv * (1 - back);

    const PX = { x0: 10 * vw, x1: 54 * vw, y0: 21 * vh, y1: 46 * vh };
    const lk = k => Math.log10(k), X = k => PX.x0 + ((lk(k) - lk(KR[0])) / (lk(KR[1]) - lk(KR[0]))) * (PX.x1 - PX.x0);
    const Y = P => PX.y1 - ((Math.log10(P) - Math.log10(PR[0])) / (Math.log10(PR[1]) - Math.log10(PR[0]))) * (PX.y1 - PX.y0);
    g.save(); g.globalAlpha = aAx; g.strokeStyle = AXIS; g.lineWidth = Math.max(1, 0.12 * u);
    g.beginPath(); g.moveTo(PX.x0, PX.y0); g.lineTo(PX.x0, PX.y1); g.lineTo(PX.x1, PX.y1); g.stroke();
    for (const lam of [100, 10, 1, 0.1]) { const x = X(1 / lam); g.beginPath(); g.moveTo(x, PX.y1); g.lineTo(x, PX.y1 + 0.8 * u); g.stroke(); }
    g.restore();
    for (const lam of [100, 10, 1, 0.1]) text(String(lam), X(1 / lam), PX.y1 + 3.2 * u, { px: 2.4 * u, color: SOFT, align: 'center', alpha: aAx });
    text('scale [Mpc/h]', 0.5 * (PX.x0 + PX.x1), PX.y1 + 6.4 * u, { px: 2.6 * u, color: INK, align: 'center', alpha: aAx });
    text('← large', PX.x0, PX.y1 + 6.4 * u, { px: 2.3 * u, color: SOFT, italic: true, alpha: aAx });
    text('small →', PX.x1, PX.y1 + 6.4 * u, { px: 2.3 * u, color: SOFT, italic: true, align: 'right', alpha: aAx });
    text('how clustered matter is', PX.x0 - 2.0 * u, 0.5 * (PX.y0 + PX.y1), { px: 2.6 * u, color: INK, align: 'center', rotate: -Math.PI / 2, alpha: aAx });
    const Pat = k => { if (!pk) return 1; const K_ = pk.k, i1 = K_.findIndex(x => x >= k); if (i1 <= 0) return pk.P[Math.max(0, i1)];
      const w_ = (Math.log(k) - Math.log(K_[i1 - 1])) / (Math.log(K_[i1]) - Math.log(K_[i1 - 1])); return Math.exp(Math.log(pk.P[i1 - 1]) * (1 - w_) + Math.log(pk.P[i1]) * w_); };
    const barTop = b => { const got = COUNTED.filter(c => c.bin === b && sA >= c.t0 + 0.7).length; return lerp(PX.y1, Y(Pat(1 / binR(b))), BIN_N[b] ? got / BIN_N[b] : 0); };
    if (pk && aBars > 0) for (let b = 0; b < COUNT_BINS; b++) {
      if (!BIN_N[b]) continue;
      const xa = X(1 / binEdge(b)), xb = X(1 / binEdge(b + 1)), xl = Math.min(xa, xb), w = Math.abs(xb - xa), yt = barTop(b);
      g.save(); g.globalAlpha = 0.35 * aBars; g.fillStyle = HYDROGEN; g.fillRect(xl + 0.12 * w, yt, 0.76 * w, PX.y1 - yt); g.restore();
      line([[xl + 0.12 * w, yt], [xl + 0.88 * w, yt]], { color: HYDROGEN, alpha: aBars, lw: Math.max(1.5, 0.24 * u) });
    }
    if (pk && pk.band3d && a3D > 0) {
      const xa = X(pk.band3d[0]), xb = X(pk.band3d[1]);
      g.save(); g.globalAlpha = 0.25 * a3D; g.fillStyle = SOFT; g.fillRect(xa, PX.y0, xb - xa, PX.y1 - PX.y0); g.restore();
      line([[xa, PX.y0], [xb, PX.y0]], { color: SOFT, alpha: a3D, lw: Math.max(2, 0.3 * u) });
      text('DESI’s 3D maps:', 0.5 * (xa + xb), PX.y1 - 4.6 * u, { px: 2.0 * u, color: SOFT, align: 'center', alpha: a3D * (1 - aWarm), halo: true });
      text('large scales', 0.5 * (xa + xb), PX.y1 - 2.2 * u, { px: 2.0 * u, color: SOFT, align: 'center', alpha: a3D * (1 - aWarm), halo: true });
    }
    if (pk && pk.band && aBand > 0) {
      const xa = X(pk.band[0]), xb = X(pk.band[1]), xs = xa + (xb - xa) * sweep;
      g.save(); g.globalAlpha = 0.22 * aBand; g.fillStyle = HYDROGEN; g.fillRect(xa, PX.y0, xs - xa, PX.y1 - PX.y0); g.restore();
      line([[xa, PX.y0], [xs, PX.y0]], { color: HYDROGEN, alpha: aBand, lw: Math.max(2, 0.3 * u) });
      text('the forest’s small scales', xb - 0.8 * u, PX.y0 + 2.6 * u, { px: 2.0 * u, color: HYDROGEN, align: 'right', alpha: aBand * sweep });
    }
    if (pk && cDraw > 0) {
      const ks = pk.k, Ps = pk.P, path = [];
      const kEnd = Math.exp(Math.log(KR[0]) + cDraw * (Math.log(KR[1]) - Math.log(KR[0])));
      for (let i = 0; i < ks.length; i++) { if (ks[i] < KR[0] || ks[i] > kEnd) continue; path.push([X(ks[i]), Y(Math.max(PR[0], Ps[i]))]); }
      g.save(); g.beginPath(); g.rect(PX.x0, PX.y0 - u, PX.x1 - PX.x0, PX.y1 - PX.y0 + u); g.clip();
      line(path, { color: INK, alpha: aAx, lw: Math.max(2, 0.4 * u) }); g.restore();
      const aName = ramp(cDraw, 0.35, 0.7) * aAx;
      text('the power spectrum', X(0.0058), Y(1100) + 3.6 * u, { px: 2.4 * u, color: INK, italic: true, alpha: aName * (1 - aPts), halo: true });
      text('the standard model (Planck)', X(0.0058), Y(1100) + 3.6 * u, { px: 2.4 * u, color: INK, italic: true, alpha: aName * aPts, halo: true });
    }
    if (pk && warm && aWarm > 0) {
      const curveT = (T2, a, k0, k1, dash) => { const path = []; for (let i = 0; i < pk.k.length; i++) { const k = pk.k[i]; if (k < k0 || k > k1) continue; path.push([X(k), Y(Math.max(PR[0], pk.P[i] * interpT(T2, k)))]); }
        g.save(); g.beginPath(); g.rect(PX.x0, PX.y0 - u, PX.x1 - PX.x0, PX.y1 - PX.y0 + u); g.clip(); line(path, { color: HYDROGEN, alpha: a, lw: Math.max(1.5, 0.32 * u), dash }); g.restore(); };
      const fade = why, kv = warm.kmax || 5;
      curveT(warm.excluded, aWarm * fade, 3.0, kv, null);
      curveT(warm.excluded, aWarm * fade, kv, KR[1], [0.25 * u, 0.6 * u]);
      const yW = Y(0.0035) - 2.4 * u;
      text('warm dark matter would erase the smallest scales;', X(3.0), yW, { px: 2.0 * u, color: HYDROGEN, italic: true, align: 'right', alpha: aWarm * fade, halo: true });
      text('the forest rules it out', X(3.0), yW + 2.4 * u, { px: 2.0 * u, color: HYDROGEN, italic: true, align: 'right', alpha: aLimit * fade, halo: true });
      text('(dotted: an extrapolation)', X(3.0), yW + 4.7 * u, { px: 1.8 * u, color: SOFT, italic: true, align: 'right', alpha: aLimit * fade, halo: true });
    }
    const P0 = pts ? pts.planck : 6.39, kp = pts ? pts.k : 1.03;
    if (pts && aPts > 0) {
      const xp = X(kp);
      dot(xp, Y(pts.desi.P * (1 + moved * pts.desi.shift)), 0.75 * u, { stroke: DESI, alpha: aPts, lw: Math.max(1.5, 0.3 * u) });
      dot(xp, Y(pts.mine.P * (1 + moved * pts.mine.shift)), 0.5 * u, { fill: HYDROGEN, alpha: aPts });
    }
    const IX = { x0: 67 * vw, x1: 91 * vw, y0: 21 * vh, y1: 46 * vh };
    if (pts && aFrame > 0) {
      const bx0 = X(kp / 1.7), bx1 = X(kp * 1.7), by0 = Y(P0 * 2.4), by1 = Y(P0 / 2.4);
      g.save(); g.globalAlpha = 0.9 * aFrame; g.strokeStyle = SOFT; g.lineWidth = Math.max(1, 0.14 * u); g.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.setLineDash([0.5 * u, 0.6 * u]); g.globalAlpha = 0.55 * aFrame;
      g.beginPath(); g.moveTo(bx1, by0); g.lineTo(IX.x0, IX.y0); g.moveTo(bx1, by1); g.lineTo(IX.x0, IX.y1); g.stroke();
      g.setLineDash([]); g.globalAlpha = aFrame; g.strokeStyle = SOFT; g.strokeRect(IX.x0, IX.y0, IX.x1 - IX.x0, IX.y1 - IX.y0); g.restore();
      const LY = r => IX.y1 - ((r - LR[0]) / (LR[1] - LR[0])) * (IX.y1 - IX.y0);
      text('against the standard model', IX.x0, IX.y0 - 1.0 * u, { px: 2.0 * u, color: SOFT, italic: true, alpha: aFrame });
      g.save(); g.globalAlpha = 0.16 * aFrame; g.fillStyle = INK; g.fillRect(IX.x0, LY(pts.planckErr), IX.x1 - IX.x0, LY(-pts.planckErr) - LY(pts.planckErr)); g.restore();
      line([[IX.x0, LY(0)], [IX.x1, LY(0)]], { color: INK, alpha: aFrame, lw: Math.max(1.5, 0.3 * u) });
      text('the standard model (Planck)', IX.x1 - 0.8 * u, LY(0) - 1.0 * u, { px: 1.9 * u, color: INK, italic: true, align: 'right', alpha: aFrame });
      for (const r of [-0.2, 0.2, 0.4]) {
        line([[IX.x0, LY(r)], [IX.x0 + 0.8 * u, LY(r)]], { color: AXIS, alpha: aFrame, lw: Math.max(1, 0.12 * u) });
        text(`${r > 0 ? '+' : '−'}${Math.round(Math.abs(r) * 100)}%`, IX.x0 - 0.8 * u, LY(r) + 0.7 * u, { px: 1.9 * u, color: SOFT, align: 'right', alpha: aFrame });
      }
      text('0', IX.x0 - 0.8 * u, LY(0) + 0.7 * u, { px: 1.9 * u, color: SOFT, align: 'right', alpha: aFrame });
      if (nu && aNu > 0) {
        const yN = LY(nu.shallower), aN = aNu * why;
        line([[IX.x0, yN], [IX.x1, yN]], { color: SLATE, alpha: aN, lw: Math.max(1.5, 0.26 * u), dash: [0.7 * u, 0.5 * u] });
        text(`heavier neutrinos: ${Math.round(-100 * nu.shallower)} % shallower`, IX.x1 - 0.8 * u, yN + 2.4 * u, { px: 1.9 * u, color: SLATE, italic: true, align: 'right', alpha: aN, halo: true });
      }
      const col = [{ q: pts.desi, x: IX.x0 + 0.17 * (IX.x1 - IX.x0), c: DESI, name: ['DESI DR1'], fill: false },
        { q: pts.mine, x: IX.x0 + 0.42 * (IX.x1 - IX.x0), c: HYDROGEN, name: ['mine', 'Keck + VLT'], fill: true }];
      for (const { q, x, c, name, fill } of col) {
        const r0 = q.P / P0 - 1, r1 = (q.P * (1 + q.shift)) / P0 - 1, r = lerp(r0, r1, moved), e = lerp(q.sig, q.sigShift, moved) / P0;
        if (moved > 0.02) {
          dot(x, LY(r0), 0.6 * u, { stroke: c, alpha: 0.45 * aLoupe * moved, lw: Math.max(1, 0.18 * u) });
          line([[x, LY(r0) - 1.0 * u], [x, LY(r) + 1.2 * u]], { color: c, alpha: 0.6 * aLoupe * moved, lw: Math.max(1, 0.16 * u), dash: [0.4 * u, 0.4 * u] });
        }
        line([[x, LY(r - e)], [x, LY(r + e)]], { color: c, alpha: aLoupe, lw: Math.max(1.5, 0.28 * u) });
        line([[x - 0.7 * u, LY(r - e)], [x + 0.7 * u, LY(r - e)]], { color: c, alpha: aLoupe, lw: Math.max(1.5, 0.28 * u) });
        line([[x - 0.7 * u, LY(r + e)], [x + 0.7 * u, LY(r + e)]], { color: c, alpha: aLoupe, lw: Math.max(1.5, 0.28 * u) });
        dot(x, LY(r), 0.75 * u, fill ? { fill: c, alpha: aLoupe } : { fill: GROUND, stroke: c, alpha: aLoupe, lw: Math.max(1.5, 0.3 * u) });
        name.forEach((t, i) => text(t, x, IX.y1 + (2.6 + 2.3 * i) * u, { px: 2.0 * u, color: c, align: 'center', alpha: aLoupe }));
      }
      text('both agree with it', 0.5 * (col[0].x + col[1].x), LY(-0.2) + 0.7 * u, { px: 2.0 * u, color: INK, italic: true, align: 'center', alpha: aAgree * (1 - aMv), halo: true });
      ['clouds modelled too simply:', 'read as extra clustering'].forEach((t, i) =>
        text(t, IX.x1 - 0.8 * u, LY(0.4) + 2.4 * i * u, { px: 1.9 * u, color: HYDROGEN, italic: true, align: 'right', alpha: aMv * (1 - aFind), halo: true }));
      ['DLAs masked, the rest', 'modelled: they agree again'].forEach((t, i) => text(t, 0.5 * (col[0].x + col[1].x), LY(-0.14) + 2.3 * i * u, { px: 1.9 * u, color: INK, italic: true, align: 'center', alpha: ramp(s3, 3.8, 4.8), halo: true }));
    }

    if (!row) return credits();
    const dyS = -22 * vh * (1 - slide);
    const n = row.n, GB = { x0: 10 * vw, x1: 91 * vw, y0: 56 * vh + dyS }; GB.h = (GB.x1 - GB.x0) * (gas ? gas.height / gas.width : 225 / 3000); GB.y1 = GB.y0 + GB.h;
    const SP = { x0: GB.x0, x1: GB.x1, y0: GB.y1 + 5.2 * vh, y1: 88 * vh + dyS }, LAB = SP.y1 + 3.0 * u;
    const XU = i => SP.x0 + (i / n) * (SP.x1 - SP.x0), YF = F => SP.y1 - F * (SP.y1 - SP.y0);
    if (aLow > 0) {
      g.save(); g.globalAlpha = aLow; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      if (gas) g.drawImage(gas, GB.x0, GB.y0, GB.x1 - GB.x0, GB.h);
      if (IMG.paper) { g.strokeStyle = SCENE.frame; g.lineWidth = Math.max(1, 0.12 * u); g.strokeRect(GB.x0, GB.y0, GB.x1 - GB.x0, GB.h); }
      g.restore();
      g.save(); g.globalAlpha = 0.5 * aLow; g.strokeStyle = IMG.ink; g.lineWidth = Math.max(1, 0.1 * u); g.setLineDash([0.6 * u, 0.6 * u]);
      g.beginPath(); g.moveTo(GB.x0, GB.y0 + GB.h / 2); g.lineTo(GB.x1, GB.y0 + GB.h / 2); g.stroke(); g.restore();
      text('gas', GB.x0 - 1.0 * u, GB.y0 + GB.h / 2 + 0.9 * u, { px: 2.6 * u, color: INK, align: 'right', alpha: aLow });
      const wHot = text('hot gas', GB.x1, GB.y0 - 1.0 * u, { px: 1.8 * u, color: SCENE.hot, italic: true, align: 'right', alpha: aLow });
      const kx1 = GB.x1 - wHot - 0.8 * u, kx0 = kx1 - 5.6 * u;
      g.save(); g.globalAlpha = aLow; const kg = g.createLinearGradient(kx0, 0, kx1, 0);
      (IMG.paper ? INKVIEW.stops.map(([lT, c]) => [Math.min(1, Math.max(0, (lT - 3.9) / 3.3)), `rgb(${c.map(v => Math.round(255 * v)).join(',')})`])
        : [[0, '#1A4DF2'], [0.33, '#8CCCFF'], [0.55, '#D98CF2'], [0.75, '#FF8C59'], [1, '#FFF7D9']]).forEach(([o, c]) => kg.addColorStop(o, c));
      g.fillStyle = kg; g.fillRect(kx0, GB.y0 - 1.9 * u, kx1 - kx0, 0.9 * u); g.restore();
      text('gas temperature: cool', kx0 - 0.8 * u, GB.y0 - 1.0 * u, { px: 1.8 * u, color: SCENE.cool, italic: true, align: 'right', alpha: aLow });
      text('light', SP.x0 - 1.0 * u, 0.5 * (SP.y0 + SP.y1) + 0.9 * u, { px: 2.6 * u, color: INK, align: 'right', alpha: aLow });
    }
    const xg = x => GB.x0 + (x / row.L) * (GB.x1 - GB.x0), yl = GB.y0 + GB.h / 2;
    const [dla, lls] = row.clouds;
    if (aCl > 0 && aLow > 0) {
      g.save(); g.globalCompositeOperation = IMG.paper ? 'source-over' : 'lighter';
      const hc = IMG.paper ? '185,58,32' : '232,112,79';
      for (const c of [dla, lls]) {
        const x = xg(c.x), r = (c.kind === 'DLA' ? 3.2 : 2.2) * u, grd = g.createRadialGradient(x, yl, 0, x, yl, r);
        grd.addColorStop(0, `rgba(${hc},0.95)`); grd.addColorStop(0.35, `rgba(${hc},0.45)`); grd.addColorStop(1, `rgba(${hc},0)`);
        g.globalAlpha = aCl * aLow; g.fillStyle = grd; g.fillRect(x - r, yl - r, 2 * r, 2 * r);
      }
      g.fillStyle = HYDROGEN; const pw = (GB.x1 - GB.x0) / row.n;
      for (let i = 0; i < row.n; i++) { const q = clamp01((row.hi[i] - 16.5) / 4); if (q > 0) { g.globalAlpha = aCl * aLow * (0.4 + 0.6 * q); g.fillRect(GB.x0 + i * pw - 0.5, yl - 0.35 * u, pw + 1, 0.7 * u); } }
      g.restore();
    }
    if (aRing > 0) {
      for (const [c, rad, name, side, ring, ink] of [[dla, 2.2 * u, 'a galaxy’s dense gas (DLA)', 1, IMG.kinds.DLA, SCENE.kinds.DLA], [lls, 1.6 * u, 'the least dense kind (LLS)', -1, IMG.kinds.LLS, SCENE.kinds.LLS]]) {
        dot(xg(c.x), yl, rad, { stroke: ring, alpha: aRing, lw: Math.max(1.5, 0.26 * u) });
        line([[xg(c.x) + side * 0.6 * rad, yl - 0.8 * rad], [xg(c.x) + side * 1.6 * u, GB.y0 - 0.4 * u]], { color: ring, alpha: aRing, lw: Math.max(1, 0.16 * u) });
        text(name, xg(c.x) + side * 1.9 * u, GB.y0 - 1.0 * u, { px: 2.0 * u, color: ink, align: side > 0 ? 'left' : 'right', alpha: aRing, halo: true });
      }
    }
    if (aFind > 0) {
      text('masked', xg(dla.x), yl + 2.2 * u + 2.4 * u, { px: 2.0 * u, color: IMG.ink, align: 'center', alpha: aFind, halo: true, haloColor: IMG.halo });
      text('modelled with the forest', xg(lls.x), yl + 1.6 * u + 2.4 * u, { px: 2.0 * u, color: IMG.accent, align: 'center', alpha: aModel, halo: true, haloColor: IMG.halo });
    }
    const MK = row.mask, inMask = i => i >= MK[0] && i <= MK[1];
    const Ff = i => Math.exp(-row.tf[i]);
    const Fs = i => Math.exp(-Math.max(0, row.tf[i] + aCl * (row.tl[i] + row.td[i]) - (inMask(i) ? 0 : wings * row.tm[i])));
    if (aLow > 0) {
      g.save(); g.globalAlpha = aLow; g.strokeStyle = AXIS; g.lineWidth = Math.max(1, 0.12 * u);
      g.beginPath(); g.moveTo(SP.x0, SP.y0); g.lineTo(SP.x0, SP.y1); g.lineTo(SP.x1, SP.y1); g.stroke(); g.restore();
      text('1', SP.x0 - 0.8 * u, YF(1) + 0.7 * u, { px: 1.8 * u, color: SOFT, align: 'right', alpha: aLow });
      text('0', SP.x0 - 0.8 * u, YF(0) + 0.7 * u, { px: 1.8 * u, color: SOFT, align: 'right', alpha: aLow });
      if (aCl > 0) {
        g.save(); g.globalAlpha = 0.38 * aCl * aLow; g.fillStyle = HYDROGEN; g.beginPath();
        for (let i = 0; i < n; i++) { const x = XU(i + 0.5); i ? g.lineTo(x, YF(Ff(i))) : g.moveTo(x, YF(Ff(i))); }
        for (let i = n - 1; i >= 0; i--) g.lineTo(XU(i + 0.5), YF(Fs(i)));
        g.closePath(); g.fill(); g.restore();
      }
      const path = []; for (let i = 0; i < n; i++) path.push([XU(i + 0.5), YF(Fs(i))]);
      line(path, { color: INK, alpha: aLow, lw: Math.max(1.2, 0.2 * u) });
      text('the forest alone', SP.x1, LAB, { px: 2.3 * u, color: SOFT, italic: true, align: 'right', alpha: aLow * (1 - ramp(s2, 0.2, 0.8)) });
      text('with the clouds', SP.x1, LAB, { px: 2.3 * u, color: HYDROGEN, italic: true, align: 'right', alpha: ramp(s2, 0.9, 1.6) * (1 - aFind) });
    }
    if (aFind > 0) {
      const xa = XU(MK[0]), xb = XU(MK[1] + 1);
      g.save(); g.globalAlpha = 0.78 * mask; g.fillStyle = GROUND; g.fillRect(xa, SP.y0 - 0.5 * u, xb - xa, SP.y1 - SP.y0 + 0.5 * u);
      g.globalAlpha = 0.25 * mask; g.strokeStyle = SOFT; g.lineWidth = Math.max(1, 0.1 * u);
      g.beginPath(); for (let x = xa - (SP.y1 - SP.y0); x < xb; x += 1.6 * u) { g.moveTo(Math.max(xa, x), SP.y1 - Math.max(0, xa - x)); g.lineTo(Math.min(xb, x + (SP.y1 - SP.y0)), SP.y0 + Math.max(0, x + (SP.y1 - SP.y0) - xb)); }
      g.stroke(); g.restore();
      line([[xa, SP.y0 + 1.6 * u], [xa, SP.y0 - 0.6 * u], [xb, SP.y0 - 0.6 * u], [xb, SP.y0 + 1.6 * u]], { color: INK, alpha: aFind, lw: Math.max(1.5, 0.24 * u) });
      text('found: its core masked', 0.5 * (xa + xb), SP.y0 - 1.6 * u, { px: 2.1 * u, color: INK, align: 'center', alpha: aFind, halo: true });
    }
    if (aModel > 0) {
      const mp = []; for (let i = 0; i < n; i++) if (row.tm[i] > 0.02) mp.push([XU(i + 0.5), YF(Math.exp(-row.tm[i]))]);
      line(mp, { color: HYDROGEN, alpha: aModel, lw: Math.max(1.5, 0.28 * u), dash: [0.7 * u, 0.5 * u] });
      const xr = XU(MK[1] + 1) + 1.2 * u, yr = YF(Math.exp(-row.tm[Math.min(n - 1, MK[1] + 60)])) + 3.2 * u;
      text('its wings: modelled,', xr, yr, { px: 2.0 * u, color: HYDROGEN, alpha: aModel, box: true });
      text('and divided out', xr, yr + 2.4 * u, { px: 2.0 * u, color: HYDROGEN, alpha: aModel, box: true });
    }
    const arc = (i, j, colour, a, lw) => {
      if (!(a > 0)) return;
      const xa = XU(i + 0.5), xb = XU(j + 0.5), ya = YF(Fs(i)), yb = YF(Fs(j)), top = Math.min(ya, yb) - Math.min(4.5 * u, 1.2 * u + 0.14 * Math.abs(xb - xa)), path = [];
      for (let k = 0; k <= 28; k++) { const t = k / 28, x = xa + (xb - xa) * t, base = ya + (yb - ya) * t; path.push([x, base - (base - top) * Math.sin(Math.PI * t)]); }
      line(path, { color: colour, alpha: 0.9 * a, lw: Math.max(1, lw * u) });
      dot(xa, ya, 0.42 * u, { fill: colour, alpha: a }); dot(xb, yb, 0.42 * u, { fill: colour, alpha: a });
    };
    const cloudy = inMask;
    const nArc = PAIRS.length;
    PAIRS.forEach(([i, sep], k) => {
      const j = Math.min(n - 1, i + sep), a1 = ramp(sA, 5.8 + (1.8 * k) / nArc, 6.1 + (1.8 * k) / nArc) * aLow;
      const hit = cloudy(i) || cloudy(j), hitMask = inMask(i) || inMask(j);
      const coral = hit ? aAlike : 0, gone = hitMask ? mask : 0;
      arc(i, j, SLATE, a1 * (1 - coral) * (1 - gone), 0.16);
      arc(i, j, HYDROGEN, a1 * coral * (1 - gone), 0.26);
    });
    const t0 = MK[0] + Math.round(0.18 * (MK[1] - MK[0])), span = MK[1] - MK[0];
    for (let k = 0; k < 5; k++) {
      const i = t0 + Math.round((0.1 * k) * span), j = Math.min(MK[1], i + Math.round((0.12 + 0.06 * k) * span));
      arc(i, j, HYDROGEN, ramp(s2, 2.0 + 0.2 * k, 2.6 + 0.2 * k) * (1 - mask), 0.26);
    }
    SHOWN.forEach(({ i, sep }, q) => {
      const j = i + sep, lit = q ? hiF : hiN, am = aMark[q] * (1 - aPts);
      const shown = ramp(sB, 0.8 + 1.3 * q, 1.2 + 1.3 * q) * aLow;
      arc(i, j, SLATE, shown * (1 - lit), 0.16); arc(i, j, HYDROGEN, shown * lit, 0.3);
      if (!pk || !(am > 0)) return;
      const r = sep * row.L / row.n, kk = 1 / r, xk = X(kk);
      const lk_ = Math.log(kk), K_ = pk.k, i1 = K_.findIndex(x => x >= kk), w_ = i1 > 0 ? (lk_ - Math.log(K_[i1 - 1])) / (Math.log(K_[i1]) - Math.log(K_[i1 - 1])) : 0;
      const yk = Y(i1 > 0 ? Math.exp(Math.log(pk.P[i1 - 1]) * (1 - w_) + Math.log(pk.P[i1]) * w_) : pk.P[0]);
      line([[xk, yk], [xk, PX.y1]], { color: HYDROGEN, alpha: 0.7 * am, lw: Math.max(1, 0.16 * u), dash: [0.4 * u, 0.4 * u] });
      dot(xk, yk, 0.7 * u, { fill: HYDROGEN, alpha: am });
      text(`pairs ${r < 2 ? Math.round(r) : Math.round(r / 5) * 5} Mpc/h apart`, xk + (q ? 1.2 : 0) * u, yk - (q ? 0.6 : 1.6) * u, { px: 2.0 * u, color: HYDROGEN, italic: true, alpha: am, halo: true });
      if (lit > 0) {
        const xm = 0.5 * (XU(i + 0.5) + XU(j + 0.5)), ym = Math.min(YF(Fs(i)), YF(Fs(j))) - Math.min(4.5 * u, 1.2 * u + 0.07 * Math.abs(XU(j) - XU(i)));
        if (!q) dot(xm, 0.5 * (ym + YF(0.5)), 2.2 * u, { stroke: HYDROGEN, alpha: lit, lw: Math.max(1.5, 0.22 * u) });
        line([[xm, ym], [xk, yk + 0.9 * u]], { color: HYDROGEN, alpha: 0.55 * lit * am, lw: Math.max(1, 0.14 * u), dash: [0.3 * u, 0.5 * u] });
      }
    });
    COUNTED.forEach(c => {
      const a = ramp(sA, c.t0, c.t0 + 0.15) * (1 - ramp(sA, c.t0 + 0.55, c.t0 + 0.8)) * aLow, fly = clamp01((sA - c.t0 - 0.25) / 0.45);
      if (!(a > 0) && !(fly > 0 && fly < 1)) return;
      const sep = Math.max(2, Math.round((c.r * n) / row.L)), i = Math.floor(c.at * (n - sep - 2)), j = i + sep;
      arc(i, j, HYDROGEN, a, 0.2);
      if (fly > 0 && fly < 1 && pk) {
        const xm = 0.5 * (XU(i + 0.5) + XU(j + 0.5)), ym = Math.min(YF(Fs(i)), YF(Fs(j))) - Math.min(4.5 * u, 1.2 * u + 0.07 * Math.abs(XU(j) - XU(i)));
        const xt = X(1 / binR(c.bin)), yt = barTop(c.bin), e = smooth(fly);
        dot(lerp(xm, xt, e), lerp(ym, yt, e) - Math.sin(Math.PI * e) * 3 * u, 0.4 * u, { fill: HYDROGEN, alpha: aLow });
      }
    });
    text('pairs of points, near and far apart', SP.x0, LAB, { px: 2.4 * u, color: SOFT, italic: true, alpha: ramp(sA, 1.0, 1.8) * (1 - ramp(sB, 0.6, 1.0)) });
    text('pairs skewed by one galaxy’s cloud', SP.x0, LAB, { px: 2.0 * u, color: HYDROGEN, italic: true, alpha: ramp(s2, 1.9, 2.6) * (1 - aFind) });
    credits();
    function credits() {
      const fit = t => { const px = Math.min(1.5 * u, (1.5 * u * 52 * vw) / measure(t, { px: 1.5 * u, italic: true })); text(t, 8 * vw, 97.0 * vh, { px, color: MUTED, italic: true }); };
      fit(p <= 1 ? 'one sightline of a PRIYA run (Bird et al. 2023), z = 3 · the pair counting: an illustration'
        : p <= 2 ? 'curve: Planck 2018 (CAMB), scale 1/k · ranges: DESI DR2 3D fits; DESI DR1 and KODIAQ-SQUAD P1D · pairs illustrative'
          : p <= 3 ? 'points: DESI DR1 P1D (Chaves-Montero et al. 2026); mine, KODIAQ-SQUAD (Ho et al. 2026; data Karaçaylı et al. 2022)'
            : p <= 4 ? 'warm dark matter: Viel et al. 2005; its limit, Iršič et al. 2024 · neutrinos: 0.163 against 0.064 eV (CAMB)'
              : 'moved: one cloud model for all times (my chains); DLAs only (DESI DR1) · clouds: hcd_priya · mask illustrative');
    }
  }
  return {
    setData({ pk: PK, abs: AB, gap: GP, why: WY } = {}) {
      if (WY && WY.wdm_sequence && Array.isArray(WY.wdm_sequence.entries)) {
        const E = WY.wdm_sequence.entries, kg = WY.wdm_sequence.k_h_per_Mpc, lim = WY.wdm_limit && WY.wdm_limit.m_keV;
        const near = m => E.reduce((b, e) => (Math.abs(Math.log(e.m_keV / m)) < Math.abs(Math.log(b.m_keV / m)) ? e : b), E[0]);
        warm = { k: kg, kmax: WY.wdm_sequence.valid_k_max_h_Mpc, excluded: { k: kg, T2: E[0].T2, m: E[0].m_keV }, limit: { k: kg, T2: near(lim || 5.7).T2, m: lim || 5.7 } };
        const NS = WY.series.filter(q => Number.isFinite(q.mnu_eV)).sort((a1, b1) => a1.mnu_eV - b1.mnu_eV);
        if (NS.length >= 2) { const at = q => interpT({ k: q.k_h_per_Mpc, T2: q.ratio }, 1.03); nu = { shallower: at(NS[NS.length - 1]) / at(NS[0]) - 1 }; }
      }
      if (PK && PK.series) {
        const S = Object.fromEntries(PK.series.map(s => [s.id, s])), L = S.pk_lin_planck_z3, R = PK.p1d_ranges || {};
        if (L) pk = { k: L.k_h_per_Mpc, P: L.P_h3, band: R.desi_dr1_p1d && R.kodiaq_squad_ho2026 ? [Math.min(R.desi_dr1_p1d.k_h[0], R.kodiaq_squad_ho2026.k_h[0]), Math.max(R.desi_dr1_p1d.k_h[1], R.kodiaq_squad_ho2026.k_h[1])] : null,
          band3d: PK.bands && PK.bands.desi_lya_fs_fit ? PK.bands.desi_lya_fs_fit.k_auto : null };
        const pl = S.planck, de = S.desi_dr1_p1d, mi = S.kodiaq_squad;
        const cosmo = AB && AB.series ? AB.series.find(s => s.runs && s.runs.global_dc4) : null;
        const rb = mi && mi.recomputed_b && mi.recomputed_b.compressed ? mi.recomputed_b : null;
        if (pl && de && mi && rb && cosmo && cosmo.if_we_didnt && cosmo.runs.global_dc4.b && cosmo.runs.per_redshift_datacorrz.b) {
          const f = rb.P_h3 / rb.compressed.Delta2_L;
          const g4 = cosmo.runs.global_dc4.b, dz = cosmo.runs.per_redshift_datacorrz.b, dd = cosmo.if_we_didnt;
          pts = { k: mi.k_h_per_Mpc, planck: pl.P_h3, planckErr: pl.sigma_P_h3 / pl.P_h3,
            desi: { P: de.P_h3, sig: de.sigma_P_h3, shift: dd.to[0] / dd.from[0] - 1, sigShift: de.sigma_P_h3 },
            mine: { P: rb.P_h3, sig: rb.sigma_P_h3, shift: g4.mean[0] / dz.mean[0] - 1, sigShift: g4.sd[0] * f } };
        }
      }
      if (GP && GP.tau_forest) {
        row = { n: GP.n, du: GP.du, L: GP.L, tf: Float64Array.from(GP.tau_forest), tl: Float64Array.from(GP.tau_lls), td: Float64Array.from(GP.tau_dla),
          tm: Float64Array.from(GP.tau_dla_model), hi: Float64Array.from(GP.hi_line), mask: GP.mask, clouds: GP.clouds };
        if (!gas && GP.gas) load(imgSrc(GP.gas.src), b => { gas = b; });
      }
      draw(last);
    },
    render(s) { last = s && Number.isFinite(s.p) ? s.p : 6; draw(last); },
    settle() { return gas ? Promise.resolve() : new Promise(r => { const k = setInterval(() => { if (gas) { clearInterval(k); r(); } }, 50); setTimeout(() => { clearInterval(k); r(); }, 5000); }); },
    readRaw() { return new TextEncoder().encode(`gap:${last.toFixed(4)}|${row ? row.n : 0}|${pts ? 1 : 0}`); },
    readPixel(x, y) { return Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data); },
  };
}
