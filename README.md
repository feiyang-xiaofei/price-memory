<p align="center">
  <img src="screenshots/hero.png" alt="Price Memory" width="720">
</p>

# Price Memory

**A Chrome extension that remembers every price you see.**

Browse any product page — Amazon, Walmart, Target, Best Buy, eBay, Nordstrom, or any other store — and Price Memory silently records the product and its price. The next time you visit, it tells you whether the price went up, down, or stayed the same.

No account. No cloud. No data leaves your browser. Everything is stored locally.

## How it works

1. Install the extension
2. Browse normally
3. Price Memory does the rest

Every product page you visit gets a small floating badge showing the price status:

| Badge | Meaning |
|-------|---------|
| **Green** | Lowest price you've seen |
| **Blue** | Near lowest — good deal |
| **Gray** | Average price range |
| **Red** | Higher than usual |

## Features

<p align="center">
  <img src="screenshots/features.png" alt="Features" width="720">
</p>

- **Passive price tracking** — No clicking, no saving, no "add to watchlist". Automatic.
- **Smart price badge** — Floating indicator on every product page with price status.
- **Price history** — See how a product's price changed over time.
- **Price drop detection** — Know which tracked items have dropped.
- **Multi-store support** — Amazon, Walmart, Target, Best Buy, eBay, Nordstrom + generic detection for any site.
- **Full dashboard** — Charts, product table, category breakdowns, price drop analysis.
- **100% local** — All data stays in your browser. No servers, no accounts, no tracking.
- **Manifest V3** — Built on Chrome's latest extension platform.

## Screenshots

<details>
<summary>Extension Popup</summary>
<p align="center">
  <img src="screenshots/popup.png" alt="Popup" width="360">
</p>
</details>

<details>
<summary>Dashboard</summary>
<p align="center">
  <img src="screenshots/dashboard.png" alt="Dashboard" width="720">
</p>
</details>

## Install

1. Download or clone this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `src` folder from this repo
6. Done. Browse any product page and it starts working.

Also works on **Edge** (`edge://extensions`) and **Brave** (`brave://extensions`).

## Supported stores

| Store | Detection |
|-------|-----------|
| Amazon | Full (dedicated extractor) |
| Walmart | Full |
| Target | Full |
| Best Buy | Full |
| eBay | Full |
| Nordstrom | Full |
| Any other site | Generic (JSON-LD, meta tags, common selectors) |

## Pro version

The free version includes full price tracking, badge, popup, dashboard overview, product table, and price drops.

**[Price Memory Pro](https://YOUR_GUMROAD_URL)** adds:

- **Smart Insights** — AI-powered spending analysis, volatility detection, buying advice
- **Deja Vu** — Deep analysis of products you keep revisiting, with buy/wait recommendations
- **Advanced analytics** — Category trends, price-stable vs volatile item classification

One-time purchase. No subscription.

## Privacy

Price Memory collects **zero** personal data. It reads product info (title, price, image) from pages you visit and stores everything locally in `chrome.storage.local`. Nothing is transmitted to any server.

Full privacy policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Tech stack

- Chrome Extension Manifest V3
- Vanilla JS (no framework)
- [TailwindCSS](https://tailwindcss.com) (CDN) for dashboard
- [ECharts](https://echarts.apache.org) for dashboard charts
- `chrome.storage.local` for persistence

## License

[MIT](LICENSE)
