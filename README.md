# CoinWatch

A vanilla-JavaScript cryptocurrency market tracker built for WDD 330. CoinWatch
fetches live data from the CoinGecko API and renders a responsive dashboard of
the top coins by market cap, with a client-side search filter and a persistent
watchlist stored in `localStorage`.

This first build covers:

- Header + footer partials loaded into a static HTML shell
- Market dashboard (top ~25 coins) rendered as a responsive grid of cards
- 24-hour price change colored green / red
- Watchlist: star a coin to save it to `localStorage`; header badge updates live
- Client-side search filter (by name or symbol)
- Loading and error states (with a retry button)
- Dark theme with CSS variables, hover lift transition, and a fade-in animation

A CryptoCompare news feed (the second third-party API) is planned for a later week.

## Tech

- Plain HTML, CSS, vanilla JavaScript (ES Modules) — no JS frameworks, no chart libraries
- [Vite](https://vitejs.dev/) for the dev server and build
- ESLint + Prettier for code quality

## Running locally

```bash
npm install
npm run start
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Optional API key

CoinGecko's public endpoints work without a key but are rate-limited. To use a
[Demo API key](https://www.coingecko.com/en/api/pricing), copy `.env.example` to
`.env` and set:

```
VITE_COINGECKO_KEY=your-key-here
```

CoinWatch sends it as the `x-cg-demo-api-key` header automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start` / `npm run dev` | Run the Vite dev server |
| `npm run build` | Build the production bundle into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint `src/` with ESLint |
| `npm run format` | Format `src/` with Prettier |

## Project structure

```
src/
  index.html              static dashboard shell
  css/style.css           theme, layout, animation
  js/
    main.js               entry: loads partials, boots dashboard + search + watchlist
    ExternalServices.mjs  CoinGecko fetch wrapper with error handling
    CoinList.mjs          renders coin cards into the DOM
    Watchlist.mjs         localStorage-backed watchlist
    utils.mjs             qs, getLocalStorage, setLocalStorage, formatters, loadHeaderFooter
  partials/
    header.html
    footer.html
  public/                 static assets (favicon, etc.)
```

## Data source

This build uses CoinGecko's `/coins/markets` endpoint with `vs_currency=usd`,
`order=market_cap_desc`, `per_page=25`, and `price_change_percentage=24h`.
