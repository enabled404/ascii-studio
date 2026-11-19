// Generate terminal .sh animation scripts into public/ascii-art/scripts/
// and dist/ascii-art/scripts/ for direct terminal curl execution.
// Written by Saad Khalid (@saadkhalidhere).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.join(rootDir, 'public', 'ascii-art', 'scripts')
const distOutDir = path.join(rootDir, 'dist', 'ascii-art', 'scripts')

fs.mkdirSync(outDir, { recursive: true })
if (fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(distOutDir, { recursive: true })
}

const PORT = 4179
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: rootDir,
  stdio: 'ignore',
})

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error('Server timeout on ' + url)
}

try {
  await waitForServer(`http://127.0.0.1:${PORT}/`)
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${PORT}/?selftest=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#selftest-results', { state: 'attached', timeout: 30000 })

  const scripts = await page.evaluate(() => {
    const api = window.__animatedArt
    if (!api || !api.NATIVE_PIECES) return []
    const out = []
    for (const piece of api.NATIVE_PIECES) {
      try {
        const render = piece.create()
        const script = api.generateTerminalScript(piece.meta, render, 2.5)
        out.push({ slug: piece.meta.slug, script })
      } catch (err) {
        console.error('Error generating script for ' + piece.meta.slug, err)
      }
    }
    return out
  })

  await browser.close()

  console.log(`Generated ${scripts.length} terminal animation scripts:`)
  for (const s of scripts) {
    const pubFile = path.join(outDir, `${s.slug}.sh`)
    fs.writeFileSync(pubFile, s.script, 'utf8')
    fs.chmodSync(pubFile, 0o755)
    if (fs.existsSync(path.join(rootDir, 'dist'))) {
      const distFile = path.join(distOutDir, `${s.slug}.sh`)
      fs.writeFileSync(distFile, s.script, 'utf8')
      fs.chmodSync(distFile, 0o755)
    }
    console.log(`  ✓ /ascii-art/scripts/${s.slug}.sh (${s.script.length} bytes)`)
  }
} finally {
  preview.kill()
}
