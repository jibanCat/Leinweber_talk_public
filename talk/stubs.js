
import { BEATS, PROGRAM, atStep, SPEAKER, LOGOS } from './beats.js';
import { PENDING } from './scenes.js';

const PAPER = [244, 242, 237], POOL = [12, 18, 27], INK = [31, 39, 50];
const mix = (a, b, u) => a.map((x, i) => Math.round(x + (b[i] - x) * u));
const rgb = c => `rgb(${c.join(',')})`;

const CREDITS_V2 = `<div class="stub-credits">
<p class="cr-title">Thank you to the Leinweber Foundation</p>
<p class="cr-fellow">Leinweber Postdoctoral Fellow · Leinweber Institute for Theoretical Physics · University of Michigan</p>
<p class="cr-desi">Michigan is a member of DESI (the Dark Energy Spectroscopic Instrument), so I can compare my theory to the real data.</p>
<p class="cr-h">Since coming to Michigan</p>
<p class="cr-t">Small-scale Lyman alpha forest cosmology with PRIYA: constraints from XQ100 and KODIAQ-SQUAD one-dimensional flux power spectra</p>
<p class="cr-a"><b>M.-F. Ho</b>, M. Qezlou, S. Bird, Y. Yang, C. Avestruz, M. A. Fernandez, V. Iršič · <i>JCAP</i> 07 (2026) 094 · arXiv:2509.18271</p>
<p class="cr-h">Published DESI collaboration papers I contributed to</p>
<p class="cr-t">Construction of the damped Lyα absorber catalog for DESI DR2 Lyα BAO</p>
<p class="cr-a">A. Brodzeller, M. Wolfson, D. M. Santos, <b>M.-F. Ho</b>, et al. · <i>Phys. Rev. D</i> 112, 083510 (2025) · arXiv:2503.14740</p>
<p class="cr-t cr-next">DESI DR2 results. I. Baryon acoustic oscillations from the Lyman alpha forest</p>
<p class="cr-a">DESI Collaboration · <i>Phys. Rev. D</i> 112, 083514 (2025) · arXiv:2503.14739</p>
<div class="cr-group"><p class="cr-h">Thanks also to the Michigan cosmology group</p>
<p class="cr-fac">Camille Avestruz · Gus Evrard · Dragan Huterer</p>
<p class="cr-stu">Uendert Andrade · Prakhar Bansal · Shreyanshi Garg · Deric Jones · Nick Kern · Jiaming Pan · Erik Peterson<br>David Robinson · Kabelo Tsiane · Isabele Lais de Souza Vitorio · Alexandra Wells · K Wilson · Qianran Xia</p></div>
<p class="cr-foot">Simulation in this talk: PRIYA (S. Bird, M. A. Fernandez, M.-F. Ho et al., <i>JCAP</i> 10 (2023) 037)<br>Ming-Feng Ho · University of Michigan · the talk online: jibancat.github.io/talks/lya</p>
</div>`;

