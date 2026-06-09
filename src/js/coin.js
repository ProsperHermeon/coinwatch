// coin.js
// Entry point for the coin detail page (coin.html). Reads the coin id from
// the URL, fetches detail + chart data from CoinGecko, and renders.

import Watchlist from './Watchlist.mjs';
import { getCoinDetail, getMarketChart } from './ExternalServices.mjs';
import { getCurrency, loadHeaderFooter, qs } from './utils.mjs';
import {
  renderCoinDescription,
  renderCoinHeader,
  renderCoinStats,
} from './CoinDetail.mjs';
import { renderPriceChart } from './PriceChart.mjs';

const watchlist = new Watchlist();

const state = {
  coinId: null,
  days: 30, // 7 | 30 | 90
  currency: getCurrency(),
};

// ---- Status helpers (mirror the dashboard's loading/error UI) -----------

function showLoading(msg = 'Loading coin data…') {
  const s = qs('#status');
  if (!s) return;
  s.innerHTML = `
    <span class="loading">
      <span class="spinner" aria-hidden="true"></span>
      ${escapeHtml(msg)}
    </span>`;
}

function showError(message) {
  const s = qs('#status');
  if (!s) return;
  s.innerHTML = `
    <div class="error-box" role="alert">
      <span>${escapeHtml(message)}</span>
      <button type="button" class="retry" id="retry-btn">Retry</button>
    </div>`;
  qs('#retry-btn')?.addEventListener('click', () => loadDetail());
}

function clearStatus() {
  const s = qs('#status');
  if (s) s.innerHTML = '';
}

function showChartStatus(text) {
  const el = qs('#chart-status');
  if (el) el.textContent = text || '';
}

// ---- Data loading --------------------------------------------------------

async function loadDetail() {
  if (!state.coinId) {
    showError('No coin id provided. Go back and click a coin from the dashboard.');
    return;
  }

  const forceFail = new URLSearchParams(window.location.search).get('fail') === '1';

  showLoading('Loading coin data…');

  try {
    if (forceFail) {
      throw new Error('Forced failure (debug flag) — showing the error state.');
    }
    const coin = await getCoinDetail(state.coinId, { vsCurrency: state.currency });
    console.log('[CoinWatch] sample coin detail:', coin?.id, Object.keys(coin?.market_data || {}).slice(0, 8));
    document.title = `${coin.name} (${coin.symbol?.toUpperCase()}) — CoinWatch`;

    renderCoinHeader(qs('#coin-header'), coin, state.currency);
    renderCoinStats(qs('#coin-stats'), coin, state.currency);
    renderCoinDescription(qs('#coin-description'), coin);
    clearStatus();

    await loadChart();
  } catch (err) {
    console.error('[CoinWatch] failed to load coin detail:', err);
    showError(err.message || 'Could not load coin data.');
  }
}

async function loadChart() {
  const canvas = qs('#price-chart');
  if (!canvas) return;
  showChartStatus('Loading chart…');
  try {
    const data = await getMarketChart(state.coinId, {
      vsCurrency: state.currency,
      days: state.days,
    });
    const prices = Array.isArray(data?.prices) ? data.prices : [];
    renderPriceChart(canvas, prices, { currency: state.currency });
    showChartStatus(prices.length ? '' : 'No price history available.');
  } catch (err) {
    console.error('[CoinWatch] failed to load chart:', err);
    showChartStatus('Could not load chart.');
  }
}

// ---- Controls wiring -----------------------------------------------------

function wireRangeButtons() {
  const group = qs('.range-group');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-days]');
    if (!btn) return;
    const days = Number(btn.dataset.days);
    if (!days || days === state.days) return;
    state.days = days;
    group.querySelectorAll('button[data-days]').forEach((b) => {
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    loadChart();
  });
}

function refreshWatchlistCount() {
  const el = qs('#watchlist-count');
  if (el) el.textContent = String(watchlist.count());
}

// ---- Boot ---------------------------------------------------------------

async function boot() {
  await loadHeaderFooter();
  refreshWatchlistCount();

  const params = new URLSearchParams(window.location.search);
  state.coinId = (params.get('id') || '').trim().toLowerCase();

  wireRangeButtons();
  await loadDetail();
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

boot();
