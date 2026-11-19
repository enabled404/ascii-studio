// Generate 192x192 and 512x512 PNG icons from public/favicon.svg
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'

const svgContent = readFileSync('public/favicon.svg', 'utf8')

async function generateIcons() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Standard icon HTML
  function makeHtml(size, padding = 0) {
    return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${size}px;
    height: ${size}px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #040406;
    overflow: hidden;
  }
  .icon-wrap {
    width: ${size - padding * 2}px;
    height: ${size - padding * 2}px;
  }
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
  <div class="icon-wrap">
    ${svgContent}
  </div>
</body>
</html>`
  }

  // 1. icon-192.png
  await page.setViewportSize({ width: 192, height: 192 })
  await page.setContent(makeHtml(192, 0))
  const buf192 = await page.screenshot({ type: 'png' })
  writeFileSync('public/icon-192.png', buf192)
  console.log('Generated public/icon-192.png (192x192)')

  // 2. icon-512.png
  await page.setViewportSize({ width: 512, height: 512 })
  await page.setContent(makeHtml(512, 0))
  const buf512 = await page.screenshot({ type: 'png' })
  writeFileSync('public/icon-512.png', buf512)
  console.log('Generated public/icon-512.png (512x512)')

  // 3. icon-maskable-192.png (with 15% safe-zone padding)
  await page.setViewportSize({ width: 192, height: 192 })
  await page.setContent(makeHtml(192, 28))
  const bufMask192 = await page.screenshot({ type: 'png' })
  writeFileSync('public/icon-maskable-192.png', bufMask192)
  console.log('Generated public/icon-maskable-192.png (192x192 maskable)')

  // 4. icon-maskable-512.png (with 15% safe-zone padding)
  await page.setViewportSize({ width: 512, height: 512 })
  await page.setContent(makeHtml(512, 76))
  const bufMask512 = await page.screenshot({ type: 'png' })
  writeFileSync('public/icon-maskable-512.png', bufMask512)
  console.log('Generated public/icon-maskable-512.png (512x512 maskable)')

  await browser.close()
}

generateIcons().catch((err) => {
  console.error(err)
  process.exit(1)
})
