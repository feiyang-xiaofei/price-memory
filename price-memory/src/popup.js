// Price Memory — Popup Script
document.addEventListener('DOMContentLoaded', async () => {
  const tabs = document.querySelectorAll('.tab');
  const content = document.getElementById('content');
  const toggleBtn = document.getElementById('toggleBtn');

  // Dashboard link
  document.getElementById('openDashboard')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // Load stats
  try {
    const stats = await sendMessage({ type: 'GET_STATS' });
    if (stats) {
      document.getElementById('statTracked').textContent = stats.totalTracked || 0;
      document.getElementById('statSaved').textContent = '$' + (stats.totalSaved || 0).toFixed(0);
      document.getElementById('statAlerts').textContent = stats.alertsSent || 0;
    }
  } catch {}

  // Load settings
  try {
    const settings = await sendMessage({ type: 'GET_SETTINGS' });
    if (settings && !settings.enabled) {
      toggleBtn.classList.remove('active');
    }
  } catch {}

  // Toggle
  toggleBtn.addEventListener('click', async () => {
    toggleBtn.classList.toggle('active');
    const enabled = toggleBtn.classList.contains('active');
    const settings = await sendMessage({ type: 'GET_SETTINGS' });
    settings.enabled = enabled;
    await sendMessage({ type: 'UPDATE_SETTINGS', data: settings });
  });

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab);
    });
  });

  async function loadTab(tabName) {
    try {
      const products = await sendMessage({ type: 'GET_ALL_PRODUCTS' });
      if (!products || products.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">&#x1f6d2;</div>
            <div class="empty-title">No products tracked yet</div>
            <div class="empty-text">Visit product pages on Amazon, Walmart, Target, Best Buy, or any retailer. Prices are tracked automatically.</div>
          </div>`;
        return;
      }

      if (tabName === 'recent') {
        renderRecent(products);
      } else if (tabName === 'drops') {
        renderDrops(products);
      } else if (tabName === 'watching') {
        renderWatching(products);
      }
    } catch {
      content.innerHTML = '<div class="empty-state"><div class="empty-text">Loading...</div></div>';
    }
  }

  function renderRecent(products) {
    const recent = products.slice(0, 15);
    const dejaVu = products.filter(p => p.viewCount >= 3).slice(0, 1);

    let html = '';
    if (dejaVu.length > 0) {
      const p = dejaVu[0];
      html += `
        <div class="deja-vu">
          <div class="deja-vu-title">&#x1f4ad; Price D&eacute;j&agrave; Vu</div>
          <div class="deja-vu-text">You've viewed <strong>${p.title?.substring(0, 40)}...</strong> ${p.viewCount} times. You clearly want it. Current: <strong>$${p.priceHistory[p.priceHistory.length - 1]?.price?.toFixed(2)}</strong></div>
        </div>`;
    }

    html += '<div class="section-header">Recently Viewed</div><div class="product-list">';
    for (const p of recent) {
      const currentPrice = p.priceHistory[p.priceHistory.length - 1]?.price || 0;
      const firstPrice = p.priceHistory[0]?.price || currentPrice;
      const diff = currentPrice - firstPrice;
      const trendClass = diff < -0.5 ? 'trend-down' : diff > 0.5 ? 'trend-up' : 'trend-flat';
      const trendText = diff < -0.5 ? `&#x25BC; $${Math.abs(diff).toFixed(0)}` : diff > 0.5 ? `&#x25B2; $${diff.toFixed(0)}` : '&#x2014;';

      html += `
        <div class="product-item" data-url="${p.url}">
          <img class="product-img" src="${p.image || ''}" alt="" onerror="this.style.display='none'">
          <div class="product-info">
            <div class="product-title">${escapeHTML(p.title || 'Unknown Product')}</div>
            <div class="product-retailer">${escapeHTML(p.retailer || '')} &middot; ${timeAgo(p.lastSeen)}</div>
            <div class="product-prices">
              <span class="product-current">$${currentPrice.toFixed(2)}</span>
              <span class="product-trend ${trendClass}">${trendText}</span>
            </div>
          </div>
        </div>`;
    }
    html += '</div>';
    content.innerHTML = html;

    content.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', () => {
        chrome.tabs.create({ url: el.dataset.url });
      });
    });
  }

  function renderDrops(products) {
    const drops = products.filter(p => {
      if (p.priceHistory.length < 2) return false;
      const current = p.priceHistory[p.priceHistory.length - 1].price;
      return current < p.highestPrice * 0.9;
    }).sort((a, b) => {
      const aDiscount = 1 - a.priceHistory[a.priceHistory.length - 1].price / a.highestPrice;
      const bDiscount = 1 - b.priceHistory[b.priceHistory.length - 1].price / b.highestPrice;
      return bDiscount - aDiscount;
    });

    if (drops.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#x1f4c9;</div>
          <div class="empty-title">No price drops yet</div>
          <div class="empty-text">Keep browsing. When prices drop on items you've viewed, they'll appear here.</div>
        </div>`;
      return;
    }

    let html = '<div class="section-header">Price Drops</div><div class="drops-list">';
    for (const p of drops.slice(0, 10)) {
      const current = p.priceHistory[p.priceHistory.length - 1].price;
      const discount = ((1 - current / p.highestPrice) * 100).toFixed(0);
      html += `
        <div class="drop-item" data-url="${p.url}" style="cursor:pointer">
          <div class="drop-info">
            <div class="drop-title">${escapeHTML(p.title || 'Unknown')}</div>
            <div class="drop-detail">Was $${p.highestPrice.toFixed(2)} &rarr; Now $${current.toFixed(2)}</div>
          </div>
          <div class="drop-badge">-${discount}%</div>
        </div>`;
    }
    html += '</div>';
    content.innerHTML = html;

    content.querySelectorAll('.drop-item').forEach(el => {
      el.addEventListener('click', () => chrome.tabs.create({ url: el.dataset.url }));
    });
  }

  function renderWatching(products) {
    const watching = products.filter(p => p.viewCount >= 2).sort((a, b) => b.viewCount - a.viewCount);
    if (watching.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#x1f440;</div>
          <div class="empty-title">Nothing watched yet</div>
          <div class="empty-text">Items you view more than once automatically appear here.</div>
        </div>`;
      return;
    }

    let html = '<div class="section-header">Items You Keep Coming Back To</div><div class="product-list">';
    for (const p of watching.slice(0, 10)) {
      const current = p.priceHistory[p.priceHistory.length - 1]?.price || 0;
      html += `
        <div class="product-item" data-url="${p.url}">
          <img class="product-img" src="${p.image || ''}" alt="" onerror="this.style.display='none'">
          <div class="product-info">
            <div class="product-title">${escapeHTML(p.title || 'Unknown')}</div>
            <div class="product-retailer">${p.viewCount} views &middot; $${p.lowestPrice.toFixed(2)} - $${p.highestPrice.toFixed(2)}</div>
            <div class="product-prices">
              <span class="product-current">$${current.toFixed(2)}</span>
            </div>
          </div>
        </div>`;
    }
    html += '</div>';
    content.innerHTML = html;

    content.querySelectorAll('.product-item').forEach(el => {
      el.addEventListener('click', () => chrome.tabs.create({ url: el.dataset.url }));
    });
  }

  function sendMessage(msg) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(msg, resolve);
    });
  }

  function escapeHTML(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Initial load
  loadTab('recent');
});
