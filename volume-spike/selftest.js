
function diff(a, b) {
  let n = 0, max = 0;
  for (let i = 0; i < a.length; i++) {
    if ((i & 3) === 3) continue;
    const d = Math.abs(a[i] - b[i]);
    if (d) { n++; if (d > max) max = d; }
  }
  return { n, max };
}

export function selftest(api) {
  const out = [];
  const frameOf = fn => { fn(); return api.raw(); };
  const stateOf = fn => { fn(); return JSON.stringify(api.state()); };
  const compare = (name, fnA, fnB) => {
    const A = [frameOf(fnA)], B = [frameOf(fnB)];
    const first = diff(A[0], B[0]);
    let matched = first.n === 0;
    for (let i = 0; !matched && i < 4; i++) {
      A.push(frameOf(fnA)); B.push(frameOf(fnB));
      matched = A.some(a => B.some(b => diff(a, b).n === 0));
    }
    const sameState = stateOf(fnA) === stateOf(fnB);
    out.push({ name, exact: first.n === 0, sameState, rerenderMatched: matched, unstable: first.n > 0 && sameState, pixels: first.n, maxDiff: first.max });
  };
  const L = api.LAST, dur = api.durations;
  const rest = k => () => api.seek(k, 1);
  const thru = k => !!(api.through && api.through(k));
  const endOf = k => { while (thru(k)) k++; return k; }, startOf = k => { while (thru(k)) k--; return k; };
  const span = (a, b) => { let t = 0; for (let x = a + 1; x <= b; x++) t += dur[x]; return t; };

  for (let k = 1; k <= L; k++) {
    for (const f of [0.37, 0.81]) {
      let pos;
      compare(`step ${k}: played to s≈${f} == seek`,
        () => { api.seek(k - 1, 1); api.key('next'); api.tick(f * dur[k] * 1000); pos = api.pos(); },
        () => api.seek(pos.k, pos.s));
    }
    compare(`step ${k}: played to the end == checkpoint ${endOf(k)}`,
      () => { api.seek(k - 1, 1); api.key('next'); api.tick(span(k - 1, endOf(k)) * 1000 + 1); }, rest(endOf(k)));
  }
  for (let k = 1; k <= L; k++) {
    compare(`← from checkpoint ${k} == checkpoint ${startOf(k - 1)}`,
      () => { api.seek(k, 1); api.key('prev'); api.tick(span(startOf(k - 1), k) * 1000 + 1); }, rest(startOf(k - 1)));
    let pos;
    compare(`step ${k}: reversed mid-step == seek`,
      () => { api.seek(k - 1, 1); api.key('next'); api.tick(0.6 * dur[k] * 1000); api.key('prev'); api.tick(0.25 * dur[k] * 1000); pos = api.pos(); },
      () => api.seek(pos.k, pos.s));
  }
  const mid = Math.min(L, 5);
  compare(`R from mid-step ${mid} == checkpoint 0`, () => { api.seek(mid, 0.5); api.key('reset'); }, rest(0));
  for (let k = 1; k <= L; k++) compare(`→→ to checkpoint ${endOf(k)} == seek`, () => { api.seek(k - 1, 1); api.key('next'); api.key('next'); }, rest(endOf(k)));
  for (let k = L; k >= 1; k--) compare(`←← to checkpoint ${startOf(k - 1)} == seek`, () => { api.seek(k, 1); api.key('prev'); api.key('prev'); }, rest(startOf(k - 1)));
  for (const [k, s] of [[Math.min(L, 4), 0.5], [L, 0.81], [L, 1]]) compare(`same seek twice (${k}, ${s})`, () => api.seek(k, s), () => api.seek(k, s));
  return out;
}
