/* ============================================================
   life-ui.js — the Game of Life lab. Wires the shared engine
   (life-engine.js) and pattern library (patterns.js) to canvas
   rendering, drawing, presets, and the rule editor.
   ============================================================ */
(function () {
  'use strict';

  var COLS = 140, ROWS = 88;

  var canvas = document.getElementById('life-canvas');
  var ctx = canvas.getContext('2d');

  var engine = new Life.Engine(COLS, ROWS, { wrap: true });
  var ages = new Uint16Array(COLS * ROWS);

  /* ---------- theme-aware colors ---------- */

  var colors = { bg: '#F1EEE7', ramp: [] };

  function hexLerp(a, b, t) {
    function ch(h, i) { return parseInt(h.slice(i, i + 2), 16); }
    function px(a1, b1) { return Math.round(a1 + (b1 - a1) * t); }
    return 'rgb(' + px(ch(a, 1), ch(b, 1)) + ',' + px(ch(a, 3), ch(b, 3)) + ',' + px(ch(a, 5), ch(b, 5)) + ')';
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return /^#([0-9a-f]{6})$/i.test(v) ? v : fallback;
  }
  function rebuildColors() {
    var accent = cssVar('--accent', '#2B59C3');
    var ink = cssVar('--ink', '#1C1E22');
    colors.bg = cssVar('--bg-sunk', '#F1EEE7');
    colors.ramp = [];
    for (var i = 0; i < 6; i++) colors.ramp.push(hexLerp(accent, ink, i / 5));
  }

  /* ---------- rendering ---------- */

  var cellPx = 6;
  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 800;
    cellPx = Math.max(2, Math.floor(w * dpr / COLS));
    canvas.width = COLS * cellPx;
    canvas.height = ROWS * cellPx;
  }

  function draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var gap = cellPx >= 5 ? 1 : 0;
    for (var y = 0; y < ROWS; y++) {
      var row = y * COLS;
      for (var x = 0; x < COLS; x++) {
        if (!engine.cells[row + x]) continue;
        var a = ages[row + x];
        var bucket = a <= 1 ? 0 : a <= 3 ? 1 : a <= 8 ? 2 : a <= 20 ? 3 : a <= 50 ? 4 : 5;
        ctx.fillStyle = colors.ramp[bucket];
        ctx.fillRect(x * cellPx, y * cellPx, cellPx - gap, cellPx - gap);
      }
    }
  }

  function updateAges() {
    for (var i = 0; i < ages.length; i++) ages[i] = engine.cells[i] ? Math.min(ages[i] + 1, 999) : 0;
  }
  function resetAges() {
    for (var i = 0; i < ages.length; i++) ages[i] = engine.cells[i] ? 1 : 0;
  }

  /* ---------- controls ---------- */

  var els = {
    play: document.getElementById('l-play'),
    step: document.getElementById('l-step'),
    clear: document.getElementById('l-clear'),
    random: document.getElementById('l-random'),
    density: document.getElementById('l-density'),
    speed: document.getElementById('l-speed'),
    preset: document.getElementById('l-preset'),
    rule: document.getElementById('l-rule'),
    wrap: document.getElementById('l-wrap'),
    gen: document.getElementById('l-gen'),
    pop: document.getElementById('l-pop'),
    ruleOut: document.getElementById('l-rule-out'),
    bGrid: document.getElementById('l-b-grid'),
    sGrid: document.getElementById('l-s-grid')
  };

  /* rule preset menu */
  Object.keys(Life.RULES).forEach(function (key) {
    var o = document.createElement('option');
    o.value = key;
    o.textContent = Life.RULES[key].name + '  (B' + Life.RULES[key].b.join('') + '/S' + Life.RULES[key].s.join('') + ')';
    els.rule.appendChild(o);
  });
  var custom = document.createElement('option');
  custom.value = 'custom';
  custom.textContent = 'Custom…';
  els.rule.appendChild(custom);

  /* pattern preset menu */
  var choose = document.createElement('option');
  choose.value = '';
  choose.textContent = 'Drop in a pattern…';
  els.preset.appendChild(choose);
  LifePatterns.PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    els.preset.appendChild(o);
  });

  /* B/S checkbox grids (B1–B8; S0–S8 — B0 omitted: it strobes the whole field) */
  var bChecks = [], sChecks = [];
  function makeChecks(container, from, to, list) {
    for (var n = from; n <= to; n++) {
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.n = n;
      var span = document.createElement('span');
      span.textContent = n;
      lab.appendChild(cb);
      lab.appendChild(span);
      container.appendChild(lab);
      list.push(cb);
      cb.addEventListener('change', onChecksChanged);
    }
  }
  makeChecks(els.bGrid, 1, 8, bChecks);
  makeChecks(els.sGrid, 0, 8, sChecks);

  function checksToRule() {
    var b = [], s = [];
    bChecks.forEach(function (cb) { if (cb.checked) b.push(+cb.dataset.n); });
    sChecks.forEach(function (cb) { if (cb.checked) s.push(+cb.dataset.n); });
    return { b: b, s: s };
  }
  function ruleToChecks(b, s) {
    bChecks.forEach(function (cb) { cb.checked = b.indexOf(+cb.dataset.n) !== -1; });
    sChecks.forEach(function (cb) { cb.checked = s.indexOf(+cb.dataset.n) !== -1; });
  }
  function onChecksChanged() {
    var r = checksToRule();
    engine.setRule(r.b, r.s);
    els.rule.value = 'custom';
    updateReadout();
  }

  els.rule.addEventListener('change', function () {
    var key = els.rule.value;
    if (key === 'custom') return;
    var r = Life.RULES[key];
    engine.setRule(r.b, r.s);
    ruleToChecks(r.b, r.s);
    updateReadout();
  });

  els.wrap.addEventListener('change', function () { engine.wrap = els.wrap.checked; });

  /* ---------- run loop ---------- */

  var running = false;
  var acc = 0;
  var lastT = 0;

  function setRunning(v) {
    running = v;
    els.play.textContent = running ? '❚❚ Pause' : '▶ Run';
  }

  function frame(t) {
    if (running) {
      var dt = Math.min((t - lastT) / 1000, 0.25);
      acc += dt * (+els.speed.value);
      var steps = 0;
      while (acc >= 1 && steps < 30) {
        engine.step();
        updateAges();
        acc -= 1;
        steps++;
      }
      if (steps > 0) { draw(); updateReadout(); }
    }
    lastT = t;
    requestAnimationFrame(frame);
  }

  function updateReadout() {
    els.gen.textContent = 'gen ' + engine.generation;
    els.pop.textContent = 'pop ' + engine.population();
    els.ruleOut.textContent = engine.ruleString();
    document.getElementById('l-speed-out').textContent = els.speed.value + '/s';
    document.getElementById('l-density-out').textContent = els.density.value + '%';
  }

  els.play.addEventListener('click', function () { setRunning(!running); });

  els.step.addEventListener('click', function () {
    setRunning(false);
    engine.step();
    updateAges();
    draw();
    updateReadout();
  });

  els.clear.addEventListener('click', function () {
    setRunning(false);
    engine.clear();
    resetAges();
    draw();
    updateReadout();
  });

  els.random.addEventListener('click', function () {
    engine.randomize((+els.density.value) / 100);
    resetAges();
    draw();
    updateReadout();
  });

  els.preset.addEventListener('change', function () {
    var id = els.preset.value;
    if (!id) return;
    var p = null;
    for (var i = 0; i < LifePatterns.PRESETS.length; i++)
      if (LifePatterns.PRESETS[i].id === id) p = LifePatterns.PRESETS[i];
    if (!p) return;
    setRunning(false);
    engine.clear();
    var b = LifePatterns.bounds(p.cells);
    engine.stamp(p.cells, Math.floor((COLS - b.w) / 2), Math.floor((ROWS - b.h) / 2));
    resetAges();
    draw();
    updateReadout();
    els.preset.value = '';
  });

  ['input'].forEach(function (evt) {
    els.speed.addEventListener(evt, updateReadout);
    els.density.addEventListener(evt, updateReadout);
  });

  /* ---------- drawing with the pointer ---------- */

  var painting = false, paintValue = 1;

  function cellFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    var x = Math.floor((e.clientX - r.left) / r.width * COLS);
    var y = Math.floor((e.clientY - r.top) / r.height * ROWS);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return [x, y];
  }

  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    var c = cellFromEvent(e);
    if (!c) return;
    painting = true;
    paintValue = engine.get(c[0], c[1]) ? 0 : 1;
    engine.set(c[0], c[1], paintValue);
    ages[c[1] * COLS + c[0]] = paintValue;
    canvas.setPointerCapture(e.pointerId);
    draw();
    updateReadout();
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!painting) return;
    var c = cellFromEvent(e);
    if (!c) return;
    engine.set(c[0], c[1], paintValue);
    ages[c[1] * COLS + c[0]] = paintValue;
    draw();
  });

  ['pointerup', 'pointercancel'].forEach(function (evt) {
    canvas.addEventListener(evt, function () { painting = false; updateReadout(); });
  });

  /* ---------- boot ---------- */

  function boot() {
    rebuildColors();
    sizeCanvas();
    var r = Life.RULES.conway;
    ruleToChecks(r.b, r.s);
    els.rule.value = 'conway';
    engine.clear();
    /* start with the Gosper gun — inviting, and it shows what "Run" will do */
    engine.stamp(LifePatterns.GOSPER_GUN, 12, 24);
    engine.stamp(LifePatterns.rotated(LifePatterns.GLIDER, 0), 100, 60);
    resetAges();
    draw();
    updateReadout();
  }

  window.addEventListener('themechange', function () { rebuildColors(); draw(); });
  var ro = new ResizeObserver(function () { sizeCanvas(); draw(); });
  ro.observe(canvas);

  boot();
  requestAnimationFrame(function (t) { lastT = t; requestAnimationFrame(frame); });
})();
