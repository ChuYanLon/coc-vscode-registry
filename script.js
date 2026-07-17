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
let activeLangFilters = new Set()
let searchQuery = ''
let sortBy = 'default'
let searchTimeout = null
let currentPage = 1
const PAGE_SIZE = 50
let currentSort = null

async function init() {
  showSkeleton(true)
  try {
    const [regResp, statusResp] = await Promise.all([
      fetch('registry.json'),
      fetch('repo-status.json').catch(() => null),
    ])
    allPackages = await regResp.json()
    const repoStatus = statusResp?.ok ? await statusResp.json() : {}
    allPackages.forEach((p, i) => {
      p._index = i
      const s = repoStatus[p.name] || {}
      p.archived = s.archived
      p.lastUpdated = s.lastUpdated
    })
    buildStats()
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

function buildStats() {
  const typeCounts = {}
  const catCounts = {}
  const langCounts = {}
  for (const p of allPackages) {
    typeCounts[p.type] = (typeCounts[p.type] || 0) + 1
    for (const c of p.categories) catCounts[c] = (catCounts[c] || 0) + 1
    for (const l of p.languages) langCounts[l] = (langCounts[l] || 0) + 1
  }

  const typeColors = {
    'pure-lsp': 'var(--yellow)',
    'direct-api': 'var(--pink)',
    'ts-bridge': 'var(--purple)',
    'snippets': 'var(--gray)',
  }

  document.getElementById('stats-types').innerHTML =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="stat-item" style="border-color:${typeColors[k]||'var(--border)'};color:${typeColors[k]||'var(--text-secondary)'}"><span class="stat-num">${v}</span>${escapeHtml(k)}</span>`).join('')

  document.getElementById('stats-categories').innerHTML =
    Object.entries(catCounts).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="stat-item"><span class="stat-num">${v}</span>${escapeHtml(k)}</span>`).join('')

  document.getElementById('stats-languages').innerHTML =
    Object.entries(langCounts).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="stat-item"><span class="stat-num">${v}</span>${escapeHtml(k)}</span>`).join('')
}

function getInstallCmd(pkg) {
  return `:CocCommand loader.install ${pkg.name}`
}

function sortPackages(pkgs) {
  const s = document.getElementById('sort-select').value
  if (s === 'default') return [...pkgs]
  const sorted = [...pkgs]
  switch (s) {
    case 'name':
      sorted.sort((a, b) => a.displayName.localeCompare(b.displayName))
      break
    case 'type':
      sorted.sort((a, b) => a.type.localeCompare(b.type) || a.displayName.localeCompare(b.displayName))
      break
    case 'category':
      sorted.sort((a, b) => {
        const ac = a.categories[0] || ''
        const bc = b.categories[0] || ''
        return ac.localeCompare(bc) || a.displayName.localeCompare(b.displayName)
      })
      break
  }
  return sorted
}

function filterPackages() {
  let pkgs = allPackages.filter(p => {
    if (activeTypeFilters.size > 0 && !activeTypeFilters.has(p.type)) return false
    if (activeCategoryFilters.size > 0 && !p.categories.some(c => activeCategoryFilters.has(c))) return false
    if (activeLangFilters.size > 0 && !p.languages.some(l => activeLangFilters.has(l))) return false
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
  return sortPackages(pkgs)
}

function updateStats(total, filtered) {
  document.getElementById('stat-total').textContent = total
  const el = document.getElementById('stat-filtered')
  el.textContent = filtered < total ? `${filtered} shown` : ''
}

function renderActiveFilters() {
  const container = document.getElementById('active-filters')
  const chips = []
  for (const t of activeTypeFilters) chips.push({ type: 'type', label: t })
  for (const c of activeCategoryFilters) chips.push({ type: 'category', label: c })
  for (const l of activeLangFilters) chips.push({ type: 'lang', label: l })
  if (chips.length === 0) { container.innerHTML = ''; return }
  container.innerHTML = chips.map(c =>
    `<span class="active-filter-tag" data-filter-type="${c.type}" data-filter-value="${escapeHtml(c.label)}">${escapeHtml(c.label)} <button class="active-filter-remove">✕</button></span>`
  ).join('') +
  `<button class="clear-filters-btn">Clear all</button>`
}

function renderFilters() {
  const types = getAllTypes(allPackages)
  const cats = getAllCategories(allPackages)
  const filtered = filterPackages()

  document.getElementById('type-filters').innerHTML = types.map(t => {
    const count = allPackages.filter(p => p.type === t).length
    const active = activeTypeFilters.has(t) ? 'active' : ''
    return `<span class="filter-badge type ${active}" data-type="${t}">${escapeHtml(t)} <span class="filter-count">${count}</span></span>`
  }).join('')

  document.getElementById('category-filters').innerHTML = cats.map(c => {
    const count = allPackages.filter(p => p.categories.includes(c)).length
    const active = activeCategoryFilters.has(c) ? 'active' : ''
    return `<span class="filter-badge category ${active}" data-cat="${c}">${escapeHtml(c)} <span class="filter-count">${count}</span></span>`
  }).join('')

  updateStats(allPackages.length, filtered.length)
}

function getAllTypes(pkgs) {
  return [...new Set(pkgs.map(p => p.type))].sort()
}

function getAllCategories(pkgs) {
  const set = new Set()
  pkgs.forEach(p => p.categories.forEach(c => set.add(c)))
  return [...set].sort()
}

function renderPackageCards(pkgs) {
  const container = document.getElementById('package-list')
  const expandedName = document.querySelector('.package-card.expanded')?.dataset?.pkgName
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
    const isExpanded = expandedName === p.name

    let extraTags = ''
    if (p.archived) {
      extraTags += `<span class="package-tag archived">archived</span>`
    }
    if (p.minPluginVersion) {
      extraTags += `<span class="package-tag version">≥${escapeHtml(p.minPluginVersion)}</span>`
    }
    if (p.pipPackages && p.pipPackages.length > 0) {
      extraTags += p.pipPackages.map(pkg => `<span class="package-tag pip">pip: ${escapeHtml(pkg)}</span>`).join('')
    }
    if (p.serverBinary) {
      extraTags += `<span class="package-tag binary">bin: ${escapeHtml(p.serverBinary.repo)}</span>`
    }

    const deps = []
    if (p.goPackages?.length) deps.push(`Go: ${p.goPackages.join(', ')}`)
    if (p.cargoPackages?.length) deps.push(`Cargo: ${p.cargoPackages.map(c => typeof c === 'string' ? c : c.crate).join(', ')}`)
    if (p.pipPackages?.length) deps.push(`pip: ${p.pipPackages.join(', ')}`)
    if (p.serverBinary) deps.push(`binary: ${p.serverBinary.repo}`)
    if (p.prebuilt) deps.push('prebuilt-vsix')

    const sourceUrl = p.source?.repo ? `https://github.com/${p.source.repo}` : p.url

    return `
      <div class="package-card ${isExpanded ? 'expanded' : ''}" data-pkg-name="${escapeHtml(p.name)}">
        <div class="package-header">
          <div class="package-body">
            <div class="package-title">
              ${escapeHtml(p.displayName)}
              <span class="package-name">${escapeHtml(p.name)}</span>
              ${p.lastUpdated ? `<span class="package-date">${escapeHtml(p.lastUpdated)}</span>` : ''}
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
            <a href="${escapeHtml(p.url || sourceUrl)}" class="btn" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              <span class="btn-label">Source</span>
            </a>
          </div>
        </div>
        <div class="package-detail">
          <div class="package-detail-row">
            <span class="package-detail-label">Install</span>
            <span class="package-detail-value"><code>${escapeHtml(installCmd)}</code></span>
          </div>
          ${sourceUrl ? `<div class="package-detail-row"><span class="package-detail-label">Source</span><span class="package-detail-value"><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceUrl)}</a></span></div>` : ''}
          ${deps.length ? `<div class="package-detail-row"><span class="package-detail-label">Deps</span><span class="package-detail-value">${deps.join(' · ')}</span></div>` : ''}
          ${p.type && p.type !== 'snippets' ? `<div class="package-detail-row"><span class="package-detail-label">Type</span><span class="package-detail-value">${escapeHtml(p.type)}</span></div>` : ''}
          ${p.languages.length ? `<div class="package-detail-row"><span class="package-detail-label">Languages</span><span class="package-detail-value">${p.languages.join(', ')}</span></div>` : ''}
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
  renderActiveFilters()
  renderPackageCards(filtered)
  window.scrollTo({ top: 0, behavior: 'smooth' })
  updateSearchClear()
}

// Card click: toggle expand
document.getElementById('package-list').addEventListener('click', e => {
  const copyBtn = e.target.closest('.copy-btn')
  if (copyBtn) {
    const cmd = copyBtn.dataset.cmd
    copyToClipboard(cmd)
    copyBtn.classList.add('btn-copied')
    const label = copyBtn.querySelector('.btn-label')
    if (label) label.textContent = 'Copied!'
    setTimeout(() => {
      copyBtn.classList.remove('btn-copied')
      if (label) label.textContent = 'Copy'
    }, 2000)
    return
  }

  const card = e.target.closest('.package-card')
  if (card) {
    const tag = e.target.closest('.package-tag')
    if (tag) {
      if (tag.classList.contains('lang')) {
        const lang = tag.textContent.trim()
        if (activeLangFilters.has(lang)) activeLangFilters.delete(lang)
        else activeLangFilters.add(lang)
        render()
        return
      }
      if (tag.classList.contains('cat')) {
        const cat = tag.textContent.trim()
        if (activeCategoryFilters.has(cat)) activeCategoryFilters.delete(cat)
        else activeCategoryFilters.add(cat)
        render()
        return
      }
      return
    }
    const action = e.target.closest('.package-actions, .btn')
    if (action) return
    card.classList.toggle('expanded')
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

function copyToClipboard(text) {
  try {
    navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
}

// Active filters
document.getElementById('active-filters').addEventListener('click', e => {
  const removeBtn = e.target.closest('.active-filter-remove')
  if (removeBtn) {
    const tag = removeBtn.closest('.active-filter-tag')
    if (!tag) return
    const type = tag.dataset.filterType
    const val = tag.dataset.filterValue
    if (type === 'type') activeTypeFilters.delete(val)
    else if (type === 'category') activeCategoryFilters.delete(val)
    else if (type === 'lang') activeLangFilters.delete(val)
    render()
    return
  }
  const clearBtn = e.target.closest('.clear-filters-btn')
  if (clearBtn) {
    activeTypeFilters.clear()
    activeCategoryFilters.clear()
    activeLangFilters.clear()
    document.getElementById('search').value = ''
    searchQuery = ''
    render()
    return
  }
})

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

// Sort
document.getElementById('sort-select').addEventListener('change', () => {
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

// Stats toggle
document.getElementById('stats-toggle')?.addEventListener('click', () => {
  const panel = document.getElementById('stats-panel')
  const btn = document.getElementById('stats-toggle')
  const isOpen = panel.classList.toggle('open')
  btn.classList.toggle('open')
  btn.textContent = isOpen ? '▾ Stats' : '▸ Stats'
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

const origRenderCards = renderPackageCards
renderPackageCards = function(pkgs) {
  origRenderCards(pkgs)
  setupScrollObserver()
}

// Back to top
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top')
  if (!btn) return
  btn.classList.toggle('visible', window.scrollY > 600)
})

document.getElementById('back-to-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// Alert dismiss
const banner = document.getElementById('alert-banner')
const dismissBtn = document.getElementById('alert-dismiss')
if (banner && dismissBtn) {
  if (localStorage.getItem('coc-registry-alert-dismissed')) {
    banner.classList.add('hidden')
  }
  dismissBtn.addEventListener('click', () => {
    banner.classList.add('hidden')
    localStorage.setItem('coc-registry-alert-dismissed', '1')
  })
}

document.addEventListener('DOMContentLoaded', init)
