import { precache, stillsDir } from './offline.js';
import { LEVELS, ORDER, heavyFor, chosen, store, CONTRAST, chosenContrast, storeContrast } from './quality.js';
import { buildTalk } from './timeline.js';
import { PROGRAM } from './beats.js';
import { LOOK, KEY as LOOK_KEY } from './look.js';

const HEAVY = heavyFor(PROGRAM);
const STILLS = stillsDir(PROGRAM, LOOK).replace(/^talk\//, '');
const SESSION = ['talk', 'look'].map(k => new URLSearchParams(location.search).get(k) ? `&${k}=${new URLSearchParams(location.search).get(k)}` : '').join('');
if (PROGRAM !== 'v2') {
  document.getElementById('heaviest').href = 'index.html?debug#fan.1';
  for (const a of document.querySelectorAll('a.box')) a.href = a.href.replace(/#.*$/, '#priya.4');
} else document.getElementById('looks').hidden = true;

const rows = document.getElementById('checks');
function row(label, status, detail) {
  const tr = document.createElement('tr');
  const mark = { ok: '✓', warn: '!', bad: '✗' }[status];
  tr.innerHTML = `<td class="${status}">${mark}</td><td>${label}</td><td></td>`;
  tr.lastChild.textContent = detail;
  rows.append(tr);
}

const gl = document.createElement('canvas').getContext('webgl2');
if (!gl) row('WebGL2', 'bad', 'not available: the talk will run on its stills only');
else {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const soft = /swiftshader|llvmpipe|software|basic render/i.test(name);
  row('WebGL2', soft ? 'warn' : 'ok', `${name}${soft ? ' — a software renderer: expect a very low frame rate' : ''}`);
  const max3d = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE);
  row('3D textures', max3d >= 240 ? 'ok' : 'bad', `up to ${max3d}³ (the cube is 240³)`);
  row('Float render targets', gl.getExtension('EXT_color_buffer_float') ? 'ok' : 'warn',
    gl.getExtension('EXT_color_buffer_float') ? 'EXT_color_buffer_float' : 'missing: the volume falls back to 8-bit layers (visible banding possible)');
}

const DATA = [['../volume-spike/data/flux_cube_240.bin', 27648000, 'the volume'], ['../volume-spike/data/f5.bin', 1333440, 'the plane'],
  ...(PROGRAM !== 'v2' ? [['../volume-spike/data/v3/fan.bin', 0, 'the DESI slice'], ['../volume-spike/data/v3/skewers.json', 0, 'the Lyα skewers'],
    ['../volume-spike/data/v3/charts/scales.json', 0, 'the charts (one of them)'], ['../volume-spike/data/v3/spectra/index.json', 0, 'the DR1 spectra']] : [])];
for (const [path, size, what] of DATA) {
  try {
    const r = await fetch(path, { method: 'HEAD' });
    const n = +r.headers.get('content-length');
    const fix = path.includes('/v3/') ? 'copy the v3 data into volume-spike/data/v3/' : 'run volume-spike/fetch-data.sh';
    row(`Data: ${what}`, r.ok && (!size || !n || n === size) ? 'ok' : 'bad', r.ok ? `${((size || n) / 1e6).toFixed(1)} MB${size && n && n !== size ? `, but the file is ${n} bytes` : ''}` : `${r.status}: ${fix}`);
  } catch (e) { row(`Data: ${what}`, 'bad', String(e)); }
}

const T = buildTalk();
try {
  const m = await fetch(`${STILLS}manifest.json`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null));
  if (!m) row('Stills (S)', 'bad', 'none built: node test/build-stills.mjs in volume-spike/');
  else {
    const names = new Set(m.files);
    const missing = T.RESTS.map((_, K) => K).filter(K => !(T.isThrough && T.isThrough(K))).map(K => `${T.hashOf(K).slice(1)}.jpg`).filter(f => !names.has(f));
    const age = (Date.now() - Date.parse(m.built)) / 864e5;
    row('Stills (S)', missing.length ? 'bad' : m.dirty ? 'warn' : 'ok',
      missing.length ? `${missing.length} checkpoints have no still (${missing.slice(0, 4).join(', ')}…): rebuild them` :
      `all ${T.RESTS.filter((_, K) => !(T.isThrough && T.isThrough(K))).length} presses, ${m.size.join('×')}, built ${age < 1 ? 'today' : `${age.toFixed(0)} days ago`} from ${m.commit}` +
      `${m.dirty ? ' with uncommitted changes' : ''}. Rebuild after any visual change.`);
  }
} catch (e) { row('Stills (S)', 'bad', String(e)); }

const w = screen.width, h = screen.height, dpr = devicePixelRatio;
row('Display', Math.abs(w / h - 16 / 9) < 0.02 ? 'ok' : 'warn',
  `${w}×${h} at ${dpr}× (${(w / h).toFixed(3)}:1${Math.abs(w / h - 16 / 9) < 0.02 ? ', 16:9' : '; the talk is composed for 16:9, other shapes get more paper'})`);
