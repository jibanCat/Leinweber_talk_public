
export const POINTS_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aP;     // x, y, reveal key (days), group (0 BGS, 1 LRG, 2 ELG, 3 QSO, 4 Lyα source)
uniform vec4 uM;                     // world → NDC: (m11, m12, m21, m22)
uniform vec2 uB;
uniform vec4 uTh;                    // survey time revealed per channel, days
uniform float uRamp;                 // days over which the newest objects fade in
uniform float uOp[5];                // opacity per group
uniform float uSecA[5];              // the separation: group g's sector starts at uSecA[g]
uniform float uSecS, uSep, uTheta0;
uniform vec4 uSize;                  // disc diameter per channel, device px
uniform vec4 uAlpha;                 // ink per object per channel
uniform float uDenScale;             // 1 on float targets; < 1 on the 8-bit fallback
uniform int uHeroIdx;                // the hand-over skewer's quasar (its index in the reveal order), -1 if none
uniform float uHeroQ;                // 0..1: that quasar marked, larger, whatever its group's opacity
uniform vec4 uPatch;                 // section 2's patch: θa, θb, r0, r1
uniform float uClip;                 // 0..1: objects outside the patch go
out float vA;
out float vR;
flat out int vCh;
float pick(vec4 v, int i) { return i == 0 ? v.x : i == 1 ? v.y : i == 2 ? v.z : v.w; }
void main() {
  int g = int(aP.w + 0.5);
  int ch = min(g, 3);
  float a = clamp((pick(uTh, ch) - aP.z) / uRamp, 0.0, 1.0) * uOp[g] * pick(uAlpha, ch);
  vec2 p = aP.xy;
  if (uClip > 0.0) {
    float r0 = length(p), t0 = atan(p.x, p.y);
    if (!(r0 >= uPatch.z && r0 < uPatch.w && t0 >= uPatch.x && t0 < uPatch.y)) a *= 1.0 - uClip;
  }
  if (uSep > 0.0) {
    float r = length(p), t = atan(p.x, p.y);
    t = mix(t, uSecA[g] + (t - uTheta0) * uSecS, uSep);
    p = r * vec2(sin(t), cos(t));
    a *= mix(1.0, uSecS, uSep);      // squeezed into a sector: the same ink per area, not a blot
  }
  float sz = pick(uSize, ch);
  if (gl_VertexID == uHeroIdx && uHeroQ > 0.0) { a = max(a, 2.0 * uHeroQ); sz *= 1.0 + 1.5 * uHeroQ; }
  vCh = ch; vA = a * uDenScale; vR = 0.5 * sz;
  if (a <= 0.0) { gl_Position = vec4(2.0, 2.0, 0.0, 1.0); gl_PointSize = 1.0; return; }
  gl_Position = vec4(vec2(dot(uM.xy, p), dot(uM.zw, p)) + uB, 0.0, 1.0);
  gl_PointSize = sz + 2.0;             // room for the antialiased edge
}`;

export const POINTS_FS = `#version 300 es
precision highp float;
in float vA;
in float vR;
flat in int vCh;
out vec4 o;
void main() {
  vec2 q = (gl_PointCoord - 0.5) * (2.0 * vR + 2.0);          // device px from the centre
  float cov;
  if (vCh == 3) {                                             // a quasar: "+"
    float arm = max(0.55, 0.34 * vR);
    float c1 = clamp(arm + 0.5 - abs(q.x), 0.0, 1.0) * clamp(vR + 0.5 - abs(q.y), 0.0, 1.0);
    float c2 = clamp(arm + 0.5 - abs(q.y), 0.0, 1.0) * clamp(vR + 0.5 - abs(q.x), 0.0, 1.0);
    cov = max(c1, c2);
  } else {
    cov = clamp(vR + 0.5 - length(q), 0.0, 1.0);              // a disc
  }
  float v = vA * cov;
  if (v <= 0.0) discard;
  o = v * vec4(equal(ivec4(vCh), ivec4(0, 1, 2, 3)));
}`;

const SEGMENT = `
vec4 segment(vec2 s0, vec2 s1, float hw, int c, vec2 vp, out float across) {
  float u = (c == 1 || c == 2 || c == 4) ? 1.0 : 0.0;
  float side = (c == 2 || c == 4 || c == 5) ? 1.0 : -1.0;
  vec2 e = s1 - s0;
  float len = length(e);
  vec2 t = len > 1e-4 ? e / len : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  float H = hw + 1.0;                                         // one more pixel for the antialiased edge
  vec2 s = mix(s0 - t * 0.5, s1 + t * 0.5, u) + n * side * H;
  across = side * H;
  return vec4(s / vp * 2.0 - 1.0, 0.0, 1.0);
}
vec2 toPx(vec4 M, vec2 B, vec2 p, vec2 vp) { return ((vec2(dot(M.xy, p), dot(M.zw, p)) + B) * 0.5 + 0.5) * vp; }
`;

export const SKEWER_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aS0;    // θ of its quasar, r_start, r_end (h⁻¹ Mpc), the quasar's reveal key
layout(location = 1) in vec4 aS1;    // ink, hero (0/1), -, -
uniform vec4 uM;
uniform vec2 uB, uVP;
uniform float uTh;                   // survey time revealed for the quasars, days
uniform float uGrow;                 // days for a skewer to draw out in full once its quasar is observed
uniform float uOp, uHeroOp, uIso, uSep, uSecA4, uSecS, uTheta0, uHalfW, uHeroHalfW;
out float vAcross;
out float vHalf;
out vec2 vW;
${SEGMENT}
void main() {
  bool hero = aS1.y > 0.5;
  float g = clamp((uTh - aS0.w) / uGrow, 0.0, 1.0);
  float a = hero ? uHeroOp : aS1.x * uOp * (1.0 - uIso) * mix(1.0, 0.35, uSep);   // squeezed: lighter
  float t = aS0.x;
  if (uSep > 0.0) t = mix(t, uSecA4 + (t - uTheta0) * uSecS, uSep);
  vec2 d = vec2(sin(t), cos(t));
  float r1 = aS0.z, r0 = r1 - g * (aS0.z - aS0.y);           // drawn from the quasar towards us
  float hw = hero ? uHeroHalfW : uHalfW;
  float across;
  vec4 P = segment(toPx(uM, uB, d * r0, uVP), toPx(uM, uB, d * r1, uVP), hw, gl_VertexID % 6, uVP, across);
  gl_Position = (g <= 0.0 || a <= 0.0) ? vec4(2.0, 2.0, 0.0, 1.0) : P;
  vAcross = across; vHalf = hw;
  vW = hero ? vec2(0.0, a) : vec2(a, 0.0);
}`;

