
export const COMMON = `
precision highp float;
float pigmentLt(float lt) { return smoothstep(0.2375, 0.5625, lt); }     // field-gl.js: log10 τ in [-1.2, 1.4]
float ltOfF(float F) {                                                    // τ = -ln F, mapped as in field-gl.js
  float tau = -log(max(F, 1e-6));
  return clamp((log(tau + 1e-3) * 0.4342944819 + 3.0) / 8.0, 0.0, 1.0);
}
float pig(float F) { return pigmentLt(ltOfF(F)); }
float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
vec3 rayDir(vec2 ndc, vec3 fwd, vec3 right, vec3 up, float tanHalf, float aspect) {
  return normalize(fwd + ndc.x * tanHalf * aspect * right + ndc.y * tanHalf * up);
}
`;

export const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const VOLUME_FS = `#version 300 es
${COMMON}
precision highp sampler3D;
uniform sampler3D uCube, uNoise;
uniform sampler2D uObs;        // beat 8: the observed tubes on the box's face, [row][iz]
uniform float uSparse;         // beat 8: 0 = the whole volume, 1 = only what the survey's sightlines pass through
uniform vec4 uIso;             // beat 8: one sightline isolated: (y, z, amount, unused)
uniform vec2 uRes;
uniform vec3 uEye, uFwd, uRight, uUp;
uniform float uTanHalf, uAspect, uFocus;
uniform float uSheetZ, uSlabW, uSteps, uInk, uThresh, uWash, uWashLod, uAerial, uGran, uJitter;
uniform vec3 uCWash, uCInk;
layout(location = 0) out vec4 outFront;
layout(location = 1) out vec4 outBack;

vec2 hitBox(vec3 o, vec3 d, vec3 bmin, vec3 bmax) {
  vec3 dd = vec3(abs(d.x) < 1e-7 ? 1e-7 : d.x, abs(d.y) < 1e-7 ? 1e-7 : d.y, abs(d.z) < 1e-7 ? 1e-7 : d.z);
  vec3 t0 = (bmin - o) / dd, t1 = (bmax - o) / dd;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  return vec2(max(max(tn.x, tn.y), tn.z), min(min(tf.x, tf.y), tf.z));
}

void main() {
  outFront = vec4(0.0); outBack = vec4(0.0);
  if (uSlabW <= 0.0) return;
  vec2 ndc = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 o = uEye, d = rayDir(ndc, uFwd, uRight, uUp, uTanHalf, uAspect);
  vec3 bmin = vec3(-0.5, -0.5, max(-0.5, uSheetZ - uSlabW));
  vec3 bmax = vec3( 0.5,  0.5, min( 0.5, uSheetZ + uSlabW));
  vec2 th = hitBox(o, d, bmin, bmax);
  th.x = max(th.x, 0.0);
  if (th.y <= th.x) return;
  float tSheet = abs(d.z) > 1e-7 ? (uSheetZ - o.z) / d.z : 1e30;

  float dt = 1.0 / uSteps;                        // world units; the box is 1 across
  float dtVox = dt * 240.0;                       // in voxels
  float t = th.x + dt * uJitter * hash12(gl_FragCoord.xy);  // deterministic per-pixel offset: no wood-grain, no history
  vec3 accF = vec3(0.0), accB = vec3(0.0);
  float TF = 1.0, TB = 1.0;
  for (int i = 0; i < 2048; i++) {
    if (t > th.y) break;
    vec3 p = o + d * t;
    vec3 tc = vec3(p.x + 0.5, p.z + 0.5, 0.5 - p.y);
    // Explicit LOD everywhere in the loop: implicit derivatives are undefined in non-uniform control flow and,
    // with per-pixel jitter, would pick a different mip level per pixel (visible as bands).
    float pv = pig(textureLod(uCube, tc, 0.0).r);
    float pw = pig(textureLod(uCube, tc, uWashLod).r);
    float vein = smoothstep(uThresh, 1.0, pv);                     // only structure lays ink down
    float wash = uWash * smoothstep(uThresh * 0.8, 1.0, pw);        // a quieter, broader tone
    if (uSparse > 0.0 || uIso.z > 0.0) {                            // beat 8: keep only the ink the beams pass through
      float seen = mix(1.0, textureLod(uObs, vec2(p.z + 0.5, 0.5 - p.y), 0.0).r, uSparse);
      vec2 dq = (p.yz - uIso.xy) * 240.0;
      seen *= mix(1.0, exp(-dot(dq, dq) / 3.38), uIso.z);         // one tube, σ = 1.3 voxels, as in the mask
      seen *= 1.0 + 1.5 * uSparse * seen;                          // a thin tube needs more ink per sample to read
      vein *= seen; wash *= seen;
    }
    if (vein + wash > 0.0) {
      float g = 1.0 + uGran * (textureLod(uNoise, tc * 7.5, 0.0).r - 0.5) * smoothstep(0.45, 0.9, pv);   // granulation in data space
      float fade = exp(-uAerial * max(t - uFocus, 0.0));              // ink thins behind the sheet: aerial perspective
      vec3 q = 0.5 - abs(p - vec3(0.0, 0.0, 0.5 * (bmin.z + bmax.z)));   // distance to the slab's faces
      q.z -= 0.5 - 0.5 * (bmax.z - bmin.z);
      float e = min(min(q.x, q.y), q.z);
      fade *= smoothstep(0.0, 0.022 + 0.018 * textureLod(uNoise, tc * 1.5, 0.0).r, e);   // deckled faces, in data space
      float a = 1.0 - exp(-uInk * (vein + wash) * g * fade * dtVox);
      vec3 c = mix(uCWash, uCInk, smoothstep(0.45, 0.9, pv));
      if (t < tSheet) { accF += TF * a * c; TF *= 1.0 - a; }
      else            { accB += TB * a * c; TB *= 1.0 - a; }
      if (TF < 0.01) break;
    }
    t += dt;
  }
  outFront = vec4(accF, 1.0 - TF);
  outBack = vec4(accB, 1.0 - TB);
}`;

