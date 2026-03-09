// Price Memory — Background Service Worker
// Handles price tracking, alerts, analytics, and storage management

const DB_KEY = 'priceMemoryDB';
const SETTINGS_KEY = 'priceMemorySettings';

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  alertOnDrop: true,
  dropThreshold: 10, // percentage
  trackingEnabled: true,
  maxItems: 10000,
  currency: 'USD'
};

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get([DB_KEY, SETTINGS_KEY]);
  if (!data[DB_KEY]) {
    await chrome.storage.local.set({ [DB_KEY]: { products: {}, categories: {}, stats: { totalTracked: 0, totalSaved: 0, alertsSent: 0 } } });
  }
  if (!data[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  }
  // Check prices every 6 hours
  chrome.alarms.create('priceCheck', { periodInMinutes: 360 });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRICE_DETECTED') {
    handlePriceDetected(message.data, sender.tab).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_HISTORY') {
    getProductHistory(message.url).then(sendResponse);
    return true;
  }
  if (message.type === 'GET_STATS') {
    getStats().then(sendResponse);
    return true;
  }
  if (message.type === 'GET_ALL_PRODUCTS') {
    getAllProducts().then(sendResponse);
    return true;
  }
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(SETTINGS_KEY).then(d => sendResponse(d[SETTINGS_KEY]));
    return true;
  }
  if (message.type === 'UPDATE_SETTINGS') {
    chrome.storage.local.set({ [SETTINGS_KEY]: message.data }).then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handlePriceDetected(data, tab) {
  const { url, title, price, image, retailer, category } = data;
  const db = await getDB();
  const productKey = normalizeURL(url);
  const now = Date.now();

  if (!db.products[productKey]) {
    db.products[productKey] = {
      url, title, image, retailer, category,
      firstSeen: now,
      priceHistory: [],
      lowestPrice: price,
      highestPrice: price,
      viewCount: 0
    };
    db.stats.totalTracked++;
  }

  const product = db.products[productKey];
  product.viewCount++;
  product.lastSeen = now;
  product.title = title || product.title;
  product.image = image || product.image;

  // Add price point
  const lastPrice = product.priceHistory.length > 0 ? product.priceHistory[product.priceHistory.length - 1].price : null;
  product.priceHistory.push({ price, timestamp: now });

  // Update extremes
  if (price < product.lowestPrice) product.lowestPrice = price;
  if (price > product.highestPrice) product.highestPrice = price;

  // Check for price drop alert
  const settings = await getSettings();
  if (settings.alertOnDrop && lastPrice && price < lastPrice) {
    const dropPercent = ((lastPrice - price) / lastPrice) * 100;
    if (dropPercent >= settings.dropThreshold) {
      chrome.notifications.create(`price-drop-${productKey}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Price Drop Detected!',
        message: `${title} dropped ${dropPercent.toFixed(0)}% — now $${price.toFixed(2)} (was $${lastPrice.toFixed(2)})`
      });
      db.stats.alertsSent++;
      db.stats.totalSaved += (lastPrice - price);
    }
  }

  // Update category stats
  if (category) {
    if (!db.categories[category]) {
      db.categories[category] = { count: 0, avgPrice: 0, prices: [] };
    }
    db.categories[category].count++;
    db.categories[category].prices.push(price);
    db.categories[category].avgPrice = db.categories[category].prices.reduce((a, b) => a + b, 0) / db.categories[category].prices.length;
  }

  await saveDB(db);

  return {
    isLowest: price <= product.lowestPrice,
    lowestPrice: product.lowestPrice,
    highestPrice: product.highestPrice,
    viewCount: product.viewCount,
    priceHistory: product.priceHistory,
    categoryAvg: category && db.categories[category] ? db.categories[category].avgPrice : null,
    firstSeen: product.firstSeen
  };
}

async function getProductHistory(url) {
  const db = await getDB();
  const key = normalizeURL(url);
  return db.products[key] || null;
}

async function getStats() {
  const db = await getDB();
  const products = Object.values(db.products);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return {
    totalTracked: db.stats.totalTracked,
    totalSaved: db.stats.totalSaved,
    alertsSent: db.stats.alertsSent,
    recentlyViewed: products.filter(p => now - p.lastSeen < thirtyDays).length,
    topCategories: Object.entries(db.categories)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data })),
    priceDrops: products.filter(p => {
      if (p.priceHistory.length < 2) return false;
      const latest = p.priceHistory[p.priceHistory.length - 1].price;
      return latest < p.highestPrice;
    }).length
  };
}

async function getAllProducts() {
  const db = await getDB();
  return Object.values(db.products).sort((a, b) => b.lastSeen - a.lastSeen);
}

function normalizeURL(url) {
  try {
    const u = new URL(url);
    // Remove tracking parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'tag', 'fbclid', 'gclid'].forEach(p => u.searchParams.delete(p));
    return u.origin + u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '');
  } catch {
    return url;
  }
}

async function getDB() {
  const data = await chrome.storage.local.get(DB_KEY);
  return data[DB_KEY] || { products: {}, categories: {}, stats: { totalTracked: 0, totalSaved: 0, alertsSent: 0 } };
}

async function saveDB(db) {
  await chrome.storage.local.set({ [DB_KEY]: db });
}

async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return data[SETTINGS_KEY] || DEFAULT_SETTINGS;
}
