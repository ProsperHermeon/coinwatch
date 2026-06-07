// CoinList.mjs
// Renders coin cards into the DOM and handles per-card interactions
// (star button toggle). Filtering is done by main.js, which calls render().

import { formatCompact, formatPercent, formatPrice } from './utils.mjs';

export default class CoinList {
  /**
   * @param {HTMLElement} gridEl    Grid container that holds the cards.
   * @param {Watchlist}   watchlist Shared watchlist instance.
   * @param {Function}    onWatchlistChange Called after a star toggle (so main.js
   *                                        can refresh the header count).
   */
  constructor(gridEl, watchlist, onWatchlistChange) {
    this.gridEl = gridEl;
    this.watchlist = watchlist;
    this.onWatchlistChange = onWatchlistChange || (() => {});
    this.coins = [];

    // Event delegation: a single click handler for every star button.
    this.gridEl.addEventListener('click', (e) => this.#handleClick(e));
  }

  /** Replace the in-memory dataset (called once after the fetch). */
  setCoins(coins) {
    this.coins = Array.isArray(coins) ? coins : [];
  }

  /**
   * Render the coin cards. If a filter string is given, only coins whose
   * name or symbol contains it are shown.
   */
  render(filter = '') {
    const needle = filter.trim().toLowerCase();
    const shown = needle
      ? this.coins.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(needle)) ||
            (c.symbol && c.symbol.toLowerCase().includes(needle)),
        )
      : this.coins;

    if (shown.length === 0) {
      this.gridEl.innerHTML = `
        <p class="muted" style="grid-column: 1 / -1; text-align: center;">
          No coins match “${escapeHtml(filter)}”.
        </p>`;
      return;
    }

    this.gridEl.innerHTML = shown.map((coin) => this.#cardTemplate(coin)).join('');
  }

  // ---- Private helpers ----------------------------------------------------

  #cardTemplate(coin) {
    const change = coin.price_change_percentage_24h;
    const isPositive = typeof change === 'number' ? change >= 0 : true;
    const changeClass = isPositive ? 'positive' : 'negative';
    const watched = this.watchlist.isWatched(coin.id);

    return `
      <article class="coin-card" data-coin-id="${escapeAttr(coin.id)}">
        <div class="coin-card-top">
          <img
            src="${escapeAttr(coin.image)}"
            alt="${escapeAttr(coin.name)} logo"
            width="36"
            height="36"
            loading="lazy"
          />
          <div class="coin-id">
            <p class="coin-name">${escapeHtml(coin.name)}</p>
            <span class="coin-symbol">${escapeHtml(coin.symbol)}</span>
          </div>
          <span class="coin-rank" aria-label="Market cap rank">#${
            coin.market_cap_rank ?? '—'
          }</span>
          <button
            type="button"
            class="star-btn"
            aria-label="${watched ? 'Remove' : 'Add'} ${escapeAttr(coin.name)} ${
              watched ? 'from' : 'to'
            } watchlist"
            aria-pressed="${watched ? 'true' : 'false'}"
            data-action="toggle-watch"
          >
            ${watched ? '★' : '☆'}
          </button>
        </div>

        <div class="coin-price">${formatPrice(coin.current_price)}</div>
        <div class="coin-change ${changeClass}">${formatPercent(change)}</div>

        <dl class="coin-stats">
          <dt class="stat-label">Market cap</dt>
          <dd class="stat-value">${formatCompact(coin.market_cap)}</dd>
          <dt class="stat-label">24h volume</dt>
          <dd class="stat-value">${formatCompact(coin.total_volume)}</dd>
        </dl>
      </article>
    `;
  }

  #handleClick(e) {
    const btn = e.target.closest('button[data-action="toggle-watch"]');
    if (!btn) return;

    const card = btn.closest('.coin-card');
    const coinId = card?.dataset.coinId;
    if (!coinId) return;

    const nowWatched = this.watchlist.toggle(coinId);

    // Update just this button rather than re-rendering the whole grid.
    btn.setAttribute('aria-pressed', nowWatched ? 'true' : 'false');
    btn.textContent = nowWatched ? '★' : '☆';

    // Update the aria-label as well so it stays accurate.
    const coin = this.coins.find((c) => c.id === coinId);
    if (coin) {
      btn.setAttribute(
        'aria-label',
        `${nowWatched ? 'Remove' : 'Add'} ${coin.name} ${
          nowWatched ? 'from' : 'to'
        } watchlist`,
      );
    }

    this.onWatchlistChange(this.watchlist.count());
  }
}

// ---- Tiny escape helpers (defensive — we control the source, but safety first) ----
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

