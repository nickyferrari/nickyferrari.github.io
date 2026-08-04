/* ============================================================
   golf-levels.js — level definitions for Life Golf.

   Every level is verified solvable by tests/run-tests.js, which
   brute-forces stamp placements with the same engine the game
   uses. Rectangles are inclusive [x0, y0, x1, y1].

   goal.type:
     'reach' — win when any live cell appears inside the goal rect
     'clear' — win when the goal rect is completely empty
               (there's a pre-placed structure squatting on it)
   ============================================================ */
(function (global) {
  'use strict';

  function block(x, y) { return [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]; }
  function flat(arrs) {
    var out = [];
    for (var i = 0; i < arrs.length; i++) out = out.concat(arrs[i]);
    return out;
  }

  var LEVELS = [
    {
      id: 'tee',
      name: 'Tee shot',
      w: 56, h: 36,
      launch: [2, 2, 9, 33],
      goal: { type: 'reach', rect: [46, 13, 51, 22] },
      walls: [],
      budget: 13, par: 9, maxGen: 110,
      blurb: 'Get any live cell onto the gold green. Nothing that sits still will do it — you need something that <strong>travels</strong>.',
      hint: 'A lightweight spaceship (LWSS) flies east at half the speed of light. Place one so its 4-row body lines up with the green, then launch.'
    },
    {
      id: 'dogleg',
      name: 'Dogleg',
      w: 44, h: 44,
      launch: [2, 2, 9, 13],
      goal: { type: 'reach', rect: [34, 31, 39, 36] },
      walls: [],
      budget: 6, par: 5, maxGen: 180,
      blurb: 'The green sits far down the diagonal, and a budget of 6 cells rules out the spaceship. Time to meet the <strong>glider</strong>.',
      hint: 'A glider drifts one cell down-and-right every 4 generations, so it stays on the diagonal it starts on. Pick a spot in the launch zone that shares a diagonal with the green.'
    },
    {
      id: 'rocks',
      name: 'The rocks',
      w: 56, h: 36,
      launch: [2, 2, 9, 33],
      goal: { type: 'reach', rect: [46, 11, 51, 18] },
      walls: flat([block(24, 6), block(24, 20), block(24, 34)]),
      budget: 13, par: 9, maxGen: 110,
      blurb: 'A reef of still-life blocks guards the fairway, and the green only spans the upper lane. Fly through the gap — <strong>without clipping the rocks</strong>.',
      hint: 'A spaceship\'s wake is taller than it looks: even passing two rows from a rock, the cells in between can spring to life and wreck you. Aim for the dead center of the gap.'
    },
    {
      id: 'demolition',
      name: 'Demolition',
      w: 48, h: 36,
      launch: [2, 2, 9, 33],
      goal: { type: 'clear', rect: [31, 14, 38, 21] },
      walls: block(34, 17),
      budget: 13, par: 9, maxGen: 100,
      blurb: 'A stubborn block squats on the green, and a block left alone lives forever. <strong>Clear every live cell out of the gold zone</strong>, however briefly.',
      hint: 'Crash a spaceship into it. A dead-center hit scatters debris right back onto the green — the winning lines are slightly off-center, so experiment with your approach row.'
    },
    {
      id: 'storm',
      name: 'Through the storm',
      w: 64, h: 40,
      launch: [2, 2, 7, 37],
      goal: { type: 'reach', rect: [56, 15, 61, 26] },
      walls: (function () {
        /* R-pentomino: a 5-cell methuselah that erupts into chaos for
           over 1000 generations. It sits mid-fairway, growing. */
        var r = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
        var out = [];
        for (var i = 0; i < r.length; i++) out.push([r[i][0] + 30, r[i][1] + 18]);
        return out;
      })(),
      budget: 13, par: 9, maxGen: 130,
      blurb: 'An R-pentomino erupts mid-fairway the moment you launch, and the clock is tight. Thread a ship past the storm <strong>before it swallows the fairway</strong>.',
      hint: 'The chaos grows outward from the center at a finite speed — a spaceship is faster. Hug the quiet edge of the fairway and go early.'
    }
  ];

  var api = { LEVELS: LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.GolfLevels = api;
})(this);
