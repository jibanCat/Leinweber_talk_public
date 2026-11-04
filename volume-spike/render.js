
import * as mat4 from './vendor/gl-matrix/mat4.js';
import * as vec3 from './vendor/gl-matrix/vec3.js';
import { program, texture3D, texture3DR8, texture2D, target, freeTarget } from './gl.js';
import { FULLSCREEN_VS, VOLUME_FS, LINE_VS, LINE_FS, FILL_VS, FILL_FS, BEAM_VS, KEPT_VS, BOX_VS, BEAM_FS, COMPOSITE_FS } from './shaders.js';
import { HERO, NY } from './timeline.js';

const NX = 1389;
const N = 240;
const SHEET_Z = (240 + 0.5) / 480 - 0.5;
const NOISE_N = 32;

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const COLOUR = {
  paper: hex('#F4F2ED'), mist: hex('#DDE5EE'), wash: hex('#7D8DA3'), ink: hex('#1F2732'), pool: hex('#0C121B'), rust: hex('#B93A20'),
};

function halve(src, n) {
  const m = n >> 1, out = new Float32Array(m * m * m);
  for (let z = 0; z < m; z++) for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
    let s = 0;
    for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      s += src[((2 * z + dz) * n + (2 * y + dy)) * n + (2 * x + dx)];
    }
    out[(z * m + y) * m + x] = s / 8;
  }
  return out;
}

function noiseLattice(n) {
  const out = new Uint8Array(n * n * n);
  for (let i = 0; i < out.length; i++) {
    let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
    out[i] = (x >>> 0) >>> 24;
  }
  return out;
}

