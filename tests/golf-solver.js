/* ============================================================
   golf-solver.js — brute-force solver used by the test suite to
   PROVE every Life Golf level is winnable within its budget.

   It tries every stamp type the game offers, in every legal
   orientation, at every anchor position inside the launch zone,
   using the exact same engine + patterns the game itself uses.
   Life is deterministic, so a solution found here is a solution
   forever.
   ============================================================ */
'use strict';

var Life = require('../assets/js/life-engine.js');
var P = require('../assets/js/patterns.js');

/* Run a level with the given seed cells; return {win, gen}. */
function simulate(level, seedCells) {
  var e = new Life.Engine(level.w, level.h, { wrap: false });
  e.stamp(level.walls, 0, 0);
  e.stamp(seedCells, 0, 0);
  var goal = level.goal;
  for (var g = 1; g <= level.maxGen; g++) {
    e.step();
    if (goal.type === 'reach') {
      if (e.populationIn(goal.rect) > 0) return { win: true, gen: g };
      if (e.population() === 0) return { win: false, gen: g };
    } else { /* clear */
      if (e.populationIn(goal.rect) === 0) return { win: true, gen: g };
    }
  }
  return { win: false, gen: level.maxGen };
}

function placements(level, cells) {
  /* All anchors such that every cell of the stamp lies inside the launch
     rect and doesn't overlap a wall. */
  var wallSet = new Set(level.walls.map(function (c) { return c[0] + ',' + c[1]; }));
  var L = level.launch;
  var b = P.bounds(cells);
  var out = [];
  for (var y = L[1]; y + b.h - 1 <= L[3]; y++) {
    for (var x = L[0]; x + b.w - 1 <= L[2]; x++) {
      var ok = true;
      for (var i = 0; i < cells.length; i++) {
        if (wallSet.has((x + cells[i][0]) + ',' + (y + cells[i][1]))) { ok = false; break; }
      }
      if (ok) out.push([x, y]);
    }
  }
  return out;
}

/* Try stamps cheapest-first; return the first (= cheapest) winning placement. */
function solve(level) {
  var stamps = P.STAMPS.slice().sort(function (a, b) { return a.cells.length - b.cells.length; });
  for (var s = 0; s < stamps.length; s++) {
    var stamp = stamps[s];
    var orientations = stamp.rotates ? (stamp.id === 'blinker' ? 2 : 4) : 1;
    for (var rot = 0; rot < orientations; rot++) {
      var cells = P.rotated(stamp.cells, rot);
      var anchors = placements(level, cells);
      for (var a = 0; a < anchors.length; a++) {
        var seed = cells.map(function (c) { return [c[0] + anchors[a][0], c[1] + anchors[a][1]]; });
        var r = simulate(level, seed);
        if (r.win) {
          return {
            stamp: stamp.id,
            rot: rot,
            anchor: anchors[a],
            cost: cells.length,
            gen: r.gen,
            desc: stamp.id + (stamp.rotates ? ' rot' + rot : '') + ' @ (' + anchors[a][0] + ',' + anchors[a][1] + ')'
          };
        }
      }
    }
  }
  return null;
}

module.exports = { simulate: simulate, solve: solve, placements: placements };