row('Reduced motion', 'ok', matchMedia('(prefers-reduced-motion: reduce)').matches
  ? 'ON: every step becomes a 200 ms dissolve. Turn it off in the system settings for the talk as designed' : 'off');

const qNow = chosen(new URLSearchParams(location.search));
row('Quality', 'ok', `this machine: ${LEVELS[qNow].label}. “Measure performance” checks it on this display`);
const cNow = chosenContrast(new URLSearchParams(location.search));
row('Contrast', 'ok', `this machine: ${CONTRAST[cNow].label}`);
for (const [id, name] of [['contrast-standard', 'standard'], ['contrast-strong', 'strong']])
  document.getElementById(id).addEventListener('click', () => { storeContrast(name); location.reload(); });
if (PROGRAM !== 'v2') {
  let stored = null; try { stored = localStorage.getItem(LOOK_KEY); } catch {}
  row('Look', LOOK === 'scene' ? 'ok' : 'warn', LOOK === 'scene' ? `per scene: the fan on the dark, every chart and Act 2 on paper${stored ? ` (day 1 stored “${stored}” here: no longer read)` : ''}`
    : `?look=${LOOK} in this page’s address: a developer override, not the talk’s look. Open preflight without it`);
}
document.getElementById('look-clear').addEventListener('click', () => { try { localStorage.removeItem(LOOK_KEY); } catch {} location.reload(); });

async function measureLevel(level) {
  const f = document.createElement('iframe');
  f.src = `index.html?test=1&quality=${level}${SESSION}`;
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:50;background:#F4F2ED';
  document.body.append(f);
  try {
    for (let i = 0; i < 1200 && !f.contentWindow?.__spikeReady; i++) await new Promise(r => setTimeout(r, 100));
    const w = f.contentWindow;
    if (!w.__spikeReady) throw new Error('the talk did not load');
    return HEAVY.map(([label, s, what]) => ({ what, ...w.__talk.bench(w.__talk.kOf(label), s, 12) }));
  } finally { f.remove(); }
}
document.getElementById('measure').addEventListener('click', async () => {
  const el = document.getElementById('perf'), note = document.getElementById('measuring');
  note.hidden = false;
  const res = {};
  try { for (const level of ORDER) res[level] = await measureLevel(level); }
  catch (e) { el.textContent = `measurement failed: ${e.message || e}`; note.hidden = true; return; }
  note.hidden = true;
  const worst = level => Math.max(...res[level].map(r => r.mean));
  const pick = ORDER.find(l => worst(l) <= 16.7) || ORDER.find(l => worst(l) <= 33.3) || 'light';
  const fps = ms => (ms <= 16.7 ? '60 fps' : ms <= 33.3 ? '30 fps' : `${Math.round(1000 / ms)} fps`);
  el.innerHTML = `<table><tr><td></td>${ORDER.map(l => `<td>${l}</td>`).join('')}</tr>` +
    HEAVY.map((h, i) => `<tr><td>${h[2]}</td>${ORDER.map(l => `<td>${res[l][i].mean.toFixed(1)} ms</td>`).join('')}</tr>`).join('') +
    `<tr><td>slowest</td>${ORDER.map(l => `<td>${fps(worst(l))}</td>`).join('')}</tr></table>` +
    `<p>Recommended here: <b>${pick}</b>. <button id="use">Use ${pick} on this machine</button></p>` +
    (worst('light') > 33.3 ? '<p class="bad">Even the light level is below 30 fps on this display: the volume shots will ' +
      'stutter. Present at a lower resolution, use a faster machine, or use S (the stills) through the volume beats.</p>' : '');
  document.getElementById('use').addEventListener('click', () => { store(pick); location.reload(); });
});

const status = document.getElementById('offline-status');
const swOk = 'serviceWorker' in navigator && 'caches' in window;
if (!swOk) { row('Offline', 'warn', 'service workers unavailable here (needs https or localhost)'); document.getElementById('offline').disabled = true; }
else {
  const reg = await navigator.serviceWorker.getRegistration('../');
  row('Offline', reg ? 'ok' : 'warn', reg ? 'service worker installed; press the button again after rebuilding stills' : 'not yet: press “Make available offline”');
}
document.getElementById('offline').addEventListener('click', async () => {
  try {
    await navigator.serviceWorker.register('../sw.js', { scope: '../' });
    const root = new URL('../', location.href);
    const r = await precache(root, (i, n, p) => { status.textContent = `caching ${i}/${n} · ${p}`; }, stillsDir(PROGRAM, LOOK));
    status.textContent = r.failed.length ? `cached ${r.total - r.failed.length}/${r.total}; failed: ${r.failed.join(', ')}`
      : `cached all ${r.total} files (${r.stills} stills). The talk now loads with the server stopped.`;
  } catch (e) { status.textContent = `failed: ${e.message || e}`; }
});