export const LINE_VS = `#version 300 es
precision highp float;
uniform sampler2D uPlane;
uniform mat4 uVP;
uniform vec2 uViewport;
uniform float uHalfW, uHero, uSpread, uAmp, uSheetZ, uTraceN, uTraceOp, uNeighOp, uNX, uNY, uTraceInk, uRowOp;
uniform float uFlat;           // 1: the hero row drawn at F = 1, the light that should have arrived (beats 2, 10)
uniform vec3 uMask;            // beat 7: (first masked pixel, last masked pixel, how far the cut has opened 0..1)
uniform vec3 uWin;             // beat 7: (first, last pixel of the ghosts' window, how much outside it is hidden 0..1)
uniform int uRowLo;
out float vDist;
out float vOp;
out float vInk;
float pigmentLt(float lt) { return smoothstep(0.2375, 0.5625, lt); }
float pig(float F) { float tau = -log(max(F, 1e-6)); return pigmentLt(clamp((log(tau + 1e-3) * 0.4342944819 + 3.0) / 8.0, 0.0, 1.0)); }
vec3 world(int px, int row) {
  float F = uFlat > 0.5 ? 1.0 : texelFetch(uPlane, ivec2(px, row), 0).r;
  float yHero = 0.5 - (uHero + 0.5) / uNY;
  float y = yHero - (float(row) - uHero) * uSpread + uAmp * (F - 0.5);
  return vec3((float(px) + 0.5) / uNX - 0.5, y, uSheetZ);
}
void main() {
  int seg = gl_VertexID / 6, corner = gl_VertexID - seg * 6;
  int row = uRowLo + gl_InstanceID;
  float dist = abs(float(row) - uHero);
  // Neighbours appear one by one as traceN grows, and fade with distance from the hero row.
  float op = row == int(uHero) ? 1.0 : clamp(uTraceN - dist + 1.0, 0.0, 1.0) * uNeighOp * (1.0 - 0.75 * dist / (uTraceN + 1.0));
  vOp = mix(op, uRowOp, uTraceInk) * uTraceOp;   // a flattened trace carries its row at the sheet's ink level
  if (row == int(uHero) && uMask.z > 0.0) {       // the mask: pixels cut out, not healed (opens from the centre)
    float c = 0.5 * (uMask.x + uMask.y), hw = 0.5 * (uMask.y - uMask.x + 1.0) * uMask.z;
    if (abs(float(seg) + 0.5 - c) < hw) vOp = 0.0;
  }
  if (row == int(uHero) && (float(seg) < uWin.x || float(seg) >= uWin.y)) vOp *= 1.0 - uWin.z;
  vec4 c0 = uVP * vec4(world(seg, row), 1.0), c1 = uVP * vec4(world(seg + 1, row), 1.0);
  vec2 s0 = c0.xy / c0.w * uViewport * 0.5, s1 = c1.xy / c1.w * uViewport * 0.5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  bool far = corner == 1 || corner == 2 || corner == 4;
  float side = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : -1.0;
  float ext = uHalfW + 1.0;
  vec4 C = far ? c1 : c0;
  vec2 S = (far ? s1 : s0) + nrm * side * ext + dir * (far ? 1.0 : -1.0) * uHalfW;
  vDist = side * ext;
  // As a trace flattens it takes on its row's ink: it becomes that row of the sheet, not a grey stroke.
  float F = texelFetch(uPlane, ivec2(far ? seg + 1 : seg, row), 0).r;
  vInk = mix(1.0, pig(F), uTraceInk);
  gl_Position = vec4(S / (uViewport * 0.5) * C.w, C.z, C.w);
}`;

