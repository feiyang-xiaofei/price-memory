// Price Memory — Content Script
// Detects product pages and prices across major retailers

(function () {
  'use strict';
  if (window.__priceMemoryLoaded) return;
  window.__priceMemoryLoaded = true;

  // Retailer-specific price extractors
  const EXTRACTORS = {
    'amazon.com': {
      price: () => {
        const el = document.querySelector('#priceblock_ourprice, #priceblock_dealprice, .a-price .a-offscreen, #corePrice_feature_div .a-offscreen, #price_inside_buybox, .priceToPay .a-offscreen');
        return el ? parsePrice(el.textContent) : null;
      },
      title: () => document.querySelector('#productTitle')?.textContent?.trim(),
      image: () => document.querySelector('#landingImage, #imgBlkFront')?.src,
      category: () => {
        const bc = document.querySelectorAll('#wayfinding-breadcrumbs_feature_div a, .a-breadcrumb a');
        return bc.length > 0 ? bc[bc.length - 1]?.textContent?.trim() : null;
      }
    },
    'walmart.com': {
      price: () => {
        const el = document.querySelector('[itemprop="price"], [data-testid="price-wrap"] .f2, .price-group');
        return el ? parsePrice(el.textContent) : null;
      },
      title: () => document.querySelector('[itemprop="name"], h1[data-testid="product-title"]')?.textContent?.trim(),
      image: () => document.querySelector('[data-testid="hero-image-container"] img, .hover-zoom-hero-image img')?.src,
      category: () => extractBreadcrumb()
    },
    'target.com': {
      price: () => {
        const el = document.querySelector('[data-test="product-price"], .styles__CurrentPriceFontSize');
        return el ? parsePrice(el.textContent) : null;
      },
      title: () => document.querySelector('[data-test="product-title"], h1')?.textContent?.trim(),
      image: () => document.querySelector('[data-test="product-image"] img, picture img')?.src,
      category: () => extractBreadcrumb()
    },
    'bestbuy.com': {
      price: () => {
        const el = document.querySelector('.priceView-customer-price span, [data-testid="customer-price"] span');
        return el ? parsePrice(el.textContent) : null;
      },
      title: () => document.querySelector('.sku-title h1, [data-testid="heading"]')?.textContent?.trim(),
      image: () => document.querySelector('.primary-image img, [data-testid="carousel"] img')?.src,
      category: () => extractBreadcrumb()
    },
    'ebay.com': {
      price: () => {
        const el = document.querySelector('.x-price-primary span, #prcIsum, [itemprop="price"]');
        return el ? parsePrice(el.textContent || el.getAttribute('content')) : null;
      },
      title: () => document.querySelector('.x-item-title__mainTitle span, #itemTitle')?.textContent?.trim()?.replace('Details about  \t', ''),
      image: () => document.querySelector('#icImg, .ux-image-carousel-item img')?.src,
      category: () => extractBreadcrumb()
    },
    'nordstrom.com': {
      price: () => {
        const el = document.querySelector('[name="price"], .pMbpU span');
        return el ? parsePrice(el.textContent || el.getAttribute('content')) : null;
      },
      title: () => document.querySelector('h1[itemprop="name"], h1')?.textContent?.trim(),
      image: () => document.querySelector('[property="og:image"]')?.getAttribute('content'),
      category: () => extractBreadcrumb()
    }
  };

  // Generic extractor for unknown retailers
  const GENERIC_EXTRACTOR = {
    price: () => {
      // Try structured data first
      const ld = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of ld) {
        try {
          const data = JSON.parse(s.textContent);
          const price = findPriceInLD(data);
          if (price) return price;
        } catch {}
      }
      // Try meta tags
      const metaPrice = document.querySelector('meta[property="product:price:amount"], meta[property="og:price:amount"]');
      if (metaPrice) return parseFloat(metaPrice.getAttribute('content'));
      // Try common CSS patterns
      const pricePatterns = [
        '[itemprop="price"]', '[data-price]', '.price', '.product-price',
        '.current-price', '.sale-price', '.offer-price', '#price',
        '.price-current', '.product__price', '.pdp-price'
      ];
      for (const sel of pricePatterns) {
        const el = document.querySelector(sel);
        if (el) {
          const p = parsePrice(el.textContent || el.getAttribute('content') || el.dataset.price);
          if (p) return p;
        }
      }
      return null;
    },
    title: () => {
      const og = document.querySelector('meta[property="og:title"]');
      if (og) return og.getAttribute('content');
      return document.querySelector('h1')?.textContent?.trim() || document.title;
    },
    image: () => {
      const og = document.querySelector('meta[property="og:image"]');
      if (og) return og.getAttribute('content');
      const mainImg = document.querySelector('[itemprop="image"], .product-image img, #main-image');
      return mainImg?.src || mainImg?.getAttribute('content');
    },
    category: () => {
      const ld = document.querySelectorAll('script[type="application/ld+json"]');
      for (const s of ld) {
        try {
          const data = JSON.parse(s.textContent);
          if (data.category) return data.category;
          if (data['@type'] === 'BreadcrumbList' && data.itemListElement) {
            const last = data.itemListElement[data.itemListElement.length - 1];
            return last?.name || last?.item?.name;
          }
        } catch {}
      }
      return extractBreadcrumb();
    }
  };

  function parsePrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,(\d{3})/g, '$1').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 || num > 100000 ? null : num;
  }

  function findPriceInLD(data) {
    if (Array.isArray(data)) {
      for (const item of data) {
        const p = findPriceInLD(item);
        if (p) return p;
      }
    }
    if (data && typeof data === 'object') {
      if (data.offers) {
        const offers = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (offers.price) return parseFloat(offers.price);
        if (offers.lowPrice) return parseFloat(offers.lowPrice);
      }
      if (data.price) return parseFloat(data.price);
    }
    return null;
  }

  function extractBreadcrumb() {
    const bc = document.querySelectorAll('[itemtype*="BreadcrumbList"] a, .breadcrumb a, nav[aria-label="breadcrumb"] a');
    if (bc.length > 1) return bc[bc.length - 1]?.textContent?.trim();
    return null;
  }

  function getRetailer(hostname) {
    for (const key of Object.keys(EXTRACTORS)) {
      if (hostname.includes(key)) return key;
    }
    return hostname.replace('www.', '');
  }

  function detectProduct() {
    const hostname = window.location.hostname;
    const extractor = Object.keys(EXTRACTORS).find(k => hostname.includes(k))
      ? EXTRACTORS[Object.keys(EXTRACTORS).find(k => hostname.includes(k))]
      : GENERIC_EXTRACTOR;

    const price = extractor.price();
    if (!price) return null;

    return {
      url: window.location.href,
      title: extractor.title() || document.title,
      price,
      image: extractor.image(),
      retailer: getRetailer(hostname),
      category: extractor.category()
    };
  }

  // Inject price badge UI
  function showPriceBadge(analysis) {
    const existing = document.getElementById('price-memory-badge');
    if (existing) existing.remove();

    const badge = document.createElement('div');
    badge.id = 'price-memory-badge';
    badge.className = 'pm-badge';

    const isLowest = analysis.isLowest;
    const priceDiff = analysis.priceHistory.length > 1
      ? analysis.priceHistory[analysis.priceHistory.length - 1].price - analysis.priceHistory[0].price
      : 0;
    const currentPrice = analysis.priceHistory[analysis.priceHistory.length - 1].price;

    let statusClass, statusIcon, statusText;
    if (isLowest && analysis.priceHistory.length > 1) {
      statusClass = 'pm-status-great';
      statusIcon = '▼';
      statusText = 'Lowest price you\'ve seen!';
    } else if (currentPrice <= analysis.lowestPrice * 1.05) {
      statusClass = 'pm-status-good';
      statusIcon = '●';
      statusText = 'Near your lowest seen price';
    } else if (currentPrice >= analysis.highestPrice * 0.95) {
      statusClass = 'pm-status-bad';
      statusIcon = '▲';
      statusText = 'Near highest price you\'ve seen';
    } else {
      statusClass = 'pm-status-neutral';
      statusIcon = '—';
      statusText = 'Average range for this item';
    }

    const firstSeenDate = new Date(analysis.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const viewText = analysis.viewCount > 1 ? `Viewed ${analysis.viewCount} times since ${firstSeenDate}` : 'First time seeing this item';

    const historyHTML = analysis.priceHistory.slice(-5).map(p => {
      const date = new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `<div class="pm-history-row"><span class="pm-history-date">${date}</span><span class="pm-history-price">$${p.price.toFixed(2)}</span></div>`;
    }).join('');

    const categoryHTML = analysis.categoryAvg
      ? `<div class="pm-category-avg">Category avg: <strong>$${analysis.categoryAvg.toFixed(2)}</strong></div>`
      : '';

    badge.innerHTML = `
      <div class="pm-badge-header">
        <div class="pm-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span>Price Memory</span>
        </div>
        <button class="pm-close" id="pm-close-btn">&times;</button>
      </div>
      <div class="pm-status ${statusClass}">
        <span class="pm-status-icon">${statusIcon}</span>
        <span class="pm-status-text">${statusText}</span>
      </div>
      <div class="pm-price-range">
        <div class="pm-range-bar">
          <div class="pm-range-fill" style="left: ${((analysis.lowestPrice / analysis.highestPrice) * 100).toFixed(0)}%; right: 0%"></div>
          <div class="pm-range-marker" style="left: ${analysis.highestPrice > analysis.lowestPrice ? ((currentPrice - analysis.lowestPrice) / (analysis.highestPrice - analysis.lowestPrice) * 100).toFixed(0) : 50}%"></div>
        </div>
        <div class="pm-range-labels">
          <span>$${analysis.lowestPrice.toFixed(2)}</span>
          <span>$${analysis.highestPrice.toFixed(2)}</span>
        </div>
      </div>
      <div class="pm-views">${viewText}</div>
      ${categoryHTML}
      <div class="pm-history-section">
        <div class="pm-history-title">Your Price History</div>
        ${historyHTML}
      </div>
    `;

    document.body.appendChild(badge);

    document.getElementById('pm-close-btn')?.addEventListener('click', () => {
      badge.classList.add('pm-badge-hidden');
      setTimeout(() => badge.remove(), 300);
    });

    // Auto-collapse after 8 seconds
    setTimeout(() => {
      if (badge.parentNode) {
        badge.classList.add('pm-badge-compact');
      }
    }, 8000);

    badge.addEventListener('click', (e) => {
      if (e.target.id !== 'pm-close-btn') {
        badge.classList.remove('pm-badge-compact');
      }
    });
  }

  // Main execution
  function run() {
    const product = detectProduct();
    if (!product) return;

    chrome.runtime.sendMessage({ type: 'PRICE_DETECTED', data: product }, (response) => {
      if (response) showPriceBadge(response);
    });
  }

  // Run after page load, with a slight delay for dynamic content
  if (document.readyState === 'complete') {
    setTimeout(run, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(run, 1500));
  }

  // Re-check on SPA navigation
  let lastURL = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastURL) {
      lastURL = window.location.href;
      setTimeout(run, 2000);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
