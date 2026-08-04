/* Debug probe: watch specific placements on specific levels. */
'use strict';
var Life = require('../assets/js/life-engine.js');
var P = require('../assets/js/patterns.js');
var G = require('../assets/js/golf-levels.js');
var solver = require('./golf-solver.js');

function draw(e, level) {
  var out = '';
  for (var y = 0; y < e.h; y++) {
    for (var x = 0; x < e.w; x++) {
      var inGoal = x >= level.goal.rect[0] && x <= level.goal.rect[2] && y >= level.goal.rect[1] && y <= level.goal.rect[3];
      out += e.get(x, y) ? 'O' : (inGoal ? '·' : ' ');
    }
    out += '\n';
  }
  return out;
}

var which = process.argv[2] || 'rocks';
var level = G.LEVELS.filter(function (l) { return l.id === which; })[0];

if (process.argv[3] === 'sweep') {
  /* sweep LWSS east anchors over all rows, report win gens */
  var cells = P.rotated(P.LWSS, 0);
  for (var y = level.launch[1]; y + 3 <= level.launch[3]; y++) {
    var seed = cells.map(function (c) { return [c[0] + 3, c[1] + y]; });
    var r = solver.simulate(level, seed);
    console.log('anchor y=' + y + ' → ' + (r.win ? 'WIN gen ' + r.gen : 'lose'));
  }
} else {
  var anchorY = +(process.argv[3] || 18);
  var frames = (process.argv[4] || '0,30,40,50,60,80').split(',').map(Number);
  var e = new Life.Engine(level.w, level.h, { wrap: false });
  e.stamp(level.walls, 0, 0);
  var cells2 = P.rotated(P.LWSS, 0);
  e.stamp(cells2.map(function (c) { return [c[0] + 3, c[1] + anchorY]; }), 0, 0);
  for (var g = 0; g <= Math.max.apply(null, frames); g++) {
    if (frames.indexOf(g) !== -1) {
      console.log('=== gen ' + g + ' (pop ' + e.population() + ', zone ' + e.populationIn(level.goal.rect) + ') ===');
      console.log(draw(e, level));
    }
    e.step();
  }
}
