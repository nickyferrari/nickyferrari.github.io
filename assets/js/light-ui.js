/* ============================================================
   light-ui.js — "Same dose, same movement, different pattern":
   an interactive version of the light-environment design used in
   my dissertation experiments.
   ============================================================ */
(function () {
  'use strict';

  var Plot = Plotting.Plot;

  var canvas = document.getElementById('light-canvas');
  var plot = new Plot(canvas, { pad: { l: 64, r: 18, t: 16, b: 44 } });
  var tip = document.getElementById('light-tip');

  var els = {
    mu: document.getElementById('e-mu'),
    sigma: document.getElementById('e-sigma'),
    amp: document.getElementById('e-amp'),
    hours: document.getElementById('e-hours'),
    show: document.getElementById('e-show'),
    reseed: document.getElementById('e-reseed'),
    png: document.getElementById('e-png'),
    legend: document.getElementById('e-legend'),
    table: document.getElementById('e-table')
  };

  var seed = 11;
  var DT = 15;                    /* seconds between intensity updates */
  var data = null;
  var hoverIdx = -1;

  function compute() {
    var steps = Math.round(+els.hours.value * 3600 / DT);
    data = Photo.matchedPair({
      mu: +els.mu.value,
      sigma: +els.sigma.value,
      amplitude: +els.amp.value,
      steps: steps,
      dt: DT,
      seed: seed
    });
  }

  function fmt(v, d) { return v.toFixed(d === undefined ? 0 : d); }

  function stats() {
    var s = data.stats;
    document.getElementById('st-mean').innerHTML =
      fmt(s.meanS) + ' <small>/</small> ' + fmt(s.meanP);
    document.getElementById('st-dose').innerHTML =
      fmt(s.doseS) + ' <small>/</small> ' + fmt(s.doseP);
    document.getElementById('st-tv').innerHTML =
      fmt(s.tvS / 1000, 1) + 'k <small>/</small> ' + fmt(s.tvP / 1000, 1) + 'k';
    document.getElementById('st-match').textContent =
      s.tvS > 0 ? fmt(100 * s.tvP / s.tvS, 1) + '%' : 'n/a';
    document.getElementById('st-flips').textContent = data.transitions;
    document.getElementById('st-expected').textContent = fmt(s.tvExpected / 1000, 1) + 'k';

    var warn = document.getElementById('e-warn');
    if (data.stats.gridLimited) {
      warn.textContent = 'The update rate limits the TV match at these settings. Increase the square-wave amplitude or reduce the stochastic spread (σ).';
      warn.classList.remove('hidden');
    } else {
      warn.classList.add('hidden');
    }
  }

  function draw() {
    plot.resize(0.44);
    var c = plot.colors();
    var mu = +els.mu.value;
    var maxV = 0;
    for (var i = 0; i < data.stochastic.length; i++) {
      if (data.stochastic[i] > maxV) maxV = data.stochastic[i];
      if (data.periodic[i] > maxV) maxV = data.periodic[i];
    }
    var top = Math.max(maxV * 1.08, mu * 1.3);
    var hours = +els.hours.value;

    plot.frame(0, hours, 0, top).begin().axes({
      xLabel: 'time (hours)',
      yLabel: 'irradiance  (µmol photons m⁻² s⁻¹)',
      fmtX: function (v) { return v + 'h'; },
      fmtY: function (v) { return String(Math.round(v)); }
    });

    var show = els.show.value;
    var toPts = function (arr) {
      var pts = [], step = Math.max(1, Math.round(arr.length / 1400));
      for (var j = 0; j < arr.length; j += step) pts.push([j * DT / 3600, arr[j]]);
      pts.push([(arr.length - 1) * DT / 3600, arr[arr.length - 1]]);
      return pts;
    };

    if (show !== 'periodic') plot.series(toPts(data.stochastic), c.s[0], { mode: 'step', width: 1.6 });
    if (show !== 'stochastic') plot.series(toPts(data.periodic), c.s[1], { mode: 'step', width: 2.2 });
    plot.ref(mu, 'mean ' + Math.round(mu), c.faint);

    if (hoverIdx >= 0) plot.crosshair(hoverIdx * DT / 3600);

    Plot.legend(els.legend, [
      { name: 'Stochastic, redrawn from N(µ, σ²)', color: c.s[0] },
      { name: 'Periodic square wave, TV-matched', color: c.s[1] },
      { name: 'Mean irradiance', color: c.faint }
    ]);
  }

  function buildTable() {
    var rows = 12;
    var stride = Math.max(1, Math.floor(data.steps / rows));
    var html = '<table class="data"><thead><tr><th>time</th><th>stochastic</th><th>periodic</th></tr></thead><tbody>';
    for (var i = 0; i < data.steps; i += stride) {
      var mins = i * DT / 60;
      html += '<tr><td>' + (mins / 60).toFixed(2) + ' h</td><td>' +
        data.stochastic[i].toFixed(0) + '</td><td>' + data.periodic[i].toFixed(0) + '</td></tr>';
    }
    html += '</tbody></table>';
    els.table.innerHTML = html;
  }

  function render() {
    document.getElementById('e-mu-out').textContent = els.mu.value + ' µmol';
    document.getElementById('e-sigma-out').textContent = '± ' + els.sigma.value;
    document.getElementById('e-amp-out').textContent = '± ' + els.amp.value;
    document.getElementById('e-hours-out').textContent = els.hours.value + ' h';
    compute();
    stats();
    draw();
    buildTable();
  }

  /* ---------- hover ---------- */

  canvas.addEventListener('pointermove', function (ev) {
    if (!data) return;
    var r = canvas.getBoundingClientRect();
    var cx = (ev.clientX - r.left) / r.width * plot.W;
    var hours = plot.invx(cx);
    var idx = Math.round(hours * 3600 / DT);
    if (idx < 0 || idx >= data.steps) { hide(); return; }
    hoverIdx = idx;
    draw();
    var c = plot.colors();
    tip.innerHTML = '<b>' + (idx * DT / 60).toFixed(1) + ' min</b>' +
      '<span class="tk">stochastic</span> <span class="tv">' + data.stochastic[idx].toFixed(0) + '</span><br>' +
      '<span class="tk">periodic</span> <span class="tv">' + data.periodic[idx].toFixed(0) + '</span>';
    tip.style.display = 'block';
    var px = plot.px(idx * DT / 3600) / plot.W * r.width;
    tip.style.left = Math.min(Math.max(px + 14, 8), r.width - 168) + 'px';
    tip.style.top = '18px';
  });

  function hide() {
    hoverIdx = -1;
    tip.style.display = 'none';
    if (data) draw();
  }
  canvas.addEventListener('pointerleave', hide);

  /* ---------- controls ---------- */

  ['mu', 'sigma', 'amp', 'hours', 'show'].forEach(function (k) {
    els[k].addEventListener('input', render);
    els[k].addEventListener('change', render);
  });

  els.reseed.addEventListener('click', function () {
    seed = (seed * 1103515245 + 12345) % 2147483647;
    render();
  });

  els.png.addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = 'light-environments.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  window.addEventListener('themechange', function () { draw(); });
  new ResizeObserver(function () { if (data) draw(); }).observe(canvas);

  render();
})();
