# The Lyman-alpha Forest: Reading the Universe and Galaxies in Shadows

A ten-minute talk for a general audience by **Ming-Feng Ho**, Leinweber Postdoctoral Fellow at the University of
Michigan, given at the Leinweber Foundation's site visit on 29 October 2026. These are its slides, as a web page.

The talk covers:
- DESI's 3D map of the Universe;
- the standard ruler left by sound waves in the early Universe, and what it says about dark energy;
- the range of scales the Lyman-alpha forest reaches.

It then follows one quasar's light through a PRIYA cosmological simulation. The light meets hydrogen, loses one
colour at each cloud, is stretched by the expanding Universe, and builds up the forest of absorption lines. Along the
way it passes a galaxy. There are 20 slides after the title.

## Viewing the slides

- **Online:** in the talk series at `jibancat.github.io/talks/`, or at this repository's own GitHub Pages site once it
  is turned on.
- **On your own computer:** from this folder, run `python3 -m http.server 8000`, then open
  `http://localhost:8000/talk/`. Opening the files directly (`file://`) does not work: the slides load their modules
  and data over HTTP.
- **Keys:**
  - → or space for the next slide, ← to go back;
  - **F** for full screen;
  - **S** for stills, pictures instead of live rendering, for a slow machine.
- **The light version** (`talk/?look=paper`) draws the simulation's pictures as ink on paper, for a weak projector.
- **Offline:** open `talk/preflight.html` and press "Make available offline". The slides then load even with no
  network, in that browser.

It runs in any browser with WebGL 2 and is best in Chrome. The first load is about 71 MB.

## What is here

| path | what it is |
|---|---|
| `index.html` | a landing page |
| `talk/` | the slides: `index.html` and the engine; this talk's slides (`lw10.js`); the scenes (`beam.js` the light's journey, `expansion.js` the expansion history, `atom.js` what Lyman alpha is, `stubs.js` the title and thanks cards); the offline page; `media/` the simulation's films and pictures; `stills/` every slide as a picture, in both looks |
| `survey/` | DESI's map, its quasars' sightlines and the pairs that measure the ruler (WebGL) |
| `chart/` | the charts (the scales slide) |
| `volume-spike/`, `ghosts-spike/`, … | shared engine modules; `volume-spike/data/` holds the data the slides load |
| `sw.js` | the offline cache (a service worker) |

The files are exactly those the slides request, in both looks. They were built from the talk's working repository at
commit `03b6252`: 206 files, with the comments taken out of the JavaScript (the shaders keep their technical
notes). Some modules carry code paths for the
speaker's other talks; this repository runs only this one.

## Data and credits

