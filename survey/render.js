
import { program, target, freeTarget } from '../volume-spike/gl.js';
import { RECORD_HALFW } from '../ghosts-spike/ghosts.js';
import { POINTS_VS, POINTS_FS, SKEWER_VS, SKEWER_FS, AXES_VS, AXES_FS, FULLSCREEN_VS, COMPOSITE_FS, MARKS_VS, MARKS_FS, FIELD_VS, FIELD_FS } from './shaders.js';
import { frameAt, baseFrame, toNDC, project as projectFrame, newFrame, apexAt, irisDisc, SAFE, SAFE_FADE, SAFE_INK } from './camera.js';
import { revealCount, surveyTimes, RAMP_DAYS, GROW_DAYS } from './data.js';
import { palette } from './look.js';
import { createMarks, MAX_MARKS, MARK_FLOATS, patchZoom, patchSize, patchInk } from './marks.js';

export { RAMP_DAYS, GROW_DAYS };
export const AXIS_HALFW = 1.0;
export const FIELD_HALFW = 1.0;

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function alphaFor(data, pal, c, k, dpr) {
  const R = 0.5 * pal.size[c] * dpr;
  const arm = Math.max(0.55, 0.34 * R);
  const area = c === 3 ? 2 * (2 * R) * (2 * arm) - (2 * arm) ** 2 : Math.PI * (R * R + 1 / 12);
  const perPx = data.rho[c] / (k * k);
  const a = perPx > 0 ? pal.cover[c] / (perPx * area) : 0.69;
  return Math.min(0.69, Math.max(0.06, a));
}