export const SKEWER_FS = `#version 300 es
precision highp float;
in float vAcross;
in float vHalf;
in vec2 vW;
out vec4 o;
void main() {
  float cov = clamp(vHalf + 0.5 - abs(vAcross), 0.0, 1.0);
  if (cov <= 0.0) discard;
  o = vec4(vW * cov, 0.0, 0.0);
}`;

export const AXES_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aSeg;   // r0, θa, r1, θb: one segment of an arc or an edge; the buffer holds 5 copies
uniform vec4 uM;
uniform vec2 uB, uVP;
uniform float uSecA[5];
uniform float uSecS, uSep, uTheta0, uHalfW, uAxes;
uniform int uNSeg;
out float vAcross;
out float vHalf;
out float vA;
${SEGMENT}
void main() {
  int g = gl_InstanceID / uNSeg;                             // copy g follows group g's sector as the wedge splits
  float w = (g == 0 ? 1.0 : uSep) * uAxes;
  float ta = mix(aSeg.y, uSecA[g] + (aSeg.y - uTheta0) * uSecS, uSep);
  float tb = mix(aSeg.w, uSecA[g] + (aSeg.w - uTheta0) * uSecS, uSep);
  float across;
  vec4 P = segment(toPx(uM, uB, aSeg.x * vec2(sin(ta), cos(ta)), uVP), toPx(uM, uB, aSeg.z * vec2(sin(tb), cos(tb)), uVP),
                   uHalfW, gl_VertexID % 6, uVP, across);
  gl_Position = w <= 0.0 ? vec4(2.0, 2.0, 0.0, 1.0) : P;
  vAcross = across; vHalf = uHalfW; vA = w;
}`;

export const AXES_FS = `#version 300 es
precision highp float;
in float vAcross;
in float vHalf;
in float vA;
out vec4 o;
void main() {
  float cov = clamp(vHalf + 0.5 - abs(vAcross), 0.0, 1.0);
  if (cov <= 0.0) discard;
  o = vec4(0.0, 0.0, vA * cov, 0.0);
}`;

export const FULLSCREEN_VS = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const COMPOSITE_FS = `#version 300 es
precision highp float;
uniform sampler2D uDen, uLin;
uniform float uDenScale;
uniform int uMode;                   // 0 paper (ink), 1 dark (light)
uniform vec3 uGround, uInk0, uInk1, uInk2, uInk3, uAccent, uAxis;
uniform float uAxisAlpha, uSkGain, uGrain, uDpr;
uniform vec2 uCanvas;
uniform vec3 uIris;                  // the iris disc: centre (device px, GL origin), radius; radius < 0: none
uniform vec2 uSafe;                  // the safe area's top: ink fades to the ground from y = uSafe.y up to uSafe.x
                                     // (device px from the top; camera.js SAFE_INK, SAFE_FADE = SAFE.top)
