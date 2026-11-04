
import { program, texture2D, target, freeTarget } from '../volume-spike/gl.js';
import { FULLSCREEN_VS } from '../volume-spike/shaders.js';
import { RECORD_VS, RECORD_FS, GHOST_VS, COVER_FS, COMPOSITE_FS } from './shaders.js';
import { plainClass } from './timeline.js';
import { RECORD_HALFW } from './ghosts.js';

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const COLOUR = { paper: hex('#F4F2ED'), wash: hex('#7D8DA3'), ink: hex('#1F2732'), rust: hex('#B93A20') };
const SEGS = 64;

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function createRenderer(canvas, data, opts) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  let R = null, size = { W: 0, H: 0, dpr: 1 };
  const onRestore = [];

  function init() {
    const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
    const rows = Math.ceil(data.ghosts.n / 100);
    const packed = new Float32Array(100 * rows * 4); packed.set(data.ghosts.params);
    R = {
      vao: gl.createVertexArray(),
      record: program(gl, RECORD_VS, RECORD_FS),
      ghost: program(gl, GHOST_VS, COVER_FS),
      comp: program(gl, FULLSCREEN_VS, COMPOSITE_FS),
      row: texture2D(gl, { w: 1389, h: 2, internal: gl.R16F, format: gl.RED, type: gl.FLOAT, data: data.rows, filter: gl.NEAREST }),
      ghosts: texture2D(gl, { w: 100, h: rows, internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT, data: packed, filter: gl.NEAREST }),
      covFormat: floatTargets ? gl.RGBA16F : gl.RGBA8,
      cov: null,
    };
    size = { W: 0, H: 0, dpr: 1 };
    resize();
  }

  function resize() {
    if (!R) return;
    const dpr = Math.min(window.devicePixelRatio || 1, opts.dprMax);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr)), H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (W === size.W && H === size.H) return;
    canvas.width = W; canvas.height = H;
    freeTarget(gl, R.cov);
    R.cov = target(gl, W, H, R.covFormat, 1);
    size = { W, H, dpr };
  }

  function plotUniforms(u) {
    const { W, H } = size;
    const sx = 2 * opts.width;
    gl.uniform4f(u.uView, sx, sx * W / H, 0, 0);
    gl.uniform1f(u.uPlotH, opts.plotH);
    gl.uniform2f(u.uViewport, W, H);
  }

  function render(s) {
    if (!R || gl.isContextLost()) return;
    resize();
    const { W, H, dpr } = size, g = data.ghosts;
    gl.bindVertexArray(R.vao);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, R.cov.fb);
    gl.viewport(0, 0, W, H);
    gl.colorMask(true, true, true, true);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.enable(gl.BLEND);

    const ghosts = (mode, mask, channel, alpha, halfW) => {
      const { p, u } = R.ghost;
      gl.useProgram(p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.ghosts); gl.uniform1i(u.uGhosts, 0);
      plotUniforms(u);
      gl.uniform1f(u.uHalfW, halfW * dpr);
      gl.uniform4fv(u.uChannel, channel);
      gl.uniform1f(u.uN, g.n); gl.uniform1f(u.uKeep, g.keep);
      gl.uniform1f(u.uRelease, s.release); gl.uniform1f(u.uDrain, s.drain); gl.uniform1f(u.uResolve, s.resolve);
      gl.uniform1f(u.uAlpha, alpha); gl.uniform1f(u.uMode, mode);
      gl.uniform2f(u.uAnswer, g.answer.v0 - opts.center, g.answer.logN);
      gl.colorMask(...mask);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, SEGS * 6, g.n);
    };
    const keep = 1 - (s.settle || 0);
    if (s.release > 0 && keep > 0) {
      gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      ghosts(0, [false, true, false, false], [0, 1, 0, 1], opts.ghostAlpha * keep, 0.55);
    }
    if (s.resolve > 0 && keep > 0) {
      gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      ghosts(1, [false, false, true, false], [0, 0, 1, 0], (0.2 + 0.55 * s.resolve) * keep, 2.4);
    }
    const record = (mode, mask, channel, halfW) => {
      gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      const { p, u } = R.record;
      gl.useProgram(p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.row); gl.uniform1i(u.uRow, 0);
      plotUniforms(u);
      gl.uniform1f(u.uHalfW, halfW * dpr);
      gl.uniform4fv(u.uChannel, channel);
      gl.uniform1i(u.uLo, g.window[0]);
      gl.uniform1f(u.uLogN, s.logN); gl.uniform1f(u.uSwap, s.swap); gl.uniform1f(u.uMode, mode);
      gl.colorMask(...mask);
      gl.drawArrays(gl.TRIANGLES, 0, (g.window[1] - g.window[0]) * 6);
    };
    if (s.profileOp > 0) record(1, [false, false, false, true], [0, 0, 0, 0.55 * s.profileOp],
      1.9 + 1.1 * Math.min(1, Math.max(0, (s.logN - 20.28) / 0.04)));
    record(0, [true, false, false, false], [1, 0, 0, 0], RECORD_HALFW);
    gl.colorMask(true, true, true, true);
    gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    const { p, u } = R.comp;
    gl.useProgram(p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.cov.tex[0]); gl.uniform1i(u.uCov, 0);
    gl.uniform2f(u.uCanvas, W, H); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uGrain, opts.grain); gl.uniform1f(u.uFog, opts.fog);
    gl.uniform1f(u.uProfileRust, Math.min(1, Math.max(0, (s.logN - 20.28) / 0.04)));
    caption(s);
    gl.uniform3fv(u.uCPaper, COLOUR.paper); gl.uniform3fv(u.uCWash, COLOUR.wash);
    gl.uniform3fv(u.uCInk, COLOUR.ink); gl.uniform3fv(u.uCRust, COLOUR.rust);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  function caption(s) {
    const el = document.getElementById('caption');
    if (!el) return;
    const text = s.swap > 0.5 ? 'the simulation’s own dense cloud' : plainClass(s.logN);
    if (el.textContent !== text) el.textContent = text;
    el.style.opacity = String(s.captionOp * (1 - (s.settle || 0)));
  }

  function readRaw() {
    const px = new Uint8Array(size.W * size.H * 4);
    gl.readPixels(0, 0, size.W, size.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; });
  canvas.addEventListener('webglcontextrestored', () => { init(); onRestore.forEach(f => f()); });
  init();
  return {
    render, readRaw,
    readHash: () => fnv1a(readRaw()),
    readPixel: (x, y) => { const px = new Uint8Array(4); gl.readPixels(x, size.H - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return Array.from(px.slice(0, 3)); },
    onRestore: f => onRestore.push(f),
    debugLines: () => `${data.ghosts.n} candidates, ${data.ghosts.keep} survivors → v0 ${data.ghosts.answer.v0.toFixed(0)} km/s, ` +
      `logN ${data.ghosts.answer.logN.toFixed(2)}   canvas ${size.W}×${size.H} @${size.dpr}x${R ? '' : '   CONTEXT LOST'}`,
    loseContext: () => { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) { ext.loseContext(); setTimeout(() => ext.restoreContext(), 1000); } },
  };
}
