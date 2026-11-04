export const C_KMS = 299792.458;
const clamp01 = x => Math.max(0, Math.min(1, x));
const lerpArr = (arr, x) => {
  if (x < 0 || x > arr.length - 1) return 0;
  const i = Math.floor(x), f = x - i;
  return i + 1 < arr.length ? arr[i] + (arr[i + 1] - arr[i]) * f : arr[i];
};

export function spectrumOf(D) {
  const P = D.path, DV = P.dv, LYA = D.lyman[0].lam, abs = D.absorbers;
  const forestAt = v => lerpArr(P.tau_lya_forest, v / DV - 0.5);
  const winAt = (prof, W, dv) => lerpArr(prof, Math.min(prof.length - 1, Math.max(0, (dv - W.v0) / W.dv)));
  const contAt = lam => { const c = D.continuum, n = c.flux.length; return lerpArr(c.flux, Math.min(n - 1, Math.max(0, (lam - c.lambda0_A) / c.dlambda_A))); };
  const offLy = D.lyman.map(L => C_KMS * Math.log(L.lam / LYA)), offMe = D.metals.map(M => C_KMS * Math.log(M.lam / LYA));
  const iD = abs.findIndex(A => A.kind === 'DLA');
  let OLD = 1, WIN = 500, TREE = 0, TREES = [], TW = 120;
  const wt0 = age => (OLD >= 1 ? 1 : OLD + (1 - OLD) * clamp01(2 - age / WIN));
  const treeW = vj => { let w = 0; for (const vc of TREES) w = Math.max(w, clamp01(1.5 - Math.abs(vj - vc) / TW)); return w; };
  const wt = (age, vj) => (TREE > 0 ? (1 - TREE) * wt0(age) + TREE * (vj === undefined ? 0 : treeW(vj)) : wt0(age));
  let GROW = null, GROW_LYA = null, GROW_OWN = 0, ONLY = false;
  const gain = a => (a === iD && GROW !== null ? GROW : 1);
  function tau(va, lam, vt, crossed, llf) {
    let t = 0;
    for (let j = 0; j < D.lyman.length; j++) {
      const L = D.lyman[j], vj = va + offLy[j];
      if (vj >= 0 && vj <= vt && !ONLY) t += L.ratio * forestAt(vj) * wt(vt - vj, vj);
      for (let a = 0; a < abs.length; a++) {
        if (ONLY && a !== iD) continue;
        const A = abs[a], dv = vj - A.v, W = A.window;
        if (crossed[a] && dv >= W.v0 - 1e-3 && dv <= W.v0 + (W.n - 1) * W.dv + 1e-3)
          t += (a === iD && j === 0 && GROW_LYA ? (1 - GROW_OWN) * GROW_LYA(dv) + GROW_OWN * winAt(A.profiles[L.name], W, dv) : winAt(A.profiles[L.name], W, dv) * gain(a)) * wt(vt - A.v);
      }
    }
    if (iD >= 0 && crossed[iD]) for (let j = 0; j < D.metals.length; j++) {
      const M = D.metals[j], dv = va + offMe[j] - D.dla.v;
      if (dv > M.window.v0 && dv < -M.window.v0) t += winAt(M.profile, M.window, dv) * wt(vt - D.dla.v) * gain(iD);
    }
    for (let a = 0; a < abs.length; a++) {
      if (!crossed[a] || (ONLY && a !== iD)) continue;
      const x = (lam / D.ll.lam) * llf[a];
      if (x < 1) t += abs[a].ll_tau * x * x * x * wt(vt - abs[a].v) * gain(a);
    }
    return t;
  }
  let buf = null;
  const arrays = n => {
    if (!buf || buf.lam.length < n) { const m = Math.ceil(n * 1.2); buf = { lam: new Float64Array(m), C: new Float64Array(m), S: new Float64Array(m) }; }
    return buf;
  };
  function sample(t, lo, hi, opts = {}) {
    const vt = clamp01(t) * P.V, stretch = Math.exp(vt / C_KMS), on = opts.on ?? 1;
    OLD = opts.old ?? 1; WIN = opts.win ?? 500; TREE = opts.tree || 0; TREES = opts.trees || []; TW = opts.treeW || 120; ONLY = opts.only === 'dla';
    const gr = opts.grow ?? null; GROW = gr === null ? null : typeof gr === 'number' ? gr : gr.f; GROW_LYA = gr && gr.lya ? gr.lya : null; GROW_OWN = (gr && gr.own) || 0;
    const crossed = abs.map((A, a) => (a === iD && GROW !== null ? GROW > 0 : vt >= (A.imprint ?? A.v))), llf = abs.map(A => Math.exp(-(vt - A.v) / C_KMS));
    let n, k0 = 0, kHi = 0;
    if (opts.fixed) n = opts.fixed + 1;
    else {
      kHi = Math.floor((vt - C_KMS * Math.log(lo / LYA)) / DV - 0.5);
      k0 = Math.ceil((vt - C_KMS * Math.log(hi / LYA)) / DV - 0.5);
      n = Math.max(0, kHi - k0 + 1);
    }
    const { lam, C, S } = arrays(n);
    for (let i = 0; i < n; i++) {
      let va;
      if (opts.fixed) { lam[i] = lo + ((hi - lo) * i) / opts.fixed; va = vt - C_KMS * Math.log(lam[i] / LYA); }
      else { va = (kHi - i + 0.5) * DV; lam[i] = LYA * Math.exp((vt - va) / C_KMS); }
      const c = contAt(lam[i] / stretch);
      C[i] = c; S[i] = on > 0 ? c * Math.exp(-on * tau(va, lam[i], vt, crossed, llf)) : c;
    }
    return { n, lam, C, S, vt, stretch, k: kHi };
  }
  return { sample, contAt, forestAt, winAt, LYA };
}
