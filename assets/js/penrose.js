/* ============================================================
   penrose.js — interactive P3 Penrose tiling explorer.

   Method: start from a "sun" of 10 golden (Robinson) triangles
   around the origin and repeatedly subdivide. Each triangle is
   half of a thin or thick rhombus; we skip stroking the rhombus
   diagonal so the drawn edges are true rhombus edges.

   Subdivision (with φ = (1+√5)/2):
     thin  (A,B,C)  →  thin(C,P,B) + thick(P,C,A),  P = A + (B−A)/φ
     thick (A,B,C)  →  thick(R,C,A) + thick(Q,R,B) + thin(R,Q,A),
                       Q = B + (A−B)/φ,  R = B + (C−B)/φ
   ============================================================ */
(function () {
  'use strict';

  var PHI = (1 + Math.sqrt(5)) / 2;

  var canvas = document.getElementById('penrose-canvas');
  var ctx = canvas.getContext('2d');

  /* ---------- palettes ---------- */

  var PALETTES = [
    { name: 'Cobalt',      thin: '#B9C8F2', thick: '#2E5BC7', edge: '#17203F', bg: '#F7F8FC' },
    { name: 'Ivory & ink', thin: '#F4EEE1', thick: '#E0D6BE', edge: '#2A2C31', bg: '#FBFAF6' },
    { name: 'Desert dusk', thin: '#F4CD86', thick: '#CE7B33', edge: '#47250F', bg: '#FBF2E2' },
    { name: 'Deep sea',    thin: '#7FC4B2', thick: '#19695F', edge: '#06302C', bg: '#ECF5F1' },
    { name: 'Noir',        thin: '#262A33', thick: '#14161C', edge: '#7E9BE8', bg: '#0C0E12' }
  ];

  /* hex → [h,s,l] and back, for the hue-shift slider */
  function hexToHsl(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return [h, s, l];
  }
  function hslCss(h, s, l) {
    return 'hsl(' + (((h % 360) + 360) % 360).toFixed(1) + ',' + (s * 100).toFixed(1) + '%,' + (l * 100).toFixed(1) + '%)';
  }
  function shifted(hex, dh) {
    var hsl = hexToHsl(hex);
    return hslCss(hsl[0] + dh, hsl[1], hsl[2]);
  }

  /* ---------- geometry ---------- */

  function baseTriangles() {
    /* 10 thin golden triangles arranged in a decagonal "sun". Alternate
       triangles are mirrored so neighbors share edges correctly. */
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var a1 = (2 * i - 1) * Math.PI / 10;
      var a2 = (2 * i + 1) * Math.PI / 10;
      var B = [Math.cos(a1), Math.sin(a1)];
      var C = [Math.cos(a2), Math.sin(a2)];
      if (i % 2 === 0) { var t = B; B = C; C = t; }
      tris.push([0, [0, 0], B, C]);
    }
    return tris;
  }

  function subdivide(tris) {
    var out = [];
    for (var i = 0; i < tris.length; i++) {
      var c = tris[i][0], A = tris[i][1], B = tris[i][2], C = tris[i][3];
      if (c === 0) {
        var P = [A[0] + (B[0] - A[0]) / PHI, A[1] + (B[1] - A[1]) / PHI];
        out.push([0, C, P, B], [1, P, C, A]);
      } else {
        var Q = [B[0] + (A[0] - B[0]) / PHI, B[1] + (A[1] - B[1]) / PHI];
        var R = [B[0] + (C[0] - B[0]) / PHI, B[1] + (C[1] - B[1]) / PHI];
        out.push([1, R, C, A], [1, Q, R, B], [0, R, Q, A]);
      }
    }
    return out;
  }

  /* cache triangle lists per depth so sliders other than "depth" are instant */
  var cache = [baseTriangles()];
  function trianglesAt(depth) {
    while (cache.length <= depth) cache.push(subdivide(cache[cache.length - 1]));
    return cache[depth];
  }

  /* ---------- controls ---------- */

  var els = {
    depth: document.getElementById('p-depth'),
    zoom: document.getElementById('p-zoom'),
    rot: document.getElementById('p-rot'),
    lw: document.getElementById('p-lw'),
    palette: document.getElementById('p-palette'),
    hue: document.getElementById('p-hue'),
    fill: document.getElementById('p-fill'),
    edges: document.getElementById('p-edges'),
    tiles: document.getElementById('p-tiles'),
    download: document.getElementById('p-download'),
    reset: document.getElementById('p-reset')
  };

  var DEFAULTS = { depth: 6, zoom: 1.85, rot: 0, lw: 1.2, palette: 0, hue: 0, fill: true, edges: true };

  PALETTES.forEach(function (p, i) {
    var o = document.createElement('option');
    o.value = i; o.textContent = p.name;
    els.palette.appendChild(o);
  });

  function setControls(v) {
    els.depth.value = v.depth; els.zoom.value = v.zoom; els.rot.value = v.rot;
    els.lw.value = v.lw; els.palette.value = v.palette; els.hue.value = v.hue;
    els.fill.checked = v.fill; els.edges.checked = v.edges;
  }
  setControls(DEFAULTS);

  function syncOutputs() {
    document.getElementById('p-depth-out').textContent = els.depth.value;
    document.getElementById('p-zoom-out').textContent = (+els.zoom.value).toFixed(2) + '×';
    document.getElementById('p-rot-out').textContent = els.rot.value + '°';
    document.getElementById('p-lw-out').textContent = (+els.lw.value).toFixed(2) + 'px';
    document.getElementById('p-hue-out').textContent = (els.hue.value > 0 ? '+' : '') + els.hue.value + '°';
  }

  /* ---------- rendering ---------- */

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || 800;
    var h = Math.round(w * 0.75);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function render() {
    syncOutputs();
    var depth = +els.depth.value;
    var tris = trianglesAt(depth);
    els.tiles.textContent = tris.length.toLocaleString() + ' triangles';

    var pal = PALETTES[+els.palette.value];
    var dh = +els.hue.value;
    var colThin = shifted(pal.thin, dh);
    var colThick = shifted(pal.thick, dh);
    var colEdge = shifted(pal.edge, dh);
    var colBg = shifted(pal.bg, dh);

    var W = canvas.width, H = canvas.height;
    var scale = Math.min(W, H) / 2 * (+els.zoom.value);
    var rot = (+els.rot.value) * Math.PI / 180;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colBg;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    var i, t;
    if (els.fill.checked) {
      for (var pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass === 0 ? colThin : colThick;
        ctx.beginPath();
        for (i = 0; i < tris.length; i++) {
          t = tris[i];
          if (t[0] !== pass) continue;
          ctx.moveTo(t[1][0], t[1][1]);
          ctx.lineTo(t[2][0], t[2][1]);
          ctx.lineTo(t[3][0], t[3][1]);
          ctx.closePath();
        }
        ctx.fill();
      }
    }

    var lw = +els.lw.value;
    if (els.edges.checked && lw > 0) {
      ctx.strokeStyle = colEdge;
      ctx.lineWidth = lw / scale;       /* keep on-screen width constant */
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (i = 0; i < tris.length; i++) {
        t = tris[i];
        /* stroke C→A→B only: the B–C edge is the rhombus diagonal */
        ctx.moveTo(t[3][0], t[3][1]);
        ctx.lineTo(t[1][0], t[1][1]);
        ctx.lineTo(t[2][0], t[2][1]);
      }
      ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* re-render at most once per animation frame */
  var queued = false;
  function requestRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; render(); });
  }

  ['input', 'change'].forEach(function (evt) {
    ['depth', 'zoom', 'rot', 'lw', 'palette', 'hue', 'fill', 'edges'].forEach(function (k) {
      els[k].addEventListener(evt, requestRender);
    });
  });

  els.reset.addEventListener('click', function () {
    setControls(DEFAULTS);
    requestRender();
  });

  els.download.addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = 'penrose-depth' + els.depth.value + '.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  var ro = new ResizeObserver(function () { sizeCanvas(); requestRender(); });
  ro.observe(canvas);

  sizeCanvas();
  render();
})();
