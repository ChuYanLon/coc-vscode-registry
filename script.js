(function() {
  const saved = localStorage.getItem('coc-registry-theme') || 'dark'
  document.documentElement.setAttribute('data-theme', saved)
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const html = document.documentElement
      const cur = html.getAttribute('data-theme')
      const next = cur === 'dark' ? 'light' : 'dark'
      html.setAttribute('data-theme', next)
      localStorage.setItem('coc-registry-theme', next)
    })
  })
})()

let allPackages = []
let activeTypeFilters = new Set()
let activeCategoryFilters = new Set()
let searchQuery = ''
let searchTimeout = null
let currentPage = 1
const PAGE_SIZE = 50
let isLoading = false

async function init() {
  showSkeleton(true)
  try {
    const resp = await fetch('registry.json')
    allPackages = await resp.json()
  } catch (e) {
    showError('Failed to load registry. Please try again.')
    return
  }
  showSkeleton(false)
  render()
}

function showSkeleton(show) {
  const sk = document.getElementById('skeleton')
  if (sk) sk.style.display = show ? 'flex' : 'none'
}

function showError(msg) {
  const list = document.getElementById('package-list')
  const sk = document.getElementById('skeleton')
  if (sk) sk.style.display = 'none'
  list.innerHTML = `<div class="no-results"><p>${escapeHtml(msg)}</p></div>`
}

function getInstallCmd(pkg) {
  return `:CocCommand loader.install ${pkg.name}`
}

function getAllTypes(pkgs) {
  return [...new Set(pkgs.map(p => p.type))].sort()
}

function getAllCategories(pkgs) {
  const set = new Set()
  pkgs.forEach(p => p.categories.forEach(c => set.add(c)))
  return [...set].sort()
}

function filterPackages() {
  return allPackages.filter(p => {
    if (activeTypeFilters.size > 0 && !activeTypeFilters.has(p.type)) return false
    if (activeCategoryFilters.size > 0 && !p.categories.some(c => activeCategoryFilters.has(c))) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = p.name.toLowerCase().includes(q)
      const matchDisplay = p.displayName.toLowerCase().includes(q)
      const matchDesc = p.description.toLowerCase().includes(q)
      const matchLang = p.languages.some(l => l.toLowerCase().includes(q))
      if (!matchName && !matchDisplay && !matchDesc && !matchLang) return false
    }
    return true
  })
}

function updateStats(total, filtered) {
  document.getElementById('stat-total').textContent = total
  const el = document.getElementById('stat-filtered')
  if (filtered < total) {
    el.textContent = `${filtered} shown`
  } else {
    el.textContent = ''
  }
}

function renderFilters() {
  const types = getAllTypes(allPackages)
  const cats = getAllCategories(allPackages)
  const filtered = filterPackages()

  const typeContainer = document.getElementById('type-filters')
  typeContainer.innerHTML = types.map(t => {
    const count = allPackages.filter(p => p.type === t).length
    const active = activeTypeFilters.has(t) ? 'active' : ''
    return `<span class="filter-badge type ${active}" data-type="${t}">${escapeHtml(t)} <span class="filter-count">${count}</span></span>`
  }).join('')

  const catContainer = document.getElementById('category-filters')
  catContainer.innerHTML = cats.map(c => {
    const count = allPackages.filter(p => p.categories.includes(c)).length
    const active = activeCategoryFilters.has(c) ? 'active' : ''
    return `<span class="filter-badge category ${active}" data-cat="${c}">${escapeHtml(c)} <span class="filter-count">${count}</span></span>`
  }).join('')

  updateStats(allPackages.length, filtered.length)
}