export const BEAM_VS = `#version 300 es
precision highp float;
uniform sampler2D uBeams;      // RGBA32F, 128 wide: (y, z, rank, brightness; 0 = not observed)
uniform mat4 uVP;
uniform vec2 uViewport;
uniform vec3 uEye;
uniform float uDpr, uFocus, uAerial, uComb, uGone, uKeptInk, uNComb, uNObs, uEmph;
uniform float uCombGrow;       // (v3 r9) how far each beam has grown from the near face (1: through the whole box)
uniform vec4 uIso;             // (y, z, amount, index)
out float vDist;
out float vOp;
out float vHalfW;
void main() {
  int id = gl_InstanceID, corner = gl_VertexID;
  vec4 b = texelFetch(uBeams, ivec2(id % 128, id / 128), 0);
  bool kept = b.w > 0.0;
  float alive = kept ? 1.0 : (b.z >= uGone * (uNComb - uNObs + 1.0) ? 1.0 : 0.0);   // hard cuts, in a fixed order
  float op = uComb * alive * (0.2 + 0.25 * uEmph) * (kept ? 1.0 - uKeptInk : 1.0);  // observed ones: see KEPT_VS
  if (uIso.z > 0.0 && id != int(uIso.w)) op *= 1.0 - 0.75 * uIso.z;
  float hw = 0.5 * uDpr * (1.0 + 0.4 * uEmph);
  bool far = corner == 1 || corner == 2 || corner == 4;
  vec3 p0 = vec3(-0.5, b.x, b.y), p1 = vec3(mix(-0.5, 0.5, uCombGrow), b.x, b.y);
  if (uCombGrow <= 0.0) op = 0.0;
  vec4 c0 = uVP * vec4(p0, 1.0), c1 = uVP * vec4(p1, 1.0);
  vec2 s0 = c0.xy / c0.w * uViewport * 0.5, s1 = c1.xy / c1.w * uViewport * 0.5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float side = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : -1.0;
  float ext = hw + 1.0;
  vec4 C = far ? c1 : c0;
  vec3 P = far ? p1 : p0;
  vec2 S = (far ? s1 : s0) + nrm * side * ext + dir * (far ? 1.0 : -1.0) * hw;
  vDist = side * ext; vHalfW = hw;
  vOp = min(op, 1.0) * exp(-uAerial * 0.5 * max(distance(P, uEye) - uFocus, 0.0));
  gl_Position = vec4(S / (uViewport * 0.5) * C.w, C.z, C.w);
}`;

