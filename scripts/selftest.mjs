// Headless verification for ASCII Studio v3.
// Serves dist/ with vite preview, loads ?selftest=1 in Chromium, reads the
// in-page self-test results, clicks through styles/recipes/tools, checks the
// landing page sections, and screenshots.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}`

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url)
        if (res.ok) return resolve(true)
      } catch { /* not up yet */ }
      if (Date.now() - start > timeoutMs) return reject(new Error('server did not start'))
      setTimeout(tick, 500)
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

  await page.goto(`${BASE}/?selftest=1`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#selftest-results', { state: 'attached', timeout: 30000 })
  const raw = await page.textContent('#selftest-results')
  const results = JSON.parse(raw ?? '{}')
  console.log('SELFTEST:', JSON.stringify(results, null, 2))

  // default view screenshot (sample renders as ASCII)
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'scripts/shot-default.png' })

  // switch to Dither style via the style browser thumbnail and screenshot
  await page.click('.mode-thumb >> text=Dither')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-dither.png' })

  // apply the Game Boy recipe and screenshot
  await page.click('.tab >> text=Recipes')
  await page.click('.recipe-card >> text=Game Boy')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-gameboy.png' })

  // banner generator
  await page.click('.tab >> text=Banner')
  await page.waitForTimeout(400)
  const banner = await page.textContent('.banner-out')
  console.log('BANNER SAMPLE:\n' + (banner ?? '').split('\n').slice(0, 5).join('\n'))

  // mini tools tab
  await page.click('.tab >> text=Tools')
  await page.waitForTimeout(400)
  const toolsVisible = await page.locator('.tools-panel').isVisible()
  console.log('TOOLS PANEL VISIBLE:', toolsVisible)
  await page.screenshot({ path: 'scripts/shot-tools.png' })
  if (!toolsVisible) results.ok = false

  // test 3D Multi-Light Studio
  await page.click('.tab >> text=Lighting')
  await page.waitForTimeout(400)
  const lightingVisible = await page.locator('.tab-body >> text=Multi-Light Studio').isVisible()
  console.log('LIGHTING PANEL VISIBLE:', lightingVisible)
  await page.click('.tab-body >> text=Cyberpunk Dual')
  await page.waitForTimeout(500)
  const lightHandles = await page.locator('.canvas-light-handle').count()
  console.log('CANVAS LIGHT HANDLES COUNT:', lightHandles)
  await page.screenshot({ path: 'scripts/shot-lighting.png' })
  if (!lightingVisible || lightHandles === 0) results.ok = false

  // test Randomize aesthetic generator
  await page.click('.randomize-btn')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-surpriseme.png' })

  // test Web Audio API synth beat
  await page.click('.tab >> text=Tune')
  await page.waitForTimeout(400)
  await page.click('.tab-body >> text=Enable Audio Modulation')
  await page.waitForTimeout(400)
  await page.click('.tab-body >> text=120 BPM Synth Beat')
  await page.waitForTimeout(600)
  const spectrumVisible = await page.locator('.audio-spectrum-bar').isVisible()
  const multibandVisible = await page.locator('.audio-multiband-grid').isVisible()
  console.log('AUDIO SPECTRUM VISIBLE:', spectrumVisible)
  console.log('MULTI-BAND AUDIO GRID VISIBLE:', multibandVisible)
  if (!spectrumVisible || !multibandVisible) results.ok = false

  // test Interactive Visualize Studio Suite (Real-World Mockups & Scientific Canvas)
  await page.click('.tab >> text=Visualize')
  await page.waitForTimeout(600)
  const visContainerVisible = await page.locator('.visualizer-studio-container').isVisible()
  const mockupCanvasVisible = await page.locator('.mockup-canvas').isVisible()
  console.log('VISUALIZE CONTAINER VISIBLE:', visContainerVisible)
  console.log('MOCKUP CANVAS VISIBLE:', mockupCanvasVisible)
  if (!visContainerVisible || !mockupCanvasVisible) results.ok = false

  // Switch real-world mockups: Museum Frame, 12" Vinyl, Retro CRT
  await page.click('.mockup-select-btn >> text=Museum Framed Poster')
  await page.waitForTimeout(300)
  await page.click('.mockup-select-btn >> text=12" Vinyl Album Jacket')
  await page.waitForTimeout(300)

  // Switch to Scientific & Creative Visualizer Canvas
  await page.click('.vis-tab-pill >> text=Scientific & Creative Canvas')
  await page.waitForTimeout(400)
  const sciCanvasVisible = await page.locator('.vis-canvas').isVisible()
  console.log('SCIENTIFIC CANVAS VISIBLE:', sciCanvasVisible)
  if (!sciCanvasVisible) results.ok = false

  // switch visualizer modes: Mandelbrot, 3D Surfaces, Oscilloscope, Lorenz Chaos
  await page.click('.vis-mode-btn >> text=Mandelbrot')
  await page.waitForTimeout(400)
  await page.click('.vis-mode-btn >> text=3D Surfaces')
  await page.waitForTimeout(400)
  await page.click('.vis-mode-btn >> text=Lorenz Chaos')
  await page.waitForTimeout(400)
  await page.click('.vis-mode-btn >> text=Oscilloscope')
  await page.waitForTimeout(400)

  // test "Send Frame to Studio"
  const sendFrameBtn = page.locator('button:has-text("Send Frame to Studio")').first()
  if (await sendFrameBtn.isVisible()) {
    await sendFrameBtn.click()
    await page.waitForTimeout(500)
    console.log('VISUALIZE FRAME SENT TO STUDIO')
  }
  await page.screenshot({ path: 'scripts/shot-visualizer.png' })

  // test MCP Setup & Integration Modal
  const mcpTopbarBtn = page.locator('.topbar button:has-text("MCP Server")').first()
  await mcpTopbarBtn.click()
  await page.waitForTimeout(400)
  const mcpModalVisible = await page.locator('.mcp-modal').isVisible()
  console.log('MCP MODAL VISIBLE:', mcpModalVisible)
  if (!mcpModalVisible) results.ok = false
  await page.click('.mcp-tab >> text=Remote URL')
  await page.waitForTimeout(200)
  const remoteUrlText = await page.textContent('.mcp-code-block pre')
  console.log('REMOTE MCP URL CHECK:', remoteUrlText.includes('api/mcp'))
  if (!remoteUrlText.includes('api/mcp')) results.ok = false

  await page.click('.mcp-tab >> text=Cursor Editor')
  await page.waitForTimeout(200)
  await page.click('.mcp-tab >> text=Tools Reference')
  await page.waitForTimeout(200)
  const mcpToolsCount = await page.locator('.mcp-tool-item').count()
  console.log('MCP TOOLS COUNT IN MODAL:', mcpToolsCount)
  if (mcpToolsCount < 7) results.ok = false
  await page.click('.mcp-modal .modal-footer button:has-text("Done")')
  await page.waitForTimeout(300)

  // test CLI and MCP Server JSON-RPC directly
  const { execSync } = await import('node:child_process')
  const cliVer = execSync('node bin/asciipro.js --version', { encoding: 'utf8' }).trim()
  console.log('CLI VERSION CHECK:', cliVer)
  const cliBanner = execSync('node bin/asciipro.js banner "PRO"', { encoding: 'utf8' })
  console.log('CLI BANNER CHECK OK:', cliBanner.includes('█'))
  const cliVisual = execSync('node bin/asciipro.js visual mandelbrot --cols 30 --rows 10', { encoding: 'utf8' })
  console.log('CLI VISUAL CHECK OK:', cliVisual.length > 50)
  const cliMockup = execSync('node bin/asciipro.js mockup phone-wallpaper', { encoding: 'utf8' })
  console.log('CLI MOCKUP CHECK OK:', cliMockup.includes('MOCKUP SCENE: PHONE-WALLPAPER'))
  if (!cliVer.includes('3.1.0') || !cliBanner.includes('█') || !cliMockup.includes('MOCKUP SCENE')) results.ok = false

  // CLI error validation checks (must cleanly fail with exit code 1)
  let invalidPlayFailedCleanly = false
  try {
    execSync('node bin/asciipro.js play non-existent-piece', { stdio: 'pipe' })
  } catch (err) {
    invalidPlayFailedCleanly = err.status === 1
  }
  console.log('CLI INVALID PLAY VALIDATION OK:', invalidPlayFailedCleanly)
  if (!invalidPlayFailedCleanly) results.ok = false

  let invalidVisualFailedCleanly = false
  try {
    execSync('node bin/asciipro.js visual invalid-mode-name', { stdio: 'pipe' })
  } catch (err) {
    invalidVisualFailedCleanly = err.status === 1
  }
  console.log('CLI INVALID VISUAL VALIDATION OK:', invalidVisualFailedCleanly)
  if (!invalidVisualFailedCleanly) results.ok = false

  // test Selective Mask tool and Stamp tool in stage-bar
  const maskBtn = page.locator('button:has-text("Mask Brush")')
  const maskBtnVisible = await maskBtn.isVisible()
  console.log('MASK TOOL BUTTON VISIBLE:', maskBtnVisible)
  if (!maskBtnVisible) results.ok = false
  await maskBtn.click({ force: true })
  await page.waitForTimeout(400)

  const stampBtn = page.locator('button:has-text("Stamp Pencil")')
  const stampBtnVisible = await stampBtn.isVisible()
  console.log('STAMP TOOL BUTTON VISIBLE:', stampBtnVisible)
  if (!stampBtnVisible) results.ok = false
  await stampBtn.click({ force: true })
  await page.waitForTimeout(400)
  const eraserBtn = page.locator('button:has-text("Eraser")')
  const eraserVisible = await eraserBtn.isVisible()
  console.log('STAMP ERASER BUTTON VISIBLE:', eraserVisible)
  if (!eraserVisible) results.ok = false

  // test Export tab Developer & Embed Code buttons
  await page.click('.tab >> text=Export')
  await page.waitForTimeout(400)
  const reactExportBtn = page.locator('button:has-text("Copy React Component")')
  const reactBtnVisible = await reactExportBtn.isVisible()
  console.log('REACT EXPORT BUTTON VISIBLE:', reactBtnVisible)
  if (!reactBtnVisible) results.ok = false

  // test AI Prompt Synth generator
  await page.click('.synth-btn')
  await page.waitForTimeout(400)
  const synthModalVisible = await page.locator('.prompt-synth-modal').isVisible()
  console.log('SYNTH MODAL VISIBLE:', synthModalVisible)
  if (!synthModalVisible) results.ok = false
  await page.click('.preset-chip >> text=Cyberpunk Samurai')
  await page.waitForTimeout(600)

  // test Magic Lens toggle
  await page.click('button:has-text("Magic Lens")')
  await page.waitForTimeout(400)
  const lensVisible = await page.locator('.canvas-magic-lens').isVisible()
  console.log('MAGIC LENS VISIBLE:', lensVisible)
  if (!lensVisible) results.ok = false

  // test Interactive Multi-Layer Studio & Text Overlay Engine
  await page.click('.tab >> text=Layers')
  await page.waitForTimeout(400)
  const layersPanelVisible = await page.locator('.tab-body >> text=Interactive Multi-Layer Studio').isVisible()
  console.log('LAYERS PANEL VISIBLE:', layersPanelVisible)
  await page.click('button:has-text("+ Cyberpunk Badge")')
  await page.waitForTimeout(300)
  await page.click('button:has-text("+ Watermark")')
  await page.waitForTimeout(300)
  const canvasLayersCount = await page.locator('.canvas-text-layer').count()
  console.log('CANVAS TEXT LAYERS COUNT:', canvasLayersCount)
  // Test reordering buttons
  const moveDownBtn = page.locator('.layer-card-actions button:has-text("▼")').first()
  if (await moveDownBtn.isVisible()) {
    await moveDownBtn.click()
    await page.waitForTimeout(200)
  }
  if (!layersPanelVisible || canvasLayersCount < 2) results.ok = false

  // test 8x8 Pixel Glyph Font Editor in Tools tab
  await page.click('.tab >> text=Tools')
  await page.waitForTimeout(400)
  await page.click('.chip >> text=8x8 Glyph Editor')
  await page.waitForTimeout(400)
  const glyphSuiteVisible = await page.locator('.glyph-editor-suite').isVisible()
  console.log('GLYPH EDITOR SUITE VISIBLE:', glyphSuiteVisible)
  await page.click('.glyph-editor-suite .chip >> text=Heart')
  await page.waitForTimeout(300)
  await page.click('button:has-text("Save to Custom Ramp")')
  await page.waitForTimeout(300)
  // Test emoji rasterization
  const glyphCharInput = page.locator('.glyph-rasterize-card input')
  if (await glyphCharInput.isVisible()) {
    await glyphCharInput.fill('👾')
    await page.click('button:has-text("Rasterize Char")')
    await page.waitForTimeout(300)
  }
  if (!glyphSuiteVisible) results.ok = false

  // test Media Management Toolbar, Delete / Bin button & Replace Media
  const mediaToolbarVisible = await page.locator('.stage-canvas-header').isVisible()
  console.log('MEDIA MANAGEMENT TOOLBAR VISIBLE:', mediaToolbarVisible)
  const replaceBtnVisible = await page.locator('.media-btn-replace').first().isVisible()
  console.log('REPLACE MEDIA BUTTON VISIBLE:', replaceBtnVisible)
  const deleteBtnVisible = await page.locator('.media-btn-delete').first().isVisible()
  console.log('DELETE / CLEAR BUTTON VISIBLE:', deleteBtnVisible)
  if (!mediaToolbarVisible || !replaceBtnVisible || !deleteBtnVisible) {
    results.ok = false
    errors.push('Media management toolbar or clear/replace buttons missing when media is loaded')
  }

  // Click Clear (Delete) button to restore default sample without page refresh
  await page.locator('.media-btn-delete').first().click()
  await page.waitForTimeout(400)
  const restoredSourceName = await page.textContent('.source-name')
  console.log('RESTORED SOURCE NAME AFTER CLEAR:', restoredSourceName)
  if (!restoredSourceName?.includes('Tropical Bloom')) {
    results.ok = false
    errors.push('Clear button did not restore default Tropical Bloom sample')
  }
  const toolbarGoneAfterClear = !(await page.locator('.stage-canvas-header').isVisible())
  console.log('TOOLBAR HIDDEN AFTER CLEAR:', toolbarGoneAfterClear)
  if (!toolbarGoneAfterClear) {
    results.ok = false
    errors.push('Media management toolbar should be hidden when default sample is restored')
  }

  // Test uploading an image and replacing it seamlessly
  const testPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYPj/nwEIGBkYGAAwEQMD8eU9XAAAAABJRU5ErkJggg==', 'base64')
  const fileInput = page.locator('input[accept="image/*"]:not([multiple])')
  await fileInput.setInputFiles({
    name: 'test-upload.png',
    mimeType: 'image/png',
    buffer: testPngBuffer,
  })
  await page.waitForTimeout(500)
  const uploadBadgeVisible = await page.locator('.media-badge:has-text("test-upload.png")').isVisible()
  console.log('UPLOAD MEDIA BADGE VISIBLE:', uploadBadgeVisible)
  if (!uploadBadgeVisible) {
    results.ok = false
    errors.push('Uploaded file badge not visible')
  }

  // Test Replace Media button with a new file
  const replaceInput = page.locator('input[accept="image/*,video/*"]')
  await replaceInput.setInputFiles({
    name: 'test-replaced.png',
    mimeType: 'image/png',
    buffer: testPngBuffer,
  })
  await page.waitForTimeout(500)
  const replacedBadgeVisible = await page.locator('.media-badge:has-text("test-replaced.png")').isVisible()
  console.log('REPLACED MEDIA BADGE VISIBLE:', replacedBadgeVisible)
  if (!replacedBadgeVisible) {
    results.ok = false
    errors.push('Replace Media did not update the active media badge')
  }

  // Click inline quick-clear (×) button on badge
  await page.locator('.media-badge-clear').first().click()
  await page.waitForTimeout(400)
  const restoredAfterQuickClear = await page.textContent('.source-name')
  console.log('RESTORED SOURCE NAME AFTER QUICK-CLEAR:', restoredAfterQuickClear)
  if (!restoredAfterQuickClear?.includes('Tropical Bloom')) {
    results.ok = false
    errors.push('Quick-clear (×) button did not restore default Tropical Bloom sample')
  }

  // test Animated ASCII Art Library & Player Suite
  console.log('TESTING ANIMATED ART LIBRARY...')
  const animNavBtn = page.locator('.topbar button:has-text("Animations (750+)")')
  const animNavVisible = await animNavBtn.isVisible()
  console.log('ANIMATED LIBRARY TOPBAR BUTTON VISIBLE:', animNavVisible)
  if (!animNavVisible) {
    results.ok = false
    errors.push('Topbar button for Animated ASCII Art Library is missing')
  } else {
    await animNavBtn.click()
    await page.waitForTimeout(500)
    const animLibVisible = await page.locator('.animated-library-container').isVisible()
    console.log('ANIMATED LIBRARY MODAL VISIBLE:', animLibVisible)
    if (!animLibVisible) {
      results.ok = false
      errors.push('Animated Library modal did not open')
    } else {
      // Search for donut
      const searchInput = page.locator('.library-search-input')
      await searchInput.fill('donut')
      await page.waitForTimeout(400)
      const donutCardVisible = await page.locator('.animated-art-card:has-text("3D Donut Raymarcher")').first().isVisible()
      console.log('DONUT CARD VISIBLE IN SEARCH:', donutCardVisible)
      if (!donutCardVisible) {
        results.ok = false
        errors.push('Donut 3D card not found in search')
      }

      // Search for Rickroll
      await searchInput.fill('rickroll')
      await page.waitForTimeout(400)
      const rickCardVisible = await page.locator('.animated-art-card:has-text("Rickroll Dancing")').first().isVisible()
      console.log('RICKROLL CARD VISIBLE IN SEARCH:', rickCardVisible)
      if (!rickCardVisible) {
        results.ok = false
        errors.push('Rickroll card not found in search')
      }

      // Open Fullscreen Player Modal
      const playerBtn = page.locator('.animated-art-card:has-text("Rickroll Dancing") button:has-text("▶ Player")').first()
      await playerBtn.click()
      await page.waitForTimeout(500)
      const playerModalVisible = await page.locator('.animated-player-modal').isVisible()
      console.log('ANIMATED PLAYER MODAL VISIBLE:', playerModalVisible)
      const scrubberVisible = await page.locator('.player-scrubber-slider').isVisible()
      console.log('TIMELINE SCRUBBER VISIBLE:', scrubberVisible)
      const webpExportBtn = page.locator('.player-export-suite button:has-text("Export WebP")').first()
      const zipExportBtn = page.locator('.player-export-suite button:has-text("Frame Files (ZIP)")').first()
      const webpExportVisible = await webpExportBtn.isVisible()
      const zipExportVisible = await zipExportBtn.isVisible()
      console.log('PLAYER WEBP EXPORT BUTTON VISIBLE:', webpExportVisible)
      console.log('PLAYER ZIP EXPORT BUTTON VISIBLE:', zipExportVisible)
      if (!playerModalVisible || !scrubberVisible || !webpExportVisible || !zipExportVisible) {
        results.ok = false
        errors.push('Animated Player Modal, scrubber, or export buttons failed to render')
      }

      // Test "Open in Studio" from Player
      const openInStudioBtn = page.locator('.player-footer-actions button:has-text("Open in Studio")').first()
      await openInStudioBtn.click()
      await page.waitForTimeout(600)
      const studioAnimBarVisible = await page.locator('.stage-canvas-header:has-text("Rickroll Dancing")').isVisible()
      console.log('STUDIO ANIMATION LOADED IN STAGE:', studioAnimBarVisible)
      if (!studioAnimBarVisible) {
        results.ok = false
        errors.push('Open in Studio did not load Rickroll Dancing into active studio session')
      }

      // Restore default sample
      await page.locator('.media-badge-clear').first().click()
      await page.waitForTimeout(400)
    }
  }

  // verify terminal curl script endpoints
  const scriptDonutRes = await page.request.get(`${BASE}/ascii-art/scripts/donut-3d.sh`)
  const scriptRickRes = await page.request.get(`${BASE}/ascii-art/scripts/rickroll-dance.sh`)
  console.log('TERMINAL SCRIPT DONUT STATUS:', scriptDonutRes.status())
  console.log('TERMINAL SCRIPT RICKROLL STATUS:', scriptRickRes.status())
  if (scriptDonutRes.status() !== 200 || scriptRickRes.status() !== 200) {
    results.ok = false
    errors.push('Terminal curl script endpoints return non-200 status')
  }

  console.log('ANIMATED WEBP BYTES:', results.animatedWebpBlobBytes)
  console.log('ANIMATED FRAMES ZIP BYTES:', results.animatedFramesZipBytes)
  if (!results.animatedWebpBlobBytes || results.animatedWebpBlobBytes < 100) {
    results.ok = false
    errors.push('Animated WebP export produced empty or invalid blob')
  }
  if (!results.animatedFramesZipBytes || results.animatedFramesZipBytes < 500) {
    results.ok = false
    errors.push('Animated frames ZIP export produced empty or invalid blob')
  }

  // verify Braille exports produced valid Unicode characters
  console.log('BRAILLE SVG UNICODE:', results.brailleSvgHasUnicode)
  console.log('BRAILLE ANSI UNICODE:', results.brailleAnsiHasUnicode)
  console.log('CHARSET CALIBRATE OK:', results.calibrateOk)
  if (!results.brailleSvgHasUnicode || !results.brailleAnsiHasUnicode) {
    results.ok = false
    errors.push('Braille export missing Unicode Braille characters')
  }

  // test favicon responses
  const favSvgRes = await page.request.get(`${BASE}/favicon.svg`)
  const favIcoRes = await page.request.get(`${BASE}/favicon.ico`)
  const favPngRes = await page.request.get(`${BASE}/favicon-32x32.png`)
  const favAppleRes = await page.request.get(`${BASE}/apple-touch-icon.png`)
  console.log('FAVICON SVG STATUS:', favSvgRes.status())
  console.log('FAVICON ICO STATUS:', favIcoRes.status())
  console.log('FAVICON 32 PNG STATUS:', favPngRes.status())
  console.log('APPLE TOUCH ICON STATUS:', favAppleRes.status())
  if (favSvgRes.status() !== 200 || favIcoRes.status() !== 200 || favPngRes.status() !== 200 || favAppleRes.status() !== 200) {
    results.ok = false
    errors.push('Favicons or touch icons failed to serve with 200 status')
  }

  // landing page sections
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  const sections = await page.evaluate(() => ({
    hero: !!document.querySelector('.landing-hero'),
    hasBadHeroBadge: !!document.querySelector('.hero-badge'),
    gallery: document.querySelectorAll('.gallery-tile').length,
    showcase: document.querySelectorAll('.showcase-tile').length,
    effects: document.querySelectorAll('.effect-tile').length,
    recipes: document.querySelectorAll('.recipe-gallery .recipe-card').length,
    usecases: document.querySelectorAll('.usecase-card').length,
    faq: document.querySelectorAll('.faq-item').length,
    footer: !!document.querySelector('.landing-footer'),
  }))
  console.log('LANDING SECTIONS:', JSON.stringify(sections))
  if (sections.hasBadHeroBadge) {
    results.ok = false
    errors.push('Error: Vibe-coding hero pill capsule badge was not removed!')
  }
  if (sections.gallery < 8 || sections.showcase < 8 || sections.recipes < 8 || sections.faq < 5 || !sections.footer) {
    results.ok = false
    errors.push('landing sections incomplete: ' + JSON.stringify(sections))
  }
  await page.screenshot({ path: 'scripts/shot-landing.png', fullPage: false })

  // test Landing Animations Showcase
  const animCardsCount = await page.locator('#animations .animated-art-card').count()
  console.log('LANDING ANIMATION CARDS COUNT:', animCardsCount)
  if (animCardsCount < 4) {
    results.ok = false
    errors.push('Landing #animations section has fewer than 4 cards')
  }

  // test Landing Visualize and MCP sections
  const landingVisVisible = await page.locator('#visualize').isVisible()
  const landingMcpVisible = await page.locator('#mcp').isVisible()
  console.log('LANDING VISUALIZE SECTION VISIBLE:', landingVisVisible)
  console.log('LANDING MCP SECTION VISIBLE:', landingMcpVisible)
  if (!landingVisVisible || !landingMcpVisible) {
    results.ok = false
    errors.push('Landing #visualize or #mcp section missing')
  }

  // test author branding links
  const authorLinkVisible = await page.locator('a[href*="github.com/enabled404"]').first().isVisible()
  console.log('AUTHOR BRANDING LINK VISIBLE:', authorLinkVisible)
  if (!authorLinkVisible) {
    results.ok = false
    errors.push('Saad Khalid author branding link missing from page')
  }

  // test Tip Jar / Support My Work link
  const tipJarVisible = await page.locator('a[href*="saadkhalidhere.gumroad.com/l/tipjar"]').first().isVisible()
  console.log('TIP JAR LINK VISIBLE:', tipJarVisible)
  if (!tipJarVisible) {
    results.ok = false
    errors.push('Saad Khalid Tip Jar link missing from page')
  }

  // test Legal & Privacy Disclaimers Modal
  const disclaimersBtn = page.locator('button:has-text("Legal & Privacy Disclaimers")').first()
  const disclaimersBtnVisible = await disclaimersBtn.isVisible()
  console.log('DISCLAIMERS BUTTON VISIBLE:', disclaimersBtnVisible)
  if (!disclaimersBtnVisible) {
    results.ok = false
    errors.push('Disclaimers modal trigger button missing')
  } else {
    await disclaimersBtn.click()
    await page.waitForTimeout(400)
    const modalVisible = await page.locator('.disclaimers-modal').isVisible()
    console.log('DISCLAIMERS MODAL VISIBLE:', modalVisible)
    if (!modalVisible) {
      results.ok = false
      errors.push('Disclaimers modal failed to open')
    } else {
      const modalText = await page.textContent('.disclaimers-modal')
      const hasClientPrivacy = modalText?.includes('Zero Remote Storage') || modalText?.includes('100% Client-Side')
      const hasOwnership = modalText?.includes('User Ownership') || modalText?.includes('100% User Ownership')
      const hasFairUse = modalText?.includes('Fair Use')
      const hasLiability = modalText?.includes('Limitation of Liability')
      const hasPermissions = modalText?.includes('Ephemeral Hardware Permissions')
      console.log('DISCLAIMERS CONTENT CHECK:', { hasClientPrivacy, hasOwnership, hasFairUse, hasLiability, hasPermissions })
      if (!hasClientPrivacy || !hasOwnership || !hasFairUse || !hasLiability || !hasPermissions) {
        results.ok = false
        errors.push('Disclaimers modal missing required legal / privacy clauses')
      }
      await page.click('.disclaimers-close-btn')
      await page.waitForTimeout(300)
    }
  }

  // mobile viewport smoke check
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  console.log('MOBILE horizontal overflow:', overflow)
  await page.screenshot({ path: 'scripts/shot-mobile.png' })

  console.log('PAGE ERRORS:', errors.length ? errors : 'none')
  await browser.close()
  console.log(results.ok ? 'VERDICT: PASS' : 'VERDICT: FAIL')
  process.exit(results.ok && errors.length === 0 ? 0 : 1)
} finally {
  preview.kill('SIGTERM')
}
