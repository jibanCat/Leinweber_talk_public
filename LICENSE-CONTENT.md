# Licence for the content

The code in this repository is under the MIT licence (`LICENSE`). The talk's content is under the Creative Commons
Attribution 4.0 International licence (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/

Copyright (c) 2026 Ming-Feng Ho.

**Covered by CC BY 4.0:** the slides' text and layout, and the pictures, stills, films and figures made for this talk.
This includes the renders of the simulation (`talk/media/`, except `beam_strip.bin`, which is data: below) and the
stills (`talk/stills/`), but not the third-party material they show, listed below.

**Attribution** depends on what you use:

- **Pictures of DESI's data: cite DESI's original papers, not this talk.** This covers the 3D map and its quasars'
  sightlines, the pairs counted on it, the quasar's spectrum, the redshifts of DESI's BAO measurements on the
  expansion history, and the stills of those slides. These pictures show DESI's work, and this talk claims no credit
  for it. Cite the DR1 paper (DESI Collaboration et al. 2026, AJ 171, 285) with DESI's acknowledgment, and the papers
  of the catalogues and results the picture shows. All of them are listed in `README.md`.
- **Images of the PRIYA simulation: cite the PRIYA simulation paper.** This covers any render, still or film that
  shows the simulation (the renders in `talk/media/`, and the stills and films of the slides that show them), and any
  picture you make from its data files. They are the only pictures this talk asks credit for. Cite Bird, Fernandez,
  Ho et al. 2023, "PRIYA: a new suite of Lyman-alpha forest simulations for cosmology", JCAP 10 (2023) 037
  ([arXiv:2306.05471](https://arxiv.org/abs/2306.05471)), together with the talk (below).
- **Anything else from the slides** (their text and layout, and the other pictures and figures made for the talk):
  Ming-Feng Ho, "The Lyman-alpha Forest: Reading the Universe and Galaxies in Shadows" (talk, Leinweber Foundation
  site visit, University of Michigan, 2026), with a link to this repository.

These citations are the attribution that CC BY 4.0 asks for.

**Not covered** (these keep their own terms):

- **DESI's data:**
  - DESI Data Release 1 is under CC BY 4.0 from the DESI Collaboration. The files here are selections and products
    made from it. When you reuse them, cite the DR1 paper and include DESI's acknowledgment (both in `README.md`).
  - DESI's published DR2 results: the BAO measurements' redshifts (DR2 Results II), and r_d as DESI's fiducial value
    (DR2 Results I, Table 1). Cite the DR2 papers listed in `README.md`.
- **The figures the scales slide is read from**, listed in `README.md`: Fig. 3 of Boddy et al. 2022, under CC BY 4.0,
  and a figure from a talk by Andreu Font-Ribera.
- **The PRIYA simulations' data:** `volume-spike/data/lw10/`, `volume-spike/data/f5.bin`, `flux_cube_240.bin`,
  `skewer.json`, `volume-spike/data/v3/charts/sim_lyman.json` and `talk/media/beam_strip.bin`. They are shared here as
  on jibancat.github.io, which shares `f5.bin` too: with credit, and no licence is granted for them. The renders made
  from them are covered above. Credit the PRIYA simulations, led by Simeon Bird: any use must cite the PRIYA
  simulation paper, Bird, Fernandez, Ho et al. 2023, JCAP 10 (2023) 037; see also Fernandez, Bird & Ho 2024, JCAP 07
  (2024) 029.
- **gl-matrix:** under its own MIT licence (`volume-spike/vendor/gl-matrix/LICENSE.md`).
- **The shaders' `hash12`** (in `volume-spike/shaders.js` and `survey/shaders.js`): Dave Hoskins' "Hash without
  Sine" (https://www.shadertoy.com/view/4djSRW), under the MIT licence. Its notice:

  > Copyright (c) 2014 David Hoskins.
  >
  > Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  > documentation files (the "Software"), to deal in the Software without restriction, including without limitation
  > the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  > permit persons to whom the Software is furnished to do so, subject to the following conditions:
  >
  > The above copyright notice and this permission notice shall be included in all copies or substantial portions of
  > the Software.
  >
  > THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
  > THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  > AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
  > TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  > SOFTWARE.
