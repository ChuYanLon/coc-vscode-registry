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

  console.log(`Checking ${entries.length} GitHub repos...\n`)

  const status: Record<string, StatusEntry> = {}
  let ok = 0, fail = 0

  const pool = new Set<Promise<void>>()
  for (const entry of entries) {
    const p = (async () => {
      const repo = entry.source!.repo!
      const data = ghApi(`repos/${repo}`)
      if (data) {
        status[entry.name] = {
          archived: data.archived ?? false,
          lastUpdated: (data.pushed_at || '').split('T')[0],
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
}

main().catch(e => { console.error(e); process.exit(1) })
