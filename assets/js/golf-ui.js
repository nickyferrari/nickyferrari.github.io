/* ============================================================
   golf-ui.js — Life Golf. A puzzle game on the same engine as
   the Life lab: place seed cells in the launch zone, press
   Launch, and satisfy the level's goal before the generation
   clock runs out. Your score is the number of cells you used.
   ============================================================ */
(function () {
  'use strict';

  var LEVELS = GolfLevels.LEVELS;
  var STAMPS = LifePatterns.STAMPS;

  var canvas = document.getElementById('golf-canvas');
  var ctx = canvas.getContext('2d');

  /* ---------- state ---------- */

  var levelIndex = 0;
  var level = LEVELS[0];
  var seeds = new Map();            /* "x,y" -> true */
  var undoStack = [];               /* arrays of "x,y" keys per placement */
  var mode = 'place';               /* place | run | won | lost */
  var engine = null;
  var stampIndex = 4;               /* default: LWSS — level 1's tool */
  var rotation = 0;
  var hover = null;                 /* [x,y] cell under pointer */
  var winInfo = null;
  var acc = 0, lastT = 0;

  var completed = {};
  try { completed = JSON.parse(localStorage.getItem('golf-done') || '{}'); } catch (e) { completed = {}; }

  /* ---------- colors ---------- */

  var C = {};
  function cssVar(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function rebuildColors() {
    C.bg = cssVar('--bg-sunk', '#F1EEE7');
    C.grid = cssVar('--line', '#E6E2D7');
    C.launch = cssVar('--accent-soft', '#E9EEFB');
    C.goal = cssVar('--gold-soft', '#F7EFDC');
    C.goalEdge = cssVar('--gold', '#B8860B');
    C.seed = cssVar('--accent', '#2B59C3');
    C.live = cssVar('--ink', '#1C1E22');
    C.wall = cssVar('--ink-faint', '#9096A0');
    C.bad = cssVar('--danger', '#B54834');
  }

  /* ---------- layout ---------- */

  var cellPx = 14;
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 900;
    cellPx = Math.max(4, Math.floor(w * dpr / level.w));
    canvas.width = level.w * cellPx;
    canvas.height = level.h * cellPx;
  }

  /* ---------- helpers ---------- */

  function key(x, y) { return x + ',' + y; }
  function inRect(x, y, r) { return x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]; }
  function wallSet() {
    var s = new Set();
    level.walls.forEach(function (c) { s.add(key(c[0], c[1])); });
    return s;
  }
  var walls = wallSet();

  function stampCells() {
    var s = STAMPS[stampIndex];
    var rot = s.rotates ? (s.id === 'blinker' ? rotation % 2 : rotation % 4) : 0;
    return LifePatterns.rotated(s.cells, rot);
  }

  function placementCells(cx, cy) {
    return stampCells().map(function (c) { return [c[0] + cx, c[1] + cy]; });
  }

  function placementValid(cells) {
    if (seeds.size + cells.length > level.budget) return false;
    for (var i = 0; i < cells.length; i++) {
      var x = cells[i][0], y = cells[i][1];
      if (!inRect(x, y, level.launch)) return false;
      if (walls.has(key(x, y))) return false;
      if (seeds.has(key(x, y))) return false;
    }
    return true;
  }

  /* ---------- drawing ---------- */

  function drawZone(rect, fill, edge) {
    ctx.fillStyle = fill;
    ctx.fillRect(rect[0] * cellPx, rect[1] * cellPx,
      (rect[2] - rect[0] + 1) * cellPx, (rect[3] - rect[1] + 1) * cellPx);
    if (edge) {
      ctx.strokeStyle = edge;
      ctx.lineWidth = Math.max(1.5, cellPx / 7);
      ctx.setLineDash([cellPx / 2, cellPx / 3]);
      ctx.strokeRect(rect[0] * cellPx + 1, rect[1] * cellPx + 1,
        (rect[2] - rect[0] + 1) * cellPx - 2, (rect[3] - rect[1] + 1) * cellPx - 2);
      ctx.setLineDash([]);
    }
  }

  function drawCell(x, y, color) {
    var gap = cellPx >= 8 ? 1 : 0;
    ctx.fillStyle = color;
    ctx.fillRect(x * cellPx + gap, y * cellPx + gap, cellPx - 2 * gap, cellPx - 2 * gap);
  }

  function draw() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawZone(level.launch, C.launch, null);
    drawZone(level.goal.rect, C.goal, C.goalEdge);

    /* faint grid (only when cells are big enough to matter) */
    if (cellPx >= 10) {
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= level.w; gx++) {
        ctx.moveTo(gx * cellPx + .5, 0);
        ctx.lineTo(gx * cellPx + .5, canvas.height);
      }
      for (var gy = 0; gy <= level.h; gy++) {
        ctx.moveTo(0, gy * cellPx + .5);
        ctx.lineTo(canvas.width, gy * cellPx + .5);
      }
      ctx.stroke();
    }

    if (mode === 'place' || mode === 'won' || mode === 'lost') {
      level.walls.forEach(function (c) { drawCell(c[0], c[1], C.wall); });
      seeds.forEach(function (_, k) {
        var p = k.split(',');
        drawCell(+p[0], +p[1], C.seed);
      });
      if (mode === 'place' && hover) {
        var cells = placementCells(hover[0], hover[1]);
        var ok = placementValid(cells);
        ctx.globalAlpha = 0.55;
        cells.forEach(function (c) {
          if (c[0] >= 0 && c[1] >= 0 && c[0] < level.w && c[1] < level.h)
            drawCell(c[0], c[1], ok ? C.seed : C.bad);
        });
        ctx.globalAlpha = 1;
      }
    } else if (engine) {
      for (var y = 0; y < level.h; y++) {
        var row = y * level.w;
        for (var x = 0; x < level.w; x++)
          if (engine.cells[row + x]) drawCell(x, y, C.live);
      }
    }
  }

  /* ---------- readouts & panel ---------- */

  var els = {
    chips: document.getElementById('g-chips'),
    title: document.getElementById('g-title'),
    blurb: document.getElementById('g-blurb'),
    hint: document.getElementById('g-hint'),
    stamps: document.getElementById('g-stamps'),
    rotate: document.getElementById('g-rotate'),
    heading: document.getElementById('g-heading'),
    launch: document.getElementById('g-launch'),
    undo: document.getElementById('g-undo'),
    clear: document.getElementById('g-clear'),
    speed: document.getElementById('g-speed'),
    cells: document.getElementById('g-cells'),
    gen: document.getElementById('g-gen'),
    status: document.getElementById('g-status'),
    overlay: document.getElementById('g-overlay'),
    overlayTitle: document.getElementById('g-overlay-title'),
    overlayBody: document.getElementById('g-overlay-body'),
    next: document.getElementById('g-next'),
    retry: document.getElementById('g-retry')
  };

  function updatePanel() {
    els.cells.textContent = seeds.size + ' / ' + level.budget + ' cells · par ' + level.par;
    els.gen.textContent = 'gen ' + (engine ? engine.generation : 0) + ' / ' + level.maxGen;
    document.getElementById('g-speed-out').textContent = els.speed.value + '/s';
    var s = STAMPS[stampIndex];
    if (s.rotates && s.headings) {
      els.heading.textContent = 'heading ' + s.headings[rotation % 4];
    } else if (s.rotates) {
      els.heading.textContent = (rotation % 2) ? 'vertical' : 'horizontal';
    } else {
      els.heading.textContent = '';
    }
    els.launch.textContent = mode === 'run' ? '■ Stop' : '▶ Launch';
    els.launch.disabled = (mode !== 'run' && seeds.size === 0);
    els.undo.disabled = mode !== 'place' || undoStack.length === 0;
    els.status.textContent =
      mode === 'place' ? 'place cells in the blue zone · right-click erases' :
      mode === 'run' ? 'simulating…' : '';
  }

  function stampPreviewSvg(cells) {
    var b = LifePatterns.bounds(cells);
    var m = Math.max(b.w, b.h);
    var u = Math.floor(34 / m);
    var svg = '<svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">';
    var ox = Math.floor((38 - b.w * u) / 2), oy = Math.floor((38 - b.h * u) / 2);
    cells.forEach(function (c) {
      svg += '<rect x="' + (ox + c[0] * u) + '" y="' + (oy + c[1] * u) + '" width="' + (u - 1) + '" height="' + (u - 1) + '" rx="1" fill="currentColor"/>';
    });
    return svg + '</svg>';
  }

  function buildStamps() {
    els.stamps.innerHTML = '';
    STAMPS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'stamp';
      b.setAttribute('aria-pressed', i === stampIndex ? 'true' : 'false');
      b.innerHTML = stampPreviewSvg(LifePatterns.normalize(s.cells)) +
        '<span>' + s.name + '</span><span class="cost">' + s.cells.length + ' cell' + (s.cells.length > 1 ? 's' : '') + '</span>';
      b.addEventListener('click', function () {
        stampIndex = i;
        rotation = 0;
        buildStamps();
        updatePanel();
        draw();
      });
      els.stamps.appendChild(b);
    });
    els.rotate.disabled = !STAMPS[stampIndex].rotates;
  }

  function buildChips() {
    els.chips.innerHTML = '';
    LEVELS.forEach(function (l, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (completed[l.id] ? ' done' : '');
      b.setAttribute('aria-pressed', i === levelIndex ? 'true' : 'false');
      b.textContent = (i + 1);
      b.title = l.name;
      b.addEventListener('click', function () { loadLevel(i); });
      els.chips.appendChild(b);
    });
  }

  /* ---------- level lifecycle ---------- */

  function loadLevel(i) {
    levelIndex = i;
    level = LEVELS[i];
    walls = wallSet();
    seeds = new Map();
    undoStack = [];
    engine = null;
    winInfo = null;
    mode = 'place';
    rotation = 0;
    /* pick a sensible default tool: glider for dogleg, LWSS elsewhere */
    stampIndex = (level.id === 'dogleg') ? 3 : 4;
    els.title.textContent = 'Hole ' + (i + 1) + ' — ' + level.name;
    els.blurb.innerHTML = level.blurb +
      (level.goal.type === 'clear'
        ? ' <em>(Win: the gold zone must be completely empty at any moment.)</em>'
        : ' <em>(Win: any live cell inside the gold zone.)</em>');
    els.hint.textContent = level.hint;
    els.overlay.classList.add('hidden');
    buildChips();
    buildStamps();
    sizeCanvas();
    updatePanel();
    draw();
  }

  function beginRun() {
    engine = new Life.Engine(level.w, level.h, { wrap: false });
    engine.stamp(level.walls, 0, 0);
    seeds.forEach(function (_, k) {
      var p = k.split(',');
      engine.set(+p[0], +p[1], 1);
    });
    mode = 'run';
    acc = 0;
    els.overlay.classList.add('hidden');
    updatePanel();
  }

  function stopRun() {
    mode = 'place';
    engine = null;
    updatePanel();
    draw();
  }

  function checkOutcome() {
    var g = engine.generation;
    if (g >= 1) {
      if (level.goal.type === 'reach') {
        if (engine.populationIn(level.goal.rect) > 0) return win(g);
        if (engine.population() === 0 && g < level.maxGen) return lose('Everything died before reaching the green.');
      } else {
        if (engine.populationIn(level.goal.rect) === 0) return win(g);
      }
    }
    if (g >= level.maxGen) {
      lose(level.goal.type === 'reach'
        ? 'The clock ran out before anything reached the green.'
        : 'The clock ran out and the green never came clean.');
    }
  }

  function scoreLabel(used) {
    var d = used - level.par;
    if (d < 0) return 'Under par?! A round for the history books.';
    if (d === 0) return 'Right at par — a perfect round.';
    if (d === 1) return 'One over par. Solid golf.';
    return d + ' over par — it counts all the same.';
  }

  function win(gen) {
    mode = 'won';
    winInfo = { gen: gen, used: seeds.size };
    completed[level.id] = true;
    try { localStorage.setItem('golf-done', JSON.stringify(completed)); } catch (e) {}
    els.overlayTitle.textContent = 'Hole ' + (levelIndex + 1) + ' complete';
    els.overlayBody.textContent = (level.goal.type === 'reach' ? 'Reached the green' : 'Green cleared') +
      ' at generation ' + gen + ' using ' + seeds.size + ' cells. ' + scoreLabel(seeds.size);
    els.next.textContent = levelIndex < LEVELS.length - 1 ? 'Next hole →' : 'Back to hole 1';
    els.retry.textContent = 'Improve my line';
    els.overlay.classList.remove('hidden');
    buildChips();
    updatePanel();
  }

  function lose(msg) {
    mode = 'lost';
    els.overlayTitle.textContent = 'No dice';
    els.overlayBody.textContent = msg + ' Your cells are still on the tee — adjust and launch again.';
    els.next.textContent = 'Back to the tee';
    els.retry.textContent = 'Watch it again';
    els.overlay.classList.remove('hidden');
    updatePanel();
  }

  /* ---------- run loop ---------- */

  function frame(t) {
    if (mode === 'run' && engine) {
      var dt = Math.min((t - lastT) / 1000, 0.25);
      acc += dt * (+els.speed.value);
      var steps = 0;
      while (acc >= 1 && steps < 30 && mode === 'run') {
        engine.step();
        checkOutcome();
        acc -= 1;
        steps++;
      }
      if (steps > 0) {
        draw();
        els.gen.textContent = 'gen ' + engine.generation + ' / ' + level.maxGen;
      }
    }
    lastT = t;
    requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */

  function cellFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / r.width * level.w);
    var y = Math.floor((e.clientY - r.top) / r.height * level.h);
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) return null;
    return [x, y];
  }

  canvas.addEventListener('pointermove', function (e) {
    if (mode !== 'place') return;
    hover = cellFromEvent(e);
    draw();
  });
  canvas.addEventListener('pointerleave', function () { hover = null; draw(); });

  canvas.addEventListener('click', function (e) {
    if (mode === 'won' || mode === 'lost') return;
    if (mode !== 'place') return;
    var c = cellFromEvent(e);
    if (!c) return;
    var cells = placementCells(c[0], c[1]);
    if (!placementValid(cells)) return;
    var keys = cells.map(function (p) { return key(p[0], p[1]); });
    keys.forEach(function (k) { seeds.set(k, true); });
    undoStack.push(keys);
    updatePanel();
    draw();
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    if (mode !== 'place') return;
    var c = cellFromEvent(e);
    if (!c) return;
    var k = key(c[0], c[1]);
    if (seeds.has(k)) {
      seeds.delete(k);
      undoStack = undoStack.map(function (arr) {
        return arr.filter(function (kk) { return kk !== k; });
      }).filter(function (arr) { return arr.length > 0; });
      updatePanel();
      draw();
    }
  });

  els.rotate.addEventListener('click', function () {
    rotation = (rotation + 1) % 4;
    updatePanel();
    draw();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'r' || e.key === 'R') {
      if (STAMPS[stampIndex].rotates) {
        rotation = (rotation + 1) % 4;
        updatePanel();
        draw();
      }
    }
  });

  els.launch.addEventListener('click', function () {
    if (mode === 'run') stopRun();
    else if (mode === 'place' && seeds.size > 0) beginRun();
  });

  els.undo.addEventListener('click', function () {
    var last = undoStack.pop();
    if (last) last.forEach(function (k) { seeds.delete(k); });
    updatePanel();
    draw();
  });

  els.clear.addEventListener('click', function () {
    seeds = new Map();
    undoStack = [];
    if (mode !== 'place') { mode = 'place'; engine = null; }
    els.overlay.classList.add('hidden');
    updatePanel();
    draw();
  });

  els.next.addEventListener('click', function () {
    if (mode === 'won') loadLevel((levelIndex + 1) % LEVELS.length);
    else stopRun();               /* lost: back to placement, seeds kept */
    els.overlay.classList.add('hidden');
  });

  els.retry.addEventListener('click', function () {
    /* keep seeds; rewatch (lost) or refine (won) */
    if (mode === 'won') { stopRun(); }
    else { beginRun(); }
    els.overlay.classList.add('hidden');
    updatePanel();
    draw();
  });

  els.speed.addEventListener('input', updatePanel);

  /* ---------- boot ---------- */

  window.addEventListener('themechange', function () { rebuildColors(); draw(); });
  var ro = new ResizeObserver(function () { sizeCanvas(); draw(); });
  ro.observe(canvas);

  rebuildColors();
  loadLevel(0);
  requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(frame); });
})();
