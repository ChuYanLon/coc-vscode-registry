#!/usr/bin/env node
/**
 * Check all GitHub repos in registry.json for archived status, stars, and latest release.
 * Generates repo-status.json (map of entry name → { archived, lastUpdated, stars, releaseTag, releaseDate }).
 * Requires gh CLI authenticated.
 *
 * Usage: npx tsx scripts/check-repo-status.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { execFileSync } from 'child_process'

const REGISTRY_PATH = path.resolve(__dirname, '../registry.json')
const STATUS_PATH = path.resolve(__dirname, '../repo-status.json')
const CONCURRENCY = 8

interface StarPoint { date: string; count: number }

interface StatusEntry {
  archived: boolean
  lastUpdated: string
  stars: number
  starHistory?: StarPoint[]
  releaseTag?: string
  releaseDate?: string
}

function ghApi(url: string): { archived?: boolean; pushed_at?: string; stargazers_count?: number } | null {
  try {
    const out = execFileSync('gh', ['api', url, '--jq', '{ archived, pushed_at, stargazers_count }'], {
      encoding: 'utf-8', timeout: 15000, maxBuffer: 1024 * 1024,
    })
    return JSON.parse(out.trim())
  } catch {
    return null
  }
}

function ghApiRelease(url: string): { tag_name?: string; published_at?: string } | null {
  try {
    const out = execFileSync('gh', ['api', url, '--jq', '{ tag_name, published_at }'], {
      encoding: 'utf-8', timeout: 15000, maxBuffer: 1024 * 1024,
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    return JSON.parse(out.trim())
  } catch {
    return null
  }
}

async function main() {
  const registry: any[] = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
  const entries = registry.filter(e => e.source?.type === 'github' && e.source?.repo)

  console.log(`Checking ${entries.length} GitHub repos...\n`)

  const prev: Record<string, StatusEntry> = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'))
  const today = new Date().toISOString().split('T')[0]
  const status: Record<string, StatusEntry> = {}
  const archivedList: Array<{ name: string; repo: string }> = []
  let ok = 0, fail = 0

  const pool = new Set<Promise<void>>()
  for (const entry of entries) {
    const p = (async () => {
      const repo = entry.source!.repo!
      const data = ghApi(`repos/${repo}`)
      const release = ghApiRelease(`repos/${repo}/releases/latest`)
      if (data) {
        const archived = data.archived ?? false
        const stars = data.stargazers_count ?? 0
        const prevEntry = prev[entry.name]
        const history = prevEntry?.starHistory ? [...prevEntry.starHistory] : []
        if (!history.length || history[history.length - 1].date !== today) {
          history.push({ date: today, count: stars })
          if (history.length > 52) history.splice(0, history.length - 52)
        }
        const entry_data: StatusEntry = {
          archived,
          lastUpdated: (data.pushed_at || '').split('T')[0],
          stars,
          starHistory: history,
        }
        if (release?.tag_name) {
          entry_data.releaseTag = release.tag_name
          entry_data.releaseDate = (release.published_at || '').split('T')[0]
        }
        status[entry.name] = entry_data
        if (archived) archivedList.push({ name: entry.name, repo })
        const icon = archived ? '📦' : '✓'
        console.log(`${icon} ${entry.name.padEnd(35)} ${repo}`)
        ok++
      } else {
        console.log(`✗ ${entry.name.padEnd(35)} ${repo}`)
        fail++
      }
    })()
    pool.add(p)
    if (pool.size >= CONCURRENCY) await Promise.race(pool)
  }
  await Promise.allSettled(pool)

  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2) + '\n')
  console.log(`\nDone: ${ok} ok, ${fail} failed → ${STATUS_PATH}`)

  // Output archived list for workflow
  if (archivedList.length > 0) {
    const lines = archivedList.map(a => `${a.name}:${a.repo}`).join('|')
    console.log(`\nARCHIVED_REPOS:${lines}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
