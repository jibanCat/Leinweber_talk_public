
export function createLocalTools({ q, T, BEATS, pos, next, extraOpen }) {
  const REHEARSE = q.has('rehearse'), DRY = q.has('dryrun') ? Math.max(0.1, parseFloat(q.get('dryrun')) || 3) : 0;
  const session = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const log = {
    session, started: new Date().toISOString(), url: location.pathname + location.search,
    program: T.program, look: T.look,
    beats: BEATS.map((b, i) => ({ beat: i, id: b.id, section: b.section, title: b.title, minutes: b.min, droppable: !!b.droppable })),
    entry: T.ENTRY, last: T.LAST, rests: [], extra: [],
  };
  let t0 = null, lastRest = null, lastSend = 0, dryTimer = 0, dryAt = -1;
  const now = () => (t0 === null ? 0 : (performance.now() - t0) / 1000);
  function send() {
    try { localStorage.setItem(`lw10-rehearsal-${session}`, JSON.stringify(log)); } catch {}
    fetch('/rehearsal-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(log), keepalive: true })
      .catch(() => {});
    lastSend = performance.now();
  }
  function onChange(k, s, animating) {
    if (t0 === null && (k > 0 || animating)) t0 = performance.now();
    const atRest = !animating && s === 1;
    if (REHEARSE && atRest && k !== lastRest) {
      lastRest = k;
      log.rests.push({ t: +now().toFixed(1), K: k, hash: T.hashOf(k), beat: T.beatOf(k) });
      send();
    }
    if (DRY && atRest && k !== dryAt && k < T.LAST) {
      dryAt = k; clearTimeout(dryTimer);
      dryTimer = setTimeout(() => { if (!extraOpen() && pos().k === k) next(); }, DRY * 1000);
    }
  }
  function onExtra(step) {
    if (!REHEARSE) return;
    log.extra.push({ t: +now().toFixed(1), step });
    send();
  }
  addEventListener('pagehide', () => { if (REHEARSE && performance.now() - lastSend > 500) send(); });
  return { onChange, onExtra, active: REHEARSE || !!DRY };
}
