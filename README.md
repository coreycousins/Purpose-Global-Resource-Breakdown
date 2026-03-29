# Purpose Global Resources — Daily Attribution Dashboard

A single-page dashboard for tracking the daily price attribution of the **Purpose Global Resources Fund Series F** (PFC5101.CF). It fetches live prices for each underlying holding, calculates each position's contribution to the fund's daily move, and presents the results in a clean, mobile-friendly layout.

Live at: **https://coreycousins.github.io/Purpose-Global-Resource-Breakdown/PurposeInvestmentBreakdown.html**

---

## How to Use It

### Summary Strip

At the top of the page, a summary strip shows:

| Field | Description |
|---|---|
| **Est. Fund Move** | Sum of all weighted contributions from holdings with live prices |
| **Coverage** | Percentage of fund weight currently covered by live or entered prices |
| **Top Contributor** | Holding with the largest positive contribution today |
| **Top Drag** | Holding with the largest negative contribution today |
| **Fund NAV** | Official NAV price from Globe and Mail (PFC5101.CF), as of last trade |
| **Reported Move** | Official reported daily % change for the fund |

### Holdings Table

Each row shows one holding with:
- **Ticker** — exchange-standard symbol (e.g. `TNZ CN`, `VLO US`)
- **Issuer** — company name, with the Yahoo Finance ticker in brackets (e.g. `[TNZ.TO]`)
- **Weight** — portfolio weight as a percentage
- **Day %** — today's price change for the holding
- **Sector** — sector classification for the holding (e.g. `Oil & Gas E&P`, `Silver Mining`, `Lithium`)
- **Contrib** — weighted contribution to the fund's daily move (`weight × day%`)
- **Bar** — visual bar scaled relative to the largest contributor today (minimum scale: 0.10%)

Rows are colour-coded: green for positive contributors, amber for positions requiring manual entry.

### Manual Entry (Amber Rows)

Some positions are illiquid, unlisted, or use internal pricing and cannot be fetched automatically. These show an input field instead of a live price. Type a value in `±0.00%` format (e.g. `+0.50%` or `-1.20%`) and it will be included in the estimated fund move and coverage calculations immediately.

### Holding Detail Popup

Click any row to open a popup with a description of that holding and a **Recent News** link that opens a Google News search for that company in a new tab.

### Refresh

Click **↻ Refresh Prices** in the header to re-fetch all live prices. The status indicator shows how many holdings loaded successfully and the time of the last update.

### Debug Panel

A collapsed debug panel at the bottom of the page logs each fetch attempt. Expand it to see which tickers loaded, which failed, and the specific error for any failures (e.g. `FAIL XYZ: HTTP 404`).

---

## Technical Details

### Architecture

The entire application is a single self-contained HTML file (`PurposeInvestmentBreakdown.html`) with no build system, no dependencies, and no backend. Everything runs in the browser.

### Holdings Data

Holdings are defined as a static JavaScript array near the top of the `<script>` block. Each entry has:

```js
{ ticker: "TNZ.TO", display: "TNZ CN", issuer: "Tenaz Energy Corp", weight: 0.1886, manual: false, sector: { label: "Oil & Gas E&P", cls: "energy" }, desc: "..." }
```

- `ticker` — Yahoo Finance symbol used for price fetching (null for manual positions)
- `display` — label shown in the table
- `weight` — portfolio weight as a decimal (e.g. `0.1886` = 18.86%)
- `manual` — if `true`, shows a text input instead of fetching a price
- `sector` — object with `label` (display text) and `cls` (`energy` | `metals` | `lithium` | `cash` | `unlisted`) for colour-coding
- `desc` — description shown in the holding detail popup

### Price Fetching (Yahoo Finance)

Live prices are fetched from the **Yahoo Finance v8 chart API**:

```
https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d
```

Because the page is served from a different origin (GitHub Pages), direct requests are blocked by CORS. All requests are routed through **corsproxy.io**:

```
https://corsproxy.io/?{encoded yahoo url}
```

The proxy returns the raw Yahoo JSON. The relevant fields extracted are:
- `meta.regularMarketPrice` — current price
- `meta.chartPreviousClose` — prior close (fallback: `meta.previousClose`)

Daily % change is calculated as `(price - prev) / prev * 100`.

All holdings are fetched in parallel via `Promise.allSettled()`. Failures are caught gracefully — the holding shows `N/A` and the error is logged to the debug panel.

### Fund NAV (Globe and Mail)

Yahoo Finance does not carry the fund ticker `PFC5101.CF`. Instead, the fund's official NAV and reported daily move are scraped from the **Globe and Mail fund page**:

```
https://www.theglobeandmail.com/investing/markets/funds/PFC5101.CF/
```

The page HTML contains a `<a is="barchart-watchlist" ... quote='{...}'>` element with a JSON attribute holding `lastPrice`, `percentChange`, and `tradeTime`. This is extracted with a regex and parsed directly.

This request also goes through corsproxy.io to work around CORS.

### Attribution Calculation

For each holding with a known day %:

```
contribution = weight × dayPct
```

The estimated fund move is `Σ(contribution)` across all covered holdings. Coverage is `Σ(weight)` of covered holdings, expressed as a percentage of the total fund.

### Bar Chart Scaling

Bar widths are scaled relative to the largest absolute contributor on the current day:

```js
const barScale = Math.max(maxAbsContrib, 0.10);
barWidth = Math.abs(contrib) / barScale * 100   // capped at 100%
```

The 0.10% floor prevents flat days from exaggerating small moves — without it, a 0.001% contribution would still fill 100% of the bar if it happened to be the day's biggest.

### Rendering

`render()` is called after every fetch and after every manual input change. It rebuilds the holdings table from scratch each time, then applies bar widths in a second pass once the maximum contribution is known.
