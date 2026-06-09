// CoinDetail.mjs
// Render the coin header + market stats + description on the detail page.
// All money values are formatted in the user's chosen currency.

import { formatCompact, formatPercent, formatPrice } from './utils.mjs';

/**
 * Render the coin header into the given container. The header shows
 * logo, name, symbol, market-cap rank, current price, and 24h change.
 *
 * @param {HTMLElement} container
 * @param {object} coin     Raw response from /coins/{id}
 * @param {string} currency Lowercase ISO code (usd/eur/gbp).
 */
export function renderCoinHeader(container, coin, currency) {
  if (!container || !coin) return;

  const md = coin.market_data || {};
  const price = pickPrice(md.current_price, currency);
  const change = md.price_change_percentage_24h;
  const changeClass = typeof change === 'number' && change < 0 ? 'negative' : 'positive';

  container.innerHTML = `
    <div class="coin-header-row">
      <img
        class="coin-header-logo"
        src="${escapeAttr(coin.image?.large || coin.image?.small || coin.image?.thumb || '')}"
        alt="${escapeAttr(coin.name)} logo"
        width="56"
        height="56"
      />
      <div class="coin-header-id">
        <h1 class="coin-header-name">${escapeHtml(coin.name)}</h1>
        <p class="coin-header-meta">
          <span class="coin-symbol">${escapeHtml(coin.symbol)}</span>
          <span class="coin-rank" aria-label="Market cap rank">
            #${coin.market_cap_rank ?? '—'}
          </span>
        </p>
      </div>
      <div class="coin-header-price">
        <div class="coin-price big">${formatPrice(price, currency)}</div>
        <div class="coin-change ${changeClass}">${formatPercent(change)}</div>
      </div>
    </div>
  `;
}

/**
 * Render the market stats grid (cap, volume, 24h H/L, ATH, ATL, supplies).
 */
export function renderCoinStats(container, coin, currency) {
  if (!container || !coin) return;
  const md = coin.market_data || {};

  const rows = [
    ['Market cap', formatCompact(pickPrice(md.market_cap, currency), currency)],
    ['24h volume', formatCompact(pickPrice(md.total_volume, currency), currency)],
    ['24h high', formatPrice(pickPrice(md.high_24h, currency), currency)],
    ['24h low', formatPrice(pickPrice(md.low_24h, currency), currency)],
    ['All-time high', formatPrice(pickPrice(md.ath, currency), currency)],
    ['All-time low', formatPrice(pickPrice(md.atl, currency), currency)],
    ['Circulating supply', formatNumber(md.circulating_supply)],
    ['Total / max supply', `${formatNumber(md.total_supply)} / ${formatNumber(md.max_supply)}`],
  ];

  container.innerHTML = `
    <dl class="stats-grid">
      ${rows
        .map(
          ([label, value]) => `
            <div class="stat-row">
              <dt class="stat-label">${escapeHtml(label)}</dt>
              <dd class="stat-value">${escapeHtml(value)}</dd>
            </div>`,
        )
        .join('')}
    </dl>
  `;
}

/**
 * Render the description text. CoinGecko's `description.en` can contain HTML,
 * so strip tags and trim before rendering as plain text.
 */
export function renderCoinDescription(container, coin) {
  if (!container) return;
  const raw = coin?.description?.en;
  if (!raw) {
    container.innerHTML = '';
    return;
  }
  const text = trimDescription(stripHtml(raw));
  container.innerHTML = `
    <h2 class="section-heading">About ${escapeHtml(coin.name)}</h2>
    <p class="description-text">${escapeHtml(text)}</p>
  `;
}

// ---- Helpers ------------------------------------------------------------

/** Pull the numeric value for a currency out of a per-currency dict. */
function pickPrice(dict, currency) {
  if (dict == null) return null;
  if (typeof dict === 'number') return dict;
  const key = (currency || 'usd').toLowerCase();
  return dict[key] ?? dict.usd ?? null;
}

/** Compact integer formatter for supplies. */
function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

/** Strip HTML tags from a string (server-controlled content from CoinGecko). */
function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Trim the description to a sensible length so the page stays scannable. */
function trimDescription(s, max = 600) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
