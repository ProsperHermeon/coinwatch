// main.js
// Entry point for the CoinWatch dashboard. Loads header/footer partials, then
// fetches markets, wires up the search filter, and keeps the watchlist count
// in the header in sync.

import CoinList from './CoinList.mjs';
import Watchlist from './Watchlist.mjs';
import { getMarkets } from './ExternalServices.mjs';
import { loadHeaderFooter, qs } from './utils.mjs';

const watchlist = new Watchlist();
let coinList; // assigned after the grid is in the DOM
let currentFilter = '';

/** Update the header badge with the current count. */
function refreshWatchlistCount(count = watchlist.count()) {
  const el = qs('#watchlist-count');
  if (el) el.textContent = String(count);
}

/** Render a spinner inside the status region. */
function showLoading() {
  const status = qs('#status');
  if (!status) return;
  status.innerHTML = `
    <span class="loading">
      <span class="spinner" aria-hidden="true"></span>
      Loading market data…
    </span>`;
}

/** Render an error box with a retry button. */
function showError(message) {
  const status = qs('#status');
  if (!status) return;
  status.innerHTML = `
    <div class="error-box" role="alert">
      <span>${message}</span>
      <button type="button" class="retry" id="retry-btn">Retry</button>
    </div>`;
  qs('#retry-btn')?.addEventListener('click', () => loadDashboard());
}

/** Clear the status region. */
function clearStatus() {
  const status = qs('#status');
  if (status) status.innerHTML = '';
}

/**
 * Fetch markets and render. The first call also wires up the search input.
 * Honors a `?fail=1` URL flag to test the error state.
 */
async function loadDashboard() {
  const grid = qs('#coin-grid');
  if (!grid) return;

  // Test hook: append ?fail=1 to the URL to simulate a network error.
  const forceFail = new URLSearchParams(window.location.search).get('fail') === '1';

  showLoading();
  grid.innerHTML = '';

  try {
    const coins = await getMarkets({ perPage: 25, forceFail });

    // Sanity-check the first item once so we know we're reading the right fields.
    if (coins.length > 0) {
      console.log('[CoinWatch] sample coin from CoinGecko:', coins[0]);
    }

    if (!coinList) {
      coinList = new CoinList(grid, watchlist, refreshWatchlistCount);
      wireSearch();
    }
    coinList.setCoins(coins);
    coinList.render(currentFilter);
    clearStatus();
  } catch (err) {
    console.error('[CoinWatch] failed to load markets:', err);
    showError(err.message || 'Something went wrong fetching market data.');
  }
}

/** Hook up the search input — filtering happens client-side. */
function wireSearch() {
  const input = qs('#search-input');
  if (!input) return;
  input.addEventListener('input', (e) => {
    currentFilter = e.target.value || '';
    if (coinList) coinList.render(currentFilter);
  });
}

// ---- Boot ----------------------------------------------------------------

async function boot() {
  await loadHeaderFooter();
  refreshWatchlistCount();
  await loadDashboard();
}

boot();
