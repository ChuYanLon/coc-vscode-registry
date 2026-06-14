let allPackages = [];
let activeTypeFilters = new Set();
let activeCategoryFilters = new Set();
let searchQuery = '';
let searchTimeout = null;
let currentPage = 1;
const PAGE_SIZE = 50;

async function init() {
  const resp = await fetch('registry.json');
  allPackages = await resp.json();
  render();
}

function getInstallCmd(pkg) {
  return `:CocCommand loader.install ${pkg.name}`;
}

function getAllTypes(pkgs) {
  return [...new Set(pkgs.map(p => p.type))].sort();
}

function getAllCategories(pkgs) {
  const set = new Set();
  pkgs.forEach(p => p.categories.forEach(c => set.add(c)));
  return [...set].sort();
}

function filterPackages() {
  return allPackages.filter(p => {
    if (activeTypeFilters.size > 0 && !activeTypeFilters.has(p.type)) return false;
    if (activeCategoryFilters.size > 0 && !p.categories.some(c => activeCategoryFilters.has(c))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDisplay = p.displayName.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchLang = p.languages.some(l => l.toLowerCase().includes(q));
      if (!matchName && !matchDisplay && !matchDesc && !matchLang) return false;
    }
    return true;
  });
}

function renderFilters() {
  const types = getAllTypes(allPackages);
  const cats = getAllCategories(allPackages);

  const typeContainer = document.getElementById('type-filters');
  typeContainer.innerHTML = types.map(t =>
    `<span class="filter-badge type ${activeTypeFilters.has(t) ? 'active' : ''}" data-type="${t}">${t}</span>`
  ).join('');

  const catContainer = document.getElementById('category-filters');
  catContainer.innerHTML = cats.map(c =>
    `<span class="filter-badge category ${activeCategoryFilters.has(c) ? 'active' : ''}" data-cat="${c}">${c}</span>`
  ).join('');
}

function renderPackageCards(pkgs) {
  const container = document.getElementById('package-list');
  if (pkgs.length === 0) {
    container.innerHTML = '<div class="package-card" style="text-align:center;color:#484f58;padding:40px;">No packages match your filters.</div>';
    return;
  }

  const totalPages = Math.ceil(pkgs.length / PAGE_SIZE);
  const start = 0;
  const end = Math.min(currentPage * PAGE_SIZE, pkgs.length);
  const pageItems = pkgs.slice(start, end);

  let html = pageItems.map(p => {
    const installCmd = getInstallCmd(p);
    const langTags = p.languages.map(l => `<span class="package-tag lang">${escapeHtml(l)}</span>`).join('');
    const catTags = p.categories.map(c => `<span class="package-tag cat">${escapeHtml(c)}</span>`).join('');
    const typeTag = `<span class="package-tag type ${p.type}">${escapeHtml(p.type)}</span>`;

    return `
      <div class="package-card">
        <div class="package-header">
          <div>
            <div class="package-title">
              ${escapeHtml(p.displayName)}
              <span class="package-name">${escapeHtml(p.name)}</span>
            </div>
            <div class="package-desc">${escapeHtml(p.description)}</div>
            <div class="package-meta">
              ${typeTag}${langTags}${catTags}
            </div>
          </div>
          <div class="package-actions">
            <button class="btn btn-primary copy-btn" data-cmd="${installCmd}">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              Copy install
            </button>
            <a href="${escapeHtml(p.url)}" class="btn" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              Source
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Pagination
  let paginationHtml = '';
  if (totalPages > 1) {
    paginationHtml = '<div class="pagination">';
    paginationHtml += `<span class="page-info">${end} / ${pkgs.length} packages</span>`;
    if (currentPage < totalPages) {
      paginationHtml += `<button class="btn load-more" data-page="${currentPage + 1}">Load more (${Math.min(PAGE_SIZE, pkgs.length - end)} remaining)</button>`;
    }
    if (currentPage > 1) {
      paginationHtml = `<button class="btn load-more" data-page="1">Show less</button> ` + paginationHtml;
    }
    paginationHtml += '</div>';
  }

  container.innerHTML = html + paginationHtml;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function render() {
  const filtered = filterPackages();
  currentPage = 1;
  renderFilters();
  renderPackageCards(filtered);
}

// Event delegation for dynamic buttons
document.getElementById('package-list').addEventListener('click', async e => {
  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    const cmd = copyBtn.dataset.cmd;
    try {
      await navigator.clipboard.writeText(cmd);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    const orig = copyBtn.innerHTML;
    copyBtn.classList.add('btn-copied');
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> Copied!`;
    setTimeout(() => {
      copyBtn.classList.remove('btn-copied');
      copyBtn.innerHTML = orig;
    }, 2000);
    return;
  }

  const loadBtn = e.target.closest('.load-more');
  if (loadBtn) {
    currentPage = parseInt(loadBtn.dataset.page);
    const filtered = filterPackages();
    renderPackageCards(filtered);
    document.querySelector('.pagination')?.scrollIntoView({ behavior: 'smooth' });
  }
});

// Filter clicks via event delegation (no re-binding on every render)
document.getElementById('type-filters').addEventListener('click', e => {
  const el = e.target.closest('.filter-badge.type');
  if (!el) return;
  const t = el.dataset.type;
  if (activeTypeFilters.has(t)) activeTypeFilters.delete(t);
  else activeTypeFilters.add(t);
  render();
});

document.getElementById('category-filters').addEventListener('click', e => {
  const el = e.target.closest('.filter-badge.category');
  if (!el) return;
  const c = el.dataset.cat;
  if (activeCategoryFilters.has(c)) activeCategoryFilters.delete(c);
  else activeCategoryFilters.add(c);
  render();
});

// Debounced search
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value;
    render();
  }, 200);
});

init();