function fnv1a(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function prepareData(cubeU16, planeU16, buildMaps) {
  const level0 = new Float32Array(cubeU16.length);
  for (let i = 0; i < cubeU16.length; i++) level0[i] = cubeU16[i] / 65535;
  const levels = [level0];
  for (let n = N; levels.length < 4; n >>= 1) levels.push(halve(levels[levels.length - 1], n));
  const plane = new Float32Array(planeU16.length);
  for (let i = 0; i < planeU16.length; i++) plane[i] = planeU16[i] / 65535;
  return { levels, plane, maps: buildMaps(plane, NX, NY), noise: noiseLattice(NOISE_N) };
}

export function createRenderer(canvas, data, opts) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is not available in this browser.');
  let hero = opts.hero ?? HERO, mask = opts.mask ?? [0, -1], win = [0, NX - 1];

  let R = null;
  let size = { W: 0, H: 0, w: 0, h: 0, dpr: 1 };
  let timer = null, gpuMs = NaN;
  const onRestore = [];

  function init() {
    const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
    timer = opts.debug ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null;
    R = {
      vao: gl.createVertexArray(),
      volume: program(gl, FULLSCREEN_VS, VOLUME_FS),
      line: program(gl, LINE_VS, LINE_FS),
      beam: program(gl, BEAM_VS, BEAM_FS),
      fill: program(gl, FILL_VS, FILL_FS),
      box: program(gl, BOX_VS, BEAM_FS),
      kept: program(gl, KEPT_VS, BEAM_FS),
      obs: texture2D(gl, { w: 240, h: 240, internal: gl.R8, format: gl.RED, type: gl.UNSIGNED_BYTE,
        data: data.beams ? data.beams.mask : new Uint8Array(240 * 240), filter: gl.LINEAR }),
      beams: data.beams ? texture2D(gl, { w: 128, h: data.beams.packed.length / 512, internal: gl.RGBA32F, format: gl.RGBA,
        type: gl.FLOAT, data: data.beams.packed, filter: gl.NEAREST }) : null,
      keptTex: data.beams ? texture2D(gl, { w: 64, h: data.beams.keptPacked.length / 256, internal: gl.RGBA32F, format: gl.RGBA,
        type: gl.FLOAT, data: data.beams.keptPacked, filter: gl.NEAREST }) : null,
      comp: program(gl, FULLSCREEN_VS, COMPOSITE_FS),
      cube: texture3D(gl, data.levels, N, gl.CLAMP_TO_EDGE),
      noise: texture3DR8(gl, data.noise, NOISE_N),
      plane: texture2D(gl, { w: NX, h: NY, internal: gl.R16F, format: gl.RED, type: gl.FLOAT, data: data.plane, filter: gl.LINEAR }),
      maps: texture2D(gl, { w: NX, h: NY, internal: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, data: data.maps, filter: gl.LINEAR }),
      volFormat: floatTargets ? gl.RGBA16F : gl.RGBA8,
      vol: null, lines: null, query: null,
    };
    size = { W: 0, H: 0, w: 0, h: 0, dpr: 1 };
    resize();
  }

  function resize() {
    if (!R) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, opts.dprMax);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr)), H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const h = Math.min(opts.res, H), w = Math.max(1, Math.round(h * W / H));
    if (W === size.W && H === size.H && w === size.w && dpr === size.dpr) return false;
    canvas.width = W; canvas.height = H;
    freeTarget(gl, R.vol); freeTarget(gl, R.lines);
    R.vol = target(gl, w, h, R.volFormat, 2);
    R.lines = target(gl, W, H, gl.RG8, 1);
    size = { W, H, w, h, dpr };
    return true;
  }

  function camera(s, aspect) {
    const fov = s.fov * Math.PI / 180, tanHalf = Math.tan(fov / 2);
    const frame = s.fitW ? s.frame + (s.frameW * aspect - s.frame) * s.fitW : s.frame;
    const dist = 0.5 / (frame * tanHalf);
    const el = s.elev * Math.PI / 180, az = s.azim * Math.PI / 180;
    const tgt = [s.driftX, s.lookY, SHEET_Z];
    const eye = [tgt[0] + dist * Math.cos(el) * Math.sin(az), tgt[1] + dist * Math.sin(el), tgt[2] + dist * Math.cos(el) * Math.cos(az)];
    const fwd = vec3.normalize([], vec3.sub([], tgt, eye));
    const right = vec3.normalize([], vec3.cross([], fwd, [0, 1, 0]));
    const up = vec3.cross([], right, fwd);
    const view = mat4.lookAt(mat4.create(), eye, tgt, [0, 1, 0]);
    const proj = mat4.perspective(mat4.create(), fov, aspect, Math.max(dist - 2, dist * 0.05), dist + 2);
    return { eye, fwd, right, up, tanHalf, dist, vp: mat4.multiply(mat4.create(), proj, view) };
  }

  function setCamera(u, cam, aspect) {
    gl.uniform3fv(u.uEye, cam.eye); gl.uniform3fv(u.uFwd, cam.fwd);
    gl.uniform3fv(u.uRight, cam.right); gl.uniform3fv(u.uUp, cam.up);
    gl.uniform1f(u.uTanHalf, cam.tanHalf); gl.uniform1f(u.uAspect, aspect);
  }

  function bindTex(unit, target3d, tex, loc) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target3d ? gl.TEXTURE_3D : gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  function render(s, cfg = {}) {
    if (!R || gl.isContextLost()) return;
    hero = cfg.hero ?? opts.hero ?? HERO; mask = cfg.mask ?? opts.mask ?? [0, -1];
    win = cfg.win ?? opts.win ?? [0, NX - 1];
    resize();
    const { W, H, w, h, dpr } = size;
    const aspect = W / H;
    const cam = camera(s, aspect);
    gl.bindVertexArray(R.vao);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, R.vol.fb);
    gl.viewport(0, 0, w, h);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]);
    if (s.slabW > 0) {
      const q = timer && !R.query ? gl.createQuery() : null;
      if (q) gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
      const { p, u } = R.volume;
      gl.useProgram(p);
      bindTex(0, true, R.cube, u.uCube);
      bindTex(1, true, R.noise, u.uNoise);
      bindTex(2, false, R.obs, u.uObs);
      gl.uniform1f(u.uSparse, s.sparse || 0);
      gl.uniform4f(u.uIso, s.isoY || 0, s.isoZ || 0, s.iso || 0, 0);
      gl.uniform2f(u.uRes, w, h);
      setCamera(u, cam, aspect);
      gl.uniform1f(u.uFocus, cam.dist);
      gl.uniform1f(u.uSheetZ, SHEET_Z); gl.uniform1f(u.uSlabW, s.slabW);
      gl.uniform1f(u.uSteps, opts.steps); gl.uniform1f(u.uInk, opts.ink * (s.inkScale ?? 1)); gl.uniform1f(u.uThresh, s.thresh ?? opts.thresh);
      gl.uniform1f(u.uWash, opts.wash * (s.washScale ?? 1)); gl.uniform1f(u.uWashLod, opts.washLod);
      gl.uniform1f(u.uAerial, opts.aerial); gl.uniform1f(u.uGran, opts.gran); gl.uniform1f(u.uJitter, opts.jitter);
      gl.uniform3fv(u.uCWash, COLOUR.wash); gl.uniform3fv(u.uCInk, COLOUR.ink);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (q) { gl.endQuery(timer.TIME_ELAPSED_EXT); R.query = q; }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, R.lines.fb);
    gl.viewport(0, 0, W, H);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
    if (s.traceOp > 0) {
      const n = Math.ceil(s.traceN);
      const lo = Math.max(0, hero - n), hi = Math.min(NY - 1, hero + n);
      const { p, u } = R.line;
      gl.useProgram(p);
      bindTex(0, false, R.plane, u.uPlane);
      gl.uniformMatrix4fv(u.uVP, false, cam.vp);
      gl.uniform2f(u.uViewport, W, H);
      gl.uniform1f(u.uHalfW, 1.1 * dpr * opts.lineScale * (s.lineW ?? 1));
      gl.uniform1f(u.uHero, hero); gl.uniform1f(u.uSpread, s.traceSpread); gl.uniform1f(u.uAmp, s.traceAmp);
      gl.uniform3f(u.uMask, mask[0], mask[1], s.mask || 0);
      gl.uniform3f(u.uWin, win[0], win[1], s.win || 0);
      gl.uniform1f(u.uSheetZ, SHEET_Z); gl.uniform1f(u.uTraceN, s.traceN); gl.uniform1f(u.uTraceOp, s.traceOp);
      gl.uniform1f(u.uNeighOp, opts.neighOp); gl.uniform1f(u.uTraceInk, s.traceInk); gl.uniform1f(u.uRowOp, Math.min(1, opts.sheetInk * 1.7)); gl.uniform1f(u.uNX, NX); gl.uniform1f(u.uNY, NY);
      gl.uniform1i(u.uRowLo, lo);
      gl.uniform1f(u.uFlat, 0); gl.uniform2f(u.uChan, 1, 0);
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, (NX - 1) * 6, hi - lo + 1);
      if ((s.expect || 0) > 0) {
        gl.uniform1f(u.uFlat, 1); gl.uniform2f(u.uChan, 0.4 * s.expect, 0.8 * s.expect);
        gl.uniform3f(u.uMask, 0, -1, 0); gl.uniform3f(u.uWin, 0, NX - 1, 0);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, (NX - 1) * 6, 1);
      }
      if ((s.shadow || 0) > 0) {
        const { p: pf, u: uf } = R.fill;
        gl.useProgram(pf);
        bindTex(0, false, R.plane, uf.uPlane);
        gl.uniformMatrix4fv(uf.uVP, false, cam.vp);
        gl.uniform1f(uf.uHero, hero); gl.uniform1f(uf.uAmp, s.traceAmp); gl.uniform1f(uf.uSheetZ, SHEET_Z);
        gl.uniform1f(uf.uNX, NX); gl.uniform1f(uf.uNY, NY); gl.uniform1f(uf.uFill, 0.42 * s.shadow);
        gl.drawArrays(gl.TRIANGLES, 0, (NX - 1) * 6);
      }
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    }
    if ((s.box || 0) > 0 && s.slabW > 0) {
      const { p, u } = R.box;
      gl.useProgram(p);
      gl.uniformMatrix4fv(u.uVP, false, cam.vp);
      gl.uniform2f(u.uViewport, W, H); gl.uniform3fv(u.uEye, cam.eye);
      gl.uniform3f(u.uMin, -0.5, -0.5, Math.max(-0.5, SHEET_Z - s.slabW));
      gl.uniform3f(u.uMax, 0.5, 0.5, Math.min(0.5, SHEET_Z + s.slabW));
      gl.uniform1f(u.uDpr, dpr * opts.lineScale); gl.uniform1f(u.uFocus, cam.dist); gl.uniform1f(u.uAerial, opts.aerial);
      gl.uniform1f(u.uBox, s.box * Math.min(1, s.slabW / 0.1));
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 12);
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    }
    if (R.beams && ((s.comb || 0) > 0 || (s.keptInk || 0) > 0)) {
      const B = data.beams, { p, u } = R.beam;
      gl.useProgram(p);
      bindTex(0, false, R.beams, u.uBeams);
      gl.uniformMatrix4fv(u.uVP, false, cam.vp);
      gl.uniform2f(u.uViewport, W, H); gl.uniform3fv(u.uEye, cam.eye);
      gl.uniform1f(u.uDpr, dpr * opts.lineScale); gl.uniform1f(u.uFocus, cam.dist); gl.uniform1f(u.uAerial, opts.aerial);
      gl.uniform1f(u.uComb, s.comb || 0); gl.uniform1f(u.uGone, s.gone || 0); gl.uniform1f(u.uKeptInk, s.keptInk || 0);
      gl.uniform1f(u.uCombGrow, s.combGrow ?? 1);
      gl.uniform1f(u.uNComb, B.nComb); gl.uniform1f(u.uNObs, B.nObs);
      gl.uniform1f(u.uEmph, s.emph || 0);
      gl.uniform4f(u.uIso, s.isoY || 0, s.isoZ || 0, s.iso || 0, s.isoIdx ?? -1);
      gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, B.n);
      if ((s.keptInk || 0) > 0) {
        const { p: pk, u: uk } = R.kept;
        gl.useProgram(pk);
        bindTex(0, false, R.keptTex, uk.uKept);
        bindTex(1, true, R.cube, uk.uCube);
        gl.uniformMatrix4fv(uk.uVP, false, cam.vp);
        gl.uniform2f(uk.uViewport, W, H); gl.uniform3fv(uk.uEye, cam.eye);
        gl.uniform1f(uk.uDpr, dpr * opts.lineScale); gl.uniform1f(uk.uFocus, cam.dist); gl.uniform1f(uk.uAerial, opts.aerial);
        gl.uniform1f(uk.uKeptInk, s.keptInk); gl.uniform1f(uk.uHover, s.hover ?? -1); gl.uniform1f(uk.uEmph, s.emph || 0);
        gl.uniform4f(uk.uIso, s.isoY || 0, s.isoZ || 0, s.iso || 0, s.isoIdx ?? -1);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 240 * 6, B.nObs);
      }
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    const { p, u } = R.comp;
    gl.useProgram(p);
    bindTex(0, false, R.vol.tex[0], u.uFront);
    bindTex(1, false, R.vol.tex[1], u.uBack);
    bindTex(2, false, R.lines.tex[0], u.uLines);
    bindTex(3, false, R.plane, u.uPlane);
    bindTex(4, false, R.maps, u.uMaps);
    gl.uniform2f(u.uCanvas, W, H); gl.uniform1f(u.uDpr, dpr); gl.uniform1f(u.uGrain, opts.grain);
    setCamera(u, cam, aspect);
    gl.uniform1f(u.uSheetZ, SHEET_Z); gl.uniform1f(u.uSheetAmt, s.sheetAmt); gl.uniform1f(u.uSheetInk, opts.sheetInk);
    gl.uniform1f(u.uRevealN, s.revealN); gl.uniform1f(u.uHero, hero); gl.uniform1f(u.uNX, NX); gl.uniform1f(u.uNY, NY);
    gl.uniform4f(u.uNeedle, hero, mask[0], mask[1], 0); gl.uniform2f(u.uCutFill, s.cut || 0, s.fill || 0);
    gl.uniform1f(u.uInvert, s.invert || 0); gl.uniform1f(u.uSlitEdge, s.slit ?? 1);
    gl.uniform2f(u.uHeroLine, s.heroLine || 0, s.heroGap ?? 1);
    gl.uniform3fv(u.uCRust, COLOUR.rust);
    gl.uniform3fv(u.uCPaper, COLOUR.paper); gl.uniform3fv(u.uCWash, COLOUR.wash);
    gl.uniform3fv(u.uCInk, COLOUR.ink); gl.uniform3fv(u.uCPool, COLOUR.pool); gl.uniform3fv(u.uCLine, COLOUR.ink);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  function pollTimer() {
    if (!timer || !R || !R.query) return gpuMs;
    const q = R.query;
    if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(timer.GPU_DISJOINT_EXT)) {
      gpuMs = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(q); R.query = null;
    }
    return gpuMs;
  }

  function readHash() {
    const px = new Uint8Array(size.W * size.H * 4);
    gl.readPixels(0, 0, size.W, size.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return fnv1a(px);
  }
  function readRaw() {
    const px = new Uint8Array(size.W * size.H * 4);
    gl.readPixels(0, 0, size.W, size.H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
  }
  function readPixel(x, y) {
    const px = new Uint8Array(4);
    gl.readPixels(x, size.H - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return Array.from(px.slice(0, 3));
  }

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); R = null; });
  canvas.addEventListener('webglcontextrestored', () => { init(); onRestore.forEach(f => f()); });

  init();
  function project(s, pt) {
    const aspect = size.W / size.H, cam = camera(s, aspect);
    const c = [0, 0, 0, 0], m = cam.vp;
    for (let r = 0; r < 4; r++) c[r] = m[r] * pt[0] + m[4 + r] * pt[1] + m[8 + r] * pt[2] + m[12 + r];
    if (c[3] <= 0) return null;
    return [(c[0] / c[3] * 0.5 + 0.5) * size.W / size.dpr, (0.5 - c[1] / c[3] * 0.5) * size.H / size.dpr];
  }

  return {
    render, resize, readHash, readRaw, readPixel, pollTimer, project,
    info: () => ({ ...size, volFormat: R && R.volFormat === gl.RGBA16F ? 'RGBA16F' : 'RGBA8', lost: !R }),
    debugLines: () => {
      const g = pollTimer(), f = R && R.volFormat === gl.RGBA16F ? 'RGBA16F' : 'RGBA8';
      return `volume ${size.w}×${size.h} (${f})  canvas ${size.W}×${size.H} @${size.dpr}x\n` +
        `volume pass ${Number.isFinite(g) ? g.toFixed(2) + ' ms' : 'n/a'}${R ? '' : '   CONTEXT LOST'}`;
    },
    onRestore: f => onRestore.push(f),
    loseContext: () => {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) return;
      ext.loseContext();
      setTimeout(() => ext.restoreContext(), 1000);
    },
  };
}
