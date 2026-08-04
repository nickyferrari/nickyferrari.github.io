/* ============================================================
   photosynthesis.js — the quantitative models behind the two
   research demos. Kept separate from the UI so the Node test
   suite can check the math directly.

   1. Kok / S-state cycle of the PSII oxygen-evolving complex
   2. Total-Variation-matched dynamic light environments

   Runs in the browser (window.Photo) and in Node.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- deterministic RNG (so a seed reproduces a figure) ---------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Standard normal via Box–Muller. */
  function gaussian(rng) {
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ============================================================
     1. The Kok model of the S-state cycle
     ------------------------------------------------------------
     The oxygen-evolving complex of PSII advances S0→S1→S2→S3→
     [S4]→S0, releasing O2 as it passes S4. Each saturating flash
     advances a center by one step, except that with probability
     `miss` it fails to advance and with probability `double` it
     advances two.

     A center evolves O2 on a flash if it crosses S4: that is any
     center in S3 that advances at all (1 − miss), plus any center
     in S2 that double-hits (double).

     Dark-adapted centers sit ~75% in S1 and ~25% in S0, which is
     why the classic flash sequence peaks on flash 3 and then
     oscillates with period four, damping toward a steady state.
     ============================================================ */

  function kokSequence(opts) {
    opts = opts || {};
    var miss = opts.miss !== undefined ? opts.miss : 0.10;
    var dbl = opts.double !== undefined ? opts.double : 0.05;
    var n = opts.flashes || 24;
    var p = (opts.initial || [0.25, 0.75, 0, 0]).slice();

    var sum = p.reduce(function (a, b) { return a + b; }, 0);
    for (var k = 0; k < 4; k++) p[k] /= sum;           /* normalize */

    var single = 1 - miss - dbl;
    var yields = [];
    var populations = [p.slice()];

    for (var f = 1; f <= n; f++) {
      /* O2 released on THIS flash, from the populations before it */
      yields.push((1 - miss) * p[3] + dbl * p[2]);
      var q = [0, 0, 0, 0];
      for (var i = 0; i < 4; i++) {
        q[i] += miss * p[i];
        q[(i + 1) % 4] += single * p[i];
        q[(i + 2) % 4] += dbl * p[i];
      }
      p = q;
      populations.push(p.slice());
    }
    return { yields: yields, populations: populations };
  }

  /* The acceptor-side (QA/QB two-electron gate) contribution: a
     period-TWO oscillation that rides on top of the period-four
     donor signal in real flash data. This is a schematic damped
     alternation, not a full acceptor-side simulation — it exists
     to show WHY the two components must be separated before a
     period-four kinetic model is fit. */
  function acceptorPeriod2(n, amplitude, damping) {
    var out = [];
    for (var f = 1; f <= n; f++) {
      var env = damping > 0 ? Math.exp(-(f - 1) / damping) : 1;
      out.push(amplitude * env * (f % 2 === 0 ? 1 : -1));
    }
    return out;
  }

  /* Scale a series so its mean is 1 (conventional "relative yield"). */
  function normalizeMean(arr) {
    var m = 0;
    for (var i = 0; i < arr.length; i++) m += arr[i];
    m /= arr.length || 1;
    if (!m) return arr.slice();
    return arr.map(function (v) { return v / m; });
  }

  /* ============================================================
     2. Dynamic light environments
     ------------------------------------------------------------
     Two light regimes can deliver the same mean irradiance and the
     same total photon dose while differing in how much they move.
     Total Variation, TV = Σ |I(t+1) − I(t)|, measures exactly that
     cumulative movement.

     For a stochastic environment whose intensity is redrawn from
     N(μ, σ²) at each step, successive differences are N(0, 2σ²),
     so the expected step size is E|ΔI| = 2σ/√π and

         E[TV] = (n − 1) · 2σ / √π.

     A square wave of amplitude A contributes 2A per transition, so
     matching k = round(TV / 2A) transitions puts a *deterministic*
     environment at the same Total Variation as a *stochastic* one
     — isolating temporal pattern from both dose and movement.
     ============================================================ */

  function totalVariation(arr) {
    var tv = 0;
    for (var i = 1; i < arr.length; i++) tv += Math.abs(arr[i] - arr[i - 1]);
    return tv;
  }

  function expectedTV(n, sigma) {
    return (n - 1) * 2 * sigma / Math.sqrt(Math.PI);
  }

  function mean(arr) {
    var m = 0;
    for (var i = 0; i < arr.length; i++) m += arr[i];
    return arr.length ? m / arr.length : 0;
  }

  /* dt is in seconds; dose returned in mmol photons m^-2. */
  function dose(arr, dt) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i] * dt;
    return s / 1000;
  }

  function stochasticTrace(opts) {
    var rng = mulberry32(opts.seed || 1);
    var out = [];
    for (var i = 0; i < opts.steps; i++) {
      out.push(Math.max(0, opts.mu + opts.sigma * gaussian(rng)));
    }
    return out;
  }

  /* Square wave around mu with amplitude A and `transitions` flips,
     spread as evenly as the step grid allows. */
  function squareTrace(opts) {
    var n = opts.steps, k = opts.transitions, A = opts.amplitude;
    var out = [];
    if (k < 1) {
      for (var j = 0; j < n; j++) out.push(opts.mu);
      return out;
    }
    var half = (n - 1) / k;
    for (var i = 0; i < n; i++) {
      var phase = Math.floor(i / half) % 2;
      out.push(Math.max(0, opts.mu + (phase === 0 ? A : -A)));
    }
    return out;
  }

  /* Build a matched pair: same mean irradiance, same duration, and
     Total Variation matched to the realized TV of the stochastic
     trace. Returns both traces plus the realized statistics. */
  function matchedPair(opts) {
    var steps = opts.steps || 240;
    var dt = opts.dt || 15;                 /* seconds per step */
    var stoch = stochasticTrace({ mu: opts.mu, sigma: opts.sigma, steps: steps, seed: opts.seed });
    var tvS = totalVariation(stoch);
    var k = Math.max(0, Math.round(tvS / (2 * opts.amplitude)));
    if (k > steps - 1) k = steps - 1;       /* can't flip faster than the grid */
    var sq = squareTrace({ mu: opts.mu, amplitude: opts.amplitude, steps: steps, transitions: k });
    return {
      dt: dt,
      steps: steps,
      transitions: k,
      stochastic: stoch,
      periodic: sq,
      stats: {
        meanS: mean(stoch), meanP: mean(sq),
        doseS: dose(stoch, dt), doseP: dose(sq, dt),
        tvS: tvS, tvP: totalVariation(sq),
        tvExpected: expectedTV(steps, opts.sigma),
        gridLimited: k >= steps - 1
      }
    };
  }

  var api = {
    mulberry32: mulberry32,
    gaussian: gaussian,
    kokSequence: kokSequence,
    acceptorPeriod2: acceptorPeriod2,
    normalizeMean: normalizeMean,
    totalVariation: totalVariation,
    expectedTV: expectedTV,
    mean: mean,
    dose: dose,
    stochasticTrace: stochasticTrace,
    squareTrace: squareTrace,
    matchedPair: matchedPair
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Photo = api;
})(this);