out vec4 outColor;
// The fold's paper grain (volume-spike/shaders.js COMMON and COMPOSITE_FS), so the paper matches at hand-overs.
float hash12(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
vec3 filt(float a, vec3 ink) { return 1.0 - a * (1.0 - ink / uGround); }          // paper: one tracer's ink filter
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  vec4 D = texelFetch(uDen, ij, 0) / uDenScale;
  vec4 L = texelFetch(uLin, ij, 0);
  vec4 a = 1.0 - exp(-D);                                    // per tracer: ink saturates softly, never a blot
  float aAx = clamp(L.b, 0.0, 1.0) * uAxisAlpha;
  float aSk = 1.0 - exp(-uSkGain * L.r);
  float aH = clamp(L.g, 0.0, 1.0);
  vec3 col;
  if (uMode == 0) {
    vec2 css = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) / uDpr;
    float fibre = fbm(vec2(css.x * 0.05, css.y * 0.8)) - 0.46875;
    float speck = vnoise(css * 1.7) - 0.5;
    float grain = (fibre * 0.03 + speck * 0.02) * uGrain;
    col = uGround * (1.0 + grain);
    col *= filt(a.x, uInk0) * filt(a.y, uInk1) * filt(a.z, uInk2) * filt(a.w, uInk3);
    col = mix(col, uAxis, aAx);                                // the arcs over the objects: always legible
    col = mix(col, uAccent, aSk);
    col = mix(col, uAccent, aH);
    col *= 1.0 + grain * 0.5 * (1.0 - dot(col, vec3(0.333)));   // ink sits in the paper's tooth
  } else {
    // light: how much of the pixel is lit (1 − Π(1 − a)), in the coverage-weighted mix of the tracers' hues, so
    // overlapping tracers mix hues instead of adding up to white (no glow); one tracer alone saturates at its hue
    float lit = 1.0 - (1.0 - a.x) * (1.0 - a.y) * (1.0 - a.z) * (1.0 - a.w);
    float sa = a.x + a.y + a.z + a.w;
    vec3 hue = sa > 0.0 ? (a.x * uInk0 + a.y * uInk1 + a.z * uInk2 + a.w * uInk3) / sa : uGround;
    col = mix(uGround, hue, lit);
    col = mix(col, uAxis, aAx);
    col = mix(col, uAccent, aSk);
    col = mix(col, uAccent, aH);
  }
  col = mix(uGround, col, smoothstep(uSafe.x, uSafe.y, uCanvas.y - gl_FragCoord.y));   // nothing under the top words
  col += (hash12(gl_FragCoord.xy + 17.0) - 0.5) / 255.0;     // dither, deterministic
  float m = uIris.z < 0.0 ? 1.0 : clamp(uIris.z + 0.5 - distance(gl_FragCoord.xy, uIris.xy), 0.0, 1.0);
  outColor = vec4(col * m, m);                               // premultiplied; m = 1 everywhere without an iris
}`;

export const MARKS_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aSeg;   // x0, y0, x1, y1: CSS px, y down
layout(location = 1) in vec4 aSty;   // half-width (CSS px), colour index, alpha, cap (1 round, 0 butt)
uniform vec2 uVP;                    // the canvas in device px
uniform float uDpr;
uniform vec3 uPal[24];             // look.js palette().marks: 8 colours, then the strip's 16 bands
flat out vec2 vA;
flat out vec2 vB;
flat out vec3 vSty;                  // half-width (device px), alpha, cap
flat out vec3 vCol;
void main() {
  vec2 a = aSeg.xy * uDpr, b = aSeg.zw * uDpr;
  float hw = aSty.x * uDpr;
  int c = gl_VertexID % 6;
  vec2 e = b - a;
  float len = length(e);
  vec2 t = len > 1e-4 ? e / len : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  float ext = (aSty.w > 0.5 ? hw : 0.0) + 1.0, H = hw + 1.0;
  float u = (c == 1 || c == 2 || c == 4) ? 1.0 : 0.0;
  float side = (c == 2 || c == 4 || c == 5) ? 1.0 : -1.0;
  vec2 p = mix(a - t * ext, b + t * ext, u) + n * side * H;
  vA = a; vB = b; vSty = vec3(hw, aSty.z, aSty.w);
  vCol = uPal[int(aSty.y + 0.5)];
  gl_Position = aSty.z <= 0.0 ? vec4(2.0, 2.0, 0.0, 1.0) : vec4(p.x / uVP.x * 2.0 - 1.0, 1.0 - p.y / uVP.y * 2.0, 0.0, 1.0);
}`;

