
export function buildPigmentMaps(F, NX, NY) {
  const n = NX * NY;
  const p = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const tau = -Math.log(Math.max(F[i], 1e-6));
    const lt = Math.max(0, Math.min(1, (Math.log10(tau + 1e-3) + 3) / 8));
    const s = Math.max(0, Math.min(1, (lt - 0.2375) / 0.325));
    p[i] = s * s * (3 - 2 * s);
  }
  const boxPass = (src, dst, w, h, r, horizontal) => {
    const m = 2 * r + 1;
    if (horizontal) {
      for (let y = 0; y < h; y++) {
        const o = y * w;
        let sum = src[o] * (r + 1);
        for (let i = 0; i < r; i++) sum += src[o + Math.min(w - 1, i)];
        for (let x = 0; x < w; x++) {
          sum += src[o + Math.min(w - 1, x + r)] - src[o + Math.max(0, x - r - 1)];
          dst[o + x] = sum / m;
        }
      }
    } else {
      for (let x = 0; x < w; x++) {
        let sum = src[x] * (r + 1);
        for (let i = 0; i < r; i++) sum += src[Math.min(h - 1, i) * w + x];
        for (let y = 0; y < h; y++) {
          sum += src[Math.min(h - 1, y + r) * w + x] - src[Math.max(0, y - r - 1) * w + x];
          dst[y * w + x] = sum / m;
        }
      }
    }
  };
  const gauss = (src, sx, sy) => {
    const rx = Math.max(0, Math.round(Math.sqrt(12 * sx * sx / 3 + 1) / 2));
    const ry = Math.max(0, Math.round(Math.sqrt(12 * sy * sy / 3 + 1) / 2));
    let a = Float32Array.from(src), b = new Float32Array(n);
    for (let k = 0; k < 3; k++) {
      if (rx > 0) { boxPass(a, b, NX, NY, rx, true); [a, b] = [b, a]; }
      if (ry > 0) { boxPass(a, b, NX, NY, ry, false); [a, b] = [b, a]; }
    }
    return a;
  };
  const pM = gauss(p, 1.3, 1.3), pL = gauss(p, 5.0, 5.0), pX = gauss(p, 14.0, 0.6), pXL = gauss(p, 14.0, 14.0);
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    out[4 * i] = Math.round(pM[i] * 255);
    out[4 * i + 1] = Math.round(pL[i] * 255);
    out[4 * i + 2] = Math.round(pX[i] * 255);
    out[4 * i + 3] = Math.round(Math.min(1, pXL[i] * 1.6) * 255);
  }
  return out;
}
