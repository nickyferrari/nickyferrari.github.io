/* Linked multigrid and rhombus views. Geometry is in penrose-model.js. */
(function () {
  'use strict';
  var Model = PenroseModel;
  var ids = ['directions', 'shift', 'radius', 'color', 'new', 'reset', 'view', 'views',
    'highlight', 'family', 'line', 'inspect', 'palette', 'zoom', 'rot', 'edges', 'download', 'svg', 'error'];
  var els = {};
  ids.forEach(function (id) { els[id] = document.getElementById('p-' + id); });
  var tileCanvas = document.getElementById('penrose-canvas');
  var gridCanvas = document.getElementById('pentagrid-canvas');
  var seed = 1, model = null, dirty = true, queued = false;
  var palettes = [{ hue: 142, saturation: 25 }, { hue: 222, saturation: 48 }, { hue: 23, saturation: 48 }];

  function output(id, text) { document.getElementById('p-' + id).textContent = text; }
  function theme() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  function selected(tile) { return els.highlight.checked && Model.inRibbon(tile, +els.family.value, +els.line.value); }

  function color(tile) {
    var p = palettes[+els.palette.value], hue = p.hue, saturation = p.saturation;
    var t = model.counts.length > 1 ? tile.type / (model.counts.length - 1) : 0;
    if (els.color.value === 'orientation') {
      hue = ((tile.families[0] * model.directions + tile.families[1]) * 137.508) % 360;
      saturation = 48; t = 0.45;
    } else if (els.color.value === 'plain') { t = 0.4; }
    return 'hsl(' + hue.toFixed(1) + ',' + saturation + '%,' + (theme() ? 28 + t * 25 : 85 - t * 32).toFixed(1) + '%)';
  }
  function colors() {
    return theme()
      ? { bg: '#151d18', edge: '#bfccbb', ribbon: '#e7b865', ribbonFill: '#a17838', grid: '#9eafa2' }
      : { bg: '#f3f4ed', edge: '#304137', ribbon: '#80501e', ribbonFill: '#dcb777', grid: '#748077' };
  }
  function frame(width, height, tiling) {
    var angle = +els.rot.value * Math.PI / 180;
    return { width: width, height: height, scale: Math.min(width, height) * 0.46 / (model.radius + 0.65) * +els.zoom.value,
      factor: tiling ? 2 / model.directions : 1, cos: Math.cos(angle), sin: Math.sin(angle) };
  }
  function screen(point, f) {
    var x = point[0] * f.factor, y = point[1] * f.factor;
    return [f.width / 2 + f.scale * (x * f.cos - y * f.sin), f.height / 2 - f.scale * (x * f.sin + y * f.cos)];
  }
  function world(point, f) {
    var x = (point[0] - f.width / 2) / f.scale, y = -(point[1] - f.height / 2) / f.scale;
    return [(x * f.cos + y * f.sin) / f.factor, (-x * f.sin + y * f.cos) / f.factor];
  }
  function polygon(ctx, tile, f) {
    var p = screen(tile.points[0], f);
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (var i = 1; i < 4; i++) { p = screen(tile.points[i], f); ctx.lineTo(p[0], p[1]); }
    ctx.closePath();
  }
  function fit(canvas) {
    if (!canvas.clientWidth) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(w / 1.2);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return true;
  }
  function drawTiles(canvas) {
    var ctx = canvas.getContext('2d'), c = colors(), f = frame(canvas.width, canvas.height, true);
    var lineWidth = canvas.width / 1200;
    ctx.globalAlpha = 1; ctx.fillStyle = c.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    // Paint ribbon last so its outline stays legible at small tile sizes.
    for (var pass = 0; pass < 2; pass++) {
      model.tiles.forEach(function (tile) {
        var active = selected(tile);
        if (active !== (pass === 1)) return;
        ctx.globalAlpha = els.highlight.checked && !active ? 0.27 : 1;
        ctx.fillStyle = active ? c.ribbonFill : color(tile);
        polygon(ctx, tile, f); ctx.fill();
        if (els.edges.checked || active) {
          ctx.strokeStyle = active ? c.ribbon : c.edge;
          ctx.lineWidth = lineWidth * (active ? 1.9 : 0.85); ctx.stroke();
        }
      });
    }
    ctx.globalAlpha = 1;
  }
  function drawGrid() {
    var ctx = gridCanvas.getContext('2d'), c = colors(), f = frame(gridCanvas.width, gridCanvas.height, false);
    var dpr = gridCanvas.width / gridCanvas.clientWidth;
    ctx.globalAlpha = 1; ctx.fillStyle = c.bg; ctx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);
    model.lines.forEach(function (line) {
      var active = els.highlight.checked && line.family === +els.family.value && line.index === +els.line.value;
      var a = screen(line.a, f), b = screen(line.b, f);
      ctx.globalAlpha = active ? 1 : (els.highlight.checked ? 0.24 : 0.58);
      ctx.strokeStyle = active ? c.ribbon : 'hsl(' + (line.family * 360 / model.directions).toFixed(1) + ',30%,' + (theme() ? 65 : 37) + '%)';
      ctx.lineWidth = dpr * (active ? 2.4 : 0.8);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.fillStyle = c.ribbon;
    model.tiles.forEach(function (tile) {
      if (!selected(tile)) return;
      var p = screen(tile.gridPoint, f);
      ctx.beginPath(); ctx.arc(p[0], p[1], 2.7 * dpr, 0, Math.PI * 2); ctx.fill();
    });
  }

  function ribbonBounds() {
    var f = +els.family.value;
    els.line.min = Math.ceil(-model.radius + model.offsets[f]);
    els.line.max = Math.floor(model.radius + model.offsets[f]);
    els.line.value = Math.max(+els.line.min, Math.min(+els.line.max, +els.line.value));
    output('line-out', els.line.value);
  }
  function rebuild() {
    model = Model.generate({ directions: +els.directions.value, radius: +els.radius.value, shift: +els.shift.value, seed: seed });
    if (els.family.options.length !== model.directions) {
      var previous = +els.family.value || 0;
      els.family.replaceChildren();
      for (var i = 0; i < model.directions; i++) {
        var option = document.createElement('option');
        option.value = i; option.textContent = i + 1; els.family.appendChild(option);
      }
      els.family.value = Math.min(previous, model.directions - 1);
    }
    ribbonBounds(); dirty = false;
  }
  function sync() {
    var n = model.directions;
    output('directions-out', n + (n === 5 ? ' · Penrose' : ' · multigrid'));
    output('shift-out', (+els.shift.value).toFixed(2));
    output('radius-out', els.radius.value);
    output('zoom-out', (+els.zoom.value).toFixed(2) + '×');
    output('rot-out', els.rot.value + '°');
    output('line-out', els.line.value);
    output('tiles', model.tiles.length.toLocaleString() + ' tiles · ' + model.counts.length + ' shapes');
    output('lines', model.lines.length + ' lines');
    output('tiling-title', n === 5 ? 'The Penrose tiling' : n + '-direction tiling');
    output('grid-title', n === 5 ? 'The pentagrid' : n + ' line families');
    var ribbonCount = model.tiles.filter(selected).length;
    output('inspect', els.highlight.checked ? 'Direction ' + (+els.family.value + 1) + ' · line ' + els.line.value + ' · ' + ribbonCount + ' tiles' : 'All tiles shown');
    els.family.disabled = !els.highlight.checked; els.line.disabled = !els.highlight.checked;
    output('ratio', n === 5
      ? 'This patch: ' + model.counts[1] + ' thick / ' + model.counts[0] + ' thin = ' + (model.counts[1] / model.counts[0]).toFixed(3) + '. Golden ratio: 1.618…'
      : 'This ' + n + '-direction patch has ' + model.counts.length + ' rhombus shapes. The golden-ratio comparison applies to the five-direction case.');
    els.views.dataset.view = els.view.value;
  }
  function render() {
    try {
      if (dirty) rebuild();
      sync();
      if (fit(tileCanvas)) drawTiles(tileCanvas);
      if (fit(gridCanvas)) drawGrid();
      els.error.hidden = true;
    } catch (error) {
      els.error.textContent = 'This pattern could not be drawn. Choose a new arrangement or reset the controls.';
      els.error.hidden = false;
      console.error(error);
    }
  }
  function requestRender(rebuildGeometry) {
    dirty = dirty || rebuildGeometry === true;
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; render(); });
  }
  ['directions', 'radius', 'shift'].forEach(function (id) {
    els[id].addEventListener('input', function () { requestRender(true); });
  });
  ['color', 'palette', 'zoom', 'rot', 'edges', 'highlight', 'line', 'view'].forEach(function (id) {
    els[id].addEventListener('input', function () { requestRender(false); });
  });
  els.family.addEventListener('change', function () { ribbonBounds(); requestRender(false); });
  els.new.addEventListener('click', function () { seed++; requestRender(true); });
  els.reset.addEventListener('click', function () {
    seed = 1;
    var defaults = { directions: 5, shift: 0, radius: 4, color: 'shape', view: 'both', palette: 0, zoom: 1, rot: 0, family: 0, line: 0 };
    Object.keys(defaults).forEach(function (key) { els[key].value = defaults[key]; });
    els.edges.checked = true; els.highlight.checked = true;
    requestRender(true);
  });

  function selectRibbon(family, index) {
    if (+els.family.value === family && +els.line.value === index && els.highlight.checked) return;
    els.family.value = family; ribbonBounds(); els.line.value = index; els.highlight.checked = true;
    requestRender(false);
  }
  function inspect(event, tiling) {
    if (!model || (event.type === 'pointermove' && event.pointerType === 'touch')) return;
    var canvas = tiling ? tileCanvas : gridCanvas, rect = canvas.getBoundingClientRect();
    var p = world([(event.clientX - rect.left) * canvas.width / rect.width,
      (event.clientY - rect.top) * canvas.height / rect.height], frame(canvas.width, canvas.height, tiling));
    if (tiling) {
      var tile = model.tiles.find(function (t) { return Model.contains(t, p); });
      if (!tile) return;
      var slot = tile.families.indexOf(+els.family.value);
      if (slot === -1) slot = 0;
      selectRibbon(tile.families[slot], tile.indices[slot]);
    } else {
      if (Math.hypot(p[0], p[1]) > model.radius) return;
      var best = null, distance = Infinity;
      model.lines.forEach(function (line) {
        var v = model.vectors[line.family];
        var d = Math.abs(p[0] * v[0] + p[1] * v[1] + model.offsets[line.family] - line.index);
        if (d < distance) { best = line; distance = d; }
      });
      if (best) selectRibbon(best.family, best.index);
    }
  }
  [tileCanvas, gridCanvas].forEach(function (canvas, i) {
    var pointerQueued = false, lastEvent;
    canvas.addEventListener('pointermove', function (event) {
      if (event.pointerType === 'touch' || !els.highlight.checked) return;
      lastEvent = event;
      if (pointerQueued) return;
      pointerQueued = true;
      requestAnimationFrame(function () { pointerQueued = false; inspect(lastEvent, i === 0); });
    });
    canvas.addEventListener('pointerdown', function (event) { inspect(event, i === 0); });
    canvas.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { els.highlight.checked = false; requestRender(false); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      var delta = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1;
      if (event.shiftKey) {
        els.family.value = (+els.family.value + delta + model.directions) % model.directions;
        ribbonBounds();
      } else {
        els.line.value = Math.max(+els.line.min, Math.min(+els.line.max, +els.line.value + delta));
      }
      els.highlight.checked = true; requestRender(false);
    });
  });

  function download(blob, extension) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'tiling-' + model.directions + '-directions.' + extension; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  els.download.addEventListener('click', function () {
    if (dirty) render();
    var canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 2000;
    drawTiles(canvas);
    canvas.toBlob(function (blob) { if (blob) download(blob, 'png'); }, 'image/png');
  });
  els.svg.addEventListener('click', function () {
    if (dirty) render();
    var width = 1200, height = 1000, f = frame(width, height, true), c = colors();
    var parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1000" width="1200" height="1000">',
      '<title>' + model.directions + '-direction multigrid tiling</title>',
      '<rect width="1200" height="1000" fill="' + c.bg + '"/>'];
    for (var pass = 0; pass < 2; pass++) model.tiles.forEach(function (tile) {
      var active = selected(tile);
      if (active !== (pass === 1)) return;
      var points = tile.points.map(function (p) { return screen(p, f).map(function (v) { return v.toFixed(3); }).join(','); }).join(' ');
      parts.push('<polygon points="' + points + '" fill="' + (active ? c.ribbonFill : color(tile)) +
        '" opacity="' + (els.highlight.checked && !active ? 0.27 : 1) + '" stroke="' +
        ((els.edges.checked || active) ? (active ? c.ribbon : c.edge) : 'none') +
        '" stroke-width="' + (active ? 1.9 : 0.85) + '" stroke-linejoin="round"/>');
    });
    parts.push('</svg>'); download(new Blob([parts.join('\n')], { type: 'image/svg+xml' }), 'svg');
  });
  window.addEventListener('themechange', function () { requestRender(false); });
  var observer = new ResizeObserver(function () { requestRender(false); });
  observer.observe(tileCanvas); observer.observe(gridCanvas);
  render();
})();