- **DESI Data Release 1** (public, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)): the slice of the 3D
  map, the quasars' sightlines, the red galaxies whose pairs are counted, the forest's pairs and one quasar's spectrum.
  - **Cite:** DESI Collaboration et al. 2026, AJ 171, 285 ([arXiv:2503.14745](https://arxiv.org/abs/2503.14745)). The
    samples are those of DESI 2024 III (JCAP 04 (2025) 012, [arXiv:2404.03000](https://arxiv.org/abs/2404.03000)) and
    DESI 2024 IV (JCAP 01 (2025) 124, [arXiv:2404.03001](https://arxiv.org/abs/2404.03001)). The catalogues' own
    papers: Ross et al. 2025 for the LSS catalogues ([arXiv:2405.16593](https://arxiv.org/abs/2405.16593)) and
    Ramírez-Pérez et al. 2024 for the Lyman-alpha deltas (MNRAS 528, 6666). The release:
    https://data.desi.lbl.gov/doc/releases/dr1/.
  - **Changes:** the files here are not DESI's files. They are selections and products made for the slides: a slab of
    the map, its sightlines, pair counts computed here, and one spectrum.
  - **Access:** the spectrum was retrieved with SPARCL (Juneau et al. 2024, ADASS XXXIII;
    [arXiv:2401.05576](https://arxiv.org/abs/2401.05576)), and the observing dates with the Astro Data Lab (Fitzpatrick
    et al. 2014, Proc. SPIE 9149; Nikutta et al. 2020, Astron. Comput. 33, 100411), both at NSF NOIRLab.
  - DESI's acknowledgment, and SPARCL's and the Data Lab's, are below.
- **DESI DR2, as published:**
  - the redshifts of DESI's BAO measurements along the expansion history: DESI DR2 Results II, Table IV (DESI
    Collaboration 2025, Phys. Rev. D 112, 083515; [arXiv:2503.14738](https://arxiv.org/abs/2503.14738));
  - the sound horizon r_d = 147.09 Mpc, DESI's fiducial value in its Planck 2018 cosmology, as tabulated in DESI DR2
    Results I, Table 1 (DESI Collaboration 2025, Phys. Rev. D 112, 083514; [arXiv:2503.14739](https://arxiv.org/abs/2503.14739));
  - the slide's "~million" quasars: DR2 measures the Lyman-alpha forest in over 820,000 quasar spectra, at redshifts
    above 2.09 (DESI DR2 Results I and II).
- **The pair counts** on the slides are computed here, from the DESI DR1 red galaxies in one patch of the map and
  random points. The forest's pairs are computed here too, from DR1's Lyman-alpha deltas and quasars, following DESI
  2024 IV's estimator as picca (version 9.0.0, github.com/igmhub/picca) implements it.
- **The expansion history:** flat ΛCDM with Planck 2018's parameters (Planck Collaboration 2020, A&A 641, A6), DESI's
  fiducial cosmology, computed here.
- **The scales slide:** schematic boxes after Boddy, Lisanti, McDermott et al. 2022 (Snowmass 2021,
  JHEAp 35, 112; [arXiv:2203.06380](https://arxiv.org/abs/2203.06380); its Fig. 3, under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)) and a figure of the Lyman-alpha surveys' scales from a talk by
  Andreu Font-Ribera, remade by Ming-Feng Ho.
- **The simulations:** PRIYA, led by Simeon Bird (Bird, Fernandez, Ho et al. 2023, JCAP 10 (2023) 037,
  [arXiv:2306.05471](https://arxiv.org/abs/2306.05471); Fernandez, Bird & Ho 2024, JCAP 07 (2024) 029,
  [arXiv:2309.03943](https://arxiv.org/abs/2309.03943)).
  - The light's journey is one PRIYA run at redshift 3: its gas, its stars and its spectra. `skewer.json` is one
    sightline of the same run. The engine's other simulation files (`f5.bin`, `flux_cube_240.bin` and
    `v3/charts/sim_lyman.json`) come from one further run of the suite; `sim_lyman.json`'s forest is rescaled to the
    mean absorption of Becker et al. 2013 (MNRAS 430, 2067).
  - The spectra were computed with fake_spectra (S. Bird; version 2.2.3, [ascl:1710.012](https://ascl.net/1710.012)),
    and the clouds come from the run's own absorber catalogue, made with hcd_priya
    (github.com/jibanCat/hcd_priya).
  - The gas view is after an idea by Yueying Ni.
  - The light's journey is designed after Andrew Pontzen's animation of a damped Lyman-alpha absorber.
  - The quasar's light is synthetic, after Vanden Berk et al. 2001 (AJ 122, 549); its metal lines are illustrative.
    Line data are from Morton 2003 (ApJS 149, 205) and the NIST Atomic Spectra Database.
- **The thanks slide** lists Ming-Feng Ho's JCAP 2026 paper and four DESI papers they co-authored: three with their
  journal references, and DESI DR2 Results IV by its arXiv number.
- **Software:**
  - gl-matrix (version 3, three of its ES modules; MIT licence: `volume-spike/vendor/gl-matrix/LICENSE.md`);
  - the shaders' `hash12` is Dave Hoskins' "Hash without Sine" (https://www.shadertoy.com/view/4djSRW; MIT licence,
    Copyright (c) 2014 David Hoskins: the notice is in `LICENSE-CONTENT.md`);
  - `mulberry32`, the seeded random numbers (Tommy Ettinger; CC0, public domain);
  - `survey/hash.js` is MurmurHash3's 32-bit finalizer (Austin Appleby; public domain), and the frame checksum in
    `volume-spike/render.js` is FNV-1a (public domain);
  - the Lyman-alpha line profile in `ghosts-spike/` uses Tepper-García 2006's approximation of the Voigt function
    (MNRAS 369, 2025).
- **Logos:** the title and thanks slides showed the University of Michigan's, the Leinweber Institute for Theoretical
  Physics' and the Leinweber Foundation's logos at the talk. This copy leaves them out.

### Where each file comes from

| files | from |
|---|---|
| `volume-spike/data/v3/fan.*`, `skewers.json` | DESI DR1: the LSS catalogues v1.2, and the Lyman-alpha catalogue and deltas v1.0. Each input's URL and checksum is in `fan.json`'s `provenance` |
| `volume-spike/data/v3/lya_pairs.json` | computed here from the DR1 Lyman-alpha deltas and quasars |
| `volume-spike/data/v3/spectra/` | one DR1 quasar spectrum, via SPARCL |
| `volume-spike/data/v3/charts/distances.json` | DESI DR2 Results II's BAO redshifts; the look-back times at Planck 2018 |
| `volume-spike/data/v3/charts/scales.json` | the scales slide's boxes (Snowmass 2021; a talk by A. Font-Ribera), remade |
| `volume-spike/data/lw10/`, `talk/media/` | one PRIYA run at redshift 3: its gas, stars and spectra, rendered for the light's journey, the Lyman-alpha slide, the map and the expansion slide's box |
| `volume-spike/data/skewer.json` | one sightline of the same run |
| `volume-spike/data/f5.bin`, `flux_cube_240.bin`, `v3/charts/sim_lyman.json` | PRIYA's simulated forest, from one further run, loaded by the engine |
| `talk/stills/` | the slides as pictures |

The data files' `ledger_id` fields (C-numbers) refer to the speaker's own list of sources. Most records also give
their public source.

### DESI's acknowledgment

This research used data obtained with the Dark Energy Spectroscopic Instrument (DESI). DESI construction and operations is managed by the Lawrence Berkeley National Laboratory. This material is based upon work supported by the U.S. Department of Energy, Office of Science, Office of High-Energy Physics, under Contract No. DE–AC02–05CH11231, and by the National Energy Research Scientific Computing Center, a DOE Office of Science User Facility under the same contract. Additional support for DESI was provided by the U.S. National Science Foundation (NSF), Division of Astronomical Sciences under Contract No. AST-0950945 to the NSF’s National Optical-Infrared Astronomy Research Laboratory; the Science and Technology Facilities Council of the United Kingdom; the Gordon and Betty Moore Foundation; the Heising-Simons Foundation; the French Alternative Energies and Atomic Energy Commission (CEA); the National Council of Humanities, Science and Technology of Mexico (CONAHCYT); the Ministry of Science and Innovation of Spain (MICINN), and by the DESI Member Institutions: www.desi.lbl.gov/collaborating-institutions. The DESI collaboration is honored to be permitted to conduct scientific research on I’oligam Du’ag (Kitt Peak), a mountain with particular significance to the Tohono O’odham Nation. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the U.S. National Science Foundation, the U.S. Department of Energy, or any of the listed funding agencies.

### SPARCL and the Astro Data Lab

This research uses services or data provided by the SPectra Analysis and Retrievable Catalog Lab (SPARCL) and the Astro
Data Lab, which are both part of the Community Science and Data Center (CSDC) program at NSF National
Optical-Infrared Astronomy Research Laboratory. NOIRLab is operated by the Association of Universities for Research in
Astronomy (AURA), Inc. under a cooperative agreement with the National Science Foundation.

### Thanks

Thanks to the Leinweber Foundation; to the University of Michigan, a member of DESI; and to Camille Avestruz, Gus
Evrard, Dragan Huterer and the Michigan cosmology group.

## Licence

- **The code** is under the MIT licence: see `LICENSE`.
- **The content** (the slides' text, the pictures, stills, films and figures made for the talk) is under CC BY 4.0:
  see `LICENSE-CONTENT.md`.
- **Pictures of DESI's data** (the map and its sightlines, the pair counts, the quasar's spectrum, the BAO
  measurements' redshifts, and the stills of those slides) show DESI's work, and this talk claims no credit for it. If
  you use one, cite DESI's original papers, listed above under "Data and credits", not this talk.
- **Images of the PRIYA simulation** (the renders in `talk/media/`, the stills and films that show the simulation,
  and any picture made from its data files) are the only pictures this talk asks credit for. Any use must cite the PRIYA
  simulation paper, Bird, Fernandez, Ho et al. 2023, JCAP 10 (2023) 037, [arXiv:2306.05471](https://arxiv.org/abs/2306.05471).
- **The data and figures of others** keep their own terms, and so do gl-matrix and `hash12` (their MIT notices are
  in `volume-spike/vendor/gl-matrix/LICENSE.md` and `LICENSE-CONTENT.md`). The PRIYA simulations' data files are shared as on
  jibancat.github.io, with credit and no licence of their own: see `LICENSE-CONTENT.md`.
