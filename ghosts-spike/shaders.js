
import { COMMON } from '../volume-spike/shaders.js';
import { B, A, TAU0, CENTER, HALF } from './ghosts.js';

const PLOT = `
uniform vec4 uView;            // x: ndc per world unit (x), y: same for y, zw: unused
uniform float uPlotH;          // plot height in world units (the window is 1 wide)
vec2 plotToNdc(float v, float F) {   // v in km/s relative to the window centre, F in [0, 1]
  vec2 w = vec2(v / ${(2 * HALF).toFixed(1)}, (F - 0.5) * uPlotH);
  return w * uView.xy;
}
`;

const VOIGT = `
float voigtH(float x) {
  x = abs(x);
  float h0 = exp(-x * x);
  if (x < 1.5) return h0;
  float q = 1.5 / (x * x);
  return h0 - ${(A / Math.sqrt(Math.PI)).toExponential(8)} / (x * x) * (h0 * h0 * (4.0 * x * x * x * x + 7.0 * x * x + 4.0 + q) - q - 1.0);
}
float transmission(float dv, float logN) {
  float tau = ${TAU0.toExponential(8)} * exp2(logN * 3.321928094887362) * voigtH(dv / ${B.toFixed(1)});
  return exp(-min(tau, 80.0));
}
`;

const EXPAND = `
uniform vec2 uViewport;
uniform float uHalfW;
out float vDist;
void emit(vec2 n0, vec2 n1, int corner) {
  vec2 s0 = n0 * uViewport * 0.5, s1 = n1 * uViewport * 0.5;
  vec2 dir = s1 - s0; float len = length(dir); dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  bool far = corner == 1 || corner == 2 || corner == 4;
  float side = (corner == 2 || corner == 4 || corner == 5) ? 1.0 : -1.0;
  float ext = uHalfW + 1.0;
  vec2 S = (far ? s1 : s0) + nrm * side * ext + dir * (far ? 1.0 : -1.0) * uHalfW;
  vDist = side * ext;
  gl_Position = vec4(S / (uViewport * 0.5), 0.0, 1.0);
}
`;

export const RECORD_VS = `#version 300 es
precision highp float;
uniform sampler2D uRow;        // R16F, 1389 × 2: row 341 (the DLA) at y = 0, row 342 (forest only) at y = 1
uniform int uLo;               // first pixel of the window
uniform float uLogN, uSwap, uMode;
${PLOT}
${VOIGT}
${EXPAND}
const float DV = 10.00008419146144;
float flux(int p) {
  float dv = float(p) * DV - ${CENTER.toFixed(1)};
  float t = transmission(dv, uLogN);
  if (uMode > 0.5) return t;
  return mix(texelFetch(uRow, ivec2(p, 1), 0).r * t, texelFetch(uRow, ivec2(p, 0), 0).r, uSwap);
}
void main() {
  int seg = gl_VertexID / 6, corner = gl_VertexID - seg * 6;
  int p0 = uLo + seg, p1 = p0 + 1;
  emit(plotToNdc(float(p0) * DV - ${CENTER.toFixed(1)}, flux(p0)), plotToNdc(float(p1) * DV - ${CENTER.toFixed(1)}, flux(p1)), corner);
}`;

export const COVER_FS = `#version 300 es
precision highp float;
uniform float uHalfW;
uniform vec4 uChannel;         // which channel(s) this draw writes, and its strength
in float vDist;
in float vA;
out vec4 outCov;
void main() {
  float cov = clamp(uHalfW + 0.5 - abs(vDist), 0.0, 1.0) * vA;
  outCov = uChannel * cov;
}`;

export const RECORD_FS = COVER_FS.replace('in float vA;', 'const float vA = 1.0;');

