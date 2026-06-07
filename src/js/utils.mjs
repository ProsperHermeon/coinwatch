// utils.mjs
// Small helpers shared across CoinWatch modules: DOM lookup, localStorage,
// number formatting, and the header/footer partial loader.

/** Shorter querySelector — `qs('.foo')` or `qs('.foo', parentEl)`. */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

/** Read a JSON value from localStorage by key. Returns `fallback` if missing/invalid. */
export function getLocalStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`getLocalStorage("${key}") failed:`, err);
    return fallback;
  }
}

/** Write a value to localStorage as JSON. */
export function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`setLocalStorage("${key}") failed:`, err);
  }
}

/**
 * Format a USD price with reasonable precision:
 *  - >= $1     : 2 decimals
 *  - >= $0.01  : 4 decimals
 *  - smaller   : 6 decimals (for micro-cap coins)
 */
export function formatPrice(value) {
  if (value == null || Number.isNaN(value)) return '—';
  let digits = 2;
  if (value < 1) digits = 4;
  if (value < 0.01) digits = 6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format a percent change as a signed string, e.g. "+1.23%" / "-4.56%". */
export function formatPercent(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Compact dollar formatter for market cap / volume.
 * e.g. 1_234_000_000 → "$1.23B".
 */
export function formatCompact(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Fetch an HTML partial and inject it into the given element.
 * Falls back to a warning in the console (rather than throwing) so that
 * a missing partial doesn't take down the whole page.
 */
async function injectPartial(targetSelector, url) {
  const target = qs(targetSelector);
  if (!target) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.warn(`injectPartial(${url}) failed:`, err);
  }
}

/**
 * Load the shared header and footer partials into #main-header / #main-footer.
 * Returns a promise that resolves once both have been injected.
 */
export async function loadHeaderFooter() {
  // Vite serves files from src/ as the root, so partials live at /partials/*.
  await Promise.all([
    injectPartial('#main-header', './partials/header.html'),
    injectPartial('#main-footer', './partials/footer.html'),
  ]);

  // Stamp the year in the footer once it's in the DOM.
  const yearEl = qs('#footer-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}
