// main.js
// Entry point for the CoinWatch dashboard. Loads header/footer partials,
// owns the view state (search, sort, filter, currency), and passes the
// finished list to CoinList for rendering.

import CoinList from './CoinList.mjs';
import Watchlist from './Watchlist.mjs';
import { getMarkets } from './ExternalServices.mjs';
import { getCurrency, loadHeaderFooter, qs, setCurrency } from './utils.mjs';

const watchlist = new Watchlist();

/** View state — every change funnels through applyView(). */
const state = {
  allCoins: [],
  search: '',
  sort: 'market_cap', // market_cap | price | change_24h | name
  filter: 'all', // all | gainers | losers | watchlist
  currency: getCurrency(),
};

let coinList; // assigned after first successful fetch

// ---- Status region helpers ----------------------------------------------

function refreshWatchlistCount(count = watchlist.count()) {
  const el = qs('#watchlist-count');
  if (el) el.textContent = String(count);
}

function showLoading() {
  const status = qs('#status');
  if (!status) return;
  status.innerHTML = `
    <span class="loading">
      <span class="spinner" aria-hidden="true"></span>
      Loading market data…
    </span>`;
}

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

function clearStatus() {
  const status = qs('#status');
  if (status) status.innerHTML = '';
}

// ---- View pipeline ------------------------------------------------------

/**
 * Apply filter -> search -> sort to state.allCoins and render the result.
 * Called whenever the user changes a control.
 */
function applyView() {
  if (!coinList) return;

  // (a) Category filter
  let list = state.allCoins.slice();
  if (state.filter === 'gainers') {
    list = list.filter((c) => typeof c.price_change_percentage_24h === 'number' && c.price_change_percentage_24h > 0);
  } else if (state.filter === 'losers') {
    list = list.filter((c) => typeof c.price_change_percentage_24h === 'number' && c.price_change_percentage_24h < 0);
  } else if (state.filter === 'watchlist') {
    list = list.filter((c) => watchlist.isWatched(c.id));
  }

  // (b) Search text
  const needle = state.search.trim().toLowerCase();
  if (needle) {
    list = list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(needle)) ||
        (c.symbol && c.symbol.toLowerCase().includes(needle)),
    );
  }

  // (c) Sort
  list.sort(getComparator(state.sort));

  coinList.render(list, { emptyMessage: emptyMessageFor(state) });
}

/** Pick a comparator based on the current sort key. */
function getComparator(key) {
  switch (key) {
    case 'price':
      return (a, b) => (b.current_price ?? 0) - (a.current_price ?? 0);
    case 'change_24h':
      return (a, b) =>
        (b.price_change_percentage_24h ?? -Infinity) -
        (a.price_change_percentage_24h ?? -Infinity);
    case 'name':
      return (a, b) => (a.name || '').localeCompare(b.name || '');
    case 'market_cap':
    default:
      // CoinGecko returns markets already sorted by market cap desc, but
      // explicit rank sort keeps things stable after filtering.
      return (a, b) => (a.market_cap_rank ?? 9e9) - (b.market_cap_rank ?? 9e9);
  }
}

function emptyMessageFor({ filter, search }) {
  if (search.trim()) return `No coins match “${search.trim()}”.`;
  if (filter === 'watchlist') return 'Your watchlist is empty. Tap a star on any coin to add it.';
  if (filter === 'gainers') return 'No gainers right now.';
  if (filter === 'losers') return 'No losers right now.';
  return 'No coins to display.';
}

// ---- Data loading -------------------------------------------------------

/**
 * Fetch markets for the current currency and re-render.
 * Honors `?fail=1` for testing the error state.
 */
async function loadDashboard() {
  const grid = qs('#coin-grid');
  if (!grid) return;

  const forceFail = new URLSearchParams(window.location.search).get('fail') === '1';

  showLoading();
  grid.innerHTML = '';

  try {
    const coins = await getMarkets({
      perPage: 25,
      vsCurrency: state.currency,
      forceFail,
    });

    if (coins.length > 0) {
      console.log('[CoinWatch] sample coin from CoinGecko:', coins[0]);
    }

    if (!coinList) {
      coinList = new CoinList(grid, watchlist, onWatchlistChange, state.currency);
    } else {
      coinList.setCurrency(state.currency);
    }

    state.allCoins = coins;
    applyView();
    clearStatus();
  } catch (err) {
    console.error('[CoinWatch] failed to load markets:', err);
    showError(err.message || 'Something went wrong fetching market data.');
  }
}

/** Called by CoinList after the user toggles a star. */
function onWatchlistChange(count) {
  refreshWatchlistCount(count);
  // Re-apply the view so the Watchlist filter category stays accurate.
  if (state.filter === 'watchlist') applyView();
}

// ---- Controls wiring ----------------------------------------------------

function wireControls() {
  // Search
  qs('#search-input')?.addEventListener('input', (e) => {
    state.search = e.target.value || '';
    applyView();
  });

  // Sort
  qs('#sort-select')?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyView();
  });

  // Currency — persist and refetch with the new vs_currency.
  const currencySelect = qs('#currency-select');
  if (currencySelect) {
    currencySelect.value = state.currency;
    currencySelect.addEventListener('change', (e) => {
      const next = e.target.value;
      if (next === state.currency) return;
      state.currency = next;
      setCurrency(next);
      loadDashboard();
    });
  }

  // Filter buttons — single delegated handler.
  const filterGroup = qs('.filter-group');
  filterGroup?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    const next = btn.dataset.filter;
    state.filter = next;
    // Update aria-pressed on every button in the group.
    filterGroup.querySelectorAll('button[data-filter]').forEach((b) => {
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    applyView();
  });
}

// ---- Boot ---------------------------------------------------------------

async function boot() {
  await loadHeaderFooter();
  refreshWatchlistCount();
  wireControls();
  await loadDashboard();
}

boot();
