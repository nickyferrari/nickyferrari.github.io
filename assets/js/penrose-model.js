/* de Bruijn multigrid dual construction. No DOM or rendering dependencies.
   Lines satisfy dot(x, direction[j]) + offset[j] = integer.
   A two-line crossing maps to four lattice labels and hence one unit rhombus.
   Reference: A. Treibergs, Penrose Tiling, slides 61–67 (University of Utah).
   Five directions and zero-sum regular offsets give a Penrose P3 tiling.
   Larger odd direction counts give related multigrid tilings. */
(function (global) {
  'use strict';
  var TAU = Math.PI * 2;

  function directions(n) {
    if (!Number.isInteger(n) || n < 5 || n > 17 || n % 2 !== 1) {
      throw new RangeError('Use an odd direction count from 5 to 17.');
    }
    return Array.from({ length: n }, function (_, j) {
      return [Math.cos(TAU * j / n), Math.sin(TAU * j / n)];
    });
  }

  function offsets(n, seed, shift) {
    var state = (seed >>> 0) || 1;
    var values = Array.from({ length: n }, function (_, j) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      // A second Fourier mode changes internal arrangement, not just translation.
      return state / 4294967296 - 0.5 + shift * Math.cos(2 * TAU * j / n);
    });
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / n;
    values = values.map(function (v) { return v - mean; });
    values[n - 1] = -values.slice(0, -1).reduce(function (a, b) { return a + b; }, 0);
    return values;
  }

  function generate(options) {
    options = options || {};
    var n = options.directions === undefined ? 5 : options.directions;
    var radius = options.radius === undefined ? 4 : options.radius;
    var shift = options.shift === undefined ? 0 : options.shift;
    var seed = options.seed === undefined ? 1 : options.seed;
    var vectors = directions(n);
    if (!Number.isFinite(radius) || radius < 1 || radius > 12 || !Number.isFinite(shift)) {
      throw new RangeError('Invalid patch radius or shift.');
    }
    var gamma = offsets(n, seed, shift);

    function build(g) {
      var tiles = [], lines = [], counts = new Array((n - 1) / 2).fill(0);
      for (var f = 0; f < n; f++) {
        for (var k = Math.ceil(-radius + g[f]); k <= Math.floor(radius + g[f]); k++) {
          var distance = k - g[f], half = Math.sqrt(Math.max(0, radius * radius - distance * distance));
          var v = vectors[f];
          lines.push({ family: f, index: k, a: [v[0] * distance - v[1] * half, v[1] * distance + v[0] * half],
            b: [v[0] * distance + v[1] * half, v[1] * distance - v[0] * half] });
        }
      }
      for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
        var a = vectors[i], b = vectors[j], det = a[0] * b[1] - a[1] * b[0];
        var angle = Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1])));
        var type = Math.round(angle * n / Math.PI) - 1;
        for (var ki = Math.ceil(-radius + g[i]); ki <= Math.floor(radius + g[i]); ki++) {
          for (var kj = Math.ceil(-radius + g[j]); kj <= Math.floor(radius + g[j]); kj++) {
            var ai = ki - g[i], bj = kj - g[j];
            var x = (ai * b[1] - a[1] * bj) / det;
            var y = (a[0] * bj - ai * b[0]) / det;
            if (x * x + y * y > radius * radius) continue;
            var labels = [], base = [0, 0];
            for (var m = 0; m < n; m++) {
              var value = x * vectors[m][0] + y * vectors[m][1] + g[m];
              if (m !== i && m !== j && Math.abs(value - Math.round(value)) < 1e-9) return null;
              labels[m] = m === i ? ki : (m === j ? kj : Math.ceil(value));
              base[0] += labels[m] * vectors[m][0];
              base[1] += labels[m] * vectors[m][1];
            }
            var points = [base, [base[0] + a[0], base[1] + a[1]],
              [base[0] + a[0] + b[0], base[1] + a[1] + b[1]], [base[0] + b[0], base[1] + b[1]]];
            if (det < 0) points.reverse();
            tiles.push({ id: i + ':' + ki + '/' + j + ':' + kj, families: [i, j], indices: [ki, kj],
              gridPoint: [x, y], points: points, labels: labels, type: type, angle: angle * 180 / Math.PI });
            counts[type]++;
          }
        }
      }
      return { directions: n, radius: radius, seed: seed, shift: shift, vectors: vectors,
        offsets: g, lines: lines, tiles: tiles, counts: counts };
    }

    var result = build(gamma);
    // At a rare triple crossing, take a deterministic nearby regular grid.
    // Preserve zero sum, so the five-direction case remains a Penrose tiling.
    for (var attempt = 1; !result && attempt <= 5; attempt++) {
      var jitter = offsets(n, seed + attempt * 7919, 0);
      result = build(gamma.map(function (v, j) { return v + jitter[j] * attempt * 1e-7; }));
    }
    if (!result) throw new Error('Could not resolve a multiple grid crossing.');
    return result;
  }

  function inRibbon(tile, family, index) {
    var slot = tile.families.indexOf(family);
    return slot !== -1 && tile.indices[slot] === index;
  }

  function contains(tile, point) {
    for (var i = 0; i < 4; i++) {
      var a = tile.points[i], b = tile.points[(i + 1) % 4];
      if ((b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]) < -1e-8) return false;
    }
    return true;
  }

  var api = { generate: generate, directions: directions, offsets: offsets, inRibbon: inRibbon, contains: contains };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.PenroseModel = api;
})(this);