export const GHOST_VS = `#version 300 es
precision highp float;
uniform sampler2D uGhosts;     // RGBA32F, (v0 − centre, logN, rank, 0), 100 wide
uniform float uN, uKeep, uRelease, uDrain, uResolve, uAlpha, uMode;   // uMode 0 = fog, 1 = survivors
uniform vec2 uAnswer;          // (v0 − centre, logN) the survivors converge to
${PLOT}
${VOIGT}
${EXPAND}
out float vA;
const int SEGS = 64;
void main() {
  int id = gl_InstanceID;
  vec4 g = texelFetch(uGhosts, ivec2(id % 100, id / 100), 0);
  float rank = g.z;
  bool survivor = rank >= uN - uKeep;
  // appear: staggered by index over the release; go out: hard cut, worst first, as the drain passes their rank
  float appear = clamp((uRelease * (uN + 400.0) - float(id)) / 400.0, 0.0, 1.0);
  float alive = rank >= uDrain * (uN - uKeep) ? 1.0 : 0.0;
  float a = appear * alive;
  // the first thirty guesses are drawn individually visible, so the fog reads as many separate wrong answers
  if (uMode < 0.5 && id < 30) a *= 14.0 + 11.0 * (1.0 - smoothstep(0.08, 0.45, uRelease));   // thirty guesses stay legible as curves over the haze
  float v0 = g.x, lN = g.y;
  if (uMode > 0.5) {                      // survivors: converge on the answer, and become ink
    if (!survivor) a = 0.0;
    v0 = mix(v0, uAnswer.x, uResolve); lN = mix(lN, uAnswer.y, uResolve);
    a *= uResolve;
  } else if (survivor) {
    a *= (1.0 + 6.0 * uDrain) * (1.0 - uResolve);   // survivors gather ink as the rest go out, then hand over
  }
  // the ghost's window: out to where τ = 0.005 in the damping wings
  float w = clamp(${B.toFixed(1)} * sqrt(${TAU0.toExponential(8)} * exp2(lN * 3.321928094887362) * ${(A / Math.sqrt(Math.PI)).toExponential(8)} / 0.005), 60.0, 3200.0);
  int seg = gl_VertexID / 6, corner = gl_VertexID - seg * 6;
  float x0 = -1.0 + 2.0 * float(seg) / float(SEGS), x1 = -1.0 + 2.0 * float(seg + 1) / float(SEGS);
  float t0 = transmission(x0 * w, lN), t1 = transmission(x1 * w, lN);
  bool far = corner == 1 || corner == 2 || corner == 4;
  // Weight the wings, not the saturated core: 10⁴ cores at F = 0 would pile into a black baseline, and the
  // wings are what separates a damped absorber from the forest (beat 5: width, not depth).
  float t = far ? t1 : t0, vx = v0 + (far ? x1 : x0) * w;
  vA = a * uAlpha * smoothstep(0.0, 0.3, 1.0 - t) * mix(0.15, 1.0, smoothstep(0.0, 0.3, t))
     * (1.0 - smoothstep(${(HALF - 150).toFixed(1)}, ${HALF.toFixed(1)}, abs(vx)));   // stay inside the record's window
  emit(plotToNdc(v0 + x0 * w, t0), plotToNdc(v0 + x1 * w, t1), corner);
}`;

export const COMPOSITE_FS = `#version 300 es
${COMMON}
uniform sampler2D uCov;        // R = record, G = ghost fog, B = resolved survivors, A = the model absorber's profile
uniform vec2 uCanvas;
uniform float uDpr, uGrain, uFog, uProfileRust;
uniform vec3 uCPaper, uCWash, uCInk, uCRust;
out vec4 outColor;
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec2 frag = gl_FragCoord.xy, uv = frag / uCanvas;
  vec2 css = vec2(frag.x, uCanvas.y - frag.y) / uDpr;
  float fibre = fbm(vec2(css.x * 0.05, css.y * 0.8)) - 0.46875;
  float speck = vnoise(css * 1.7) - 0.5;
  float grain = (fibre * 0.03 + speck * 0.02) * uGrain;
  vec3 col = uCPaper * (1.0 + grain);
  vec4 c = texture(uCov, uv);
  col = mix(col, uCWash, clamp(c.g * uFog, 0.0, 0.6));
  col = mix(col, mix(uCWash, uCRust, uProfileRust), c.a);   // the absorber alone, under the record
  col = mix(col, uCInk, c.r);
  col = mix(col, uCRust, c.b);
  col *= 1.0 + grain * 0.5 * (1.0 - dot(col, vec3(0.333)));
  col += (hash12(frag + 17.0) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;
