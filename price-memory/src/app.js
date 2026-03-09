// Price Memory Dashboard — App Logic
// Reads real data from Chrome extension storage, falls back to demo data

// ============================================================
// GLOBAL STATE
// ============================================================
let ALL_PRODUCTS = [];
let ALL_STATS = {};

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initNavigation();
  renderDashboard();
});

async function loadData() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['priceMemoryDB', 'priceMemorySettings'], resolve);
      });
      const db = result.priceMemoryDB;
      if (db && db.products && Object.keys(db.products).length > 0) {
        // Convert products object (keyed by URL) to array
        ALL_PRODUCTS = Object.entries(db.products).map(([url, p], i) => ({
          id: 'prod_' + i,
          url: p.url || url,
          title: p.title || 'Unknown Product',
          retailer: p.retailer || extractDomain(p.url || url),
          category: p.category || 'Uncategorized',
          image: p.image || '',
          firstSeen: p.firstSeen || Date.now(),
          lastSeen: p.lastSeen || Date.now(),
          priceHistory: p.priceHistory || [],
          lowestPrice: p.lowestPrice || 0,
          highestPrice: p.highestPrice || 0,
          viewCount: p.viewCount || 1
        })).sort((a, b) => b.lastSeen - a.lastSeen);
        ALL_STATS = computeStats(ALL_PRODUCTS);
        // Merge in background stats if available
        if (db.stats) {
          ALL_STATS.alertsSent = db.stats.alertsSent || ALL_STATS.alertsSent;
        }
        return;
      }
    }
  } catch (e) {
    console.log('Price Memory: Could not read from Chrome storage, using demo data', e);
  }
  // Fallback to demo data
  ALL_PRODUCTS = generateDemoProducts();
  ALL_STATS = computeStats(ALL_PRODUCTS);
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch { return ''; }
}

// ============================================================
// NAVIGATION
// ============================================================
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchPage(item.dataset.page);
    });
  });
}

function switchPage(page) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-' + page)?.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
    if (n.dataset.page === page) n.classList.remove('text-[#888]');
    else n.classList.add('text-[#888]');
  });
  if (page === 'products') renderProducts();
  if (page === 'drops') renderDrops();
  if (page === 'insights') renderInsights();
  if (page === 'dejavu') renderDejaVu();
}

