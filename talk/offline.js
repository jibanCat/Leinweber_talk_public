export const CACHE = 'lw10-talk-v1';
export const FILES = [
  'talk/', 'arrival/timeline.js', 'chart/alpha.js', 'chart/constants.js',
  'chart/contour.js', 'chart/data.js', 'chart/kit.js', 'chart/labels.js',
  'chart/plain.js', 'chart/render.js', 'chart/scenes/absorbers.js', 'chart/scenes/bao.js',
  'chart/scenes/common.js', 'chart/scenes/dlap1d.js', 'chart/scenes/dlapairs.js', 'chart/scenes/emuwalk.js',
  'chart/scenes/find.js', 'chart/scenes/fullshape.js', 'chart/scenes/multifid.js', 'chart/scenes/mywork.js',
  'chart/scenes/pk.js', 'chart/scenes/resolution.js', 'chart/scenes/ruler.js', 'chart/scenes/scales.js',
  'chart/scenes/small.js', 'chart/scenes/spectrum.js', 'chart/scenes/thermal.js', 'chart/scenes/w0wa.js',
  'chart/scenes/xi.js', 'chart/spectra.js', 'chart/timeline.js', 'confession/beams.js',
  'confession/timeline.js', 'ghosts-spike/galaxy.js', 'ghosts-spike/ghosts.js', 'ghosts-spike/render.js',
  'ghosts-spike/shaders.js', 'ghosts-spike/timeline.js', 'mask-spike/mask.js', 'mask-spike/timeline.js',
  'program.js', 'read/regions.js', 'read/timeline.js', 'record/framing.js',
  'record/timeline.js', 'return/timeline.js', 'survey/camera.js', 'survey/data.js',
  'survey/hash.js', 'survey/labels.js', 'survey/look.js', 'survey/lyapairs.js',
  'survey/marks.js', 'survey/pairs.js', 'survey/provenance.js', 'survey/render.js',
  'survey/shaders.js', 'survey/spacing.js', 'survey/timeline.js', 'talk/atom.js',
  'talk/beam.js', 'talk/beamspec.js', 'talk/beamtime.js', 'talk/beats.js',
  'talk/clip.js', 'talk/count.js', 'talk/expansion.js', 'talk/features.js',
  'talk/gap.js', 'talk/interact.js', 'talk/lamps.js', 'talk/look.js',
  'talk/lw10.js', 'talk/map.js', 'talk/media/beam_gas_0.jpg', 'talk/media/beam_gas_1.jpg',
  'talk/media/beam_gas_2.jpg', 'talk/media/beam_gas_3.jpg', 'talk/media/beam_gas_dens_0.jpg', 'talk/media/beam_gas_dens_1.jpg',
  'talk/media/beam_gas_dens_paper_0.jpg', 'talk/media/beam_gas_dens_paper_1.jpg', 'talk/media/beam_gas_paper_0.jpg', 'talk/media/beam_gas_paper_1.jpg',
  'talk/media/beam_gas_paper_2.jpg', 'talk/media/beam_gas_paper_3.jpg', 'talk/media/beam_gas_stars_0.jpg', 'talk/media/beam_gas_stars_1.jpg',
  'talk/media/beam_gas_stars_paper_0.jpg', 'talk/media/beam_gas_stars_paper_1.jpg', 'talk/media/beam_strip.bin', 'talk/media/beam_zoom.mp4',
  'talk/media/beam_zoom_paper.mp4', 'talk/media/expansion_box.jpg', 'talk/media/expansion_box_paper.jpg', 'talk/media/lyman_hydrogen.jpg',
  'talk/media/lyman_hydrogen_paper.jpg', 'talk/media/lyman_stars.jpg', 'talk/media/lyman_stars_paper.jpg', 'talk/media/map_tau.jpg',
  'talk/media/map_tau_paper.jpg', 'talk/mouse.js', 'talk/offline.js', 'talk/peek.js',
  'talk/plan_lw.js', 'talk/preflight.html', 'talk/preflight.js', 'talk/quality.js',
  'talk/rehearse.js', 'talk/scenes.js', 'talk/stubs.js', 'talk/talk.js',
  'talk/timeline.js', 'texture/physics.js', 'texture/render.js', 'texture/timeline.js',
  'volume-spike/data/f5.bin', 'volume-spike/data/flux_cube_240.bin', 'volume-spike/data/lw10/beam.json', 'volume-spike/data/lw10/lyman.json',
  'volume-spike/data/skewer.json', 'volume-spike/data/v3/charts/distances.json', 'volume-spike/data/v3/charts/scales.json', 'volume-spike/data/v3/charts/sim_lyman.json',
  'volume-spike/data/v3/fan.bin', 'volume-spike/data/v3/fan.json', 'volume-spike/data/v3/lya_pairs.json', 'volume-spike/data/v3/skewers.json',
  'volume-spike/data/v3/spectra/39627770032034423.json', 'volume-spike/data/v3/spectra/index.json', 'volume-spike/gl.js', 'volume-spike/pigment-maps.js',
  'volume-spike/player.js', 'volume-spike/render.js', 'volume-spike/selftest.js', 'volume-spike/shaders.js',
  'volume-spike/timeline.js', 'volume-spike/vendor/gl-matrix/common.js', 'volume-spike/vendor/gl-matrix/mat4.js', 'volume-spike/vendor/gl-matrix/vec3.js',
  'talk/index.html',
];

export const stillsDir = (program, look) => (program === 'v2' ? 'talk/stills/' : program === 'lw10' ? (look === 'paper' ? 'talk/stills/lw10-paper/' : 'talk/stills/lw10/') : look === 'scene' || !look ? 'talk/stills/v3/' : `talk/stills/v3-${look}/`);
export const MANIFESTS = ['talk/stills/lw10/manifest.json', 'talk/stills/lw10-paper/manifest.json'];

export async function precache(root, onProgress = () => {}, dir = 'talk/stills/') {
  const manifest = await fetch(new URL(`${dir}manifest.json`, root)).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const all = [...FILES, ...(manifest ? [`${dir}manifest.json`, ...manifest.files.map(f => `${dir}${f}`)] : [])];
  const cache = await caches.open(CACHE);
  const failed = [];
  for (let i = 0; i < all.length; i++) {
    const url = new URL(all[i], root);
    try {
      const r = await fetch(url, { cache: 'reload' });
      if (!r.ok) throw new Error(r.status);
      await cache.put(url, r);
    } catch { failed.push(all[i]); }
    onProgress(i + 1, all.length, all[i]);
  }
  return { total: all.length, failed, stills: manifest ? manifest.files.length : 0 };
}
