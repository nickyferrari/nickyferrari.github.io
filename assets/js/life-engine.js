/* ============================================================
   life-engine.js — a small, fast engine for Conway-family
   cellular automata (outer-totalistic rules on a square grid).

   Shared by the Game of Life lab, Life Golf, and the test
   suite: it runs both in the browser (as window.Life) and in
   Node (via module.exports), with no dependencies.
   ============================================================ */
(function (global) {
  'use strict';

  function maskFrom(list) {
    var m = 0;
    for (var i = 0; i < list.length; i++) m |= 1 << list[i];
    return m;
  }

  /**
   * new Life.Engine(width, height, { wrap, birth, survive })
   *   wrap:    true = toroidal edges (default), false = dead beyond the edge
   *   birth:   neighbor counts that create a live cell   (default [3])
   *   survive: neighbor counts that keep a cell alive    (default [2,3])
   */
  function Engine(w, h, opts) {
    opts = opts || {};
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h);
    this.next = new Uint8Array(w * h);
    this.wrap = opts.wrap !== undefined ? !!opts.wrap : true;
    this.generation = 0;
    this.setRule(opts.birth || [3], opts.survive || [2, 3]);
  }

  Engine.prototype.setRule = function (birth, survive) {
    this.birth = birth.slice();
    this.survive = survive.slice();
    this.bMask = maskFrom(birth);
    this.sMask = maskFrom(survive);
  };

  Engine.prototype.ruleString = function () {
    return 'B' + this.birth.join('') + '/S' + this.survive.join('');
  };

  Engine.prototype.get = function (x, y) { return this.cells[y * this.w + x]; };
  Engine.prototype.set = function (x, y, v) { this.cells[y * this.w + x] = v ? 1 : 0; };

  Engine.prototype.clear = function () {
    this.cells.fill(0);
    this.generation = 0;
  };

  Engine.prototype.randomize = function (density) {
    for (var i = 0; i < this.cells.length; i++) this.cells[i] = Math.random() < density ? 1 : 0;
    this.generation = 0;
  };

  /** Stamp a list of [x,y] offsets at (ox, oy). Cells falling outside a
      non-wrapping grid are silently dropped. */
  Engine.prototype.stamp = function (cellList, ox, oy) {
    for (var i = 0; i < cellList.length; i++) {
      var x = ox + cellList[i][0], y = oy + cellList[i][1];
      if (this.wrap) {
        x = ((x % this.w) + this.w) % this.w;
        y = ((y % this.h) + this.h) % this.h;
      } else if (x < 0 || y < 0 || x >= this.w || y >= this.h) {
        continue;
      }
      this.cells[y * this.w + x] = 1;
    }
  };

  Engine.prototype.population = function () {
    var p = 0;
    for (var i = 0; i < this.cells.length; i++) p += this.cells[i];
    return p;
  };

  /** Live-cell count inside an inclusive rectangle [x0,y0,x1,y1]. */
  Engine.prototype.populationIn = function (rect) {
    var p = 0;
    for (var y = rect[1]; y <= rect[3]; y++)
      for (var x = rect[0]; x <= rect[2]; x++)
        p += this.cells[y * this.w + x];
    return p;
  };

  Engine.prototype.snapshot = function () { return this.cells.slice(); };

  Engine.prototype.step = function () {
    var w = this.w, h = this.h, cur = this.cells, nxt = this.next;
    var bM = this.bMask, sM = this.sMask, wrap = this.wrap;
    for (var y = 0; y < h; y++) {
      var ym = wrap ? (y - 1 + h) % h : y - 1;
      var yp = wrap ? (y + 1) % h : y + 1;
      var rowU = ym >= 0 ? ym * w : -1;
      var row = y * w;
      var rowD = yp < h ? yp * w : -1;
      for (var x = 0; x < w; x++) {
        var xm = wrap ? (x - 1 + w) % w : x - 1;
        var xp = wrap ? (x + 1) % w : x + 1;
        var n = 0;
        if (rowU >= 0) {
          if (xm >= 0) n += cur[rowU + xm];
          n += cur[rowU + x];
          if (xp < w) n += cur[rowU + xp];
        }
        if (xm >= 0) n += cur[row + xm];
        if (xp < w) n += cur[row + xp];
        if (rowD >= 0) {
          if (xm >= 0) n += cur[rowD + xm];
          n += cur[rowD + x];
          if (xp < w) n += cur[rowD + xp];
        }
        nxt[row + x] = ((cur[row + x] ? sM : bM) >> n) & 1;
      }
    }
    var t = this.cells; this.cells = this.next; this.next = t;
    this.generation++;
  };

  var RULES = {
    conway:   { name: "Conway's Life",        b: [3],          s: [2, 3] },
    highlife: { name: 'HighLife',             b: [3, 6],       s: [2, 3] },
    daynight: { name: 'Day & Night',          b: [3, 6, 7, 8], s: [3, 4, 6, 7, 8] },
    seeds:    { name: 'Seeds',                b: [2],          s: [] },
    nodeath:  { name: 'Life without Death',   b: [3],          s: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    maze:     { name: 'Maze',                 b: [3],          s: [1, 2, 3, 4, 5] }
  };

  var api = { Engine: Engine, RULES: RULES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Life = api;
})(this);