export const KEPT_VS = `#version 300 es
precision highp float;
precision highp sampler3D;
uniform sampler2D uKept;       // RGBA32F, 64 wide: (y, z, beam index, brightness)
uniform sampler3D uCube;
uniform mat4 uVP;
uniform vec2 uViewport;
uniform vec3 uEye;
uniform float uDpr, uFocus, uAerial, uKeptInk, uHover, uEmph;
uniform vec4 uIso;             // (y, z, amount, beam index)
out float vDist;
out float vOp;
out float vHalfW;
float pigmentLt(float lt) { return smoothstep(0.2375, 0.5625, lt); }
float pig(float F) { float tau = -log(max(F, 1e-6)); return pigmentLt(clamp((log(tau + 1e-3) * 0.4342944819 + 3.0) / 8.0, 0.0, 1.0)); }
void main() {
  int seg = gl_VertexID / 6, corner = gl_VertexID - seg * 6;
  vec4 b = texelFetch(uKept, ivec2(gl_InstanceID % 64, gl_InstanceID / 64), 0);
  float idx = b.z;
  bool far = corner == 1 || corner == 2 || corner == 4;
  float x0 = float(seg) / 240.0 - 0.5, x1 = float(seg + 1) / 240.0 - 0.5;
  vec3 p0 = vec3(x0, b.x, b.y), p1 = vec3(x1, b.x, b.y);
  vec3 P = far ? p1 : p0;
  float F = textureLod(uCube, vec3(P.x + 0.5, P.z + 0.5, 0.5 - P.y), 0.0).r;
  float op = uKeptInk * (0.5 + 0.5 * pig(F)) * (0.75 + 0.25 * b.w) * (1.0 + 0.5 * uEmph);   // a thread that survives the back row
  if (uIso.z > 0.0) op *= abs(idx - uIso.w) < 0.5 ? 1.0 + 0.6 * uIso.z : 1.0 - 0.8 * uIso.z;
  bool hov = abs(idx - uHover) < 0.5;
  if (hov) op = max(op * 1.8, 0.5 * uKeptInk);                  // the one under the pointer: darker and wider
  float hw = 1.7 * uDpr * (1.0 + 0.3 * uEmph) * (hov ? 1.6 : 1.0);
  vec4 c0 = uVP * vec4(p0, 1.0), c1 = uVP * vec4(p1, 1.0);
  vec2 s0 = c0.xy / c0.w * uViewport * 0.5, s1 = c1.xy / c1.w * uViewport * 0.5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float side = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : -1.0;
  float ext = hw + 1.0;
  vec4 C = far ? c1 : c0;
  vec2 S = (far ? s1 : s0) + nrm * side * ext + dir * (far ? 1.0 : -1.0) * hw;
  vDist = side * ext; vHalfW = hw;
  vOp = min(op, 1.0) * exp(-uAerial * 0.5 * max(distance(P, uEye) - uFocus, 0.0));
  gl_Position = vec4(S / (uViewport * 0.5) * C.w, C.z, C.w);
}`;

export const BOX_VS = `#version 300 es
precision highp float;
uniform mat4 uVP;
uniform vec2 uViewport;
uniform vec3 uEye, uMin, uMax;
uniform float uDpr, uFocus, uAerial, uBox;
out float vDist;
out float vOp;
out float vHalfW;
void main() {
  int e = gl_InstanceID, corner = gl_VertexID;
  int axis = e / 4, k = e - axis * 4;                 // 4 edges along each axis
  vec3 a = uMin, b = uMin;
  float u = (k & 1) == 1 ? 1.0 : 0.0, v = (k & 2) == 2 ? 1.0 : 0.0;
  vec3 span = uMax - uMin;
  if (axis == 0) { a = uMin + vec3(0.0, u * span.y, v * span.z); b = a + vec3(span.x, 0.0, 0.0); }
  else if (axis == 1) { a = uMin + vec3(u * span.x, 0.0, v * span.z); b = a + vec3(0.0, span.y, 0.0); }
  else { a = uMin + vec3(u * span.x, v * span.y, 0.0); b = a + vec3(0.0, 0.0, span.z); }
  bool far = corner == 1 || corner == 2 || corner == 4;
  vec4 c0 = uVP * vec4(a, 1.0), c1 = uVP * vec4(b, 1.0);
  vec2 s0 = c0.xy / c0.w * uViewport * 0.5, s1 = c1.xy / c1.w * uViewport * 0.5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float side = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : -1.0;
  float hw = 0.75 * uDpr, ext = hw + 1.0;
  vec4 C = far ? c1 : c0;
  vec3 P = far ? b : a;
  vec2 S = (far ? s1 : s0) + nrm * side * ext + dir * (far ? 1.0 : -1.0) * hw;
  vDist = side * ext; vHalfW = hw;
  vOp = 0.55 * uBox * exp(-uAerial * 0.35 * max(distance(P, uEye) - uFocus, 0.0));
  gl_Position = vec4(S / (uViewport * 0.5) * C.w, C.z, C.w);
}`;

