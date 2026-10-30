/* ============================================================
   kok-ui.js — the Kok clock: flash-induced oxygen yields from
   PSII, with the period-four donor signal and the period-two
   acceptor signal shown separately or superimposed.
   ============================================================ */
(function () {
  'use strict';

  var Plot = Plotting.Plot;

  var canvas = document.getElementById('kok-canvas');
  var plot = new Plot(canvas, { pad: { l: 60, r: 18, t: 16, b: 44 } });
  var tip = document.getElementById('kok-tip');

  var els = {
    miss: document.getElementById('k-miss'),
    dbl: document.getElementById('k-double'),
    s1: document.getElementById('k-s1'),
    flashes: document.getElementById('k-flashes'),
    acc: document.getElementById('k-acc'),
    accTau: document.getElementById('k-acc-tau'),
    view: document.getElementById('k-view'),
    reset: document.getElementById('k-reset'),
    png: document.getElementById('k-png'),
    legend: document.getElementById('k-legend'),
    table: document.getElementById('k-table'),
    wheel: document.getElementById('k-wheel'),
    flashPick: document.getElementById('k-flash-pick')
  };

  var DEFAULTS = { miss: 0.10, dbl: 0.05, s1: 0.75, flashes: 24, acc: 0.30, accTau: 6 };
  var model = null;
  var hover = -1;

  function compute() {
    var n = +els.flashes.value;
    var s1 = +els.s1.value;
    var k = Photo.kokSequence({
      miss: +els.miss.value,
      double: +els.dbl.value,
      flashes: n,
      initial: [1 - s1, s1, 0, 0]
    });
    var donor = Photo.normalizeMean(k.yields);
    var acceptor = Photo.acceptorPeriod2(n, +els.acc.value, +els.accTau.value);
    var raw = donor.map(function (v, i) { return v + acceptor[i]; });
    model = { donor: donor, acceptor: acceptor, raw: raw, populations: k.populations, n: n };
  }

  function seriesShown() {
    var c = plot.colors();
    var v = els.view.value;
    var out = [];
    if (v === 'raw' || v === 'all') out.push({ key: 'raw', name: 'Raw flash yield (what the instrument records)', color: c.s[0], data: model.raw });
    if (v === 'split' || v === 'all') {
      out.push({ key: 'donor', name: 'Donor side: S-state cycle (period 4)', color: c.s[1], data: model.donor });
      out.push({ key: 'acceptor', name: 'Acceptor side: semiquinone (period 2)', color: c.s[2], data: model.acceptor });
    }
    if (v === 'donor') out.push({ key: 'donor', name: 'Donor side: S-state cycle (period 4)', color: c.s[1], data: model.donor });
    return out;
  }

  function draw() {
    plot.resize(0.44);
    var c = plot.colors();
    var shown = seriesShown();

    var lo = 0, hi = 0;
    shown.forEach(function (s) {
      s.data.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
    });
    hi = Math.max(hi * 1.12, 1.2);
    lo = Math.min(lo * 1.2, -0.05);

    plot.frame(0.4, model.n + 0.6, lo, hi).begin().axes({
      xLabel: 'flash number',
      yLabel: 'relative O₂ yield  (mean = 1)',
      xTicks: (function () {
        var t = [];
        var step = model.n > 30 ? 5 : model.n > 16 ? 4 : 2;
        for (var i = step; i <= model.n; i += step) t.push(i);
        return t;
      })(),
      fmtY: function (v) { return v.toFixed(1); }
    });

    plot.ref(0, null, c.line);

    shown.forEach(function (s) {
      var pts = s.data.map(function (v, i) { return [i + 1, v]; });
      plot.series(pts, s.color, { dots: true, dotR: model.n > 32 ? 3.2 : 4.5, width: 2 });
    });

    if (hover >= 0) plot.crosshair(hover + 1);

    Plot.legend(els.legend, shown.map(function (s) { return { name: s.name, color: s.color }; }));
    drawWheel();
  }

  /* S-state populations after the selected flash, as a sequential
     (single-hue, light→dark) ramp — a magnitude job, not identity. */
  function drawWheel() {
    var f = Math.min(+els.flashPick.value, model.n);
    var pops = model.populations[f];
    var accent = Plotting.cssVar('--accent', '#2B59C3');
    var html = '<p class="bs-name" style="margin-top:0">S-state populations after flash ' + f + '</p>';
    for (var i = 0; i < 4; i++) {
      var pct = (pops[i] * 100);
      var alpha = 0.3 + 0.7 * (i / 3);
      html += '<div style="display:flex;align-items:center;gap:8px;margin:4px 0">' +
        '<span style="font-family:var(--mono);font-size:.78rem;color:var(--ink-soft);width:20px">S' + i + '</span>' +
        '<span style="flex:1;height:11px;border-radius:4px;background:var(--bg-sunk);overflow:hidden;display:block">' +
        '<span style="display:block;height:100%;width:' + pct.toFixed(1) + '%;background:' + accent + ';opacity:' + alpha.toFixed(2) + ';border-radius:4px"></span></span>' +
        '<span style="font-family:var(--mono);font-size:.74rem;color:var(--ink-faint);width:42px;text-align:right">' + pct.toFixed(1) + '%</span></div>';
    }
    els.wheel.innerHTML = html;
  }

  function buildTable() {
    var html = '<table class="data"><thead><tr><th>flash</th><th>raw</th><th>donor (P4)</th><th>acceptor (P2)</th></tr></thead><tbody>';
    for (var i = 0; i < model.n; i++) {
      html += '<tr><td>' + (i + 1) + '</td><td>' + model.raw[i].toFixed(3) + '</td><td>' +
        model.donor[i].toFixed(3) + '</td><td>' + model.acceptor[i].toFixed(3) + '</td></tr>';
    }
    els.table.innerHTML = html + '</tbody></table>';
  }

  function render() {
    document.getElementById('k-miss-out').textContent = (+els.miss.value * 100).toFixed(0) + '%';
    document.getElementById('k-double-out').textContent = (+els.dbl.value * 100).toFixed(0) + '%';
    document.getElementById('k-s1-out').textContent =
      'S₁ ' + (+els.s1.value * 100).toFixed(0) + '% / S₀ ' + ((1 - +els.s1.value) * 100).toFixed(0) + '%';
    document.getElementById('k-flashes-out').textContent = els.flashes.value;
    document.getElementById('k-acc-out').textContent = (+els.acc.value).toFixed(2);
    document.getElementById('k-acc-tau-out').textContent = els.accTau.value + ' flashes';

    /* keep miss + double a valid probability pair */
    if (+els.miss.value + +els.dbl.value > 0.9) els.dbl.value = (0.9 - +els.miss.value).toFixed(2);

    els.flashPick.max = els.flashes.value;
    document.getElementById('k-flash-pick-out').textContent = 'flash ' + els.flashPick.value;

    compute();
    draw();
    buildTable();
  }

  canvas.addEventListener('pointermove', function (ev) {
    if (!model) return;
    var r = canvas.getBoundingClientRect();
    var cx = (ev.clientX - r.left) / r.width * plot.W;
    var idx = Math.round(plot.invx(cx)) - 1;
    if (idx < 0 || idx >= model.n) { hide(); return; }
    hover = idx;
    draw();
    var shown = seriesShown();
    var html = '<b>flash ' + (idx + 1) + '</b>';
    shown.forEach(function (s) {
      html += '<span class="tk">' + s.name.split(':')[0].trim() + '</span> <span class="tv">' +
        s.data[idx].toFixed(3) + '</span><br>';
    });
    tip.innerHTML = html;
    tip.style.display = 'block';
    var px = plot.px(idx + 1) / plot.W * r.width;
    tip.style.left = Math.min(Math.max(px + 14, 8), r.width - 200) + 'px';
    tip.style.top = '18px';
  });

  function hide() {
    hover = -1;
    tip.style.display = 'none';
    if (model) draw();
  }
  canvas.addEventListener('pointerleave', hide);

  ['miss', 'dbl', 's1', 'flashes', 'acc', 'accTau', 'view', 'flashPick'].forEach(function (k) {
    els[k].addEventListener('input', render);
    els[k].addEventListener('change', render);
  });

  els.reset.addEventListener('click', function () {
    els.miss.value = DEFAULTS.miss;
    els.dbl.value = DEFAULTS.dbl;
    els.s1.value = DEFAULTS.s1;
    els.flashes.value = DEFAULTS.flashes;
    els.acc.value = DEFAULTS.acc;
    els.accTau.value = DEFAULTS.accTau;
    els.view.value = 'all';
    els.flashPick.value = 3;
    render();
  });

  els.png.addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = 'kok-flash-sequence.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  window.addEventListener('themechange', function () { draw(); });
  new ResizeObserver(function () { if (model) draw(); }).observe(canvas);

  render();
})();
