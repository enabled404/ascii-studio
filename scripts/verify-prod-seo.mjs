// Comprehensive SEO, Author Branding, Legal Disclaimers and production health verification.
import { chromium } from 'playwright'

const PROD_URL = process.env.PROD_URL || 'https://asciipro.vercel.app'
console.log(`\n=== VERIFYING LIVE PRODUCTION SEO & AUTHOR BRANDING: ${PROD_URL} ===\n`)

const checks = []
function record(name, pass, detail) {
  checks.push({ name, pass, detail })
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'}: ${name}${detail ? ` (${detail})` : ''}`)
}

async function verifyDiscoveryFiles() {
  // 1. robots.txt
  const rRes = await fetch(`${PROD_URL}/robots.txt`)
  const rText = await rRes.text()
  record('robots.txt status 200', rRes.status === 200, `status=${rRes.status}`)
  record('robots.txt specifies sitemap', rText.includes('sitemap.xml'))
  record('robots.txt allows all crawlers', rText.includes('Allow: /'))
  record('robots.txt specifies Googlebot', rText.includes('Googlebot'))

  // 2. sitemap.xml
  const sRes = await fetch(`${PROD_URL}/sitemap.xml`)
  const sText = await sRes.text()
  record('sitemap.xml status 200', sRes.status === 200, `status=${sRes.status}`)
  record('sitemap.xml valid xml header', sText.includes('<?xml') && sText.includes('<urlset'))
  record('sitemap.xml has canonical or prod URL', sText.includes('asciipro.vercel.app') || sText.includes('asciiart-studio.vercel.app') || sText.includes('ascii-studio-jade.vercel.app'))
  record('sitemap.xml includes image:image schema', sText.includes('xmlns:image') && sText.includes('image:loc'))
  const locs = Array.from(sText.matchAll(/<loc>([^<]+)<\/loc>/g)).map(m => m[1])
  const uniqueLocs = new Set(locs)
  record('sitemap.xml has no duplicate loc entries', locs.length === uniqueLocs.size, `total=${locs.length}, unique=${uniqueLocs.size}`)

  // 3. site.webmanifest
  const mRes = await fetch(`${PROD_URL}/site.webmanifest`)
  const mJson = await mRes.json()
  record('site.webmanifest status 200', mRes.status === 200, `status=${mRes.status}`)
  record('site.webmanifest has name', mJson.name === 'ASCII Studio — Image & Video to ASCII Art')
  record('site.webmanifest has developer attribution', mJson.developer?.name?.includes('Saad Khalid') && mJson.developer?.name?.includes('saadkhalidhere'))
  const has192 = mJson.icons?.some((i) => i.sizes === '192x192')
  const has512 = mJson.icons?.some((i) => i.sizes === '512x512')
  record('site.webmanifest has 192x192 icon', !!has192)
  record('site.webmanifest has 512x512 icon', !!has512)

  // 4. manifest.json
  const mjRes = await fetch(`${PROD_URL}/manifest.json`)
  record('manifest.json status 200', mjRes.status === 200, `status=${mjRes.status}`)

  // 5. og-image.png
  const ogRes = await fetch(`${PROD_URL}/og-image.png`)
  const ogBuf = await ogRes.arrayBuffer()
  record('og-image.png status 200', ogRes.status === 200, `bytes=${ogBuf.byteLength}`)
  record('og-image.png reasonable size', ogBuf.byteLength > 50000 && ogBuf.byteLength < 5000000)

  // 6. icon-192.png & icon-512.png
  const i192Res = await fetch(`${PROD_URL}/icon-192.png`)
  record('icon-192.png status 200', i192Res.status === 200, `status=${i192Res.status}`)
  const i512Res = await fetch(`${PROD_URL}/icon-512.png`)
  record('icon-512.png status 200', i512Res.status === 200, `status=${i512Res.status}`)
}