// ============================================================
// DEMO DATA GENERATOR
// ============================================================
function generateDemoProducts() {
  const now = Date.now();
  const DAY = 86400000;
  const products = [
    { title: 'Sony WH-1000XM5 Wireless Headphones', retailer: 'amazon.com', category: 'Electronics', basePrice: 348, currentPrice: 278, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop', views: 7 },
    { title: 'Apple MacBook Air M3 15"', retailer: 'bestbuy.com', category: 'Electronics', basePrice: 1299, currentPrice: 1199, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100&h=100&fit=crop', views: 12 },
    { title: 'Nike Air Max 90 — White/Black', retailer: 'nike.com', category: 'Shoes', basePrice: 130, currentPrice: 97.50, img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop', views: 5 },
    { title: 'Patagonia Better Sweater Fleece Jacket', retailer: 'nordstrom.com', category: 'Clothing', basePrice: 149, currentPrice: 119, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=100&h=100&fit=crop', views: 3 },
    { title: 'Dyson V15 Detect Cordless Vacuum', retailer: 'target.com', category: 'Home', basePrice: 749, currentPrice: 649, img: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&h=100&fit=crop', views: 4 },
    { title: 'Samsung 65" OLED 4K Smart TV', retailer: 'walmart.com', category: 'Electronics', basePrice: 1799, currentPrice: 1499, img: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=100&h=100&fit=crop', views: 8 },
    { title: 'Instant Pot Duo 7-in-1 (6 Quart)', retailer: 'amazon.com', category: 'Home', basePrice: 89.95, currentPrice: 64.99, img: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=100&h=100&fit=crop', views: 2 },
    { title: 'Levi\'s 501 Original Fit Jeans', retailer: 'nordstrom.com', category: 'Clothing', basePrice: 69.50, currentPrice: 69.50, img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=100&h=100&fit=crop', views: 1 },
    { title: 'AirPods Pro 2nd Generation', retailer: 'amazon.com', category: 'Electronics', basePrice: 249, currentPrice: 189, img: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=100&h=100&fit=crop', views: 15 },
    { title: 'KitchenAid Stand Mixer — Empire Red', retailer: 'target.com', category: 'Home', basePrice: 449.99, currentPrice: 349.99, img: 'https://images.unsplash.com/photo-1594385208974-2f8bb07b2c94?w=100&h=100&fit=crop', views: 6 },
    { title: 'Adidas Ultraboost Light Running Shoes', retailer: 'adidas.com', category: 'Shoes', basePrice: 190, currentPrice: 133, img: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=100&h=100&fit=crop', views: 4 },
    { title: 'Herman Miller Aeron Chair — Graphite', retailer: 'hermanmiller.com', category: 'Furniture', basePrice: 1395, currentPrice: 1395, img: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=100&h=100&fit=crop', views: 9 },
    { title: 'Kindle Paperwhite (16 GB)', retailer: 'amazon.com', category: 'Electronics', basePrice: 149.99, currentPrice: 124.99, img: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=100&h=100&fit=crop', views: 3 },
    { title: 'All-Clad Stainless Steel 10-Piece Set', retailer: 'walmart.com', category: 'Home', basePrice: 699.99, currentPrice: 549.99, img: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop', views: 2 },
    { title: 'Osprey Atmos AG 65 Backpack', retailer: 'rei.com', category: 'Outdoor', basePrice: 320, currentPrice: 255.93, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=100&h=100&fit=crop', views: 5 },
    { title: 'PlayStation 5 Slim Console', retailer: 'bestbuy.com', category: 'Electronics', basePrice: 499.99, currentPrice: 449.99, img: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=100&h=100&fit=crop', views: 11 },
    { title: 'Bose SoundLink Flex Bluetooth Speaker', retailer: 'amazon.com', category: 'Electronics', basePrice: 149, currentPrice: 119, img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=100&h=100&fit=crop', views: 2 },
    { title: 'Canada Goose Expedition Parka', retailer: 'nordstrom.com', category: 'Clothing', basePrice: 1350, currentPrice: 1350, img: 'https://images.unsplash.com/photo-1544923246-77307dd270b5?w=100&h=100&fit=crop', views: 3 },
    { title: 'YETI Rambler 20 oz Tumbler', retailer: 'yeti.com', category: 'Outdoor', basePrice: 35, currentPrice: 35, img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=100&h=100&fit=crop', views: 1 },
    { title: 'New Balance 990v6 Made in USA', retailer: 'newbalance.com', category: 'Shoes', basePrice: 199.99, currentPrice: 174.99, img: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=100&h=100&fit=crop', views: 6 },
  ];

  return products.map((p, i) => {
    // Generate realistic price history
    const historyLength = 3 + Math.floor(Math.random() * 12);
    const priceHistory = [];
    const startDate = now - (historyLength * DAY * (2 + Math.random() * 3));
    for (let j = 0; j < historyLength; j++) {
      const t = startDate + j * DAY * (2 + Math.random() * 3);
      // Create realistic price fluctuations
      const variance = p.basePrice * 0.15;
      const trend = (p.currentPrice - p.basePrice) / historyLength * j;
      const noise = (Math.random() - 0.5) * variance;
      const price = Math.max(p.basePrice * 0.6, p.basePrice + trend + noise);
      priceHistory.push({ price: Math.round(price * 100) / 100, timestamp: t });
    }
    // Ensure last price matches currentPrice
    priceHistory.push({ price: p.currentPrice, timestamp: now - Math.random() * DAY * 2 });

    const prices = priceHistory.map(h => h.price);
    return {
      id: 'prod_' + i,
      url: 'https://www.' + p.retailer + '/product/' + i,
      title: p.title,
      retailer: p.retailer,
      category: p.category,
      image: p.img,
      firstSeen: priceHistory[0].timestamp,
      lastSeen: priceHistory[priceHistory.length - 1].timestamp,
      priceHistory,
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      viewCount: p.views
    };
  });
}

function computeStats(products) {
  let totalSaved = 0;
  let dropsCount = 0;
  products.forEach(p => {
    if (p.priceHistory.length >= 2) {
      const first = p.priceHistory[0].price;
      const current = p.priceHistory[p.priceHistory.length - 1].price;
      if (current < first) {
        totalSaved += (first - current);
        dropsCount++;
      }
    }
  });
  const categories = {};
  products.forEach(p => {
    if (!categories[p.category]) categories[p.category] = { count: 0, total: 0 };
    categories[p.category].count++;
    categories[p.category].total += p.priceHistory[p.priceHistory.length - 1].price;
  });
  return {
    totalTracked: products.length,
    totalSaved: Math.round(totalSaved * 100) / 100,
    dropsCount,
    alertsSent: dropsCount,
    avgViews: (products.reduce((s, p) => s + p.viewCount, 0) / products.length).toFixed(1),
    categories
  };
}

// ============================================================
// DASHBOARD RENDERING
// ============================================================
function renderDashboard() {
  // Sidebar savings
  document.getElementById('sidebarSavings').textContent = '$' + Math.round(ALL_STATS.totalSaved);
  document.getElementById('sidebarAlerts').textContent = ALL_STATS.alertsSent;

  // Stats row
  const statsRow = document.getElementById('statsRow');
  const statCards = [
    { value: ALL_STATS.totalTracked, label: 'Products Tracked', color: 'text-white', icon: '&#x1F4E6;' },
    { value: '$' + Math.round(ALL_STATS.totalSaved), label: 'Potential Savings', color: 'text-[#00ff88]', icon: '&#x1F4B0;' },
    { value: ALL_STATS.dropsCount, label: 'Price Drops Found', color: 'text-[#00c8ff]', icon: '&#x1F4C9;' },
    { value: ALL_STATS.avgViews, label: 'Avg Views/Item', color: 'text-[#a050ff]', icon: '&#x1F440;' },
  ];
  statsRow.innerHTML = statCards.map((s, i) => `
    <div class="glass rounded-2xl p-5 fade-up fade-up-${i+1}">
      <div class="text-[24px] mb-1">${s.icon}</div>
      <div class="text-[26px] font-extrabold ${s.color} tracking-tight">${s.value}</div>
      <div class="text-[11px] text-[#666] mt-1">${s.label}</div>
    </div>
  `).join('');

  // Activity chart
  renderActivityChart();
  // Category chart
  renderCategoryChart();
  // Recent drops
  renderRecentDrops();
  // Watched items
  renderWatchedItems();
}

function renderActivityChart() {
  const chart = echarts.init(document.getElementById('chartActivity'));
  const now = Date.now();
  const DAY = 86400000;
  // Build 30 days of activity data from real product history
  const days = [];
  const tracked = [];
  const drops = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = now - (i + 1) * DAY;
    const dayEnd = now - i * DAY;
    const d = new Date(dayEnd);
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    // Count products that had price entries on this day
    let viewCount = 0;
    let dropCount = 0;
    ALL_PRODUCTS.forEach(p => {
      const dayEntries = p.priceHistory.filter(h => h.timestamp >= dayStart && h.timestamp < dayEnd);
      if (dayEntries.length > 0) {
        viewCount++;
        // Check if this entry was a price drop vs previous entry
        const idx = p.priceHistory.indexOf(dayEntries[0]);
        if (idx > 0 && dayEntries[0].price < p.priceHistory[idx - 1].price * 0.98) {
          dropCount++;
        }
      }
    });
    tracked.push(viewCount);
    drops.push(dropCount);
  }
  chart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: '#1a1a1a', borderColor: '#333', textStyle: { color: '#e8e8e8', fontSize: 12 } },
    legend: { data: ['Products Viewed', 'Price Drops'], top: 0, right: 0, textStyle: { color: '#666', fontSize: 11 } },
    grid: { left: 40, right: 16, top: 36, bottom: 24 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#222' } }, axisLabel: { color: '#555', fontSize: 10, interval: 4 }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#151515' } }, axisLabel: { color: '#555', fontSize: 10 } },
    series: [
      { name: 'Products Viewed', type: 'bar', data: tracked, barWidth: 6, itemStyle: { color: 'rgba(0,255,136,0.3)', borderRadius: [3,3,0,0] }, emphasis: { itemStyle: { color: '#00ff88' } } },
      { name: 'Price Drops', type: 'bar', data: drops, barWidth: 6, itemStyle: { color: 'rgba(0,200,255,0.4)', borderRadius: [3,3,0,0] }, emphasis: { itemStyle: { color: '#00c8ff' } } }
    ]
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderCategoryChart() {
  const chart = echarts.init(document.getElementById('chartCategory'));
  const cats = ALL_STATS.categories;
  const data = Object.entries(cats).map(([name, d]) => ({ name, value: d.count }));
  const colors = ['#00ff88', '#00c8ff', '#a050ff', '#ff5050', '#ffaa00', '#ff50aa'];
  chart.setOption({
    tooltip: { trigger: 'item', backgroundColor: '#1a1a1a', borderColor: '#333', textStyle: { color: '#e8e8e8', fontSize: 12 }, formatter: '{b}: {c} items ({d}%)' },
    series: [{
      type: 'pie', radius: ['45%', '72%'], center: ['50%', '50%'],
      data, label: { color: '#888', fontSize: 11 },
      itemStyle: { borderColor: '#0a0a0a', borderWidth: 3, color: (params) => colors[params.dataIndex % colors.length] },
      emphasis: { label: { fontSize: 13, fontWeight: 'bold' } }
    }]
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderRecentDrops() {
  const el = document.getElementById('recentDropsList');
  const drops = ALL_PRODUCTS.filter(p => {
    if (p.priceHistory.length < 2) return false;
    return p.priceHistory[p.priceHistory.length - 1].price < p.priceHistory[0].price;
  }).sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 5);

  el.innerHTML = drops.map(p => {
    const current = p.priceHistory[p.priceHistory.length - 1].price;
    const first = p.priceHistory[0].price;
    const pct = ((1 - current / first) * 100).toFixed(0);
    return `
      <div class="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
        <img src="${p.image}" class="rounded-lg object-cover bg-[#1a1a1a]" style="width:36px;height:36px;max-width:36px;max-height:36px;" onerror="this.style.display='none'" alt="">
        <div class="flex-1 min-w-0">
          <div class="text-[12px] text-[#ddd] truncate">${escapeHTML(p.title)}</div>
          <div class="text-[11px] text-[#555]">${p.retailer}</div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-[13px] font-bold text-white">${formatCurrency(current)}</div>
          <div class="text-[11px] font-semibold text-[#00ff88]">-${pct}%</div>
        </div>
      </div>`;
  }).join('');
}

function renderWatchedItems() {
  const el = document.getElementById('watchedList');
  const watched = ALL_PRODUCTS.filter(p => p.viewCount >= 3).sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);

  el.innerHTML = watched.map(p => {
    const current = p.priceHistory[p.priceHistory.length - 1].price;
    const prices = p.priceHistory.map(h => h.price);
    return `
      <div class="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
        <img src="${p.image}" class="rounded-lg object-cover bg-[#1a1a1a]" style="width:36px;height:36px;max-width:36px;max-height:36px;" onerror="this.style.display='none'" alt="">
        <div class="flex-1 min-w-0">
          <div class="text-[12px] text-[#ddd] truncate">${escapeHTML(p.title)}</div>
          <div class="text-[11px] text-[#555]">${p.viewCount} views &middot; ${p.retailer}</div>
        </div>
        <div class="flex-shrink-0">${sparklineHTML(prices.slice(-8), '#a050ff')}</div>
      </div>`;
  }).join('');
}

// ============================================================
// PRODUCTS PAGE
// ============================================================
function renderProducts() {
  const container = document.getElementById('productTableBody');
  const countEl = document.getElementById('productCount');
  const filtersEl = document.getElementById('categoryFilters');

  // Category filters
  const cats = [...new Set(ALL_PRODUCTS.map(p => p.category))];
  filtersEl.innerHTML = `<button class="category-pill active text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-[#888]" data-cat="all">All</button>` +
    cats.map(c => `<button class="category-pill text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-[#888]" data-cat="${c}">${c}</button>`).join('');

  let activeFilter = 'all';
  filtersEl.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      filtersEl.querySelectorAll('.category-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.cat;
      renderTable();
    });
  });

  function renderTable() {
    const filtered = activeFilter === 'all' ? ALL_PRODUCTS : ALL_PRODUCTS.filter(p => p.category === activeFilter);
    countEl.textContent = filtered.length + ' products tracked across ' + new Set(filtered.map(p => p.retailer)).size + ' retailers';

    container.innerHTML = filtered.map(p => {
      const current = p.priceHistory[p.priceHistory.length - 1].price;
      const first = p.priceHistory[0].price;
      const diff = current - first;
      const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : 0;
      const trendColor = diff < -1 ? 'text-[#00ff88] bg-[rgba(0,255,136,0.08)]' : diff > 1 ? 'text-[#ff5050] bg-[rgba(255,80,80,0.08)]' : 'text-[#888] bg-white/[0.03]';
      const trendArrow = diff < -1 ? '&#x25BC;' : diff > 1 ? '&#x25B2;' : '&#x2014;';
      const prices = p.priceHistory.map(h => h.price);
      const sparkColor = diff < -1 ? '#00ff88' : diff > 1 ? '#ff5050' : '#555';

      return `
        <tr class="product-row border-b border-white/[0.03] cursor-pointer">
          <td class="py-3 px-5">
            <div class="flex items-center gap-3">
              <img src="${p.image}" class="rounded-lg object-cover bg-[#1a1a1a] flex-shrink-0" style="width:40px;height:40px;max-width:40px;max-height:40px;" onerror="this.style.display='none'" alt="">
              <div class="min-w-0">
                <div class="text-[12px] font-medium text-[#ddd] truncate max-w-[260px]">${escapeHTML(p.title)}</div>
                <div class="text-[10px] text-[#555] mt-0.5">${p.category}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-[12px] text-[#888]">${p.retailer}</td>
          <td class="py-3 px-4 text-right text-[13px] font-bold text-white">${formatCurrency(current)}</td>
          <td class="py-3 px-4 text-right text-[12px] text-[#00ff88]">${formatCurrency(p.lowestPrice)}</td>
          <td class="py-3 px-4 text-right text-[12px] text-[#ff5050]">${formatCurrency(p.highestPrice)}</td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-2">
              ${sparklineHTML(prices.slice(-8), sparkColor)}
              <span class="trend-badge text-[11px] font-semibold px-2 py-0.5 rounded ${trendColor}">${trendArrow} ${Math.abs(pct)}%</span>
            </div>
          </td>
          <td class="py-3 px-4 text-center text-[12px] text-[#888]">${p.viewCount}</td>
        </tr>`;
    }).join('');
  }

  renderTable();
}

// ============================================================
// PRICE DROPS PAGE
// ============================================================
function renderDrops() {
  const grid = document.getElementById('dropsGrid');
  const drops = ALL_PRODUCTS.filter(p => {
    if (p.priceHistory.length < 2) return false;
    const current = p.priceHistory[p.priceHistory.length - 1].price;
    return current < p.highestPrice * 0.95;
  }).sort((a, b) => {
    const aPct = 1 - a.priceHistory[a.priceHistory.length - 1].price / a.highestPrice;
    const bPct = 1 - b.priceHistory[b.priceHistory.length - 1].price / b.highestPrice;
    return bPct - aPct;
  });

  grid.innerHTML = drops.map((p, i) => {
    const current = p.priceHistory[p.priceHistory.length - 1].price;
    const dropPct = ((1 - current / p.highestPrice) * 100).toFixed(0);
    const savedAmount = (p.highestPrice - current).toFixed(2);
    const prices = p.priceHistory.map(h => h.price);
    const isAtLowest = current <= p.lowestPrice;

    return `
      <div class="glass rounded-2xl p-5 fade-up fade-up-${(i % 5) + 1} cursor-pointer hover:border-[rgba(0,255,136,0.15)] transition-all">
        <div class="flex items-start justify-between mb-3">
          <img src="${p.image}" class="rounded-xl object-cover bg-[#1a1a1a]" style="width:56px;height:56px;max-width:56px;max-height:56px;" onerror="this.style.display='none'" alt="">
          <div class="bg-[rgba(0,255,136,0.12)] text-[#00ff88] text-[14px] font-extrabold px-3 py-1.5 rounded-lg">-${dropPct}%</div>
        </div>
        <div class="text-[13px] font-medium text-[#ddd] mb-1 line-clamp-2 leading-snug" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHTML(p.title)}</div>
        <div class="text-[11px] text-[#555] mb-3">${p.retailer}</div>
        <div class="flex items-end gap-2 mb-3">
          <span class="text-[20px] font-extrabold text-white">${formatCurrency(current)}</span>
          <span class="text-[13px] text-[#555] line-through">${formatCurrency(p.highestPrice)}</span>
        </div>
        ${isAtLowest ? '<div class="text-[11px] font-semibold text-[#00ff88] bg-[rgba(0,255,136,0.06)] px-2.5 py-1 rounded-md inline-block mb-3">Lowest price you\'ve ever seen</div>' : ''}
        <div class="flex items-center justify-between">
          <div class="text-[11px] text-[#666]">Save ${formatCurrency(parseFloat(savedAmount))}</div>
          ${sparklineHTML(prices.slice(-10), '#00ff88')}
        </div>
      </div>`;
  }).join('');

  if (drops.length === 0) {
    grid.innerHTML = '<div class="col-span-3 text-center py-20 text-[#555]">No price drops detected yet. Keep browsing!</div>';
  }
}

// ============================================================
// INSIGHTS PAGE
// ============================================================
function renderInsights() {
  // Free version: show upgrade prompt
  const grid = document.getElementById('insightsGrid');
  const upgrade = document.getElementById('insightsUpgrade');
  if (grid) grid.classList.add('hidden');
  if (upgrade) upgrade.classList.remove('hidden');
  return;
  const grid_ = document.getElementById('insightsGrid');
  const now = Date.now();

  // Generate smart insights from the data
  const totalSpentBrowsing = ALL_PRODUCTS.reduce((s, p) => s + p.priceHistory[p.priceHistory.length - 1].price, 0);
  const mostViewedCategory = Object.entries(ALL_STATS.categories).sort((a, b) => b[1].count - a[1].count)[0];
  const biggestDrop = ALL_PRODUCTS.filter(p => p.priceHistory.length > 1).sort((a, b) => {
    const aD = a.highestPrice - a.priceHistory[a.priceHistory.length - 1].price;
    const bD = b.highestPrice - b.priceHistory[b.priceHistory.length - 1].price;
    return bD - aD;
  })[0];
  const mostViewed = ALL_PRODUCTS.sort((a, b) => b.viewCount - a.viewCount)[0];
  const stableItems = ALL_PRODUCTS.filter(p => p.highestPrice - p.lowestPrice < p.lowestPrice * 0.03);
  const volatileItems = ALL_PRODUCTS.filter(p => (p.highestPrice - p.lowestPrice) / p.lowestPrice > 0.15);

  const insights = [
    {
      icon: '&#x1F4B8;',
      title: 'Total Browsed Value',
      value: formatCurrency(totalSpentBrowsing),
      description: `If you bought everything you browsed, you'd spend ${formatCurrency(totalSpentBrowsing)}. Your browsing-to-buying ratio suggests strong self-control.`,
      color: '#00ff88'
    },
    {
      icon: '&#x1F3AF;',
      title: 'Your Top Category',
      value: mostViewedCategory ? mostViewedCategory[0] : 'N/A',
      description: mostViewedCategory ? `You've browsed ${mostViewedCategory[1].count} ${mostViewedCategory[0].toLowerCase()} items with an average price of ${formatCurrency(mostViewedCategory[1].total / mostViewedCategory[1].count)}. This is where you're most likely to find deals.` : '',
      color: '#00c8ff'
    },
    {
      icon: '&#x1F4A5;',
      title: 'Biggest Price Drop',
      value: biggestDrop ? '-' + ((1 - biggestDrop.priceHistory[biggestDrop.priceHistory.length - 1].price / biggestDrop.highestPrice) * 100).toFixed(0) + '%' : 'N/A',
      description: biggestDrop ? `"${biggestDrop.title.substring(0, 50)}..." dropped from ${formatCurrency(biggestDrop.highestPrice)} to ${formatCurrency(biggestDrop.priceHistory[biggestDrop.priceHistory.length - 1].price)}. That's ${formatCurrency(biggestDrop.highestPrice - biggestDrop.priceHistory[biggestDrop.priceHistory.length - 1].price)} saved if you buy now.` : '',
      color: '#00ff88'
    },
    {
      icon: '&#x1F440;',
      title: 'Most Revisited Item',
      value: mostViewed ? mostViewed.viewCount + ' views' : 'N/A',
      description: mostViewed ? `You keep coming back to "${mostViewed.title.substring(0, 50)}...". Current price: ${formatCurrency(mostViewed.priceHistory[mostViewed.priceHistory.length - 1].price)}. ${mostViewed.priceHistory[mostViewed.priceHistory.length - 1].price <= mostViewed.lowestPrice ? 'It\'s at its lowest — maybe time to buy?' : 'Wait for a better price.'}` : '',
      color: '#a050ff'
    },
    {
      icon: '&#x1F512;',
      title: 'Price-Stable Items',
      value: stableItems.length + ' items',
      description: `${stableItems.length} items in your history rarely change price (less than 3% variance). These include brands that don't discount often — buy when you need them.`,
      color: '#888'
    },
    {
      icon: '&#x1F3A2;',
      title: 'Volatile Prices',
      value: volatileItems.length + ' items',
      description: `${volatileItems.length} items swing more than 15% in price. These are worth waiting on — set alerts and buy on dips.`,
      color: '#ff5050'
    },
  ];

  grid.innerHTML = insights.map((ins, i) => `
    <div class="insight-card glass rounded-2xl p-6 fade-up fade-up-${(i % 5) + 1}">
      <div class="flex items-start justify-between mb-4">
        <div class="text-[28px]">${ins.icon}</div>
        <div class="text-[22px] font-extrabold tracking-tight" style="color:${ins.color}">${ins.value}</div>
      </div>
      <div class="text-[14px] font-semibold text-white mb-2">${ins.title}</div>
      <div class="text-[12px] text-[#888] leading-relaxed">${ins.description}</div>
    </div>
  `).join('');
}

// ============================================================
// DEJA VU PAGE
// ============================================================
function renderDejaVu() {
  // Free version: show upgrade prompt
  const list = document.getElementById('dejavuList');
  const upgrade = document.getElementById('dejavuUpgrade');
  if (list) list.classList.add('hidden');
  if (upgrade) upgrade.classList.remove('hidden');
  return;
  const container = document.getElementById('dejavuList');
  const watched = ALL_PRODUCTS.filter(p => p.viewCount >= 2).sort((a, b) => b.viewCount - a.viewCount);

  container.innerHTML = watched.map((p, i) => {
    const current = p.priceHistory[p.priceHistory.length - 1].price;
    const prices = p.priceHistory.map(h => h.price);
    const isAtLowest = current <= p.lowestPrice;
    const firstSeen = formatDate(p.firstSeen);
    const daysSince = Math.floor((Date.now() - p.firstSeen) / 86400000);
    const priceRange = p.highestPrice - p.lowestPrice;
    const volatility = p.lowestPrice > 0 ? ((priceRange / p.lowestPrice) * 100).toFixed(0) : 0;

    // Mini chart for this product
    const chartId = 'dejavu-chart-' + i;

    let advice = '';
    if (isAtLowest) {
      advice = '<span class="text-[#00ff88] font-semibold">At its lowest price. This is a good time to buy.</span>';
    } else if (current < p.lowestPrice * 1.05) {
      advice = '<span class="text-[#00c8ff] font-semibold">Very close to lowest price. Consider buying soon.</span>';
    } else if (parseInt(volatility) > 15) {
      advice = '<span class="text-[#ffaa00] font-semibold">Price is volatile. Wait for a dip — it will likely drop again.</span>';
    } else {
      advice = '<span class="text-[#888]">Price is stable. No significant savings expected from waiting.</span>';
    }

    return `
      <div class="glass rounded-2xl p-6 fade-up fade-up-${(i % 5) + 1}">
        <div class="flex gap-5">
          <img src="${p.image}" class="rounded-xl object-cover bg-[#1a1a1a] flex-shrink-0" style="width:80px;height:80px;max-width:80px;max-height:80px;" onerror="this.style.display='none'" alt="">
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-[15px] font-semibold text-white mb-1">${escapeHTML(p.title)}</div>
                <div class="text-[12px] text-[#666]">${p.retailer} &middot; ${p.category}</div>
              </div>
              <div class="bg-[rgba(160,80,255,0.1)] text-[#a050ff] text-[12px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0">
                ${p.viewCount} views
              </div>
            </div>
            <div class="grid grid-cols-4 gap-4 mt-4">
              <div>
                <div class="text-[10px] uppercase tracking-wider text-[#555]">Current</div>
                <div class="text-[16px] font-bold text-white mt-0.5">${formatCurrency(current)}</div>
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-wider text-[#555]">Lowest</div>
                <div class="text-[16px] font-bold text-[#00ff88] mt-0.5">${formatCurrency(p.lowestPrice)}</div>
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-wider text-[#555]">Highest</div>
                <div class="text-[16px] font-bold text-[#ff5050] mt-0.5">${formatCurrency(p.highestPrice)}</div>
              </div>
              <div>
                <div class="text-[10px] uppercase tracking-wider text-[#555]">Volatility</div>
                <div class="text-[16px] font-bold text-[#888] mt-0.5">${volatility}%</div>
              </div>
            </div>
            <div class="mt-3 text-[12px]">${advice}</div>
            <div class="flex items-center gap-3 mt-3 text-[11px] text-[#555]">
              <span>First seen ${firstSeen}</span>
              <span>&middot;</span>
              <span>Tracking for ${daysSince} days</span>
              <span class="ml-auto">${sparklineHTML(prices, '#a050ff')}</span>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================
// UTILITIES
// ============================================================
function formatCurrency(n) { return '$' + n.toFixed(2); }
function formatDate(ts) { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}
function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function sparklineHTML(prices, color) {
  if (!prices || prices.length < 2) return '';
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min || 1;
  return '<div class="sparkline">' + prices.map(p => {
    const h = Math.max(3, ((p - min) / range) * 26);
    return `<div class="sparkline-bar" style="height:${h}px;background:${color}"></div>`;
  }).join('') + '</div>';
}
