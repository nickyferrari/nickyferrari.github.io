/* ============================================================
   run-tests.js — checks for the Life engine and interactive models.

   Run with:  node tests/run-tests.js     (no dependencies)
   ============================================================ */
'use strict';

var Life = require('../assets/js/life-engine.js');
var P = require('../assets/js/patterns.js');

var failures = 0;

function check(label, cond, extra) {
  if (cond) {
    console.log('  PASS  ' + label);
  } else {
    failures++;
    console.log('  FAIL  ' + label + (extra ? '  [' + extra + ']' : ''));
  }
}

function cellSet(engine) {
  var s = new Set();
  for (var y = 0; y < engine.h; y++)
    for (var x = 0; x < engine.w; x++)
      if (engine.get(x, y)) s.add(x + ',' + y);
  return s;
}

function shiftedEquals(before, after, dx, dy) {
  if (before.size !== after.size) return false;
  for (var key of before) {
    var p = key.split(',');
    if (!after.has((+p[0] + dx) + ',' + (+p[1] + dy))) return false;
  }
  return true;
}

function measureShift(before, after) {
  /* If |before| == |after|, find the translation by comparing min corners. */
  function minCorner(s) {
    var mx = Infinity, my = Infinity;
    for (var key of s) {
      var p = key.split(',');
      if (+p[0] < mx) mx = +p[0];
      if (+p[1] < my) my = +p[1];
    }
    return [mx, my];
  }
  var b = minCorner(before), a = minCorner(after);
  return [a[0] - b[0], a[1] - b[1]];
}

console.log('— engine basics —');

(function () {
  var e = new Life.Engine(20, 20, { wrap: false });
  e.stamp(P.BLOCK, 5, 5);
  var s0 = e.snapshot();
  e.step();
  check('block is a still life', e.snapshot().join('') === s0.join(''));
})();

(function () {
  var e = new Life.Engine(20, 20, { wrap: false });
  e.stamp(P.BLINKER, 5, 5);
  var s0 = e.snapshot().join('');
  e.step();
  var s1 = e.snapshot().join('');
  e.step();
  check('blinker has period 2', e.snapshot().join('') === s0 && s1 !== s0);
})();

(function () {
  var e = new Life.Engine(30, 30, { wrap: false });
  e.stamp(P.PULSAR, 8, 8);
  var s0 = e.snapshot().join('');
  e.step(); var s1 = e.snapshot().join('');
  e.step(); e.step();
  check('pulsar has period 3', e.snapshot().join('') === s0 && s1 !== s0);
})();

(function () {
  var e = new Life.Engine(30, 30, { wrap: false });
  e.stamp(P.GLIDER, 3, 3);
  var before = cellSet(e);
  for (var i = 0; i < 4; i++) e.step();
  var after = cellSet(e);
  var d = measureShift(before, after);
  check('glider moves (+1,+1) per 4 generations (southeast)',
    shiftedEquals(before, after, 1, 1), 'measured shift ' + d);
})();

(function () {
  var e = new Life.Engine(40, 20, { wrap: false });
  e.stamp(P.LWSS, 2, 8);
  var before = cellSet(e);
  for (var i = 0; i < 4; i++) e.step();
  var after = cellSet(e);
  var d = measureShift(before, after);
  check('LWSS moves (+2,0) per 4 generations (east)',
    shiftedEquals(before, after, 2, 0), 'measured shift ' + d);
})();

(function () {
  var e = new Life.Engine(12, 12, { wrap: true });
  e.stamp(P.GLIDER, 1, 1);
  var s0 = e.snapshot().join('');
  for (var i = 0; i < 48; i++) e.step();  /* 12 cells of travel on a 12-torus */
  check('glider laps a 12×12 torus in 48 generations', e.snapshot().join('') === s0);
})();

(function () {
  var e = new Life.Engine(80, 50, { wrap: false });
  e.stamp(P.GOSPER_GUN, 2, 10);
  for (var i = 0; i < 120; i++) e.step();
  var pop = e.population();
  check('Gosper gun emits gliders (population grows)', pop > 45, 'pop=' + pop);
})();

(function () {
  var e = new Life.Engine(30, 30, { wrap: true, birth: Life.RULES.seeds.b, survive: Life.RULES.seeds.s });
  e.set(10, 10, 1); e.set(11, 10, 1);
  e.step();
  check('Seeds rule: originals die, births happen',
    !e.get(10, 10) && !e.get(11, 10) && e.population() > 0, 'pop=' + e.population());
})();

(function () {
  var e = new Life.Engine(40, 40, { wrap: false });
  e.stamp(P.PENTADECATHLON_SEED, 15, 19);
  for (var i = 0; i < 30; i++) e.step();      /* settle */
  var s0 = e.snapshot().join('');
  for (var j = 0; j < 15; j++) e.step();
  check('row of 10 settles into a period-15 pentadecathlon', e.snapshot().join('') === s0);
})();

/* ---- geometry helpers ---- */

(function () {
  var v = P.rotated(P.BLINKER, 1);
  var vertical = v.length === 3 && v.every(function (c) { return c[0] === 0; });
  check('rot90 turns a horizontal blinker vertical', vertical, JSON.stringify(v));
})();

(function () {
  /* Rotating the glider 90° CW should turn a SE glider into a SW glider. */
  var e = new Life.Engine(30, 30, { wrap: false });
  e.stamp(P.rotated(P.GLIDER, 1), 20, 3);
  var before = cellSet(e);
  for (var i = 0; i < 4; i++) e.step();
  var after = cellSet(e);
  check('rotated glider heads southwest', shiftedEquals(before, after, -1, 1),
    'measured ' + measureShift(before, after));
})();

require('./test-penrose.js')(check);

/* ---- science demos (Kok model, dynamic light environments) ---- */

require('./test-science.js')(check);

console.log('\n' + (failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURE(S)'));
process.exit(failures === 0 ? 0 : 1);
