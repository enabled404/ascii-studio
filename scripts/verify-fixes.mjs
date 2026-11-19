// Deep verification script testing Physics particles, Batch ZIP, Audio, and Webcam mirror
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const PORT = 4174
const BASE = `http://127.0.0.1:${PORT}`

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve(true)
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('server did not start'))
      setTimeout(tick, 400)
    }
    tick()
  })
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})

try {
  await waitForServer(`${BASE}/`)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
      errors.push(`console: ${m.text()}`)
    }
  })

  await page.goto(`${BASE}/#studio`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  console.log('--- 1. Testing Physics Simulation Controls ---')
  await page.click('.tab >> text=Tune')
  await page.waitForTimeout(300)
  await page.click('label:has-text("Enable Physics Particle Simulation")')
  await page.waitForTimeout(400)

  const physicsBarVisible = await page.locator('.physics-control-bar').isVisible()
  console.log('Physics Control Bar Visible:', physicsBarVisible)
  if (!physicsBarVisible) throw new Error('Physics control bar not visible after toggle')

  // Switch force modes in physics bar
  await page.click('.physics-control-bar >> text=🧲 Attract')
  await page.waitForTimeout(200)
  await page.click('.physics-control-bar >> text=🌀 Vortex')
  await page.waitForTimeout(200)
  await page.click('.physics-control-bar >> text=💥 Repel')
  await page.waitForTimeout(200)

  // Move pointer over canvas and test physics reactivity
  const canvas = page.locator('canvas.preview-canvas.art')
  const box = await canvas.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(300)
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7)
    await page.waitForTimeout(300)
  }

  // Reset particles
  await page.click('.physics-control-bar >> text=↺ Reset Particles')
  await page.waitForTimeout(200)

  // Exit physics
  await page.click('.physics-control-bar >> text=✕ Exit Physics')
  await page.waitForTimeout(300)
  const physicsBarClosed = !(await page.locator('.physics-control-bar').isVisible())
  console.log('Physics Exit Worked:', physicsBarClosed)
  if (!physicsBarClosed) throw new Error('Exit physics failed')

  console.log('--- 2. Testing Batch ZIP Export in Tools & Export tabs ---')
  await page.click('.tab >> text=Tools')
  await page.waitForTimeout(300)
  const batchZipBtnTools = page.locator('.tab-body >> button:has-text("Batch Export Images to ZIP")')
  console.log('Batch ZIP Button in Tools Visible:', await batchZipBtnTools.isVisible())
  if (!(await batchZipBtnTools.isVisible())) throw new Error('Batch ZIP button not visible in Tools tab')

  await page.click('.tab >> text=Export')
  await page.waitForTimeout(300)
  const batchZipBtnExport = page.locator('.tab-body >> button:has-text("Batch Export Images to ZIP")')
  console.log('Batch ZIP Button in Export Visible:', await batchZipBtnExport.isVisible())
  if (!(await batchZipBtnExport.isVisible())) throw new Error('Batch ZIP button not visible in Export tab')

  console.log('--- 3. Testing Audio File Upload UI in Tune tab ---')
  await page.click('.tab >> text=Tune')
  await page.waitForTimeout(300)
  // Enable audio
  await page.click('label:has-text("Enable Audio Modulation")')
  await page.waitForTimeout(300)
  const audioFileBtn = page.locator('button:has-text("File (.mp3/.wav)")')
  console.log('Audio File Upload Button Visible:', await audioFileBtn.isVisible())
  if (!(await audioFileBtn.isVisible())) throw new Error('Audio file button not visible in Tune tab')

  console.log('--- 4. Testing End-to-End Batch ZIP Processing & Extraction ---')
  // Create 2 test PNG images locally
  const testImg1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64')
  const testImg2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVR42mNk+M9QzwAEjDAGVUSVom8QAAA4QAc7L0681QAAAABJRU5ErkJggg==', 'base64')
  fs.writeFileSync('/tmp/test_img1.png', testImg1)
  fs.writeFileSync('/tmp/test_img2.png', testImg2)

  // Set up download listener
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })

  // Find the hidden batch file input and upload images
  const batchInput = page.locator('input[type="file"][multiple]')
  await batchInput.setInputFiles(['/tmp/test_img1.png', '/tmp/test_img2.png'])

  const download = await downloadPromise
  const zipPath = '/tmp/downloaded_batch.zip'
  await download.saveAs(zipPath)
  console.log('Downloaded ZIP archive saved to:', zipPath, 'Size:', fs.statSync(zipPath).size)

  // Verify the zip with unzip -t and list contents
  const zipTestOut = execSync(`unzip -t ${zipPath}`).toString()
  console.log('ZIP Integrity Test Output:\n' + zipTestOut)
  const zipListOut = execSync(`unzip -l ${zipPath}`).toString()
  console.log('ZIP Content Listing:\n' + zipListOut)

  if (!zipListOut.includes('test_img1.png') || !zipListOut.includes('test_img1.txt') ||
      !zipListOut.includes('test_img2.png') || !zipListOut.includes('test_img2.txt')) {
    throw new Error('ZIP archive missing expected batch processed files')
  }

  console.log('--- 5. Testing Stage Bar Transform Controls ---')
  const flipHBtn = page.locator('.stage-bar >> button:has-text("Flip H")')
  console.log('Flip H in stage-bar Visible:', await flipHBtn.isVisible())
  if (!(await flipHBtn.isVisible())) throw new Error('Flip H button not visible in stage bar')
  await flipHBtn.click()
  await page.waitForTimeout(200)
  await flipHBtn.click()
  await page.waitForTimeout(200)

  console.log('Page Errors encountered:', errors.length ? errors : 'none')
  if (errors.length > 0) throw new Error(`Page errors: ${errors.join(', ')}`)

  console.log('ALL DEEP VERIFICATION CHECKS PASSED COMPLETELY!')
  await browser.close()
  process.exit(0)
} finally {
  preview.kill('SIGTERM')
}
