// Standalone script to record a cinematic 20-second product demo of ASCII Studio.
// Records high-res video using Playwright, then transcodes to demo.mp4, demo.webm, and demo.gif using ffmpeg.
import { spawn, execSync } from 'node:child_process'
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const PORT = 4175
const BASE = `http://127.0.0.1:${PORT}`
const TEMP_DIR = path.resolve('scripts/temp-video')

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve(true)
      } catch { /* waiting */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('Server did not start in time'))
      setTimeout(tick, 400)
    }
    tick()
  })
}

console.log('Starting preview server on port', PORT, '...')
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})

try {
  await waitForServer(`${BASE}/`)
  console.log('Preview server ready at', BASE)

  const browser = await chromium.launch({
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: TEMP_DIR,
      size: { width: 1280, height: 720 },
    },
  })

  const page = await context.newPage()
  console.log('Navigating to landing page...')
  const startTime = Date.now()

  // 1. Landing page hero and typography (0s -> 3s)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // Drag comparison slider to demonstrate ASCII conversion
  const slider = page.locator('.ba-slider')
  if (await slider.isVisible()) {
    const box = await slider.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 12 })
      await page.waitForTimeout(300)
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 15 })
      await page.waitForTimeout(300)
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 10 })
      await page.mouse.up()
    }
  }

  // 2. Open Studio (3s -> 5s)
  console.log('Opening Studio workspace...')
  const openBtn = page.locator('button:has-text("Open Studio — it’s free"), button:has-text("Open Studio")').first()
  await openBtn.hover()
  await page.waitForTimeout(300)
  await openBtn.click()
  await page.waitForSelector('.preview-canvas.art', { state: 'visible', timeout: 10000 })
  await page.waitForTimeout(1000)

  // 3. Switch standout styles (5s -> 11s)
  console.log('Demonstrating styles: Matrix Rain, LEGO Bricks, Braille, Cyberterminal...')
  
  // Matrix Rain
  const matrixBtn = page.locator('button[title="Matrix Rain"], button:has-text("Matrix Rain")').first()
  if (await matrixBtn.isVisible()) {
    await matrixBtn.click()
    await page.waitForTimeout(1500)
  }

  // LEGO Bricks
  const legoBtn = page.locator('button[title="LEGO Bricks"], button:has-text("LEGO Bricks")').first()
  if (await legoBtn.isVisible()) {
    await legoBtn.click()
    await page.waitForTimeout(1500)
  }

  // Braille
  const brailleBtn = page.locator('button[title="Braille"], button:has-text("Braille")').first()
  if (await brailleBtn.isVisible()) {
    await brailleBtn.click()
    await page.waitForTimeout(1400)
  }

  // Cyberterminal
  const cyberBtn = page.locator('button[title="Cyberterminal"], button:has-text("Cyberterminal")').first()
  if (await cyberBtn.isVisible()) {
    await cyberBtn.click()
    await page.waitForTimeout(1400)
  }

  // 4. 3D Lighting Studio with specular normal reactions (11s -> 15.5s)
  console.log('Testing 3D Lighting Studio and interactive handles...')
  await page.click('.tab:has-text("Lighting")')
  await page.waitForTimeout(400)

  const dualLightBtn = page.locator('button:has-text("Cyberpunk Dual")').first()
  if (await dualLightBtn.isVisible()) {
    await dualLightBtn.click()
    await page.waitForTimeout(500)
  }

  // Drag the canvas light handle smoothly to show specular surface shine
  const lightHandles = page.locator('.canvas-light-handle')
  const count = await lightHandles.count()
  if (count > 0) {
    const handle1 = lightHandles.first()
    const hBox = await handle1.boundingBox()
    if (hBox) {
      await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + hBox.height / 2)
      await page.mouse.down()
      await page.mouse.move(hBox.x + 120, hBox.y + 90, { steps: 18 })
      await page.waitForTimeout(200)
      await page.mouse.move(hBox.x - 60, hBox.y + 40, { steps: 18 })
      await page.mouse.up()
      await page.waitForTimeout(500)
    }
  }

  // 5. Audio spectrum & media management toolbar (15.5s -> 20s)
  console.log('Testing Audio spectrum & media management toolbar...')
  await page.click('.tab:has-text("Tune")')
  await page.waitForTimeout(400)

  const audioCheck = page.locator('.tab-body >> text=Enable Audio Modulation')
  if (await audioCheck.isVisible()) {
    await audioCheck.click()
    await page.waitForTimeout(300)
  }

  const beatBtn = page.locator('.tab-body >> text=120 BPM Synth Beat')
  if (await beatBtn.isVisible()) {
    await beatBtn.click()
    await page.waitForTimeout(800)
  }

  // Trigger AI procedural artwork synthesizer to bring up active media management toolbar
  const synthBtn = page.locator('.synth-btn').first()
  if (await synthBtn.isVisible()) {
    await synthBtn.click()
    await page.waitForTimeout(400)
    const presetSamurai = page.locator('.preset-chip >> text=Cyberpunk Samurai')
    if (await presetSamurai.isVisible()) {
      await presetSamurai.click()
      await page.waitForTimeout(800)
    }
  }

  // Show the media management toolbar with active badge, replace media, clear
  const mediaToolbar = page.locator('.stage-canvas-header').first()
  if (await mediaToolbar.isVisible()) {
    await page.locator('.media-badge').first().hover()
    await page.waitForTimeout(400)
    await page.locator('.media-btn-replace').first().hover()
    await page.waitForTimeout(400)
  }

  // Smooth final hold to reach clean 20-21s total
  const elapsed = (Date.now() - startTime) / 1000
  console.log(`Action sequence elapsed: ${elapsed.toFixed(1)}s`)
  if (elapsed < 20.5) {
    await page.waitForTimeout(Math.round((20.5 - elapsed) * 1000))
  }

  console.log('Closing context to flush video file...')
  const videoPath = await page.video().path()
  await context.close()
  await browser.close()

  console.log('Recorded raw video to:', videoPath)

  // Use ffmpeg to produce demo.mp4, demo.webm, demo.gif
  console.log('Transcoding demo.mp4 (H.264, 1280x720, faststart)...')
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${videoPath}" -t 20 -c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -crf 20 -movflags +faststart public/demo.mp4`,
    { stdio: 'inherit' }
  )

  console.log('Transcoding demo.webm (VP9)...')
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${videoPath}" -t 20 -c:v libvpx-vp9 -b:v 0 -crf 26 public/demo.webm`,
    { stdio: 'inherit' }
  )

  console.log('Generating optimized demo.gif preview (palettegen + paletteuse)...')
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${videoPath}" -t 20 -vf "fps=14,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3" public/demo.gif`,
    { stdio: 'inherit' }
  )

  console.log('\nGenerated demo assets in public/:')
  execSync('ls -lh public/demo.*', { stdio: 'inherit' })

} catch (err) {
  console.error('Demo recording failed:', err)
  process.exitCode = 1
} finally {
  preview.kill()
}