function renderPackageCards(pkgs) {
  const container = document.getElementById('package-list')
  if (pkgs.length === 0) {
    container.innerHTML = '<div class="no-results"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No packages match your filters.</p></div>'
    return
  }

  const end = Math.min(currentPage * PAGE_SIZE, pkgs.length)
  const pageItems = pkgs.slice(0, end)

  let html = pageItems.map(p => {
    const installCmd = getInstallCmd(p)
    const langTags = p.languages.map(l => `<span class="package-tag lang">${escapeHtml(l)}</span>`).join('')
    const catTags = p.categories.map(c => `<span class="package-tag cat">${escapeHtml(c)}</span>`).join('')
    const typeTag = `<span class="package-tag type ${p.type}">${escapeHtml(p.type)}</span>`

    let extraTags = ''
    if (p.minPluginVersion) {
      extraTags += `<span class="package-tag version">≥${escapeHtml(p.minPluginVersion)}</span>`
    }
    if (p.pipPackages && p.pipPackages.length > 0) {
      extraTags += p.pipPackages.map(pkg => `<span class="package-tag pip">pip: ${escapeHtml(pkg)}</span>`).join('')
    }
    if (p.serverBinary) {
      extraTags += `<span class="package-tag binary">bin: ${escapeHtml(p.serverBinary.repo)}</span>`
    }

    return `
      <div class="package-card">
        <div class="package-header">
          <div class="package-body">
            <div class="package-title">
              ${escapeHtml(p.displayName)}
              <span class="package-name">${escapeHtml(p.name)}</span>
            </div>
            <div class="package-desc">${escapeHtml(p.description)}</div>
            ${p.notes ? `<div class="package-notes">⚠ ${escapeHtml(p.notes)}</div>` : ''}
            <div class="package-meta">
              ${typeTag}${langTags}${catTags}${extraTags}
            </div>
          </div>
          <div class="package-actions">
            <button class="btn btn-primary copy-btn" data-cmd="${installCmd}">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              <span class="btn-label">Copy</span>
            </button>
            <a href="${escapeHtml(p.url)}" class="btn" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span class="btn-label">Source</span>
            </a>
          </div>
        </div>
      </div>
    `
  }).join('')

  if (end < pkgs.length) {
    const remaining = pkgs.length - end
    html += `<button class="show-more">Show ${Math.min(remaining, PAGE_SIZE)} more (${end}/${pkgs.length})</button>`
  }
  html += '<div class="scroll-sentinel"></div>'

  container.innerHTML = html
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

function render() {
  const filtered = filterPackages()
  currentPage = 1
  renderFilters()
  renderPackageCards(filtered)
  window.scrollTo({ top: 0, behavior: 'smooth' })
  updateSearchClear()
}

// Event delegation
document.getElementById('package-list').addEventListener('click', async e => {
  const copyBtn = e.target.closest('.copy-btn')
  if (copyBtn) {
    const cmd = copyBtn.dataset.cmd
    try {
      await navigator.clipboard.writeText(cmd)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = cmd
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copyBtn.classList.add('btn-copied')
    const label = copyBtn.querySelector('.btn-label')
    if (label) label.textContent = 'Copied!'
    setTimeout(() => {
      copyBtn.classList.remove('btn-copied')
      if (label) label.textContent = 'Copy'
    }, 2000)
    return
  }

  const showMore = e.target.closest('.show-more')
  if (showMore) {
    showMore.disabled = true
    showMore.textContent = 'Loading...'
    const pkgs = filterPackages()
    const totalPages = Math.ceil(pkgs.length / PAGE_SIZE)
    if (currentPage < totalPages) {
      currentPage++
      renderPackageCards(pkgs)
    }
    return
  }
})

// Infinite scroll
let scrollObserver = null
function setupScrollObserver() {
  if (scrollObserver) scrollObserver.disconnect()
  const sentinel = document.querySelector('.scroll-sentinel')
  if (!sentinel) return
  scrollObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      const pkgs = filterPackages()
      const totalPages = Math.ceil(pkgs.length / PAGE_SIZE)
      if (currentPage < totalPages) {
        currentPage++
        renderPackageCards(pkgs)
      }
    }
  }, { rootMargin: '400px' })
  scrollObserver.observe(sentinel)
}

const origRender = renderPackageCards
renderPackageCards = function(pkgs) {
  origRender(pkgs)
  setupScrollObserver()
}

// Filter clicks
document.getElementById('type-filters').addEventListener('click', e => {
  const el = e.target.closest('.filter-badge.type')
  if (!el) return
  const t = el.dataset.type
  if (activeTypeFilters.has(t)) activeTypeFilters.delete(t)
  else activeTypeFilters.add(t)
  render()
})

document.getElementById('category-filters').addEventListener('click', e => {
  const el = e.target.closest('.filter-badge.category')
  if (!el) return
  const c = el.dataset.cat
  if (activeCategoryFilters.has(c)) activeCategoryFilters.delete(c)
  else activeCategoryFilters.add(c)
  render()
})

// Search
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value
    render()
  }, 200)
})

function updateSearchClear() {
  const btn = document.getElementById('search-clear')
  const input = document.getElementById('search')
  if (!btn || !input) return
  btn.classList.toggle('visible', input.value.length > 0)
}

document.getElementById('search-clear')?.addEventListener('click', () => {
  const input = document.getElementById('search')
  if (input) {
    input.value = ''
    searchQuery = ''
    render()
    input.focus()
  }
})

document.addEventListener('DOMContentLoaded', init)
