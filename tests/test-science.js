/* ============================================================
   test-science.js — checks on the quantitative models behind the
   research demos. Required by run-tests.js.
   ============================================================ */
'use strict';

var P = require('../assets/js/photosynthesis.js');

module.exports = function (check) {
  console.log('\n— Kok / S-state cycle —');

  (function () {
    var r = P.kokSequence({ miss: 0.10, double: 0.05, flashes: 30 });
    var bad = r.populations.filter(function (p) {
      return Math.abs(p.reduce(function (a, b) { return a + b; }, 0) - 1) > 1e-9;
    });
    check('S-state populations stay normalized', bad.length === 0, bad.length + ' bad rows');
  })();

  (function () {
    var r = P.kokSequence({ miss: 0.10, double: 0.05, flashes: 30 });
    check('no O2 on flash 1 (dark-adapted S1/S0)', r.yields[0] === 0, 'Y1=' + r.yields[0]);
    var maxIdx = r.yields.indexOf(Math.max.apply(null, r.yields));
    check('yield peaks on flash 3', maxIdx === 2, 'peak at flash ' + (maxIdx + 1));
  })();

  (function () {
    /* classic period-4: with damping, peaks recur near flashes 3, 7, 11 */
    var r = P.kokSequence({ miss: 0.10, double: 0.05, flashes: 16 });
    var y = r.yields;
    check('local maximum at flash 7 (period 4)', y[6] > y[5] && y[6] > y[7],
      [y[5], y[6], y[7]].map(function (v) { return v.toFixed(4); }).join(', '));
    check('local maximum at flash 11 (period 4)', y[10] > y[9] && y[10] > y[11],
      [y[9], y[10], y[11]].map(function (v) { return v.toFixed(4); }).join(', '));
  })();

  (function () {
    var r = P.kokSequence({ miss: 0.12, double: 0.04, flashes: 400 });
    var last = r.populations[r.populations.length - 1];
    var maxDev = Math.max.apply(null, last.map(function (v) { return Math.abs(v - 0.25); }));
    check('populations converge to 0.25 each (misses damp the oscillation)',
      maxDev < 1e-3, 'max deviation ' + maxDev.toExponential(2));
  })();

  (function () {
    /* With no misses and no double hits the cycle is undamped and exactly
       period-4: flash 3, 7, 11 ... carry all the oxygen. */
    var r = P.kokSequence({ miss: 0, double: 0, flashes: 12, initial: [0, 1, 0, 0] });
    var carriers = r.yields.map(function (v, i) { return v > 0.5 ? i + 1 : 0; }).filter(Boolean);
    check('lossless cycle evolves O2 only on flashes 3, 7, 11',
      carriers.join(',') === '3,7,11', 'got ' + carriers.join(','));
  })();

  (function () {
    var a = P.acceptorPeriod2(8, 0.2, 0);
    var alternates = a.every(function (v, i) { return i % 2 === 0 ? v < 0 : v > 0; });
    check('acceptor component alternates with period 2', alternates, JSON.stringify(a.map(function (v) { return +v.toFixed(2); })));
  })();

  console.log('\n— dynamic light environments —');

  (function () {
    var tv = P.totalVariation([100, 120, 90, 90, 130]);
    check('total variation sums absolute steps', Math.abs(tv - (20 + 30 + 0 + 40)) < 1e-9, 'tv=' + tv);
  })();

  (function () {
    /* E|X-Y| for iid normals = 2σ/√π. Confirm the closed form the demo
       relies on against a large simulated trace. */
    var sigma = 40, steps = 200000;
    var trace = P.stochasticTrace({ mu: 100000, sigma: sigma, steps: steps, seed: 7 });
    var realized = P.totalVariation(trace) / (steps - 1);
    var predicted = 2 * sigma / Math.sqrt(Math.PI);
    var err = Math.abs(realized - predicted) / predicted;
    check('E[TV] closed form matches simulation within 1%', err < 0.01,
      'realized ' + realized.toFixed(3) + ' vs predicted ' + predicted.toFixed(3));
  })();

  (function () {
    var r = P.matchedPair({ mu: 300, sigma: 90, amplitude: 150, steps: 240, dt: 15, seed: 3 });
    var rel = Math.abs(r.stats.tvP - r.stats.tvS) / r.stats.tvS;
    check('matched square wave lands within 2% of the stochastic TV', rel < 0.02,
      'TV ' + r.stats.tvP.toFixed(0) + ' vs ' + r.stats.tvS.toFixed(0));
    var doseRel = Math.abs(r.stats.doseP - r.stats.doseS) / r.stats.doseS;
    check('matched pair delivers the same photon dose within 5%', doseRel < 0.05,
      'dose ' + r.stats.doseP.toFixed(1) + ' vs ' + r.stats.doseS.toFixed(1) + ' mmol/m2');
    check('the two traces are genuinely different signals',
      P.totalVariation(r.stochastic.map(function (v, i) { return v - r.periodic[i]; })) > 0,
      'traces identical');
  })();

  (function () {
    var r = P.matchedPair({ mu: 250, sigma: 0, amplitude: 100, steps: 100, dt: 10, seed: 5 });
    check('zero-noise environment produces a flat trace and no transitions',
      r.transitions === 0 && r.stats.tvS === 0 && r.stats.tvP === 0,
      'transitions=' + r.transitions);
  })();
};