export const DESI_ACK = 'This research used data obtained with the Dark Energy Spectroscopic Instrument (DESI). DESI construction and operations is managed by the Lawrence Berkeley National Laboratory. This material is based upon work supported by the U.S. Department of Energy, Office of Science, Office of High-Energy Physics, under Contract No. DE–AC02–05CH11231, and by the National Energy Research Scientific Computing Center, a DOE Office of Science User Facility under the same contract. Additional support for DESI was provided by the U.S. National Science Foundation (NSF), Division of Astronomical Sciences under Contract No. AST-0950945 to the NSF’s National Optical-Infrared Astronomy Research Laboratory; the Science and Technology Facilities Council of the United Kingdom; the Gordon and Betty Moore Foundation; the Heising-Simons Foundation; the French Alternative Energies and Atomic Energy Commission (CEA); the National Council of Humanities, Science and Technology of Mexico (CONAHCYT); the Ministry of Science and Innovation of Spain (MICINN), and by the DESI Member Institutions: www.desi.lbl.gov/collaborating-institutions. The DESI collaboration is honored to be permitted to conduct scientific research on I’oligam Du’ag (Kitt Peak), a mountain with particular significance to the Tohono O’odham Nation. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the U.S. National Science Foundation, the U.S. Department of Energy, or any of the listed funding agencies.';
export const DR2_IV = 'DESI DR2 Results IV: Alcock-Paczyński Measurements from the Lyman Alpha Forest and Cosmological Constraints';
export const DR2_II = 'DESI DR2 results II: measurements of baryon acoustic oscillations and cosmological constraints';
export const DR1_P1D = 'Cosmological analysis of the DESI DR1 Lyα 1D power spectrum';
export const DESI24_III = 'DESI 2024 III: Baryon Acoustic Oscillations from Galaxies and Quasars';
export const DESI24_V = 'DESI 2024 V: Full-Shape Galaxy Clustering from Galaxies and Quasars';
export const KODIAQ_P1D = 'KODIAQ-SQUAD P1D: Karaçaylı et al. 2022, <i>MNRAS</i> 509, 2842';

