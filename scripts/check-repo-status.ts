#!/usr/bin/env node
/**
 * Check all GitHub repos in registry.json for archived status and last update time.
 * Generates repo-status.json (map of entry name → { archived, lastUpdated }).
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

interface StatusEntry {
  archived: boolean
  lastUpdated: string
}

function ghApi(url: string): { archived?: boolean; pushed_at?: string } | null {
  try {
    const out = execFileSync('gh', ['api', url, '--jq', '{ archived, pushed_at }'], {
      encoding: 'utf-8', timeout: 15000, maxBuffer: 1024 * 1024,
    })
    return JSON.parse(out.trim())
  } catch {
    return null
  }
}

async function main() {
  const registry: any[] = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
  const entries = registry.filter(e => e.source?.type === 'github' && e.source?.repo)

  // Load old status for change detection
  let oldStatus: Record<string, StatusEntry> = {}
  try { oldStatus = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8')) } catch {}

  console.log(`Checking ${entries.length} GitHub repos...\n`)

  const status: Record<string, StatusEntry> = {}
  const newlyArchived: string[] = []
  let ok = 0, fail = 0

  const pool = new Set<Promise<void>>()
  for (const entry of entries) {
    const p = (async () => {
      const repo = entry.source!.repo!
      const data = ghApi(`repos/${repo}`)
      if (data) {
        const archived = data.archived ?? false
        status[entry.name] = {
          archived,
          lastUpdated: (data.pushed_at || '').split('T')[0],
        }
        // Detect newly archived
        const old = oldStatus[entry.name]
        if (archived && old && !old.archived) {
          newlyArchived.push(entry.name)
        }
        const icon = data.archived ? '📦' : '✓'
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

  // Output newly archived for workflow to consume
  if (newlyArchived.length > 0) {
    console.log(`\nNEWLY_ARCHIVED:${newlyArchived.join(',')}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
