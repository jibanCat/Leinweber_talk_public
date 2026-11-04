import { SCENE } from './look.js';
const INK = SCENE.ink, SOFT = SCENE.soft, GROUND = SCENE.ground, ACC = SCENE.accent;
const SERIF = '"LyaAlpha", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => x * x * (3 - 2 * x);
const ramp = (x, a, b) => smooth(clamp01((x - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
export const ATOM_DUR = [13.0];
const LIGHT = SCENE.paper ? '#4A5566' : '#E9E6DF', PHOTON = SCENE.paper ? '#5B4FA8' : '#B9A6FF';

export function createAtom(canvas) {
  const g = canvas.getContext('2d');
  let last = 1;
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
    const seg = (x0, y0, x1, y1, c, a, lw, dash) => { if (!(a > 0)) return; g.save(); g.globalAlpha = a; g.strokeStyle = c; g.lineWidth = lw; if (dash) g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore(); };
    const s1 = clamp01(p) * ATOM_DUR[0], a1 = ramp(s1, 0, 0.6);
    const HIT = 4.4, slow = ramp(s1, 2.6, 3.2) * (1 - ramp(s1, 7.4, 8.0));
    const hit = ramp(s1, HIT, HIT + 0.4), climb = ramp(s1, HIT + 0.3, HIT + 2.5), jump = climb, dip = ramp(s1, HIT, HIT + 0.8);
    const grow = 1 + 0.45 * ramp(s1, 3.0, 4.2) * (1 - ramp(s1, 7.6, 8.6));
    const cx = 30 * vw, cy = 60 * vh, R1 = 3.0 * u * grow, R2 = 4 * R1;

    for (const [R, n] of [[R1, 1], [R2, 2]]) { g.save(); g.globalAlpha = (n === 2 ? 0.35 + 0.5 * jump : 0.6) * a1; g.strokeStyle = n === 2 && jump > 0 ? ACC : SOFT; g.lineWidth = Math.max(1, (0.12 + 0.14 * (n === 2 ? jump * (1 - ramp(s1, 8.0, 9.0)) : 0)) * u); g.setLineDash([0.4 * u, 0.4 * u]); g.beginPath(); g.arc(cx, cy, R, 0, 2 * Math.PI); g.stroke(); g.restore();
      text(`n = ${n}`, cx + R * 0.72 + 0.8 * u, cy + R * 0.72 + 2.6 * u, { px: 2.6 * u, color: SOFT, alpha: a1 }); }
    g.save(); g.globalAlpha = a1; g.fillStyle = ACC; g.beginPath(); g.arc(cx, cy, 1.0 * u * grow, 0, 2 * Math.PI); g.fill(); g.restore();
    let slowed = 0; for (let x = 0; x < s1; x += 0.05) slowed += 0.05 * ramp(x, 2.6, 3.2) * (1 - ramp(x, 7.4, 8.0));
    const R = R1 + (R2 - R1) * jump, th = 0.5 + 1.3 * s1 - 1.0 * slowed;
    if (climb > 0 && climb < 1) {
      g.save(); g.globalAlpha = 0.5 * a1; g.strokeStyle = PHOTON; g.lineWidth = Math.max(2, 0.3 * u); g.beginPath();
      for (let i = 0; i <= 30; i++) { const f = (i / 30) * climb, rr = R1 + (R2 - R1) * f; g.lineTo(cx + rr * Math.cos(th - 1.2 * (climb - f)), cy - rr * Math.sin(th - 1.2 * (climb - f))); }
      g.stroke(); g.restore();
    }
    g.save(); g.globalAlpha = a1; g.fillStyle = INK; g.shadowColor = climb > 0 && climb < 1 ? PHOTON : INK; g.shadowBlur = 0.8 * u + 3.2 * u * Math.sin(Math.PI * climb); g.beginPath(); g.arc(cx + R * Math.cos(th), cy - R * Math.sin(th), 0.7 * u * grow, 0, 2 * Math.PI); g.fill(); g.restore();
    text('a hydrogen atom: a proton, one electron', cx, cy + 12 * u * 1.45 + 5.0 * u, { px: 3.0 * u, color: SOFT, italic: true, align: 'center', alpha: a1 });
    text('slow motion', cx, cy + 12 * u * 1.45 + 9.4 * u, { px: 3.0 * u, color: PHOTON, italic: true, align: 'center', alpha: slow * a1 });

    const xA = cx - R1, xHead = s1 < 2.6 ? lerp(4 * vw, xA - 9 * u, clamp01((s1 - 0.6) / 2.0)) : s1 < HIT ? lerp(xA - 9 * u, xA, smooth(clamp01((s1 - 2.6) / (HIT - 2.6))))
      : s1 < 8.0 ? xA : lerp(xA, 56 * vw, ramp(s1, 8.0, 10.0));
    const aL = ramp(s1, 0.5, 0.9) * a1;
    if (aL > 0) {
      g.save(); g.globalAlpha = aL; g.strokeStyle = LIGHT; g.lineWidth = Math.max(2, 0.34 * u); g.shadowColor = LIGHT; g.shadowBlur = 1.0 * u; g.beginPath();
      const L = 15 * u, k = (2 * Math.PI) / (2.2 * u), ph = 6 * s1 * (1 - 0.85 * slow);
      for (let i = 0; i <= 120; i++) { const f = i / 120, x = xHead - L * (1 - f), env = Math.sin(Math.PI * f) ** 2; const y = cy + 1.6 * u * env * Math.sin(k * (x - xHead) + ph); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore();
    }
    if (hit > 0 && hit < 1) {
      const fl = Math.sin(Math.PI * hit);
      g.save(); g.globalAlpha = 0.9 * fl * a1; g.fillStyle = PHOTON; g.shadowColor = PHOTON; g.shadowBlur = 4 * u; g.beginPath(); g.arc(xA, cy, 2.2 * u * fl, 0, 2 * Math.PI); g.fill(); g.restore();
      g.save(); g.globalAlpha = 0.7 * (1 - hit) * a1; g.strokeStyle = PHOTON; g.lineWidth = Math.max(2, 0.3 * u); g.beginPath(); g.arc(cx, cy, R1 + 10 * u * hit, 0, 2 * Math.PI); g.stroke(); g.restore();
    }

    const cw = 21 * vw, ch = 16 * vh, kx = Math.min(xHead - 7.5 * u - cw / 2, 60 * vw - cw), ky = 22 * vh;
    if (aL > 0) {
      g.save(); g.globalAlpha = 0.9 * aL; g.fillStyle = SCENE.halo; g.fillRect(kx, ky, cw, ch); g.globalAlpha = 0.6 * aL; g.strokeStyle = SOFT; g.lineWidth = Math.max(1, 0.12 * u); g.strokeRect(kx, ky, cw, ch); g.restore();
      seg(kx + cw / 2, ky + ch, xHead - 7.5 * u, cy - 2.4 * u, SOFT, 0.5 * aL, Math.max(1, 0.1 * u), [0.3 * u, 0.4 * u]);
      const took = ramp(s1, HIT + 0.8, HIT + 1.6);
      text('the light’s colours', kx + 1.2 * u, ky + 3.2 * u, { px: 2.5 * u, color: SOFT, italic: true, alpha: aL * (1 - took) });
      text('colour taken by hydrogen', kx + 1.2 * u, ky + 3.2 * u, { px: 2.5 * u, color: ACC, italic: true, alpha: aL * took });
      const px0 = kx + 1.8 * u, px1 = kx + cw - 1.8 * u, py0 = ky + 5.2 * u, py1 = ky + ch - 3.4 * u, xm = lerp(px0, px1, 8.5 / 21);
      seg(xm, py0, xm, py1, ACC, 0.7 * aL, Math.max(1, 0.12 * u), [0.4 * u, 0.3 * u]);
      const NB = 21, bw = (px1 - px0) / NB, jb = Math.floor((xm - px0) / bw), yB = j => lerp(py1, py0, 0.85 * (1 - (j === jb ? 0.9 * dip : 0)));
      g.save(); g.globalAlpha = aL; g.strokeStyle = LIGHT; g.lineWidth = Math.max(1.5, 0.26 * u); g.lineJoin = 'miter'; g.beginPath(); g.moveTo(px0, yB(0));
      for (let j = 0; j < NB; j++) { if (j) g.lineTo(px0 + j * bw, yB(j)); g.lineTo(px0 + (j + 1) * bw, yB(j)); }
      g.stroke(); g.restore();
      text('bluer', px0, py1 + 2.6 * u, { px: 2.0 * u, color: SOFT, italic: true, alpha: aL });
      text('redder', px1, py1 + 2.6 * u, { px: 2.0 * u, color: SOFT, italic: true, align: 'right', alpha: aL });
      text('121.6 nm', xm, py1 + 2.6 * u, { px: 2.0 * u, color: ACC, align: 'center', alpha: aL });
    }

    const ex0 = 66 * vw, ex1 = 80 * vw, et = 26 * vh, eb = 80 * vh, yE = n => et + (eb - et) / (n * n);
    const aE = ramp(s1, 1.2, 2.0) * a1, lit = Math.sin(Math.PI * climb);
    for (const [n, a, dash, lab] of [[1, 1, null, 'n = 1'], [2, 1, null, 'n = 2'], [3, 0.5, null, ''], [Infinity, 0.7, [0.5 * u, 0.4 * u], 'free']]) {
      const y = n === Infinity ? et : yE(n), on = n === 1 || n === 2 ? lit : 0;
      g.save(); g.shadowColor = ACC; g.shadowBlur = 2.4 * u * on; seg(ex0, y, ex1, y, on > 0.05 ? ACC : INK, a * aE, Math.max(1.5, (0.26 + 0.3 * on) * u), dash); g.restore();
      if (lab) text(lab, ex0 - 1.2 * u, y + 0.9 * u, { px: 2.8 * u, color: SOFT, align: 'right', alpha: aE });
    }
    text('hydrogen’s energy levels', 0.5 * (ex0 + ex1), eb + 5.0 * u, { px: 2.8 * u, color: SOFT, italic: true, align: 'center', alpha: aE });
    if (jump > 0) {
      const x = ex0 + 0.3 * (ex1 - ex0), y0 = yE(1), y1 = yE(2), yt = lerp(y0, y1, jump);
      g.save(); g.globalAlpha = aE; g.strokeStyle = ACC; g.fillStyle = ACC; g.lineWidth = Math.max(3, 0.5 * u); g.shadowColor = ACC; g.shadowBlur = 2 * u * lit; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, yt + 1.4 * u); g.stroke();
      if (jump > 0.85) { g.beginPath(); g.moveTo(x, y1); g.lineTo(x - 1.0 * u, y1 + 1.8 * u); g.lineTo(x + 1.0 * u, y1 + 1.8 * u); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(x, yt, 0.7 * u, 0, 2 * Math.PI); g.fillStyle = INK; g.fill();
      g.restore();
    }
    const aN = ramp(s1, HIT + 2.4, HIT + 3.2) * a1;
    text('Lyman alpha', ex1 + 1.8 * u, yE(2) + 0.6 * u, { px: 4.8 * u, color: ACC, alpha: aN });
    text('121.6 nm', ex1 + 1.8 * u, yE(2) + 5.0 * u, { px: 3.4 * u, color: ACC, alpha: aN });
  }
  return {
    render(st) { last = st && Number.isFinite(st.p) ? st.p : 1; draw(last); },
    settle() { return Promise.resolve(); },
    readRaw() { return new TextEncoder().encode(`atom:${last.toFixed(4)}`); },
    readPixel(x, y) { return Array.from(g.getImageData(Math.round(x), Math.round(y), 1, 1).data); },
  };
}