export const BEAM_FS = `#version 300 es
precision highp float;
in float vDist;
in float vOp;
in float vHalfW;
out vec4 outCov;
void main() { outCov = vec4(clamp(vHalfW + 0.5 - abs(vDist), 0.0, 1.0) * vOp, 0.0, 0.0, 1.0); }`;

export const LINE_FS = `#version 300 es
precision highp float;
uniform float uHalfW;
uniform vec2 uChan;            // (ink, wash): which channel of the coverage target this line goes to
in float vDist;
in float vOp;
in float vInk;
out vec4 outCov;
void main() {
  float cov = clamp(uHalfW + 0.5 - abs(vDist), 0.0, 1.0) * vOp * vInk;
  outCov = vec4(cov * uChan.x, cov * uChan.y, 0.0, 1.0);
}`;

export const FILL_VS = `#version 300 es
precision highp float;
uniform sampler2D uPlane;
uniform mat4 uVP;
uniform float uHero, uAmp, uSheetZ, uNX, uNY;
void main() {
  int seg = gl_VertexID / 6, c = gl_VertexID - seg * 6;
  int v = c == 0 ? 0 : c == 1 ? 1 : c == 2 ? 2 : c == 3 ? 2 : c == 4 ? 1 : 3;   // (0,1,2) (2,1,3); 2,3 on top
  int px = seg + ((v == 1 || v == 3) ? 1 : 0);
  float F = v >= 2 ? 1.0 : texelFetch(uPlane, ivec2(px, int(uHero)), 0).r;
  float y = 0.5 - (uHero + 0.5) / uNY + uAmp * (F - 0.5);
  gl_Position = uVP * vec4((float(px) + 0.5) / uNX - 0.5, y, uSheetZ, 1.0);
}`;
export const FILL_FS = `#version 300 es
precision highp float;
uniform float uFill;
out vec4 outCov;
void main() { outCov = vec4(0.0, uFill, 0.0, 1.0); }`;

