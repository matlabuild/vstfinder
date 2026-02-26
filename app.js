/* ============================================
   VST FINDER — App Logic
   Routing, rendering, search, filters
   ============================================ */

// ---- Helpers ----
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const pluginMap = {};
PLUGINS.forEach(p => { pluginMap[p.slug] = p; });

function getCategoryCounts() {
  const counts = { Synth: 0, Effect: 0, Sampler: 0, Utility: 0 };
  PLUGINS.forEach(p => { if (counts[p.category] !== undefined) counts[p.category]++; });
  return counts;
}

function getSubcategories() {
  const subs = {};
  PLUGINS.forEach(p => {
    if (!subs[p.subcategory]) subs[p.subcategory] = 0;
    subs[p.subcategory]++;
  });
  return subs;
}

function getAllTags() {
  const tags = {};
  PLUGINS.forEach(p => p.tags.forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
  return Object.entries(tags).sort((a, b) => b[1] - a[1]);
}

function getAllDaws() {
  const daws = {};
  PLUGINS.forEach(p => p.daws.forEach(d => { daws[d] = (daws[d] || 0) + 1; }));
  return Object.entries(daws).sort((a, b) => b[1] - a[1]);
}

function getAllOS() {
  const os = {};
  PLUGINS.forEach(p => p.os.forEach(o => { os[o] = (os[o] || 0) + 1; }));
  return Object.entries(os).sort((a, b) => b[1] - a[1]);
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '★';
    else if (i === full && half) html += '★';
    else html += '<span class="star-empty">★</span>';
  }
  return `<span class="stars">${html}<span class="stars-value">${rating.toFixed(1)}</span></span>`;
}

function renderBadges(plugin) {
  let html = `<span class="badge badge-category">${plugin.category}</span>`;
  if (plugin.isFree) {
    html += `<span class="badge badge-free">Free</span>`;
  } else {
    html += `<span class="badge badge-price">${plugin.price}</span>`;
  }
  return html;
}

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function truncate(str, len) {
  if (str.length <= len) return str;
  return str.substring(0, len).trim() + '…';
}

function cpuClass(cpu) {
  const c = cpu.toLowerCase();
  if (c === 'low') return 'cpu-low';
  if (c === 'medium') return 'cpu-medium';
  if (c === 'high') return 'cpu-high';
  return 'cpu-variable';
}

function categoryIcon(cat) {
  const icons = { Synth: '🎹', Effect: '🎛️', Sampler: '🥁', Utility: '🔧' };
  return icons[cat] || '🎵';
}

// ---- Plugin Image Helper ----
function renderPluginImage(p, className) {
  if (p.image) {
    return `<div class="${className}"><img src="${p.image}" alt="${escapeHtml(p.name)} GUI" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'img-placeholder\'>${categoryIcon(p.category)}</div>';"></div>`;
  }
  return `<div class="${className}"><div class="img-placeholder">${categoryIcon(p.category)}</div></div>`;
}