export function createRenderer(canvas, data, opts = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: true, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  const pal = palette(opts.look || 'dark');
  const f32 = a => Float32Array.from(a);
  const U = { ground: f32(pal.ground), ink: pal.ink.map(f32), accent: f32(pal.accent), axis: f32(pal.axis) };
  const dprMax = opts.dprMax ?? 2;
  const geo = data.geo, sk = data.skewers;
  const heroIdx = sk.hero ? sk.hero.i : -1;

  const F = newFrame(), F0 = newFrame(), M = new Float32Array(6), th = [0, 0, 0, 0];
  const op = new Float32Array(5), secA = Float32Array.from(geo.secA), size = new Float32Array(4), alpha = new Float32Array(4);
  const ZERO = new Float32Array(4);
  const marks = createMarks(data, pal), PAL = Float32Array.from(pal.marks.flat());
  const IR = { x: 0, y: 0, r: 0, on: false };
  const FIELD_POS = Float32Array.from(pal.marks[1]);
  const pt = data.pairs ? data.pairs.patch : null;
  const axes5 = new Float32Array(data.axes.length * 5);
  for (let g = 0; g < 5; g++) axes5.set(data.axes, g * data.axes.length);

  let R = null;
  let size_ = { W: 0, H: 0, cw: 0, ch: 0, dpr: 1 };
  let lastCount = 0, lastMarks = 0;
  const onRestore = [];

  function init() {
    const float = !!gl.getExtension('EXT_color_buffer_float');
    const vaoPts = gl.createVertexArray();
    gl.bindVertexArray(vaoPts);
    const bPts = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPts);
    gl.bufferData(gl.ARRAY_BUFFER, data.points, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);

    const vaoSk = gl.createVertexArray();
    gl.bindVertexArray(vaoSk);
    const bSk = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bSk);
    gl.bufferData(gl.ARRAY_BUFFER, sk.inst.length ? sk.inst : new Float32Array(8), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(0, 1);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(1, 1);

    const vaoAx = gl.createVertexArray();
    gl.bindVertexArray(vaoAx);
    const bAx = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bAx);
    gl.bufferData(gl.ARRAY_BUFFER, axes5, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.vertexAttribDivisor(0, 1);

    const vaoMk = gl.createVertexArray();
    gl.bindVertexArray(vaoMk);
    const bMk = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bMk);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_MARKS * MARK_FLOATS * 4, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribDivisor(0, 1);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16); gl.vertexAttribDivisor(1, 1);
    gl.bindVertexArray(null);

    let vaoFd = null, bFd = null;
    if (data.lya && data.lya.nField > 0) {
      vaoFd = gl.createVertexArray();
      gl.bindVertexArray(vaoFd);
      bFd = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, bFd);
      gl.bufferData(gl.ARRAY_BUFFER, data.lya.field, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(0, 1);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(1, 1);
      gl.bindVertexArray(null);
    }

    R = {
      float, vaoPts, vaoSk, vaoAx, vaoMk, bMk, vaoFd, bufs: [bPts, bSk, bAx, bMk, bFd].filter(Boolean), vaoFull: gl.createVertexArray(),
      marks: program(gl, MARKS_VS, MARKS_FS),
      field: data.lya ? program(gl, FIELD_VS, FIELD_FS) : null,
      points: program(gl, POINTS_VS, POINTS_FS),
      skewers: program(gl, SKEWER_VS, SKEWER_FS),
      axes: program(gl, AXES_VS, AXES_FS),
      comp: program(gl, FULLSCREEN_VS, COMPOSITE_FS),
      fmt: float ? gl.RGBA16F : gl.RGBA8,
      denScale: float ? 1 : 0.125,
      den: null, lin: null,
    };
    size_ = { W: 0, H: 0, cw: 0, ch: 0, dpr: 1 };
    resize();
  }

  function resize() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight);
    const W = Math.max(1, Math.round(cw * dpr)), H = Math.max(1, Math.round(ch * dpr));
    if (W === size_.W && H === size_.H && dpr === size_.dpr) return;
    canvas.width = W; canvas.height = H;
    freeTarget(gl, R.den); freeTarget(gl, R.lin);
    R.den = target(gl, W, H, R.fmt, 1);
    R.lin = target(gl, W, H, R.fmt, 1);
    size_ = { W, H, cw: W / dpr, ch: H / dpr, dpr };
  }

  function render(st) {
    if (!R || gl.isContextLost()) return;
    resize();
    const { W, H, cw, ch, dpr } = size_;
    frameAt(data, st, cw, ch, F);
    toNDC(F, cw, ch, M);
    baseFrame(geo, cw, ch, F0);
    surveyTimes(data, st, th);
    const tmax = Math.max(th[0], th[1], th[2], th[3]);
    let count = revealCount(data.key, tmax);
    if ((st.heroQ || 0) > 0 && heroIdx >= count) count = heroIdx + 1;
    lastCount = count;
    op[0] = st.opB; op[1] = st.opL; op[2] = st.opE; op[3] = st.opQ; op[4] = st.opY;
    const zEff = patchZoom(data, st, F, cw, ch), zs = patchSize(zEff);
    for (let c = 0; c < 4; c++) { size[c] = pal.size[c] * dpr * zs; alpha[c] = patchInk(alphaFor(data, pal, c, F0.k * dpr, dpr), zEff); }

    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, R.den.fb);
    gl.viewport(0, 0, W, H);
    gl.clearBufferfv(gl.COLOR, 0, ZERO);
    if (count > 0) {
      const { p, u } = R.points;
      gl.useProgram(p);
      gl.uniform4f(u.uM, M[0], M[1], M[2], M[3]); gl.uniform2f(u.uB, M[4], M[5]);
      gl.uniform4f(u.uTh, th[0], th[1], th[2], th[3]);
      gl.uniform1f(u.uRamp, RAMP_DAYS);
      gl.uniform1fv(u.uOp, op); gl.uniform1fv(u.uSecA, secA);
      gl.uniform1f(u.uSecS, geo.secS); gl.uniform1f(u.uSep, st.sep); gl.uniform1f(u.uTheta0, geo.theta0);
      gl.uniform4f(u.uSize, size[0], size[1], size[2], size[3]);
      gl.uniform4f(u.uAlpha, alpha[0], alpha[1], alpha[2], alpha[3]);
      gl.uniform1f(u.uDenScale, R.denScale);
      gl.uniform1i(u.uHeroIdx, heroIdx); gl.uniform1f(u.uHeroQ, st.heroQ || 0);
      if (pt) gl.uniform4f(u.uPatch, pt.ta, pt.tb, pt.r0, pt.r1);
      gl.uniform1f(u.uClip, pt ? st.pclip || 0 : 0);
      gl.bindVertexArray(R.vaoPts);
      gl.drawArrays(gl.POINTS, 0, count);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, R.lin.fb);
    gl.viewport(0, 0, W, H);
    gl.clearBufferfv(gl.COLOR, 0, ZERO);
    if (st.axes > 0 && data.nAxes > 0) {
      const { p, u } = R.axes;
      gl.useProgram(p);
      gl.uniform4f(u.uM, M[0], M[1], M[2], M[3]); gl.uniform2f(u.uB, M[4], M[5]); gl.uniform2f(u.uVP, W, H);
      gl.uniform1fv(u.uSecA, secA);
      gl.uniform1f(u.uSecS, geo.secS); gl.uniform1f(u.uSep, st.sep); gl.uniform1f(u.uTheta0, geo.theta0);
      gl.uniform1f(u.uHalfW, AXIS_HALFW * dpr); gl.uniform1f(u.uAxes, st.axes);
      gl.uniform1i(u.uNSeg, data.nAxes);
      gl.bindVertexArray(R.vaoAx);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, data.nAxes * (st.sep > 0 ? 5 : 1));
    }
    if (st.sk > 0 && sk.count > 0) {
      const { p, u } = R.skewers;
      gl.useProgram(p);
      gl.uniform4f(u.uM, M[0], M[1], M[2], M[3]); gl.uniform2f(u.uB, M[4], M[5]); gl.uniform2f(u.uVP, W, H);
      gl.uniform1f(u.uTh, th[3]); gl.uniform1f(u.uGrow, GROW_DAYS);
      gl.uniform1f(u.uOp, st.sk * pal.skewer.alpha);
      gl.uniform1f(u.uHeroOp, st.sk * (pal.skewer.alpha + (1 - pal.skewer.alpha) * st.heroW));
      gl.uniform1f(u.uIso, st.iso);
      gl.uniform1f(u.uSep, st.sep); gl.uniform1f(u.uSecA4, geo.secA[4]); gl.uniform1f(u.uSecS, geo.secS); gl.uniform1f(u.uTheta0, geo.theta0);
      gl.uniform1f(u.uHalfW, pal.skewer.halfW * dpr);
      gl.uniform1f(u.uHeroHalfW, (pal.skewer.halfW + (RECORD_HALFW - pal.skewer.halfW) * st.heroW) * dpr);
      gl.bindVertexArray(R.vaoSk);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, sk.count);
    }
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    irisDisc(data, st, cw, ch, IR);
    const irX = IR.x * dpr, irY = H - IR.y * dpr, irR = IR.on ? IR.r * dpr : -1;
    const { p, u } = R.comp;
    gl.useProgram(p);
    gl.uniform3f(u.uIris, irX, irY, irR);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.den.tex[0]); gl.uniform1i(u.uDen, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.lin.tex[0]); gl.uniform1i(u.uLin, 1);
    gl.uniform1f(u.uDenScale, R.denScale);
    gl.uniform1i(u.uMode, pal.mode);
    gl.uniform3fv(u.uGround, U.ground);
    gl.uniform3fv(u.uInk0, U.ink[0]); gl.uniform3fv(u.uInk1, U.ink[1]); gl.uniform3fv(u.uInk2, U.ink[2]); gl.uniform3fv(u.uInk3, U.ink[3]);
    gl.uniform3fv(u.uAccent, U.accent); gl.uniform3fv(u.uAxis, U.axis);
    gl.uniform1f(u.uAxisAlpha, pal.axisAlpha); gl.uniform1f(u.uSkGain, pal.skewer.gain);
    gl.uniform1f(u.uGrain, pal.grain); gl.uniform1f(u.uDpr, dpr); gl.uniform2f(u.uCanvas, W, H);
    gl.uniform2f(u.uSafe, SAFE_FADE * H, SAFE_INK * H);
    gl.bindVertexArray(R.vaoFull);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (R.vaoFd && (st.lfield || 0) > 0) {
      const f = R.field;
      gl.useProgram(f.p);
      gl.uniform4f(f.u.uM, M[0], M[1], M[2], M[3]); gl.uniform2f(f.u.uB, M[4], M[5]); gl.uniform2f(f.u.uVP, W, H);
      gl.uniform1f(f.u.uHalfW, FIELD_HALFW * dpr); gl.uniform1f(f.u.uAlpha, st.lfield);
      gl.uniform2f(f.u.uSafe, SAFE_FADE * H, SAFE_INK * H);
      gl.uniform3fv(f.u.uNeg, U.accent); gl.uniform3fv(f.u.uPos, FIELD_POS);
      gl.uniform3f(f.u.uIris, irX, irY, irR);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(R.vaoFd);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, data.lya.nField);
      gl.disable(gl.BLEND);
    }

    lastMarks = marks.build(st, F, cw, ch);
    if (lastMarks > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, R.bMk);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, marks.buf, 0, lastMarks * MARK_FLOATS);
      const m = R.marks;
      gl.useProgram(m.p);
      gl.uniform2f(m.u.uVP, W, H); gl.uniform1f(m.u.uDpr, dpr); gl.uniform3fv(m.u.uPal, PAL);
      gl.uniform3f(m.u.uIris, irX, irY, irR); gl.uniform2f(m.u.uSafe, SAFE_FADE * H, SAFE_INK * H);
      gl.enable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(R.vaoMk);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, lastMarks);
      gl.disable(gl.BLEND);
    }
    gl.bindVertexArray(null);
  }

  function readRaw() {
    const px = new Uint8Array(size_.W * size_.H * 4);
    gl.readPixels(0, 0, size_.W, size_.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }
  function readPixel(x, y) {
    const px = new Uint8Array(4);
    gl.readPixels(x, size_.H - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from(px.slice(0, 3));
  }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; });
  canvas.addEventListener('webglcontextrestored', () => { init(); onRestore.forEach(f => f()); });
  init();

  const P = [0, 0], FP = newFrame();
  return {
    render, resize,
    readHash: () => fnv1a(readRaw()), readRaw, readPixel,
    project: (st, x, y) => { frameAt(data, st, size_.cw || canvas.clientWidth, size_.ch || canvas.clientHeight, FP); return projectFrame(FP, x, y, P).slice(); },
    hero: () => sk.hero,
    apex: st => apexAt(data, st, size_.cw || canvas.clientWidth, size_.ch || canvas.clientHeight, [0, 0]),
    iris: st => irisDisc(data, st, size_.cw || canvas.clientWidth, size_.ch || canvas.clientHeight, {}),
    look: pal.name,
    alphaFor: c => alphaFor(data, pal, c, baseFrame(geo, size_.cw, size_.ch, newFrame()).k * size_.dpr, size_.dpr),
    info: () => ({ ...size_, fmt: R && R.float ? 'RGBA16F' : 'RGBA8', lost: !R, look: pal.name, drawn: lastCount, marks: lastMarks, n: data.n }),
    debugLines: () => `fan: ${lastCount.toLocaleString()} / ${data.n.toLocaleString()} objects, ${sk.count} skewers drawn of ${sk.total}, ${lastMarks} marks` +
      `  ·  ${size_.W}×${size_.H} @${size_.dpr}x  ·  ${R && R.float ? 'RGBA16F' : 'RGBA8 fallback'}  ·  look ${pal.name}${R ? '' : '  CONTEXT LOST'}`,
    onRestore: f => onRestore.push(f),
    loseContext: () => {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) return;
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 1000);
    },
  };
}
