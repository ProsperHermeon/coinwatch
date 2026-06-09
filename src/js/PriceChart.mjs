// PriceChart.mjs
// Lightweight Canvas 2D line chart for coin price history. No libraries.
// Handles devicePixelRatio for crispness, redraws on resize, and labels
// the min/max price + start/end dates.

import { formatPrice } from './utils.mjs';

const THEME = {
  bg: '#1a1f2b',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#848e9c',
  accent: '#f0b90b',
  positive: '#16c784',
  negative: '#ea3943',
  text: '#eaecef',
  muted: '#848e9c',
};

/** Map of canvas -> resize handler, so we can detach on subsequent calls. */
const resizeHandlers = new WeakMap();

/**
 * Render a price line chart on the given canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Array<[number, number]>} prices  Array of [timestampMs, price] pairs.
 * @param {object} [opts]
 * @param {string} [opts.currency='usd']
 */
export function renderPriceChart(canvas, prices, { currency = 'usd' } = {}) {
  if (!canvas) return;

  const safePrices = Array.isArray(prices) ? prices.filter(isValidPoint) : [];

  // Detach a previous resize handler if any, then install a fresh one
  // so window resizes redraw at the right pixel density.
  const prevHandler = resizeHandlers.get(canvas);
  if (prevHandler) window.removeEventListener('resize', prevHandler);

  const draw = () => paint(canvas, safePrices, currency);
  resizeHandlers.set(canvas, draw);
  window.addEventListener('resize', draw);

  draw();
}

/** Single-point validity check. */
function isValidPoint(p) {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    typeof p[0] === 'number' &&
    typeof p[1] === 'number' &&
    Number.isFinite(p[1])
  );
}

// ---- Drawing ------------------------------------------------------------

function paint(canvas, prices, currency) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Size the backing store to the displayed size * DPR for crisp lines.
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(rect.width, 1);
  const H = Math.max(rect.height, 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Background
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  if (prices.length < 2) {
    drawEmptyState(ctx, W, H);
    return;
  }

  // Padding for axis labels.
  const padL = 64; // room for y-axis price labels
  const padR = 18;
  const padT = 22;
  const padB = 28;
  const plotW = Math.max(W - padL - padR, 1);
  const plotH = Math.max(H - padT - padB, 1);

  // Scales
  const xs = prices.map((p) => p[0]);
  const ys = prices.map((p) => p[1]);
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const yPad = (yMax - yMin) * 0.08 || yMax * 0.02 || 1;
  const yLo = yMin - yPad;
  const yHi = yMax + yPad;

  const xToPx = (x) => padL + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const yToPx = (y) => padT + (1 - (y - yLo) / (yHi - yLo || 1)) * plotH;

  // Gridlines (5 horizontal)
  ctx.strokeStyle = THEME.grid;
  ctx.lineWidth = 1;
  ctx.font = '11px Roboto Mono, ui-monospace, monospace';
  ctx.fillStyle = THEME.muted;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = yLo + ((yHi - yLo) * i) / 4;
    const py = yToPx(v);
    ctx.beginPath();
    ctx.moveTo(padL, py);
    ctx.lineTo(W - padR, py);
    ctx.stroke();
    ctx.fillText(formatPrice(v, currency), padL - 6, py);
  }

  // Line color reflects net change over the visible range.
  const lineColor =
    prices[prices.length - 1][1] >= prices[0][1] ? THEME.positive : THEME.negative;

  // Filled area under the line
  ctx.beginPath();
  ctx.moveTo(xToPx(prices[0][0]), padT + plotH);
  prices.forEach(([t, v]) => ctx.lineTo(xToPx(t), yToPx(v)));
  ctx.lineTo(xToPx(prices[prices.length - 1][0]), padT + plotH);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, hexToRgba(lineColor, 0.28));
  grad.addColorStop(1, hexToRgba(lineColor, 0));
  ctx.fillStyle = grad;
  ctx.fill();

  // The price line
  ctx.beginPath();
  prices.forEach(([t, v], i) => {
    const px = xToPx(t);
    const py = yToPx(v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  // Min / max markers + labels
  const iMin = ys.indexOf(yMin);
  const iMax = ys.indexOf(yMax);
  drawPoint(ctx, xToPx(xs[iMax]), yToPx(yMax), THEME.positive);
  drawPoint(ctx, xToPx(xs[iMin]), yToPx(yMin), THEME.negative);

  ctx.fillStyle = THEME.text;
  ctx.font = '11px Roboto Mono, ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`High ${formatPrice(yMax, currency)}`, xToPx(xs[iMax]), yToPx(yMax) - 8);
  ctx.textBaseline = 'top';
  ctx.fillText(`Low ${formatPrice(yMin, currency)}`, xToPx(xs[iMin]), yToPx(yMin) + 8);

  // Start / end date labels along the x-axis
  ctx.fillStyle = THEME.muted;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(formatDate(xMin), padL, padT + plotH + 8);
  ctx.textAlign = 'right';
  ctx.fillText(formatDate(xMax), W - padR, padT + plotH + 8);
}

function drawPoint(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEmptyState(ctx, W, H) {
  ctx.fillStyle = THEME.muted;
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('No price history available.', W / 2, H / 2);
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** Convert a 6-char hex (e.g. "#16c784") to rgba with the given alpha. */
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
