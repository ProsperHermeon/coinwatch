// ExternalServices.mjs
// Thin wrapper around the CoinGecko REST API.
// Centralizing fetch calls here keeps networking concerns out of the UI code
// and makes error handling consistent.

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

/**
 * Build request headers. If a Demo API key is provided via VITE_COINGECKO_KEY,
 * send it as `x-cg-demo-api-key`; otherwise just hit the public endpoint.
 */
function buildHeaders() {
  const headers = { Accept: 'application/json' };
  const key = import.meta.env.VITE_COINGECKO_KEY;
  if (key && key.trim().length > 0) {
    headers['x-cg-demo-api-key'] = key.trim();
  }
  return headers;
}

/**
 * Shared fetch helper: throws a clear Error on non-ok responses so callers can
 * surface a friendly message in the UI.
 */
async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { headers: buildHeaders() });
  } catch (networkErr) {
    // Network-level failure (offline, DNS, CORS, etc.)
    throw new Error(`Network error contacting CoinGecko: ${networkErr.message}`);
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('CoinGecko rate limit reached. Please wait a moment and try again.');
    }
    throw new Error(`CoinGecko request failed (${res.status} ${res.statusText}).`);
  }

  try {
    return await res.json();
  } catch (parseErr) {
    throw new Error(`Could not parse CoinGecko response: ${parseErr.message}`);
  }
}

/**
 * Fetch top-N markets sorted by market cap (USD).
 * Returns an array of coin objects (see CoinList.mjs for the fields used).
 *
 * @param {object} [opts]
 * @param {number} [opts.perPage=25]  Number of coins to request.
 * @param {number} [opts.page=1]
 * @param {string} [opts.vsCurrency='usd']
 * @param {boolean} [opts.forceFail=false]  Test hook: force an error path.
 */
export async function getMarkets({
  perPage = 25,
  page = 1,
  vsCurrency = 'usd',
  forceFail = false,
} = {}) {
  if (forceFail) {
    throw new Error('Forced failure (debug flag) — showing the error state.');
  }

  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: String(page),
    price_change_percentage: '24h',
    sparkline: 'false',
  });

  const url = `${COINGECKO_BASE}/coins/markets?${params.toString()}`;
  return getJson(url);
}

/**
 * Fetch a single coin's full detail object (with market_data, description, etc).
 *
 * @param {string} id  CoinGecko coin id, e.g. "bitcoin".
 * @param {object} [opts]
 * @param {string} [opts.vsCurrency='usd']  Currency hint (the endpoint always
 *   returns every currency in a dict; we keep the param for API symmetry).
 */
export async function getCoinDetail(id, { vsCurrency: _vsCurrency = 'usd' } = {}) {
  if (!id) throw new Error('Missing coin id.');
  const params = new URLSearchParams({
    localization: 'false',
    tickers: 'false',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
  });
  const url = `${COINGECKO_BASE}/coins/${encodeURIComponent(id)}?${params.toString()}`;
  return getJson(url);
}

/**
 * Fetch market-chart price history for a coin.
 * Returns the raw response: { prices, market_caps, total_volumes } where each
 * is an array of [timestampMs, value] pairs.
 *
 * @param {string} id
 * @param {object} [opts]
 * @param {string} [opts.vsCurrency='usd']
 * @param {number} [opts.days=30]  1, 7, 14, 30, 90, 180, 365 or 'max'.
 */
export async function getMarketChart(id, { vsCurrency = 'usd', days = 30 } = {}) {
  if (!id) throw new Error('Missing coin id.');
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: String(days),
  });
  const url = `${COINGECKO_BASE}/coins/${encodeURIComponent(
    id,
  )}/market_chart?${params.toString()}`;
  return getJson(url);
}