async function verifyMetaAndSchema() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
      errors.push(`console: ${m.text()}`)
    }
  })

  await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(1000)

  // Title
  const title = await page.title()
  record('Title is optimized and keyword-rich', title.includes('ASCII Studio') && title.includes('ASCII Art'), title)

  // Meta Description
  const desc = await page.getAttribute('meta[name="description"]', 'content')
  record('Meta description exists', !!desc && desc.length > 50, desc?.slice(0, 70) + '...')
  
  // Verify all 6 required primary keywords
  const hasKw1 = desc?.toLowerCase().includes('ascii art generator')
  const hasKw2 = desc?.toLowerCase().includes('image to ascii converter')
  const hasKw3 = desc?.toLowerCase().includes('braille art')
  const hasKw4 = desc?.toLowerCase().includes('ansi terminal art')
  const hasKw5 = desc?.toLowerCase().includes('video to ascii')
  const hasKw6 = desc?.toLowerCase().includes('3d ascii studio')
  record('Meta description contains "ASCII art generator"', !!hasKw1)
  record('Meta description contains "image to ASCII converter"', !!hasKw2)
  record('Meta description contains "Braille art"', !!hasKw3)
  record('Meta description contains "ANSI terminal art"', !!hasKw4)
  record('Meta description contains "video to ASCII"', !!hasKw5)
  record('Meta description contains "3D ASCII studio"', !!hasKw6)

  // Author & Creator Meta Tags
  const metaAuthor = await page.getAttribute('meta[name="author"]', 'content')
  const metaCreator = await page.getAttribute('meta[name="creator"]', 'content')
  record('meta[name="author"] is Saad Khalid (@saadkhalidhere)', metaAuthor === 'Saad Khalid (@saadkhalidhere)', metaAuthor)
  record('meta[name="creator"] is Saad Khalid', metaCreator === 'Saad Khalid', metaCreator)

  // Canonical
  const canonical = await page.getAttribute('link[rel="canonical"]', 'href')
  record('Canonical link tag points to prod domain', canonical === 'https://asciipro.vercel.app/' || canonical === 'https://asciiart-studio.vercel.app/' || canonical === 'https://ascii-studio-jade.vercel.app/', canonical)

  // Open Graph
  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content')
  const ogDesc = await page.getAttribute('meta[property="og:description"]', 'content')
  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content')
  const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content')
  record('og:title exists', !!ogTitle, ogTitle)
  record('og:description exists', !!ogDesc)
  record('og:image points to og-image.png', ogImage?.includes('og-image.png'), ogImage)
  record('og:url points to prod', ogUrl?.includes('.vercel.app'), ogUrl)

  // Twitter
  const twCard = await page.getAttribute('meta[name="twitter:card"]', 'content')
  const twImage = await page.getAttribute('meta[name="twitter:image"]', 'content')
  const twCreator = await page.getAttribute('meta[name="twitter:creator"]', 'content')
  record('twitter:card is summary_large_image', twCard === 'summary_large_image')
  record('twitter:image points to og-image.png', twImage?.includes('og-image.png'), twImage)
  record('twitter:creator is @saadkhalidhere', twCreator === '@saadkhalidhere', twCreator)

  // Robots
  const robots = await page.getAttribute('meta[name="robots"]', 'content')
  record('Robots allows index, follow, large images', robots?.includes('index') && robots?.includes('max-image-preview:large'))

  // JSON-LD Schema
  const jsonLdRaw = await page.textContent('script[type="application/ld+json"]')
  record('JSON-LD script present', !!jsonLdRaw)
  let graph = []
  try {
    const parsed = JSON.parse(jsonLdRaw)
    graph = parsed['@graph'] || [parsed]
    record('JSON-LD parses cleanly', true)
  } catch (err) {
    record('JSON-LD parses cleanly', false, err.message)
  }

  const types = graph.flatMap((x) => Array.isArray(x['@type']) ? x['@type'] : [x['@type']])
  record('Schema WebApplication present', types.includes('WebApplication'))
  record('Schema SoftwareApplication present', types.includes('SoftwareApplication'))
  record('Schema FAQPage present', types.includes('FAQPage'))
  record('Schema HowTo present', types.includes('HowTo'))
  record('Schema Organization present', types.includes('Organization'))
  record('Schema WebSite present', types.includes('WebSite'))
  record('Schema BreadcrumbList present', types.includes('BreadcrumbList'))
  record('Schema Person entity present for author SEO', types.includes('Person'))

  const person = graph.find((x) => x['@type'] === 'Person')
  record('Person entity name is Saad Khalid', person?.name === 'Saad Khalid', person?.name)
  record('Person entity alternateName includes saadkhalidhere', person?.alternateName?.includes('saadkhalidhere'), JSON.stringify(person?.alternateName))
  record('Person entity jobTitle is Creative Technologist / Software Engineer', person?.jobTitle?.includes('Software Engineer'), person?.jobTitle)
  record('Person entity sameAs includes GitHub & X', person?.sameAs?.some(s => s.includes('enabled404')) && person?.sameAs?.some(s => s.includes('saadkhalidhere')), JSON.stringify(person?.sameAs))
  record('Person entity includes knowsAbout expertise', Array.isArray(person?.knowsAbout) && person?.knowsAbout.length >= 5)
  record('Person entity includes permanent avatar image', !!person?.image && person?.image.includes('github.com'))

  const appSchema = graph.find((x) => (Array.isArray(x['@type']) ? x['@type'] : [x['@type']]).includes('SoftwareApplication'))
  record('SoftwareApplication.author connects to Person #author', appSchema?.author?.['@id']?.includes('#author'), appSchema?.author?.['@id'])
  record('SoftwareApplication.publisher connects to Person #author', appSchema?.publisher?.['@id']?.includes('#author'), appSchema?.publisher?.['@id'])

  const siteSchema = graph.find((x) => x['@type'] === 'WebSite')
  record('WebSite.creator connects to Person #author', siteSchema?.creator?.['@id']?.includes('#author'), siteSchema?.creator?.['@id'])

  // Semantic elements & Accessibility
  const semantic = await page.evaluate(() => ({
    h1Count: document.querySelectorAll('h1').length,
    h1Text: document.querySelector('h1')?.textContent || '',
    h2Count: document.querySelectorAll('h2').length,
    h3Count: document.querySelectorAll('h3').length,
    hasHeader: !!document.querySelector('header.landing-nav'),
    hasMain: !!document.querySelector('main.landing-hero'),
    hasFooter: !!document.querySelector('footer.landing-footer'),
    hasSkipLink: !!document.querySelector('.skip-link'),
    canvasesHaveAria: Array.from(document.querySelectorAll('canvas')).every(c => c.hasAttribute('aria-label') || c.hasAttribute('role')),
    hasAuthorLink: !!document.querySelector('a[href*="github.com/enabled404"]'),
    hasXLink: !!document.querySelector('a[href*="x.com/saadkhalidhere"]'),
    hasTipJar: !!document.querySelector('a[href*="saadkhalidhere.gumroad.com/l/tipjar"]'),
  }))

  record('Exactly one h1 heading', semantic.h1Count === 1, `count=${semantic.h1Count}`)
  record('h1 heading is keyword-rich', semantic.h1Text.includes('ASCII Art Generator'), semantic.h1Text.replace(/\s+/g, ' ').trim())
  record('Multiple descriptive h2 headings', semantic.h2Count >= 6, `count=${semantic.h2Count}`)
  record('Semantic landmarks (header, main, footer)', semantic.hasHeader && semantic.hasMain && semantic.hasFooter)
  record('Accessibility skip-link exists', semantic.hasSkipLink)
  record('All landing canvases have accessible aria-labels or roles', semantic.canvasesHaveAria)
  record('Landing page links to Saad Khalid GitHub profile', semantic.hasAuthorLink)
  record('Landing page links to Saad Khalid X / Twitter profile', semantic.hasXLink)
  record('Landing page links to Saad Khalid Tip Jar / Support My Work', semantic.hasTipJar)

  // Verify Legal & Privacy Disclaimers Modal
  const disclaimersBtn = page.locator('button:has-text("Legal & Privacy Disclaimers")').first()
  record('Disclaimers button is visible in footer', await disclaimersBtn.isVisible())
  await disclaimersBtn.click()
  await page.waitForTimeout(400)

  const modalVisible = await page.locator('.disclaimers-modal').isVisible()
  record('Disclaimers modal opens smoothly on click', modalVisible)
  const modalText = await page.textContent('.disclaimers-modal')
  record('Disclaimers modal has 100% Client-Side Privacy section', modalText?.includes('Zero Remote Storage') || modalText?.includes('100% Client-Side'))
  record('Disclaimers modal has User Ownership & Commercial Copyright', modalText?.includes('User Ownership & Commercial Copyright') || modalText?.includes('100% User Ownership'))
  record('Disclaimers modal has Fair Use representation', modalText?.includes('Fair Use'))
  record('Disclaimers modal has Limitation of Liability', modalText?.includes('Limitation of Liability'))
  record('Disclaimers modal has Ephemeral Hardware Permissions', modalText?.includes('Ephemeral Hardware Permissions'))
  record('Disclaimers modal credits Saad Khalid (@saadkhalidhere)', modalText?.includes('Saad Khalid') && modalText?.includes('@saadkhalidhere'))

  await page.click('.disclaimers-close-btn')
  await page.waitForTimeout(300)
  const modalClosed = !(await page.locator('.disclaimers-modal').isVisible())
  record('Disclaimers modal closes cleanly via close button', modalClosed)

  // Test direct section anchor button (100% Client-Side Shield)
  const directBtn = page.locator('button:has-text("100% Client-Side Shield")').first()
  if (await directBtn.isVisible()) {
    await directBtn.click()
    await page.waitForTimeout(400)
    const directModalVisible = await page.locator('.disclaimers-modal').isVisible()
    const cardHighlighted = await page.locator('#disclaimer-zero-storage').isVisible()
    record('Direct disclaimer section anchor button opens modal to specific card', directModalVisible && cardHighlighted)
    // Test Escape key closes modal
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const escapedModalClosed = !(await page.locator('.disclaimers-modal').isVisible())
    record('Escape key cleanly dismisses disclaimers modal', escapedModalClosed)
  }

  record('Zero production console/runtime errors', errors.length === 0, errors.length ? errors.join('; ') : 'none')

  await browser.close()
}

try {
  await verifyDiscoveryFiles()
  await verifyMetaAndSchema()

  const allPassed = checks.every((c) => c.pass)
  console.log(`\nOVERALL PRODUCTION SEO & AUTHOR VERDICT: ${allPassed ? 'ALL TESTS PASSED (S-TIER READY)' : 'FAILED'}\n`)
  process.exit(allPassed ? 0 : 1)
} catch (err) {
  console.error('Fatal error during production verification:', err)
  process.exit(1)
}
