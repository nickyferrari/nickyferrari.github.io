# Nicholas Ferrari — personal website

A static website for a broad personal audience, with research, teaching, a CV,
and interactive experiments. Built with HTML, CSS, and JavaScript; no build step
or dependencies are required.

- Live website: https://nickyferrari.github.io/
- Source: https://github.com/nickyferrari/nickyferrari.github.io
- Local redesign branch: `codex/minimal-redesign`

## Preview

From this folder:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. The `.preview/` directory is ignored by Git and holds
local working files and server logs only.

## Pages

- `index.html`: introduction, background, research summaries, and links to experiments.
- `publications.html`: papers, work in preparation, and conference presentations.
- `cv.html`: education, experience, teaching, service, methods, and coursework.
- `teaching.html`: courses, mentoring, outreach, and contact.
- `play/index.html`: interactive collection.
- `play/light.html`, `play/kok.html`: photosynthesis demonstrations.
- `play/penrose.html`, `play/life.html`: mathematical experiments.
- `404.html`: self-contained missing-page screen for GitHub Pages.

The shared appearance lives in `assets/css/style.css`. Each page includes its
own navigation and footer; update those consistently when changing navigation.
The light theme is the default, and the theme button saves a visitor’s preference.
The CV has a print stylesheet and a “Print or save PDF” button.

## Content review

The redesign retains the existing site’s credentials, dates, publication titles,
and research record. Before publishing, confirm:

1. The Ph.D. completion year and any current affiliation or role to add.
2. Whether the manuscript marked “in preparation” has changed status.
3. Whether the 2025–2026 mentoring and service descriptions are still current.
4. Any personal interests or projects to add beyond the existing research and games.

Generic Scholar, ORCID, and LinkedIn home-page links were removed. Add actual
profile URLs when available. A portrait is optional; the new design does not
require one. No private credentials are needed for editing the local files.

The five paper links were checked against Crossref’s publisher-deposited records:

- https://doi.org/10.3390/plants15040625
- https://doi.org/10.1093/plphys/kiag048
- https://doi.org/10.1111/gcb.17595
- https://doi.org/10.3390/plants13060811
- https://doi.org/10.3791/63801

## Checks

```sh
node tests/run-tests.js
```

The tests cover the cellular-automaton engine, multigrid geometry, ribbon
continuity, the Kok model, and light-environment matching. After visual changes,
also check the pages at desktop and mobile widths, the theme toggle, the CV’s
print layout, and the interactive controls.

The light demonstration approximates matching on a finite update grid; its
readouts show the achieved dose and total variation. The Kok demonstration’s
period-two component is schematic, not a complete acceptor-side model.

The tiling explorer uses de Bruijn's multigrid dual construction, implemented in
`assets/js/penrose-model.js`. Five line directions with regular zero-sum offsets
produce Penrose rhombi; the other odd counts from 7 through 17 produce related
multigrid tilings. The pattern-shift control changes an internal Fourier mode of
the offsets while preserving their sum. Counts refer to the finite patch, not
the infinite tiling. Its linked grid and tiling views share one geometry model.

The controls include ribbon selection, patch size, color by shape or orientation,
view selection, zoom, rotation, new arrangements, and PNG/SVG exports. Hover or
tap either canvas to follow a ribbon; the selectors and canvas arrow keys offer
keyboard equivalents. With the canvas focused, Shift plus an arrow changes the
direction, and Escape clears the highlight.

References: [MinutePhysics](https://www.youtube.com/watch?v=-eqdj63nEr4) and
[Andrejs Treibergs' construction notes](https://www.math.utah.edu/~treiberg/PenroseSlides.pdf).

## Publishing

These changes are local until pushed to GitHub. Publishing requires a GitHub
session or Git credentials with write access to the source repository. Review
the draft, commit the changes on the redesign branch, and merge through the
repository’s normal workflow. Confirm the branch configured under GitHub Pages
before merging. No hosting migration is required.