export const DLA_CAT = 'Construction of the damped Lyα absorber catalog for DESI DR2 Lyα BAO';
const CR_THANKS = `<p class="cr-title">Thank you to the Leinweber Foundation</p>
<p class="cr-fellow">Leinweber Postdoctoral Fellow · Leinweber Institute for Theoretical Physics · University of Michigan</p>`;
const CR_DESI = `<p class="cr-desi">Michigan is a member of DESI (the Dark Energy Spectroscopic Instrument), so I can compare my theory to the real data.</p>`;
const CR_WORK = `<p class="cr-h">My work</p>
<p class="cr-t">Small-scale Lyman-alpha forest cosmology with PRIYA: constraints from XQ-100 and KODIAQ-SQUAD one-dimensional flux power spectra</p>
<p class="cr-a"><b>M.-F. Ho</b>, M. Qezlou, S. Bird, Y. Yang, C. Avestruz, M. A. Fernandez, V. Iršič · <i>JCAP</i> 07 (2026) 094 · arXiv:2509.18271</p>
`;
const CR_WORK_LW = `<p class="cr-h">My work</p>
<p class="cr-t">Small-scale Lyman-alpha forest cosmology with PRIYA: constraints from XQ-100 and KODIAQ-SQUAD one-dimensional flux power spectra</p>
<p class="cr-a"><b>M.-F. Ho</b>, M. Qezlou, S. Bird, Y. Yang, C. Avestruz, M. A. Fernandez, V. Iršič · <i>JCAP</i> 07 (2026) 094 · arXiv:2509.18271</p>`;
const CR_REFS = `<p class="cr-h">Contribution to the DESI Lyα working group: DESI papers I co-authored</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DLA_CAT}</span> · A. Brodzeller, …, <b>M.-F. Ho</b>, et al. · <i>Phys. Rev. D</i> 112, 083510 (2025)</p>
<p class="cr-a cr-ref"><span class="cr-rt">DESI DR2 results I: baryon acoustic oscillations from the Lyman-α forest</span> · DESI Collaboration · <i>Phys. Rev. D</i> 112, 083514 (2025)</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DR2_II}</span> · DESI Collaboration · <i>Phys. Rev. D</i> 112, 083515 (2025)</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DR2_IV}</span> · DESI Collaboration · arXiv:2607.27410 (2026)</p>`;
const CR_GROUP = `<div class="cr-group"><p class="cr-h">Thanks also to the Michigan cosmology group</p>
<p class="cr-fac">Camille Avestruz · Gus Evrard · Dragan Huterer</p>
<p class="cr-stu">Uendert Andrade · Prakhar Bansal · Shreyanshi Garg · Deric Jones · Nick Kern · Hernán Enrique Noriega · Jiaming Pan · Erik Peterson<br>David Robinson · Kabelo Tsiane · Isabele Lais de Souza Vitorio · Alexandra Wells · K Wilson · Qianran Xia<br>Visiting scholars: <span style="white-space:nowrap">Elena Rasia (INAF – Osservatorio Astronomico di Trieste)</span> · <span style="white-space:nowrap">Cinthia Nunes de Lima (Universidade Estadual de Londrina, Brazil)</span></p></div>`;
const CREDITS_V3 = `<div class="stub-credits v3">
${CR_THANKS}
${CR_DESI}
<div class="cr-row"><div class="cr-main">${CR_WORK}</div>
<figure class="cr-fig"><img src="logos/ink-forest.jpg" alt="Ink Forest: a browser game on PRIYA sightlines (Ming-Feng Ho)"><figcaption>Ink Forest: feel free to play</figcaption></figure></div>
<div class="cr-cols"><div class="cr-col"><p class="cr-h">Public software I built at Michigan (MIT licence)</p>
<p class="cr-t">gp_dla_finder</p>
<p class="cr-a">finds damped Lyα absorbers in quasar spectra · github.com/jibanCat/gp_dla_finder</p>
<p class="cr-t cr-next">hcd_priya</p>
<p class="cr-a">the forest and its dense absorbers, emulated together · github.com/jibanCat/hcd_priya</p></div>
<div class="cr-col"><p class="cr-h">Teaching material</p>
<p class="cr-t">Lyα: from gas to forest</p>
<p class="cr-a">how hydrogen makes the forest · jibancat.github.io/lya-gas-to-forest</p>
<p class="cr-t cr-next">Ink Forest</p>
<p class="cr-a">a browser game on PRIYA sightlines · jibancat.github.io/ink-forest</p></div></div>
${CR_REFS}
${CR_GROUP}
<p class="cr-foot">Simulation in this talk: PRIYA (S. Bird, M. A. Fernandez, M.-F. Ho et al., <i>JCAP</i> 10 (2023) 037) · data: ${KODIAQ_P1D}<br>Ming-Feng Ho · University of Michigan · an earlier public version of this talk: jibancat.github.io/talks/lya</p>
</div>`;
const CREDITS_LW = `<div class="stub-credits v3 lw">
<div class="cr-top"><div class="cr-head">${CR_THANKS}</div></div>
${CR_DESI}
${CR_GROUP}
${CR_WORK_LW}
${CR_REFS}
<p class="cr-web">Ming-Feng Ho, Leinweber Postdoctoral Fellow · <span>jibancat.github.io</span></p>
</div>`;
const PAPERS_V3 = `<div class="stub-credits v3 cr-papers">
<p class="cr-title">The DESI papers in this talk</p>
<p class="cr-h">DESI papers I co-authored (also on the thanks card)</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DLA_CAT}</span> · A. Brodzeller, M. Wolfson, D. M. Santos, <b>M.-F. Ho</b>, et al. · arXiv:2503.14740</p>
<p class="cr-a cr-ref"><span class="cr-rt">DESI DR2 results I: baryon acoustic oscillations from the Lyman-α forest</span> · arXiv:2503.14739</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DR2_II}</span> · arXiv:2503.14738</p>
<p class="cr-a cr-ref"><span class="cr-rt">${DR2_IV}</span> · arXiv:2607.27410</p>
<p class="cr-h">DESI results I cite in this talk</p>
<p class="cr-t">${DESI24_III}</p>
<p class="cr-a">DESI Collaboration · <i>JCAP</i> 04 (2025) 012 · arXiv:2404.03000</p>
<p class="cr-t cr-next">${DESI24_V}</p>
<p class="cr-a">DESI Collaboration · <i>JCAP</i> 09 (2025) 008 · arXiv:2411.12021</p>
<p class="cr-t cr-next">${DR1_P1D}</p>
<p class="cr-a">J. Chaves-Montero et al. (DESI) · <i>JCAP</i> 06 (2026) 040 · arXiv:2601.21432</p>
<p class="cr-ack">DESI data: Data Release 1 of the Dark Energy Spectroscopic Instrument (DESI Collaboration et al. 2026), CC BY 4.0. ${DESI_ACK}</p>
</div>`;

