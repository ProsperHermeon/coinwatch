// CoinList.mjs
// Renders coin cards into the DOM and handles per-card interactions
// (star button toggle). main.js owns the view state and passes a
// finished list to render() — this module does not filter or sort.

import { formatCompact, formatPercent, formatPrice } from './utils.mjs';

export default class CoinList {
  /**
   * @param {HTMLElement} gridEl    Grid container that holds the cards.
   * @param {Watchlist}   watchlist Shared watchlist instance.
   * @param {Function}    onWatchlistChange Called after a star toggle (so main.js
   *                                        can refresh the header count + re-render).
   * @param {string}      [currency='usd'] ISO currency code for money formatting.
   */
  constructor(gridEl, watchlist, onWatchlistChange, currency = 'usd') {
    this.gridEl = gridEl;
    this.watchlist = watchlist;
    this.onWatchlistChange = onWatchlistChange || (() => {});
    this.currency = currency;

    // Event delegation: a single click handler for every star button.
    this.gridEl.addEventListener('click', (e) => this.#handleClick(e));
  }

  /** Update the currency used for money formatting on subsequent renders. */
  setCurrency(code) {
    this.currency = code || 'usd';
  }

  /**
   * Render the given list of coins. The list is rendered as-is —
   * filtering / sorting is the caller's responsibility.
   *
   * @param {Array} coins
   * @param {object} [opts]
   * @param {string} [opts.emptyMessage]  Custom message when the list is empty.
   */
  render(coins, { emptyMessage = 'No coins to display.' } = {}) {
    const list = Array.isArray(coins) ? coins : [];

    if (list.length === 0) {
      this.gridEl.innerHTML = `
        <p class="muted empty-msg">
          ${escapeHtml(emptyMessage)}
        </p>`;
      return;
    }

    this.gridEl.innerHTML = list.map((coin) => this.#cardTemplate(coin)).join('');
  }

  // ---- Private helpers ----------------------------------------------------

  #cardTemplate(coin) {
    const change = coin.price_change_percentage_24h;
    const isPositive = typeof change === 'number' ? change >= 0 : true;
    const changeClass = isPositive ? 'positive' : 'negative';
    const watched = this.watchlist.isWatched(coin.id);
    const currency = this.currency;

    return `
      <article class="coin-card" data-coin-id="${escapeAttr(coin.id)}">
        <div class="coin-card-top">
          <a
            class="coin-link"
            href="./coin.html?id=${encodeURIComponent(coin.id)}"
            aria-label="Open detail page for ${escapeAttr(coin.name)}"
          >
            <img
              src="${escapeAttr(coin.image)}"
              alt="${escapeAttr(coin.name)} logo"
              width="36"
              height="36"
              loading="lazy"
            />
            <span class="coin-id">
              <span class="coin-name">${escapeHtml(coin.name)}</span>
              <span class="coin-symbol">${escapeHtml(coin.symbol)}</span>
            </span>
          </a>
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

        <div class="coin-price">${formatPrice(coin.current_price, currency)}</div>
        <div class="coin-change ${changeClass}">${formatPercent(change)}</div>

        <dl class="coin-stats">
          <dt class="stat-label">Market cap</dt>
          <dd class="stat-value">${formatCompact(coin.market_cap, currency)}</dd>
          <dt class="stat-label">24h volume</dt>
          <dd class="stat-value">${formatCompact(coin.total_volume, currency)}</dd>
        </dl>
      </article>
    `;
  }

  #handleClick(e) {
    const btn = e.target.closest('button[data-action="toggle-watch"]');
    if (!btn) return;

    // Defensive: clicking the star must not navigate or bubble to the card link.
    e.preventDefault();
    e.stopPropagation();

    const card = btn.closest('.coin-card');
    const coinId = card?.dataset.coinId;
    if (!coinId) return;

    const nowWatched = this.watchlist.toggle(coinId);

    // Update just this button rather than re-rendering the whole grid.
    btn.setAttribute('aria-pressed', nowWatched ? 'true' : 'false');
    btn.textContent = nowWatched ? '★' : '☆';

    // Update the aria-label as well so it stays accurate.
    const name = card.querySelector('.coin-name')?.textContent || coinId;
    btn.setAttribute(
      'aria-label',
      `${nowWatched ? 'Remove' : 'Add'} ${name} ${nowWatched ? 'from' : 'to'} watchlist`,
    );

    this.onWatchlistChange(this.watchlist.count(), coinId, nowWatched);
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
