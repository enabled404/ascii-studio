// Production test for live deployment at https://asciipro.vercel.app
import { chromium } from 'playwright'

const PROD_URL = process.env.PROD_URL || 'https://asciipro.vercel.app'
console.log(`Testing Live Production: ${PROD_URL}`)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []

page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
    errors.push(`console: ${m.text()}`)
  }
})

try {
  // Test 1: Self-test automated test suite on live prod
  await page.goto(`${PROD_URL}/?selftest=1`, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForSelector('#selftest-results', { state: 'attached', timeout: 30000 })
  const raw = await page.textContent('#selftest-results')
  const results = JSON.parse(raw ?? '{}')
  console.log('LIVE PROD SELFTEST RESULTS:', JSON.stringify(results, null, 2))

  // Test 2: Mode switching on live prod
  await page.click('.mode-thumb >> text=Dither')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-prod-dither.png' })

  // Test 3: Recipes on live prod
  await page.click('.tab >> text=Recipes')
  await page.click('.recipe-card >> text=Game Boy')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'scripts/shot-prod-recipe.png' })

  // Test 4: 3D Lighting studio on live prod
  await page.click('.tab >> text=Lighting')
  await page.waitForTimeout(400)
  const lightingVisible = await page.locator('.tab-body >> text=Multi-Light Studio').isVisible()
  console.log('LIVE PROD LIGHTING PANEL VISIBLE:', lightingVisible)
  await page.click('.tab-body >> text=Cyberpunk Dual')
  await page.waitForTimeout(500)
  const lightHandles = await page.locator('.canvas-light-handle').count()
  console.log('LIVE PROD CANVAS LIGHT HANDLES COUNT:', lightHandles)
  await page.screenshot({ path: 'scripts/shot-prod-lighting.png' })

  // Test 5: Web Audio API engine & multi-band reactivity on live prod
  await page.click('.tab >> text=Tune')
  await page.waitForTimeout(400)
  await page.click('.tab-body >> text=Enable Audio Modulation')
  await page.waitForTimeout(400)
  await page.click('.tab-body >> text=120 BPM Synth Beat')
  await page.waitForTimeout(600)
  const spectrumVisible = await page.locator('.audio-spectrum-bar').isVisible()
  const multibandVisible = await page.locator('.audio-multiband-grid').isVisible()
  console.log('LIVE PROD AUDIO SPECTRUM VISIBLE:', spectrumVisible)
  console.log('LIVE PROD MULTI-BAND GRID VISIBLE:', multibandVisible)

  // Test 6: Interactive Multi-Layer Studio on live prod
  await page.click('.tab >> text=Layers')
  await page.waitForTimeout(400)
  const layersVisible = await page.locator('.tab-body >> text=Interactive Multi-Layer Studio').isVisible()
  console.log('LIVE PROD LAYERS PANEL VISIBLE:', layersVisible)
  await page.click('button:has-text("+ Cyberpunk Badge")')
  await page.waitForTimeout(300)
  await page.click('button:has-text("+ Watermark")')
  await page.waitForTimeout(300)
  const layersCount = await page.locator('.canvas-text-layer').count()
  console.log('LIVE PROD CANVAS TEXT LAYERS COUNT:', layersCount)
  const moveDownBtn = page.locator('.layer-card-actions button:has-text("▼")').first()
  if (await moveDownBtn.isVisible()) {
    await moveDownBtn.click()
    await page.waitForTimeout(200)
  }

  // Test 7: Tools tab & 8x8 Glyph Editor on live prod
  await page.click('.tab >> text=Tools')
  await page.waitForTimeout(400)
  const toolsVisible = await page.locator('.tools-panel').isVisible()
  console.log('LIVE PROD TOOLS VISIBLE:', toolsVisible)
  await page.click('.chip >> text=8x8 Glyph Editor')
  await page.waitForTimeout(400)
  const glyphVisible = await page.locator('.glyph-editor-suite').isVisible()
  console.log('LIVE PROD GLYPH EDITOR VISIBLE:', glyphVisible)
  await page.click('.glyph-editor-suite .chip >> text=Heart')
  await page.waitForTimeout(300)
  const glyphCharInput = page.locator('.glyph-rasterize-card input')
  if (await glyphCharInput.isVisible()) {
    await glyphCharInput.fill('👾')
    await page.click('button:has-text("Rasterize Char")')
    await page.waitForTimeout(300)
  }

  // Test 7b: Animated ASCII Art Library on live prod
  const animBtn = page.locator('.topbar button:has-text("Animations (750+)")')
  const animBtnVisible = await animBtn.isVisible()
  console.log('LIVE PROD ANIMATED ART BUTTON VISIBLE:', animBtnVisible)
  await animBtn.click()
  await page.waitForTimeout(600)
  const animLibVisible = await page.locator('.animated-library-container').isVisible()
  console.log('LIVE PROD ANIMATED LIBRARY MODAL VISIBLE:', animLibVisible)
  const searchInput = page.locator('.library-search-input')
  await searchInput.fill('donut')
  await page.waitForTimeout(400)
  const donutCardVisible = await page.locator('.animated-art-card:has-text("3D Donut Raymarcher")').first().isVisible()
  console.log('LIVE PROD DONUT CARD VISIBLE:', donutCardVisible)
  const playerBtn = page.locator('.animated-art-card:has-text("3D Donut Raymarcher") button:has-text("▶ Player")').first()
  await playerBtn.click()
  await page.waitForTimeout(500)
  const playerModalVisible = await page.locator('.animated-player-modal').isVisible()
  console.log('LIVE PROD PLAYER MODAL VISIBLE:', playerModalVisible)
  const webpBtn = page.locator('.player-export-suite button:has-text("Export WebP")').first()
  const zipBtn = page.locator('.player-export-suite button:has-text("Frame Files (ZIP)")').first()
  const webpVisible = await webpBtn.isVisible()
  const zipVisible = await zipBtn.isVisible()
  console.log('LIVE PROD WEBP EXPORT BUTTON VISIBLE:', webpVisible)
  console.log('LIVE PROD ZIP EXPORT BUTTON VISIBLE:', zipVisible)
  const openStudioBtn = page.locator('.player-footer-actions button:has-text("Open in Studio")').first()
  await openStudioBtn.click()
  await page.waitForTimeout(600)
  const studioAnimBarVisible = await page.locator('.stage-canvas-header:has-text("3D Donut Raymarcher")').isVisible()
  console.log('LIVE PROD STUDIO ANIMATION BAR VISIBLE:', studioAnimBarVisible)

  // Test 7c: Visualize Studio tab on live prod
  await page.click('.tab >> text=Visualize')
  await page.waitForTimeout(600)
  const visContainerVisible = await page.locator('.visualizer-studio-container').isVisible()
  const mockupCanvasVisible = await page.locator('.mockup-canvas').isVisible()
  console.log('LIVE PROD VISUALIZE CONTAINER VISIBLE:', visContainerVisible)
  console.log('LIVE PROD MOCKUP CANVAS VISIBLE:', mockupCanvasVisible)
  await page.click('.vis-tab-pill >> text=Scientific & Creative Canvas')
  await page.waitForTimeout(400)
  const visCanvasVisible = await page.locator('.vis-canvas').isVisible()
  console.log('LIVE PROD SCIENTIFIC CANVAS VISIBLE:', visCanvasVisible)
  await page.click('.vis-mode-btn >> text=Mandelbrot')
  await page.waitForTimeout(400)
  await page.click('.vis-mode-btn >> text=3D Surfaces')
  await page.waitForTimeout(400)

  // Test 7d: MCP Modal on live prod
  const mcpBtn = page.locator('.topbar button:has-text("MCP Server")')
  await mcpBtn.click()
  await page.waitForTimeout(400)
  const mcpModalVisible = await page.locator('.mcp-modal').isVisible()
  console.log('LIVE PROD MCP MODAL VISIBLE:', mcpModalVisible)
  await page.click('.mcp-tab >> text=Cursor Editor')
  await page.waitForTimeout(200)
  await page.click('.mcp-tab >> text=Tools Reference')
  await page.waitForTimeout(200)
  const mcpToolsCount = await page.locator('.mcp-tool-item').count()
  console.log('LIVE PROD MCP TOOLS COUNT:', mcpToolsCount)
  await page.click('.mcp-modal .modal-footer button:has-text("Done")')
  await page.waitForTimeout(300)

  // Test 8: Landing page sections on live prod
  await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(1200)
  const sections = await page.evaluate(() => ({
    hero: !!document.querySelector('.landing-hero'),
    heroBadge: document.querySelector('.landing-hero-badge')?.textContent?.trim(),
    gallery: document.querySelectorAll('.gallery-tile').length,
    showcase: document.querySelectorAll('.showcase-tile').length,
    effects: document.querySelectorAll('.effect-tile').length,
    recipes: document.querySelectorAll('.recipe-gallery .recipe-card').length,
    usecases: document.querySelectorAll('.usecase-card').length,
    faq: document.querySelectorAll('.faq-item').length,
    footer: !!document.querySelector('.landing-footer'),
  }))
  console.log('LIVE PROD LANDING SECTIONS:', JSON.stringify(sections, null, 2))
  await page.screenshot({ path: 'scripts/shot-prod-landing.png' })

  // Test 9: Mobile responsiveness on live prod
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  console.log('LIVE PROD MOBILE horizontal overflow:', overflow)
  await page.screenshot({ path: 'scripts/shot-prod-mobile.png' })

  console.log('LIVE PROD PAGE ERRORS:', errors.length ? errors : 'none')
  const pass = results.ok && lightingVisible && lightHandles > 0 && spectrumVisible && multibandVisible && layersVisible && layersCount > 0 && glyphVisible && toolsVisible && visContainerVisible && mockupCanvasVisible && visCanvasVisible && mcpModalVisible && !overflow && errors.length === 0
  console.log(pass ? 'LIVE PROD VERDICT: PASS' : 'LIVE PROD VERDICT: FAIL')
  process.exit(pass ? 0 : 1)
} finally {
  await browser.close()
}