function beatLabel(B, beat) {
  if (PROGRAM === 'v2') return `beat ${beat} · ${B.title}${B.droppable ? ' · droppable' : ''} · placeholder`;
  const who = B.pending ? ` · ${B.pending}` : PENDING[B.scene] ? ` · ${PENDING[B.scene]}` : '';
  return `§${B.section} · ${B.title}${B.droppable ? ' · droppable' : ''} · placeholder${who}`;
}

export function createStubs(root) {
  root.innerHTML = '<div class="stub-point"></div><div class="stub-text"><p class="stub-beat"></p>' +
    '<p class="stub-step"></p></div><div class="stub-title"><p>The Lyman-alpha Forest</p>' +
    '<p>Reading the Universe and Galaxies in Shadows</p>' + (PROGRAM !== 'v2' ? `<p class="stub-name">${SPEAKER}</p>` : '') + '</div>' +
    (PROGRAM !== 'v2' ? `<div class="stub-logos">${LOGOS.map(l => `<img class="${l.cls}" src="${l.src}" alt="${l.alt}">`).join('')}</div>` : '') +
    (PROGRAM === 'lw10' ? CREDITS_LW + PAPERS_V3 : PROGRAM !== 'v2' ? CREDITS_V3 + PAPERS_V3 : CREDITS_V2);
  const [point, text, beatEl, stepEl, title, credits] = ['.stub-point', '.stub-text', '.stub-beat', '.stub-step', '.stub-title', '.stub-credits']
    .map(q => root.querySelector(q));
  const papers = root.querySelector('.stub-credits.cr-papers');
  const logos = root.querySelector('.stub-logos');
  let sig = '';

  function render(st) {
    const ground = mix(PAPER, POOL, st.dark);
    root.style.background = rgb(ground);
    const stub = st.scene === 'stub' ? st.s : null;
    const op = stub ? st.op : 0;
    let beat = -1, i = 0, dip = 0;
    if (stub) {
      beat = stub.beat;
      i = Math.round(stub.step);
      const f = stub.step - Math.floor(stub.step);
      dip = f === 0 ? 1 : Math.abs(2 * f - 1);
    }
    const B = BEATS[beat];
    const card = B ? atStep(B.card, i) : null;
    const isTitle = card === 'title', isCredits = card === 'credits', isPapers = card === 'papers';
    const fg = rgb(mix(INK, PAPER, st.dark));
    const textOp = stub && !isTitle && !isCredits && !isPapers ? op * dip : 0;
    const titleOp = stub && isTitle ? op * dip : 0;
    const creditsOp = stub && isCredits ? op * dip : 0;
    const pointOp = stub && B && B.point && B.point[i] ? op * dip : 0;
    const papersOp = stub && isPapers ? op * dip : 0;
    const beatText = B && !isCredits && !isPapers ? beatLabel(B, beat) : '';
    const stepText = B && !isCredits && !isPapers ? (B.steps[i] || '') : '';
    if (beatEl.textContent !== beatText) beatEl.textContent = beatText;
    if (stepEl.textContent !== stepText) stepEl.textContent = stepText;
    text.style.color = fg; text.style.opacity = String(textOp);
    title.style.color = rgb(mix(INK, [200, 204, 210], st.dark)); title.style.opacity = String(titleOp);
    if (logos) logos.style.opacity = String(titleOp);
    credits.style.opacity = String(creditsOp);
    if (papers) papers.style.opacity = String(papersOp);
    point.style.opacity = String(pointOp);
    sig = JSON.stringify([ground, beatText, stepText, textOp, titleOp, pointOp, creditsOp, papersOp]);
  }
  return { render, signature: () => sig, ground: () => root.style.background };
}
