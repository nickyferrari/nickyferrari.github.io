'use strict';
var M = require('../assets/js/penrose-model.js');
var key = function (p) { return p.map(function (v) { return Math.round(v * 1e7); }).join(','); };

module.exports = function (check) {
  console.log('\n— multigrid geometry —');
  [5, 7, 9, 11, 13, 15, 17].forEach(function (n) {
    var m = M.generate({ directions: n, radius: 4 });
    var vertices = new Set(), edges = new Map(), valid = true;
    m.tiles.forEach(function (t) {
      var area = 0;
      for (var i = 0; i < 4; i++) {
        var a = t.points[i], b = t.points[(i + 1) % 4];
        valid = valid && Math.abs(Math.hypot(a[0] - b[0], a[1] - b[1]) - 1) < 1e-8;
        area += a[0] * b[1] - a[1] * b[0];
        vertices.add(key(a));
        var edge = [key(a), key(b)].sort().join('|');
        edges.set(edge, (edges.get(edge) || 0) + 1);
      }
      valid = valid && area > 0 && Math.abs(area / 2 - Math.sin(t.angle * Math.PI / 180)) < 1e-8;
    });
    check(n + ' directions produce valid unit rhombi with the expected shape count',
      valid && m.counts.length === (n - 1) / 2 && m.counts.every(function (v) { return v > 0; }));
    check(n + '-direction patch has no unmatched internal holes or multiply shared edges',
      vertices.size - edges.size + m.tiles.length === 1 && Array.from(edges.values()).every(function (v) { return v <= 2; }));

    // Consecutive crossings on a line must become edge-sharing tiles in a ribbon.
    var ribbon = m.tiles.filter(function (t) { return M.inRibbon(t, 0, 0); });
    ribbon.sort(function (a, b) { return a.gridPoint[1] - b.gridPoint[1]; });
    var connected = ribbon.length > 1;
    for (var r = 1; r < ribbon.length; r++) {
      var prev = new Set(ribbon[r - 1].points.map(key));
      connected = connected && ribbon[r].points.filter(function (p) { return prev.has(key(p)); }).length === 2;
    }
    check(n + '-direction grid line maps to a continuous ribbon', connected);
  });

  var base = M.generate(), same = M.generate(), moved = M.generate({ shift: 0.37 }), other = M.generate({ seed: 2 });
  check('arrangements are reproducible and both shift and seed change the tiling',
    JSON.stringify(base) === JSON.stringify(same) && JSON.stringify(base.tiles) !== JSON.stringify(moved.tiles) &&
    JSON.stringify(base.tiles) !== JSON.stringify(other.tiles));
  check('pattern shifts preserve the zero-sum Penrose condition', [-1, 0, 0.37, 1].every(function (shift) {
    return Math.abs(M.generate({ shift: shift }).offsets.reduce(function (a, b) { return a + b; }, 0)) < 1e-10;
  }));
  var large = M.generate({ radius: 10 });
  check('large Penrose patch approaches the golden ratio of thick to thin tiles',
    Math.abs(large.counts[1] / large.counts[0] - (1 + Math.sqrt(5)) / 2) < 0.035);
  var sample = base.tiles.filter(function (_, i) { return i % 13 === 0; });
  check('tile picking identifies exactly one tile at sampled interior points', sample.every(function (tile) {
    var center = tile.points.reduce(function (p, q) { return [p[0] + q[0] / 4, p[1] + q[1] / 4]; }, [0, 0]);
    return base.tiles.filter(function (t) { return M.contains(t, center); }).length === 1 && M.contains(tile, center);
  }));
  check('grid crossings remain on their two generating lines', moved.tiles.every(function (tile) {
    return tile.families.every(function (family, slot) {
      var v = moved.vectors[family], p = tile.gridPoint;
      return Math.abs(p[0] * v[0] + p[1] * v[1] + moved.offsets[family] - tile.indices[slot]) < 1e-9;
    });
  }));
};