export const MARKS_FS = `#version 300 es
precision highp float;
uniform vec2 uVP;
uniform vec3 uIris;                  // as in COMPOSITE_FS
uniform vec2 uSafe;                  // as in COMPOSITE_FS
flat in vec2 vA;
flat in vec2 vB;
flat in vec3 vSty;
flat in vec3 vCol;
out vec4 o;
void main() {
  vec2 q = vec2(gl_FragCoord.x, uVP.y - gl_FragCoord.y);     // device px, y down, pixel centre
  vec2 e = vB - vA;
  float l2 = dot(e, e), len = sqrt(l2), cov;
  if (vSty.z > 0.5) {                                         // round caps: distance to the segment
    float h = l2 > 1e-8 ? clamp(dot(q - vA, e) / l2, 0.0, 1.0) : 0.0;
    cov = clamp(vSty.x + 0.5 - length(q - vA - e * h), 0.0, 1.0);
  } else {                                                    // butt caps: a bar
    vec2 t = len > 1e-4 ? e / len : vec2(1.0, 0.0);
    float al = dot(q - vA, t), ac = abs(dot(q - vA, vec2(-t.y, t.x)));
    cov = clamp(vSty.x + 0.5 - ac, 0.0, 1.0) * clamp(al + 0.5, 0.0, 1.0) * clamp(len - al + 0.5, 0.0, 1.0);
  }
  float a = vSty.y * cov * smoothstep(uSafe.x, uSafe.y, q.y);
  if (uIris.z >= 0.0) a *= clamp(uIris.z + 0.5 - distance(gl_FragCoord.xy, uIris.xy), 0.0, 1.0);
  if (a <= 0.0) discard;
  o = vec4(vCol * a, a);
}`;

export const FIELD_VS = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aSeg;   // x0, y0, x1, y1 (h⁻¹ Mpc)
layout(location = 1) in vec2 aVal;   // δ, weight
uniform vec4 uM;
uniform vec2 uB, uVP;
uniform float uHalfW, uAlpha;
out float vAcross;
flat out float vD;
${SEGMENT}
void main() {
  float across;
  vec4 P = segment(toPx(uM, uB, aSeg.xy, uVP), toPx(uM, uB, aSeg.zw, uVP), uHalfW, gl_VertexID % 6, uVP, across);
  gl_Position = (uAlpha <= 0.0 || aVal.y <= 0.0) ? vec4(2.0, 2.0, 0.0, 1.0) : P;
  vAcross = across; vD = aVal.x;
}`;

export const FIELD_FS = `#version 300 es
precision highp float;
uniform float uHalfW, uAlpha;
uniform vec3 uNeg, uPos, uIris;
uniform vec2 uVP, uSafe;             // uSafe: as in COMPOSITE_FS
in float vAcross;
flat in float vD;
out vec4 o;
void main() {
  float cov = clamp(uHalfW + 0.5 - abs(vAcross), 0.0, 1.0);
  float a = cov * uAlpha * (vD < 0.0 ? min(1.0, -vD / 0.6) : 0.5 * min(1.0, vD / 0.6));
  a *= smoothstep(uSafe.x, uSafe.y, uVP.y - gl_FragCoord.y);
  if (uIris.z >= 0.0) a *= clamp(uIris.z + 0.5 - distance(gl_FragCoord.xy, uIris.xy), 0.0, 1.0);
  if (a <= 0.0) discard;
  o = vec4((vD < 0.0 ? uNeg : uPos) * a, a);
}`;