export const COMPOSITE_FS = `#version 300 es
${COMMON}
uniform sampler2D uFront, uBack, uLines, uPlane, uMaps;
uniform vec2 uCanvas;
uniform float uDpr, uGrain;
uniform vec3 uEye, uFwd, uRight, uUp;
uniform float uTanHalf, uAspect;
uniform float uSheetZ, uSheetAmt, uSheetInk, uRevealN, uHero, uNX, uNY;
uniform vec3 uCPaper, uCWash, uCInk, uCPool, uCLine, uCRust;
uniform vec4 uNeedle;          // beat 7: (masked row, first pixel, last pixel, unused)
uniform vec2 uCutFill;         // beat 7: the cut (paper) and the fill (cinnabar), 0..1
uniform float uSlitEdge;       // the cut's two edges, relative strength (1 in beat 7; stronger in beat 4's lit void)
uniform vec2 uHeroLine;        // the hero sightline as an ink line in the volume: (amount, 1 = a gap where it is masked,
                               // 0 = drawn through the masked stretch, heavier there: beat 4's chosen stretch)
uniform float uInvert;         // beat 10: 0 = ink on paper, 1 = light on the dark
out vec4 outColor;

void layer(inout vec3 C, inout float keep, vec3 X, float a) { C = C * (1.0 - a) + X * a; keep *= 1.0 - a; }

// Beat 7: the masked stretch of one sightline, which lies exactly on the sheet plane (row 341 of the iz = 240 plane).
// Drawn at the sheet's depth, between the ink behind and in front: first as a cut (paper: our record of it is gone),
// then as the fill (cinnabar, as dark as the real flux there: the beam through the damped absorber).
void needle(vec2 ndc, out vec3 C, out float keep) {
  C = vec3(0.0); keep = 1.0;
  if (uCutFill.x <= 0.0 && uCutFill.y <= 0.0 && uHeroLine.x <= 0.0) return;
  vec3 d = rayDir(ndc, uFwd, uRight, uUp, uTanHalf, uAspect);
  if (abs(d.z) < 1e-7) return;
  float ts = (uSheetZ - uEye.z) / d.z;
  if (ts <= 0.0) return;
  vec3 p = uEye + d * ts;
  vec2 uv = vec2(p.x + 0.5, 0.5 - p.y);
  float row = uv.y * uNY - 0.5, px = uv.x * uNX - 0.5;
  float fw = max(fwidth(row), 1e-4);
  float dr = abs(row - uNeedle.x);
  // at least ~6 px wide on screen (it must survive a soft projector at talk distance), never thinner than the row
  float dpx = dr / fw;
  float cov = max(clamp(3.0 - dpx, 0.0, 1.0), clamp((0.5 - dr) / fw + 0.5, 0.0, 1.0));
  float along = smoothstep(uNeedle.y - 1.0, uNeedle.y + 1.0, px) * (1.0 - smoothstep(uNeedle.z - 1.0, uNeedle.z + 1.0, px));
  // the sightline itself: ~3 px of ink along the whole row inside the box (the one line under discussion), with a
  // gap where it is masked, or through the stretch and heavier there
  if (uHeroLine.x > 0.0 && px >= 0.0 && px <= uNX - 1.0) {
    float wpx = mix(2.0, 4.5, along * (1.0 - uHeroLine.y));
    layer(C, keep, uCInk, 0.85 * uHeroLine.x * clamp(wpx - dpx, 0.0, 1.0) * (1.0 - along * uHeroLine.y));
  }
  cov *= along;
  float edge = clamp(1.0 - abs(dpx - 3.6) / 0.9, 0.0, 1.0) * along;          // the cut's two faint edges, like a slit in paper
  if (cov <= 0.0 && edge <= 0.0 && (uCutFill.y <= 0.0 || dpx >= 4.5 || along <= 0.0)) return;
  float cutA = uCutFill.x * (1.0 - uCutFill.y);
  layer(C, keep, uCPaper, cov * cutA);
  layer(C, keep, uCWash, min(1.0, edge * cutA * 0.45 * uSlitEdge));
  float F = texture(uPlane, vec2(uv.x, (uNeedle.x + 0.5) / uNY)).r;
  // the fill is ~9 px, half as wide again as the cut: it must read by weight as well as by hue (a deuteranope sees
  // cinnabar as a pale olive)
  float fillCov = max(clamp(4.5 - dpx, 0.0, 1.0), clamp((0.5 - dr) / fw + 0.5, 0.0, 1.0)) * along;
  float core = smoothstep(0.85, 0.97, pig(F));                       // where the light is all gone: the cloud's own core
  float dash = step(0.45, fract(px / 9.0));                            // its wings (its shadow in colour, not its size): broken, pale
  layer(C, keep, uCRust, fillCov * uCutFill.y * (core * 0.95 + (1.0 - core) * 0.4 * dash * (0.3 + 0.7 * pig(F))));
}
// Ink thins towards the edge of the data with a slightly irregular (deckled) boundary, so the sheet
// never reads as a cut-out card. In data space: it moves with the sheet.
float deckle(vec2 uv) {
  float e = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  return smoothstep(0.0, 0.022 + 0.018 * vnoise(uv * 48.0), e);
}

// The sheet as one premultiplied layer, following field-gl.js's "ink-colour sumi" at rest.
void sheet(vec2 ndc, out vec3 C, out float keep) {
  C = vec3(0.0); keep = 1.0;
  if (uSheetAmt <= 0.0) return;
  vec3 d = rayDir(ndc, uFwd, uRight, uUp, uTanHalf, uAspect);
  if (abs(d.z) < 1e-7) return;
  float ts = (uSheetZ - uEye.z) / d.z;
  if (ts <= 0.0) return;
  vec3 p = uEye + d * ts;
  if (abs(p.x) > 0.5 || abs(p.y) > 0.5) return;
  vec2 uv = vec2(p.x + 0.5, 0.5 - p.y);
  float row = uv.y * uNY - 0.5;
  float k = clamp(uRevealN - abs(row - uHero) + 1.0, 0.0, 1.0) * uSheetAmt * uSheetInk;
  k *= deckle(uv);
  float px = uv.x * uNX - 0.5;
  if (uCutFill.x > 0.0 && abs(row - uNeedle.x) < 0.5 && px >= uNeedle.y && px <= uNeedle.z) k *= 1.0 - uCutFill.x;   // the masked row
  if (k <= 0.0) return;
  float Fv = texture(uPlane, uv).r;
  vec4 M = texture(uMaps, uv);
  float pM = M.r, pL = M.g, pX = M.b, pXL = M.a;
  float pFine = mix(pM, pig(Fv), 0.18);
  float gran = (vnoise(uv * vec2(uNX, uNY) * 0.9) - 0.5) * 0.35 * smoothstep(0.5, 1.0, pM);   // data space
  // (field-gl.js's cool mist in the voids is left out: here the voids stay paper, so the sheet never reads as a card)
  layer(C, keep, uCWash * 0.92, 0.34 * smoothstep(0.03, 0.34, pXL) * k);
  layer(C, keep, uCWash, 0.22 * smoothstep(0.04, 0.55, pX) * k);
  layer(C, keep, uCWash, 0.80 * smoothstep(0.02, 0.42, pL) * k);
  layer(C, keep, uCInk, 0.72 * smoothstep(0.20, 0.72, pM) * (0.72 + 0.28 * smoothstep(0.02, 0.22, pXL)) * k);
  vec3 poolC = mix(uCInk, uCPool, smoothstep(0.6, 1.0, pFine));
  layer(C, keep, poolC, clamp(smoothstep(0.42, 0.9, pFine + gran), 0.0, 1.0) * k);
}

float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uCanvas;
  vec2 css = vec2(frag.x, uCanvas.y - frag.y) / uDpr;                 // paper grain in CSS px: screen space
  float fibre = fbm(vec2(css.x * 0.05, css.y * 0.8)) - 0.46875;       // zero-mean
  float speck = vnoise(css * 1.7) - 0.5;
  float grain = (fibre * 0.03 + speck * 0.02) * uGrain;
  vec3 col = uCPaper * (1.0 + grain);

  vec4 B = texture(uBack, uv);
  col = col * (1.0 - B.a) + B.rgb;
  vec3 SC; float keep;
  sheet(uv * 2.0 - 1.0, SC, keep);
  col = col * keep + SC;
  vec3 NC; float nkeep;
  needle(uv * 2.0 - 1.0, NC, nkeep);
  col = col * nkeep + NC;
  vec4 F = texture(uFront, uv);
  col = col * (1.0 - F.a) + F.rgb;
  vec2 LL = texture(uLines, uv).rg;
  col = mix(col, uCWash, LL.g);                                        // the shadow and the expected light (beats 2, 10)
  col = mix(col, uCLine, LL.r);
  col *= 1.0 + grain * 0.5 * (1.0 - dot(col, vec3(0.333)));           // ink sits in the paper's tooth
  if (uInvert > 0.0) {                                                 // beat 10's end: paper drains to dark, ink becomes light
    vec3 inv = uCPool + (uCPaper - col) / max(uCPaper - uCInk, vec3(1e-3)) * (uCPaper - uCPool);
    col = mix(col, clamp(inv, 0.0, 1.0), uInvert);
  }
  col += (hash12(frag + 17.0) - 0.5) / 255.0;                         // dither, deterministic
  outColor = vec4(col, 1.0);
}`;
