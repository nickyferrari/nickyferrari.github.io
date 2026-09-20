/* ============================================================
   patterns.js — famous Life patterns plus small geometry
   helpers (rotation/normalization). Cells are [x, y] offsets
   with y increasing downward. Runs in browser (window.LifePatterns)
   and Node (module.exports).
   ============================================================ */
(function (global) {
  'use strict';

  /* Normalize so the min x and min y are 0. */
  function normalize(cells) {
    var minX = Infinity, minY = Infinity, i;
    for (i = 0; i < cells.length; i++) {
      if (cells[i][0] < minX) minX = cells[i][0];
      if (cells[i][1] < minY) minY = cells[i][1];
    }
    var out = [];
    for (i = 0; i < cells.length; i++) out.push([cells[i][0] - minX, cells[i][1] - minY]);
    return out;
  }

  /* Rotate 90° clockwise: (x, y) -> (-y, x), then normalize. Rotating a
     pattern 90° CW also rotates its velocity 90° CW. */
  function rot90(cells) {
    var out = [];
    for (var i = 0; i < cells.length; i++) out.push([-cells[i][1], cells[i][0]]);
    return normalize(out);
  }

  function rotated(cells, times) {
    var c = normalize(cells);
    for (var i = 0; i < ((times % 4) + 4) % 4; i++) c = rot90(c);
    return c;
  }

  function bounds(cells) {
    var maxX = 0, maxY = 0;
    for (var i = 0; i < cells.length; i++) {
      if (cells[i][0] > maxX) maxX = cells[i][0];
      if (cells[i][1] > maxY) maxY = cells[i][1];
    }
    return { w: maxX + 1, h: maxY + 1 };
  }

  /* ---- travelers ---- */

  /* Glider, heading southeast (verified by the test suite). */
  var GLIDER = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];

  /* Lightweight spaceship, heading east (verified by the test suite). */
  var LWSS = [[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [4, 1], [4, 2], [0, 3], [3, 3]];

  /* ---- still lifes & oscillators ---- */

  var BLOCK = [[0, 0], [1, 0], [0, 1], [1, 1]];
  var BLINKER = [[0, 0], [1, 0], [2, 0]];

  var PULSAR = (function () {
    var cs = [], L = [2, 3, 4, 8, 9, 10], E = [0, 5, 7, 12];
    for (var i = 0; i < E.length; i++)
      for (var j = 0; j < L.length; j++) {
        cs.push([L[j], E[i]]);
        cs.push([E[i], L[j]]);
      }
    return cs;
  })();

  /* A row of 10 cells settles into the period-15 pentadecathlon. */
  var PENTADECATHLON_SEED = (function () {
    var cs = [];
    for (var x = 0; x < 10; x++) cs.push([x, 0]);
    return cs;
  })();

  /* ---- methuselahs ---- */

  var R_PENTOMINO = [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]];
  var ACORN = [[1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2]];
  var DIEHARD = [[6, 0], [0, 1], [1, 1], [1, 2], [5, 2], [6, 2], [7, 2]];

  /* ---- the Gosper glider gun (period 30, emits gliders forever) ---- */

  var GOSPER_GUN = [
    [0, 4], [0, 5], [1, 4], [1, 5],
    [10, 4], [10, 5], [10, 6], [11, 3], [11, 7], [12, 2], [12, 8], [13, 2], [13, 8],
    [14, 5], [15, 3], [15, 7], [16, 4], [16, 5], [16, 6], [17, 5],
    [20, 2], [20, 3], [20, 4], [21, 2], [21, 3], [21, 4], [22, 1], [22, 5],
    [24, 0], [24, 1], [24, 5], [24, 6],
    [34, 2], [34, 3], [35, 2], [35, 3]
  ];

  /* Presets for the Life lab, in menu order. */
  var PRESETS = [
    { id: 'gun',      name: 'Gosper glider gun',            cells: GOSPER_GUN },
    { id: 'glider',   name: 'Glider',                       cells: GLIDER },
    { id: 'lwss',     name: 'Lightweight spaceship',        cells: LWSS },
    { id: 'rpent',    name: 'R-pentomino (methuselah)',     cells: R_PENTOMINO },
    { id: 'acorn',    name: 'Acorn (methuselah)',           cells: ACORN },
    { id: 'diehard',  name: 'Diehard (dies at gen 130)',    cells: DIEHARD },
    { id: 'pulsar',   name: 'Pulsar (period 3)',            cells: PULSAR },
    { id: 'pd',       name: 'Pentadecathlon (period 15)',   cells: PENTADECATHLON_SEED },
    { id: 'blinker',  name: 'Blinker (period 2)',           cells: BLINKER }
  ];

  var api = {
    normalize: normalize,
    rot90: rot90,
    rotated: rotated,
    bounds: bounds,
    GLIDER: GLIDER,
    LWSS: LWSS,
    BLOCK: BLOCK,
    BLINKER: BLINKER,
    PULSAR: PULSAR,
    R_PENTOMINO: R_PENTOMINO,
    ACORN: ACORN,
    DIEHARD: DIEHARD,
    GOSPER_GUN: GOSPER_GUN,
    PENTADECATHLON_SEED: PENTADECATHLON_SEED,
    PRESETS: PRESETS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.LifePatterns = api;
})(this);