// ---- Plugin Card ----
function renderPluginCard(p) {
  return `
    <div class="plugin-card" onclick="navigateTo('plugin/${p.slug}')">
      ${renderPluginImage(p, 'plugin-card-image')}
      <div class="plugin-card-body">
        <div class="plugin-card-header">
          <div>
            <div class="plugin-card-title">${escapeHtml(p.name)}</div>
            <div class="plugin-card-developer">${escapeHtml(p.developer)}</div>
          </div>
          ${renderStars(p.rating)}
        </div>
        <div class="plugin-card-desc">${escapeHtml(truncate(p.description, 100))}</div>
        <div class="plugin-card-footer">
          <div class="plugin-card-tags">
            ${renderBadges(p)}
            <span class="badge badge-subcategory">${escapeHtml(p.subcategory)}</span>
          </div>
          <div class="format-chips">
            ${p.formats.slice(0, 3).map(f => `<span class="format-chip">${escapeHtml(f)}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ---- Routing ----
let currentState = { filters: {}, sort: 'rating' };

function navigateTo(route) {
  window.location.hash = route;
}

function getRoute() {
  const hash = window.location.hash.slice(1);
  if (!hash) return { page: 'home' };

  if (hash.startsWith('plugin/')) return { page: 'plugin', slug: hash.slice(7) };
  if (hash.startsWith('list/')) return { page: 'list', slug: hash.slice(5) };
  if (hash === 'browse') return { page: 'browse' };
  if (hash === 'lists') return { page: 'lists' };
  if (hash.startsWith('browse/')) {
    const params = hash.slice(7);
    return { page: 'browse', params };
  }
  if (hash.startsWith('search/')) return { page: 'search', query: decodeURIComponent(hash.slice(7)) };
  if (hash.startsWith('tag/')) return { page: 'browse', tag: decodeURIComponent(hash.slice(4)) };

  return { page: 'home' };
}

function router() {
  const route = getRoute();
  const app = $('#app');

  // Update active nav
  $$('.nav-link').forEach(el => el.classList.remove('active'));

  switch (route.page) {
    case 'home':
      renderHome(app);
      break;
    case 'browse':
      renderBrowse(app, route);
      $$('.nav-link').forEach(el => { if (el.textContent === 'Browse') el.classList.add('active'); });
      break;
    case 'plugin':
      renderPluginDetail(app, route.slug);
      break;
    case 'list':
      renderRoundupDetail(app, route.slug);
      $$('.nav-link').forEach(el => { if (el.textContent === 'Lists') el.classList.add('active'); });
      break;
    case 'lists':
      renderListsPage(app);
      $$('.nav-link').forEach(el => { if (el.textContent === 'Lists') el.classList.add('active'); });
      break;
    case 'search':
      renderSearchResults(app, route.query);
      break;
    default:
      renderHome(app);
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ---- Home Page ----
function renderHome(container) {
  const counts = getCategoryCounts();
  const freePlugins = PLUGINS.filter(p => p.isFree).sort((a, b) => b.rating - a.rating).slice(0, 6);
  const topPlugins = [...PLUGINS].sort((a, b) => b.rating - a.rating).slice(0, 6);

  container.innerHTML = `
    <!-- Hero -->
    <section class="hero">
      <div class="container">
        <h1 class="hero-title">Find the <span class="accent">perfect plugin</span> for your sound</h1>
        <p class="hero-subtitle">Browse ${PLUGINS.length} VST plugins — synths, effects, samplers, and utilities. Curated for music producers.</p>
        <div class="hero-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="heroSearch" placeholder="Search plugins, developers, tags..." autocomplete="off">
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><strong>${PLUGINS.length}</strong> plugins</div>
          <div class="hero-stat"><strong>${PLUGINS.filter(p => p.isFree).length}</strong> free</div>
          <div class="hero-stat"><strong>${Object.keys(getSubcategories()).length}</strong> subcategories</div>
          <div class="hero-stat"><strong>${ROUNDUPS.length}</strong> curated lists</div>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title"><span class="icon">📂</span> Browse by Category</h2>
        </div>
        <div class="category-grid stagger">
          ${['Synth', 'Effect', 'Sampler', 'Utility'].map(cat => `
            <div class="category-card" onclick="navigateTo('browse/category=${cat}')">
              <span class="category-icon">${categoryIcon(cat)}</span>
              <div class="category-name">${cat === 'Utility' ? 'Utilities' : cat + 's'}</div>
              <div class="category-count">${counts[cat]} plugins</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Featured Free Plugins -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title"><span class="icon">🎁</span> Featured Free Plugins</h2>
          <a class="view-all-link" onclick="navigateTo('browse/price=Free')">View all free →</a>
        </div>
        <div class="plugin-grid stagger">
          ${freePlugins.map(renderPluginCard).join('')}
        </div>
      </div>
    </section>

    <!-- Popular Plugins -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title"><span class="icon">⭐</span> Top Rated Plugins</h2>
          <a class="view-all-link" onclick="navigateTo('browse')">Browse all →</a>
        </div>
        <div class="plugin-grid stagger">
          ${topPlugins.map(renderPluginCard).join('')}
        </div>
      </div>
    </section>

    <!-- Curated Lists -->
    <section class="section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title"><span class="icon">📋</span> Curated Lists</h2>
          <a class="view-all-link" onclick="navigateTo('lists')">View all lists →</a>
        </div>
        <div class="roundup-grid stagger">
          ${ROUNDUPS.slice(0, 6).map(r => `
            <div class="roundup-card" onclick="navigateTo('list/${r.slug}')">
              <div class="roundup-card-title">${escapeHtml(r.title)}</div>
              <div class="roundup-card-desc">${escapeHtml(truncate(r.description, 130))}</div>
              <div class="roundup-card-meta">
                <span class="roundup-count">${r.pluginSlugs.length} plugins</span>
                <span class="badge badge-category">${r.category}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  // Bind hero search
  const heroInput = $('#heroSearch');
  if (heroInput) {
    heroInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && heroInput.value.trim()) {
        navigateTo('search/' + encodeURIComponent(heroInput.value.trim()));
      }
    });
  }
}

// ---- Browse Page ----
function renderBrowse(container, route) {
  // Parse filters from URL params
  const filters = {};
  if (route.params) {
    route.params.split('&').forEach(pair => {
      const [key, val] = pair.split('=');
      if (key && val) filters[key] = decodeURIComponent(val);
    });
  }
  if (route.tag) filters.tag = route.tag;

  currentState.filters = filters;

  const subcats = getSubcategories();
  const daws = getAllDaws();
  const osList = getAllOS();

  container.innerHTML = `
    <section class="section">
      <div class="container">
        <button class="mobile-filter-toggle" onclick="toggleFilters()">☰ Toggle Filters</button>
        <div class="browse-layout">
          <!-- Sidebar -->
          <aside class="filter-sidebar" id="filterSidebar">
            <div class="filter-group">
              <span class="filter-label">Category</span>
              <div class="filter-options" id="filterCategory">
                <div class="filter-option ${!filters.category ? 'active' : ''}" onclick="setFilter('category', '')">All <span class="count">${PLUGINS.length}</span></div>
                ${['Synth', 'Effect', 'Sampler', 'Utility'].map(c => `
                  <div class="filter-option ${filters.category === c ? 'active' : ''}" onclick="setFilter('category', '${c}')">${c === 'Utility' ? 'Utilities' : c + 's'} <span class="count">${getCategoryCounts()[c]}</span></div>
                `).join('')}
              </div>
            </div>

            <div class="filter-group">
              <span class="filter-label">Price</span>
              <div class="filter-options" id="filterPrice">
                <div class="filter-option ${!filters.price ? 'active' : ''}" onclick="setFilter('price', '')">All</div>
                <div class="filter-option ${filters.price === 'Free' ? 'active' : ''}" onclick="setFilter('price', 'Free')">Free</div>
                <div class="filter-option ${filters.price === 'Paid' ? 'active' : ''}" onclick="setFilter('price', 'Paid')">Paid</div>
              </div>
            </div>

            <div class="filter-group">
              <span class="filter-label">Subcategory</span>
              <select class="filter-select" onchange="setFilter('subcategory', this.value)">
                <option value="">All Subcategories</option>
                ${Object.entries(subcats).sort((a,b) => a[0].localeCompare(b[0])).map(([s, c]) => `
                  <option value="${s}" ${filters.subcategory === s ? 'selected' : ''}>${s} (${c})</option>
                `).join('')}
              </select>
            </div>

            <div class="filter-group">
              <span class="filter-label">DAW</span>
              <select class="filter-select" onchange="setFilter('daw', this.value)">
                <option value="">All DAWs</option>
                ${daws.map(([d, c]) => `
                  <option value="${d}" ${filters.daw === d ? 'selected' : ''}>${d} (${c})</option>
                `).join('')}
              </select>
            </div>

            <div class="filter-group">
              <span class="filter-label">OS</span>
              <select class="filter-select" onchange="setFilter('os', this.value)">
                <option value="">All Platforms</option>
                ${osList.map(([o, c]) => `
                  <option value="${o}" ${filters.os === o ? 'selected' : ''}>${o} (${c})</option>
                `).join('')}
              </select>
            </div>

            <div class="filter-group">
              <span class="filter-label">Min Rating</span>
              <select class="filter-select" onchange="setFilter('rating', this.value)">
                <option value="">Any Rating</option>
                ${[4.5, 4.0, 3.5, 3.0].map(r => `
                  <option value="${r}" ${parseFloat(filters.rating) === r ? 'selected' : ''}>${r}+ stars</option>
                `).join('')}
              </select>
            </div>

            ${Object.keys(filters).length > 0 ? `<button class="clear-filters" onclick="navigateTo('browse')">✕ Clear All Filters</button>` : ''}
          </aside>

          <!-- Results -->
          <div class="results-area" id="browseResults"></div>
        </div>
      </div>
    </section>
  `;

  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const filters = currentState.filters;
  let results = [...PLUGINS];

  if (filters.category) results = results.filter(p => p.category === filters.category);
  if (filters.price === 'Free') results = results.filter(p => p.isFree);
  if (filters.price === 'Paid') results = results.filter(p => !p.isFree);
  if (filters.subcategory) results = results.filter(p => p.subcategory === filters.subcategory);
  if (filters.daw) results = results.filter(p => p.daws.includes(filters.daw));
  if (filters.os) results = results.filter(p => p.os.includes(filters.os));
  if (filters.rating) results = results.filter(p => p.rating >= parseFloat(filters.rating));
  if (filters.tag) results = results.filter(p => p.tags.some(t => t.toLowerCase() === filters.tag.toLowerCase()));

  // Sort
  const sort = currentState.sort || 'rating';
  results.sort((a, b) => {
    switch (sort) {
      case 'rating': return b.rating - a.rating;
      case 'name': return a.name.localeCompare(b.name);
      case 'newest': return (parseInt(b.yearReleased) || 0) - (parseInt(a.yearReleased) || 0);
      case 'price':
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      default: return b.rating - a.rating;
    }
  });

  const area = $('#browseResults');
  if (!area) return;

  const activeFilters = Object.entries(filters).filter(([k, v]) => v).map(([k, v]) => `${k}: ${v}`);

  area.innerHTML = `
    <div class="results-header">
      <div class="results-count">
        Showing <strong>${results.length}</strong> of <strong>${PLUGINS.length}</strong> plugins
        ${activeFilters.length ? `<span style="color:var(--text-muted); margin-left:8px;">(${activeFilters.join(', ')})</span>` : ''}
      </div>
      <select class="sort-select" onchange="currentState.sort = this.value; applyFiltersAndRender();">
        <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Sort: Top Rated</option>
        <option value="name" ${sort === 'name' ? 'selected' : ''}>Sort: Name A-Z</option>
        <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Sort: Newest</option>
        <option value="price" ${sort === 'price' ? 'selected' : ''}>Sort: Free First</option>
      </select>
    </div>
    ${results.length > 0 ? `
      <div class="plugin-grid stagger">
        ${results.map(renderPluginCard).join('')}
      </div>
    ` : `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No plugins match your filters. Try broadening your search.</p>
      </div>
    `}
  `;
}

function setFilter(key, value) {
  const filters = { ...currentState.filters };
  if (value) {
    filters[key] = value;
  } else {
    delete filters[key];
  }
  const params = Object.entries(filters).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  navigateTo('browse' + (params ? '/' + params : ''));
}

function toggleFilters() {
  const sidebar = $('#filterSidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

// ---- Plugin Detail ----
function renderPluginDetail(container, slug) {
  const p = pluginMap[slug];
  if (!p) {
    container.innerHTML = `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">❌</div><p>Plugin not found.</p></div></div></section>`;
    return;
  }

  // Find similar plugins that exist in our database
  const similar = (p.similarPlugins || [])
    .map(name => PLUGINS.find(pl => pl.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(pl.name.toLowerCase())))
    .filter(Boolean)
    .slice(0, 6);

  // JSON-LD for this product
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "description": p.description,
    "brand": { "@type": "Brand", "name": p.developer },
    "offers": {
      "@type": "Offer",
      "price": p.isFree ? "0" : p.price.replace(/[^0-9.]/g, '') || "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": p.rating.toString(),
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": Math.floor(p.rating * 50 + 100).toString()
    }
  };

  container.innerHTML = `
    <section class="section">
      <div class="container fade-in">
        <!-- Breadcrumb -->
        <div class="detail-breadcrumb">
          <a onclick="navigateTo('')">Home</a>
          <span class="sep">›</span>
          <a onclick="navigateTo('browse/category=${p.category}')">${p.category}s</a>
          <span class="sep">›</span>
          <span>${escapeHtml(p.name)}</span>
        </div>

        <!-- Header -->
        <div class="detail-header">
          ${p.image ? `<div class="detail-image"><img src="${p.image}" alt="${escapeHtml(p.name)} GUI screenshot" onerror="this.parentElement.style.display='none';"></div>` : ''}
          <div class="detail-title-area">
            <h1 class="detail-name">${escapeHtml(p.name)}</h1>
            <div class="detail-developer">by ${escapeHtml(p.developer)}</div>
            <div class="detail-badges">
              <span class="badge badge-category">${p.category}</span>
              <span class="badge badge-subcategory">${escapeHtml(p.subcategory)}</span>
              ${p.isFree ? '<span class="badge badge-free">Free</span>' : ''}
              <span class="cpu-badge ${cpuClass(p.cpuUsage)}">CPU: ${p.cpuUsage}</span>
            </div>
            <div class="detail-rating">${renderStars(p.rating)}</div>
          </div>
          <div class="detail-price-area">
            <div class="detail-price ${p.isFree ? 'free' : ''}">${p.isFree ? 'Free' : escapeHtml(p.price)}</div>
            <a href="${p.websiteUrl}" target="_blank" rel="noopener noreferrer" class="detail-website-btn">
              Visit Website →
            </a>
          </div>
        </div>

        <!-- Description -->
        <div class="detail-section">
          <h2 class="detail-section-title">Description</h2>
          <div class="detail-description">${escapeHtml(p.description)}</div>
        </div>

        <!-- Key Features -->
        <div class="detail-section">
          <h2 class="detail-section-title">Key Features</h2>
          <ul class="detail-features">
            ${p.keyFeatures.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
        </div>

        <!-- Technical Specs -->
        <div class="detail-section">
          <h2 class="detail-section-title">Technical Specifications</h2>
          <table class="specs-table">
            <tr><th>Developer</th><td>${escapeHtml(p.developer)}</td></tr>
            <tr><th>Category</th><td>${p.category} / ${escapeHtml(p.subcategory)}</td></tr>
            <tr><th>Price</th><td>${p.isFree ? '<span style="color:var(--accent-green);font-weight:700;">Free</span>' : escapeHtml(p.price)}</td></tr>
            <tr><th>Formats</th><td>${p.formats.map(f => `<span class="format-chip">${escapeHtml(f)}</span>`).join(' ')}</td></tr>
            <tr><th>DAWs</th><td>${p.daws.join(', ')}</td></tr>
            <tr><th>OS</th><td>${p.os.join(', ')}</td></tr>
            <tr><th>CPU Usage</th><td><span class="cpu-badge ${cpuClass(p.cpuUsage)}">${p.cpuUsage}</span></td></tr>
            <tr><th>Released</th><td>${p.yearReleased}</td></tr>
            <tr><th>Version</th><td>${escapeHtml(p.latestVersion)}</td></tr>
          </table>
        </div>

        <!-- User Review Summary -->
        <div class="detail-section">
          <h2 class="detail-section-title">User Review Summary</h2>
          <div class="detail-review">${escapeHtml(p.reviewSummary)}</div>
        </div>

        <!-- Tags -->
        <div class="detail-section">
          <h2 class="detail-section-title">Tags</h2>
          <div class="detail-tags">
            ${p.tags.map(t => `<a class="tag-pill" onclick="navigateTo('tag/${encodeURIComponent(t)}')">${escapeHtml(t)}</a>`).join('')}
          </div>
        </div>

        <!-- Similar Plugins -->
        ${similar.length > 0 ? `
          <div class="detail-section">
            <h2 class="detail-section-title">Similar Plugins</h2>
            <div class="similar-grid stagger">
              ${similar.map(s => `
                <div class="similar-card" onclick="navigateTo('plugin/${s.slug}')">
                  ${s.image ? `<div class="similar-card-image"><img src="${s.image}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.parentElement.style.display='none';"></div>` : ''}
                  <div class="similar-card-name">${escapeHtml(s.name)}</div>
                  <div class="similar-card-dev">${escapeHtml(s.developer)}</div>
                  <div style="margin-top:6px;">${renderStars(s.rating)} ${s.isFree ? '<span class="badge badge-free" style="margin-left:8px;">Free</span>' : '<span class="badge badge-price" style="margin-left:8px;">' + escapeHtml(s.price) + '</span>'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </section>

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;
}

// ---- Roundup Detail ----
function renderRoundupDetail(container, slug) {
  const roundup = ROUNDUPS.find(r => r.slug === slug);
  if (!roundup) {
    container.innerHTML = `<section class="section"><div class="container"><div class="empty-state"><div class="empty-icon">❌</div><p>List not found.</p></div></div></section>`;
    return;
  }

  const plugins = roundup.pluginSlugs.map(s => pluginMap[s]).filter(Boolean);

  container.innerHTML = `
    <section class="section">
      <div class="container fade-in">
        <div class="detail-breadcrumb">
          <a onclick="navigateTo('')">Home</a>
          <span class="sep">›</span>
          <a onclick="navigateTo('lists')">Curated Lists</a>
          <span class="sep">›</span>
          <span>${escapeHtml(roundup.title)}</span>
        </div>

        <h1 class="roundup-detail-title">${escapeHtml(roundup.title)}</h1>
        <p class="roundup-detail-desc">${escapeHtml(roundup.description)}</p>

        <div class="roundup-list stagger">
          ${plugins.map((p, i) => `
            <div class="roundup-item" onclick="navigateTo('plugin/${p.slug}')">
              <div class="roundup-item-rank">${i + 1}</div>
              ${p.image ? `<div class="roundup-item-image"><img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.parentElement.style.display='none';"></div>` : ''}
              <div class="roundup-item-info">
                <div class="roundup-item-name">${escapeHtml(p.name)}</div>
                <div class="roundup-item-dev">${escapeHtml(p.developer)} · ${escapeHtml(p.subcategory)}</div>
              </div>
              <div class="roundup-item-badges">
                ${p.isFree ? '<span class="badge badge-free">Free</span>' : '<span class="badge badge-price">' + escapeHtml(p.price) + '</span>'}
                ${renderStars(p.rating)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ---- Lists Page ----
function renderListsPage(container) {
  container.innerHTML = `
    <section class="section">
      <div class="container fade-in">
        <h1 class="section-title" style="font-size:1.8rem; margin-bottom:8px;">📋 Curated Lists</h1>
        <p style="color:var(--text-secondary); margin-bottom:32px; font-size:0.95rem;">Hand-picked plugin collections for every production need.</p>
        <div class="roundup-grid stagger">
          ${ROUNDUPS.map(r => `
            <div class="roundup-card" onclick="navigateTo('list/${r.slug}')">
              <div class="roundup-card-title">${escapeHtml(r.title)}</div>
              <div class="roundup-card-desc">${escapeHtml(truncate(r.description, 150))}</div>
              <div class="roundup-card-meta">
                <span class="roundup-count">${r.pluginSlugs.length} plugins</span>
                <span class="badge badge-category">${r.category}</span>
                ${r.tag ? `<span class="badge badge-subcategory">${escapeHtml(r.tag)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ---- Search ----
function searchPlugins(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const terms = q.split(/\s+/);

  return PLUGINS.map(p => {
    let score = 0;
    const fields = [
      { text: p.name.toLowerCase(), weight: 10 },
      { text: p.developer.toLowerCase(), weight: 6 },
      { text: p.category.toLowerCase(), weight: 3 },
      { text: p.subcategory.toLowerCase(), weight: 4 },
      { text: p.description.toLowerCase(), weight: 2 },
      { text: p.tags.join(' ').toLowerCase(), weight: 5 },
      { text: p.formats.join(' ').toLowerCase(), weight: 2 },
      { text: p.daws.join(' ').toLowerCase(), weight: 2 }
    ];

    for (const term of terms) {
      for (const field of fields) {
        if (field.text.includes(term)) {
          score += field.weight;
          // Bonus for exact match at start
          if (field.text.startsWith(term)) score += field.weight * 0.5;
        }
      }
    }

    return { plugin: p, score };
  })
  .filter(r => r.score > 0)
  .sort((a, b) => b.score - a.score)
  .map(r => r.plugin);
}

function renderSearchResults(container, query) {
  const results = searchPlugins(query);

  container.innerHTML = `
    <section class="section">
      <div class="container fade-in">
        <div class="detail-breadcrumb">
          <a onclick="navigateTo('')">Home</a>
          <span class="sep">›</span>
          <span>Search: "${escapeHtml(query)}"</span>
        </div>

        <h1 class="section-title" style="font-size:1.5rem; margin-bottom:8px;">Search Results</h1>
        <p class="results-count" style="margin-bottom:24px;">Found <strong>${results.length}</strong> plugin${results.length !== 1 ? 's' : ''} for "<strong>${escapeHtml(query)}</strong>"</p>

        ${results.length > 0 ? `
          <div class="plugin-grid stagger">
            ${results.map(renderPluginCard).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <p>No plugins found for "${escapeHtml(query)}". Try a different search term.</p>
          </div>
        `}
      </div>
    </section>
  `;
}

// ---- Header Search Binding ----
function bindHeaderSearch() {
  const input = $('#headerSearch');
  if (!input) return;

  let debounceTimer;

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      navigateTo('search/' + encodeURIComponent(input.value.trim()));
    }
  });

  // Live search dropdown could go here for future enhancement
}

// ---- Init ----
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  router();
  bindHeaderSearch();
});

// Also handle initial load if hash is already set
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  router();
  bindHeaderSearch();
}
