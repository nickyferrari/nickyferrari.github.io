/* ============================================================
   plot.js — a very small canvas plotting helper shared by the
   science demos. Handles device-pixel scaling, axes, recessive
   grid, line/step/bar marks, and a crosshair tooltip.

   Deliberately tiny: no dependencies, no chart-junk, one y-axis
   only (never a dual axis).
   ============================================================ */
(function (global) {
  'use strict';

  function cssVar(name, fb) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }

  function Plot(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.pad = Object.assign({ l: 58, r: 16, t: 14, b: 40 }, this.opts.pad || {});
    this.dpr = 1;
  }

  Plot.prototype.colors = function () {
    return {
      ink: cssVar('--ink', '#1C1E22'),
      soft: cssVar('--ink-soft', '#575D66'),
      faint: cssVar('--ink-faint', '#9096A0'),
      grid: cssVar('--grid', '#DFDACD'),
      line: cssVar('--line-strong', '#D3CEC1'),
      bg: cssVar('--bg-sunk', '#F1EEE7'),
      s: [cssVar('--series-1', '#2B59C3'), cssVar('--series-2', '#B5540C'), cssVar('--series-3', '#0B8F84')]
    };
  };

  Plot.prototype.resize = function (aspect) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = this.canvas.clientWidth || 800;
    var h = Math.round(w * (aspect || 0.46));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.W = w;
    this.H = h;
  };

  /* Set the data window. */
  Plot.prototype.frame = function (x0, x1, y0, y1) {
    this.x0 = x0; this.x1 = x1; this.y0 = y0; this.y1 = y1;
    var p = this.pad;
    this.px = function (x) { return p.l + (x - x0) / (x1 - x0) * (this.W - p.l - p.r); };
    this.py = function (y) { return this.H - p.b - (y - y0) / (y1 - y0) * (this.H - p.t - p.b); };
    this.invx = function (cx) { return x0 + (cx - p.l) / (this.W - p.l - p.r) * (x1 - x0); };
    return this;
  };

  Plot.prototype.begin = function () {
    var c = this.colors();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.W, this.H);
    this.ctx.fillStyle = c.bg;
    this.ctx.fillRect(0, 0, this.W, this.H);
    return this;
  };

  function ticks(lo, hi, target) {
    var span = hi - lo;
    if (!(span > 0)) return [lo];
    var raw = span / (target || 5);
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  Plot.ticks = ticks;

  /* Recessive grid + axis labels. fmtX/fmtY are optional formatters. */
  Plot.prototype.axes = function (o) {
    o = o || {};
    var ctx = this.ctx, c = this.colors(), p = this.pad;
    var xs = o.xTicks || ticks(this.x0, this.x1, 6);
    var ys = o.yTicks || ticks(this.y0, this.y1, 5);
    var fx = o.fmtX || function (v) { return String(v); };
    var fy = o.fmtY || function (v) { return String(v); };

    ctx.strokeStyle = c.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < ys.length; i++) {
      var y = Math.round(this.py(ys[i])) + 0.5;
      ctx.moveTo(p.l, y); ctx.lineTo(this.W - p.r, y);
    }
    ctx.stroke();

    ctx.fillStyle = c.faint;
    ctx.font = '11px ui-monospace, Menlo, Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (i = 0; i < ys.length; i++) ctx.fillText(fy(ys[i]), p.l - 9, this.py(ys[i]));

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (i = 0; i < xs.length; i++) {
      if (xs[i] < this.x0 - 1e-9 || xs[i] > this.x1 + 1e-9) continue;
      ctx.fillText(fx(xs[i]), this.px(xs[i]), this.H - p.b + 9);
    }

    /* axis titles */
    ctx.fillStyle = c.soft;
    ctx.font = '11.5px -apple-system, "Segoe UI", Roboto, sans-serif';
    if (o.xLabel) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(o.xLabel, p.l + (this.W - p.l - p.r) / 2, this.H - 2);
    }
    if (o.yLabel) {
      ctx.save();
      ctx.translate(11, p.t + (this.H - p.t - p.b) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(o.yLabel, 0, 0);
      ctx.restore();
    }

    /* baseline */
    ctx.strokeStyle = c.line;
    ctx.beginPath();
    var yb = Math.round(this.py(Math.max(this.y0, Math.min(0, this.y1)))) + 0.5;
    ctx.moveTo(p.l, yb); ctx.lineTo(this.W - p.r, yb);
    ctx.stroke();
    return this;
  };

  /* pts: [[x,y],...]. mode 'line' | 'step'. 2px marks per the spec. */
  Plot.prototype.series = function (pts, color, o) {
    o = o || {};
    var ctx = this.ctx;
    if (!pts.length) return this;
    ctx.strokeStyle = color;
    ctx.lineWidth = o.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var x = this.px(pts[i][0]), y = this.py(pts[i][1]);
      if (i === 0) { ctx.moveTo(x, y); continue; }
      if (o.mode === 'step') ctx.lineTo(x, this.py(pts[i - 1][1]));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (o.fill) {
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = color;
      ctx.lineTo(this.px(pts[pts.length - 1][0]), this.py(Math.max(this.y0, 0)));
      ctx.lineTo(this.px(pts[0][0]), this.py(Math.max(this.y0, 0)));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (o.dots) {
      var r = o.dotR || 4.5;                       /* >= 8px marker diameter */
      for (i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(this.px(pts[i][0]), this.py(pts[i][1]), r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;                          /* 2px surface ring */
        ctx.strokeStyle = this.colors().bg;
        ctx.stroke();
      }
    }
    return this;
  };

  /* Horizontal reference line with an inline label. */
  Plot.prototype.ref = function (y, label, color) {
    var ctx = this.ctx, c = this.colors();
    ctx.strokeStyle = color || c.faint;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(this.pad.l, this.py(y));
    ctx.lineTo(this.W - this.pad.r, this.py(y));
    ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      /* sits just inside the left edge so it never collides with the data */
      ctx.font = '10.5px ui-monospace, Menlo, Consolas, monospace';
      var w = ctx.measureText(label).width;
      ctx.fillStyle = c.bg;
      ctx.fillRect(this.pad.l + 4, this.py(y) - 15, w + 8, 13);
      ctx.fillStyle = c.faint;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, this.pad.l + 8, this.py(y) - 3);
    }
    return this;
  };

  Plot.prototype.crosshair = function (x) {
    var ctx = this.ctx, c = this.colors();
    ctx.strokeStyle = c.faint;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(Math.round(this.px(x)) + 0.5, this.pad.t);
    ctx.lineTo(Math.round(this.px(x)) + 0.5, this.H - this.pad.b);
    ctx.stroke();
    ctx.setLineDash([]);
    return this;
  };

  /* Build a legend into a container element (identity never color-alone:
     every series also gets its name here). */
  Plot.legend = function (el, items) {
    el.innerHTML = '';
    items.forEach(function (it) {
      var span = document.createElement('span');
      span.className = 'legend-item';
      var sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = it.color;
      if (it.dash) sw.style.background = 'repeating-linear-gradient(90deg,' + it.color + ' 0 4px, transparent 4px 7px)';
      span.appendChild(sw);
      span.appendChild(document.createTextNode(it.name));
      el.appendChild(span);
    });
  };

  var api = { Plot: Plot, cssVar: cssVar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Plotting = api;
})(this);
