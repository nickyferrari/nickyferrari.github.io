# nickferrari95.github.io — research website

A fast, dependency-free personal academic site: plain HTML, CSS, and JavaScript.
No build step, no framework, nothing to keep updated. Every file here is exactly
what gets served.

Content is drawn from your CV drafts, cover letters, and scientific-interest
statements in `job_search/`. Everything that still needs your input is marked
with an `<!-- EDIT: ... -->` comment in the HTML — see **Before you publish**.

```
├── index.html            About + research interests + news
├── publications.html     5 papers, 1 in prep, 4 conference presentations
├── cv.html               Full CV, print-friendly (Print / save as PDF button)
├── teaching.html         Courses, mentoring, outreach, contact
├── 404.html              Self-contained fun 404 (tiny Game of Life inside)
├── play/
│   ├── index.html        Playground landing page
│   ├── light.html        Designing a light environment  ← your dissertation
│   ├── kok.html          The Kok clock                  ← your Plants (2026) paper
│   ├── penrose.html      Penrose tiling explorer
│   ├── life.html         Game of Life lab
│   └── golf.html         Life Golf — 5-hole puzzle game
├── assets/
│   ├── css/style.css        Whole design system (colors/fonts in :root tokens)
│   ├── js/photosynthesis.js Kok model + Total-Variation light environments
│   ├── js/plot.js           Tiny canvas plotting helper
│   ├── js/life-engine.js    Cellular-automaton engine (browser + Node)
│   ├── js/patterns.js       Famous Life patterns + geometry helpers
│   ├── js/golf-levels.js    Life Golf level definitions
│   ├── js/*-ui.js           Page logic for each demo
│   ├── favicon.svg          Two light environments over one window
│   └── portrait.svg         Placeholder — replace with your photo
└── tests/
    ├── run-tests.js      Everything; run this
    ├── test-science.js   Kok model + light environment checks
    ├── golf-solver.js    Brute-force solver proving each golf hole is winnable
    └── probe.js          ASCII visualizer for debugging golf levels
```

## Preview locally

```bash
python3 -m http.server 8000     # then visit http://localhost:8000
```

## Before you publish

Small list, all quick:

| # | What | Where |
|---|------|-------|
| 1 | **Photo** — save as `assets/me.jpg`, point the `<img>` at it | `index.html` hero |
| 2 | **Profile links** — Google Scholar, ORCID, GitHub, LinkedIn are placeholder URLs | `index.html`, `teaching.html`, `publications.html` |
| 3 | **DOIs / PDFs** on the publications page are placeholder `#` links | `publications.html` |
| 4 | **Footer "source" link** — points at `github.com/yourusername/...` | all pages |
| 5 | **News dates** — add your defense date and next position when ready | `index.html` |
| 6 | **Teaching philosophy** — I drafted a paragraph from your materials; rewrite in your voice | `teaching.html` |
| 7 | **References section** on the CV — trim to "available on request" if you prefer | `cv.html` |

Two deliberate choices worth knowing about: your **phone number is not on the
site** (email only — public pages get scraped), and the CV page is styled for
printing rather than linking a PDF, so "Print / save as PDF" produces a clean
document. If you'd rather link your formatted `.docx`-derived PDF, drop it at
`assets/cv.pdf` and there's a commented-out button in `cv.html` ready to go.

## Deploy to GitHub Pages (free hosting)

### Option A — all in the browser, ~3 minutes

1. Sign in at github.com → **+** (top right) → **New repository**.
2. Name it **exactly** `YOURUSERNAME.github.io`, keep it Public, **Create repository**.
3. On the new repo page, click the **"uploading an existing file"** link.
4. Drag the **contents** of this folder in — in Chrome or Edge you can drag the
   folders (`play/`, `assets/`, `tests/`) and they upload with structure intact.
   Make sure `index.html` lands at the top level, not inside a subfolder.
5. **Commit changes.** A minute or two later the site is live at
   `https://YOURUSERNAME.github.io`

### Option B — with git

```bash
cd path/to/this/folder
git init
git add .
git commit -m "Research website"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/YOURUSERNAME.github.io.git
git push -u origin main
```

### Variant: a project repo instead

Push to any repo, then **Settings → Pages → Deploy from a branch**, pick `main` /
`(root)`. The site appears at `https://YOURUSERNAME.github.io/REPONAME/`. All
links here are relative, so both setups work unchanged. A custom domain can be
attached later under **Settings → Pages**.

## The Playground

Two demos are your research:

- **Designing a light environment** (`play/light.html`) — the Total-Variation
  matching from your dissertation, live. Sliders for µ, σ, square-wave amplitude,
  and window length; the square wave's flip count is recomputed to match the
  realized TV of the stochastic draw, and the readouts show mean irradiance,
  photon dose, and TV for both so you can watch them stay matched while the
  *pattern* diverges.
- **The Kok clock** (`play/kok.html`) — the S-state cycle with miss and
  double-hit probabilities, dark-adapted S₁/S₀ ratio, live S-state populations,
  and the period-two acceptor component superimposed on the period-four donor
  signal. The stage note points at your *Plants* (2026) paper for the EWT
  separation. The period-two trace is labeled on the page as a schematic stand-in,
  not a full Q_A/Q_B simulation — worth keeping that caveat if you edit the copy.

And three for fun, per your original request: the Penrose tiling explorer, the
Game of Life lab (HighLife, Seeds, Day & Night, or any custom B/S rule), and
**Life Golf**, a five-hole puzzle game on the same Life engine.

## Tests

```bash
node tests/run-tests.js
```

No dependencies, ~2 seconds. It verifies:

- **The Life engine** — glider and LWSS headings and speeds, oscillator periods
  (blinker 2, pulsar 3, pentadecathlon 15), the Gosper gun, toroidal wrapping,
  and the Seeds rule.
- **Life Golf** — brute-forces every hole to prove a winning line exists within
  budget, and that an empty board can't accidentally win.
- **The science models** — S-state populations stay normalized, no O₂ on flash 1,
  the yield peaks on flash 3 with period-4 recurrences at 7 and 11, a lossless
  cycle stays undamped forever, populations converge to 0.25 each under misses,
  the E[TV] = (n−1)·2σ/√π closed form matches a 200,000-step simulation to within
  1%, and matched pairs land within 2% on TV and 5% on dose.

If you add a golf hole or change a model, run this before you push — several
checks exist specifically to catch a plausible-looking change that breaks the
physics.
