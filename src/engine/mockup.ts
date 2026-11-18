// Real-World Mockup & Scene Visualizer Engine for ASCII Studio.
// Renders generated ASCII art, pixel art, and dithered visual effects into 12 photorealistic
// real-world layouts and environments (Phone wallpaper, Gallery frame, Vinyl album,
// Cyberpunk billboard, 1984 CRT monitor, Hoodie, Coffee mug, Cassette tape, Laptop lid,
// Arcade cabinet, Magazine cover, and Gaming desk mat).
// Written by Saad Khalid (@saadkhalidhere) for ASCII Studio (https://asciipro.vercel.app).

export type MockupId =
  | 'phone-wallpaper'
  | 'gallery-frame'
  | 'vinyl-sleeve'
  | 'billboard-neon'
  | 'retro-crt'
  | 'hoodie-streetwear'
  | 'coffee-mug'
  | 'cassette-tape'
  | 'laptop-stickers'
  | 'arcade-cabinet'
  | 'magazine-cover'
  | 'desk-mat'

export type EnvironmentLight = 'studio' | 'neon' | 'gallery' | 'darkroom'
export type FrameFinish = 'oak' | 'walnut' | 'aluminum' | 'black' | 'gold' | 'neon-chrome'

export interface MockupMeta {
  id: MockupId
  name: string
  category: 'mobile' | 'print' | 'merch' | 'retro' | 'ambient'
  aspectRatio: string
  dimensions: { width: number; height: number }
  description: string
  badge?: string
}

export const MOCKUP_CATALOG: MockupMeta[] = [
  {
    id: 'phone-wallpaper',
    name: 'Smartphone Lockscreen',
    category: 'mobile',
    aspectRatio: '9:19.5',
    dimensions: { width: 1080, height: 2340 },
    description: 'Modern smartphone lockscreen with glass bezel, dynamic clock, live notifications, and status bar.',
    badge: 'Popular',
  },
  {
    id: 'gallery-frame',
    name: 'Museum Framed Poster',
    category: 'print',
    aspectRatio: '4:5',
    dimensions: { width: 1600, height: 2000 },
    description: 'Museum-grade framed gallery art with bevel matting, textured paper, and realistic overhead spotlight.',
    badge: 'Classic',
  },
  {
    id: 'vinyl-sleeve',
    name: '12" Vinyl Album Jacket',
    category: 'print',
    aspectRatio: '1:1',
    dimensions: { width: 1800, height: 1800 },
    description: 'Vintage 12-inch vinyl record jacket with cardboard ring wear and shiny grooved vinyl disc sliding out.',
    badge: 'Retro',
  },
  {
    id: 'billboard-neon',
    name: 'Cyberpunk Neon Billboard',
    category: 'ambient',
    aspectRatio: '16:9',
    dimensions: { width: 1920, height: 1080 },
    description: 'Giant rooftop LED billboard towering over a rainy Tokyo/Neo-Seoul skyline with neon fog reflections.',
    badge: 'Cyberpunk',
  },
  {
    id: 'retro-crt',
    name: '1984 CRT Monitor',
    category: 'retro',
    aspectRatio: '4:3',
    dimensions: { width: 1600, height: 1200 },
    description: 'Curved cathode-ray tube glass monitor with aperture grille scanlines, phosphor bloom, and power LED.',
    badge: 'Vintage',
  },
  {
    id: 'hoodie-streetwear',
    name: 'Streetwear Hoodie Print',
    category: 'merch',
    aspectRatio: '1:1',
    dimensions: { width: 1600, height: 1600 },
    description: 'Heavyweight streetwear hoodie apparel mockup with realistic fabric weave, cloth drape, and chest print.',
  },
  {
    id: 'coffee-mug',
    name: 'Ceramic Coffee Mug',
    category: 'merch',
    aspectRatio: '4:3',
    dimensions: { width: 1600, height: 1200 },
    description: 'Glossy ceramic desk mug with cylindrical perspective warp, specular highlights, and surface shadow.',
  },
  {
    id: 'cassette-tape',
    name: '90s Cassette Tape',
    category: 'retro',
    aspectRatio: '16:10',
    dimensions: { width: 1600, height: 1000 },
    description: '1990s transparent audio cassette tape with magnetic tape spools, clear shell, and printed J-card label.',
  },
  {
    id: 'laptop-stickers',
    name: 'Developer Laptop Lid',
    category: 'merch',
    aspectRatio: '16:10',
    dimensions: { width: 1800, height: 1125 },
    description: 'Brushed aluminum MacBook lid with surrounding developer stickers (Rust, MCP, ASCII) and center art decal.',
  },
  {
    id: 'arcade-cabinet',
    name: 'Arcade Cabinet Marquee',
    category: 'retro',
    aspectRatio: '4:3',
    dimensions: { width: 1600, height: 1200 },
    description: 'Retro 80s arcade machine with glowing backlit marquee header, coin door, and CRT screen bezel.',
  },
  {
    id: 'magazine-cover',
    name: 'Cyberpunk Art Magazine',
    category: 'print',
    aspectRatio: '3:4',
    dimensions: { width: 1500, height: 2000 },
    description: 'Glossy retro-futuristic creative magazine cover with barcode, editorial headline, and issue typography.',
  },
  {
    id: 'desk-mat',
    name: 'Gaming Desk Mat',
    category: 'merch',
    aspectRatio: '16:9',
    dimensions: { width: 1920, height: 1080 },
    description: 'Extended stitched gaming mousepad with mechanical keyboard, wireless mouse, and edge-to-edge art print.',
  },
]

export interface MockupRenderOptions {
  lighting?: EnvironmentLight
  frameFinish?: FrameFinish
  resolutionScale?: number // 1 for standard preview, 2 for 4K / high-res export
}

/**
 * Creates a fallback canvas with a stylish placeholder graphic if no studio art is available.
 */
export function createDefaultArtCanvas(width = 800, height = 600): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Dark retro background
  ctx.fillStyle = '#06070d'
  ctx.fillRect(0, 0, width, height)

  // Cyberpunk grid
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
  ctx.lineWidth = 1
  const step = 32
  for (let x = 0; x < width; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += step) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Central glowing ASCII typography banner
  ctx.fillStyle = '#00f0ff'
  ctx.font = 'bold 36px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#00f0ff'
  ctx.shadowBlur = 18
  ctx.fillText('▓▒░ ASCII STUDIO ░▒▓', width / 2, height / 2 - 28)

  ctx.shadowBlur = 8
  ctx.fillStyle = '#ff007f'
  ctx.font = '18px monospace'
  ctx.fillText('105+ STYLES · 3D LIGHTING · MCP SERVER', width / 2, height / 2 + 18)

  ctx.shadowBlur = 0
  ctx.fillStyle = '#8892b0'
  ctx.font = '13px monospace'
  ctx.fillText('https://asciipro.vercel.app', width / 2, height / 2 + 52)

  return canvas
}

/**
 * Render any source canvas onto the specified real-world mockup scene.
 */
export function renderMockupToCanvas(
  targetCanvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement | null,
  mockupId: MockupId,
  options: MockupRenderOptions = {}
): void {
  const meta = MOCKUP_CATALOG.find((m) => m.id === mockupId) || MOCKUP_CATALOG[0]
  const scale = Math.max(0.5, Math.min(2.5, options.resolutionScale || 1))
  const lighting = options.lighting || 'studio'
  const finish = options.frameFinish || 'oak'

  const targetW = Math.round(meta.dimensions.width * (scale > 1.5 ? 1 : 0.65))
  const targetH = Math.round(meta.dimensions.height * (scale > 1.5 ? 1 : 0.65))

  targetCanvas.width = targetW
  targetCanvas.height = targetH

  const ctx = targetCanvas.getContext('2d')
  if (!ctx) return

  const src = sourceCanvas || createDefaultArtCanvas(800, 600)

  // Render specific mockup scene
  switch (mockupId) {
    case 'phone-wallpaper':
      renderPhoneWallpaper(ctx, targetW, targetH, src, lighting)
      break
    case 'gallery-frame':
      renderGalleryFrame(ctx, targetW, targetH, src, lighting, finish)
      break
    case 'vinyl-sleeve':
      renderVinylSleeve(ctx, targetW, targetH, src, lighting)
      break
    case 'billboard-neon':
      renderBillboardNeon(ctx, targetW, targetH, src, lighting)
      break
    case 'retro-crt':
      renderRetroCrt(ctx, targetW, targetH, src, lighting)
      break
    case 'hoodie-streetwear':
      renderHoodieMockup(ctx, targetW, targetH, src, lighting)
      break
    case 'coffee-mug':
      renderCoffeeMug(ctx, targetW, targetH, src, lighting)
      break
    case 'cassette-tape':
      renderCassetteTape(ctx, targetW, targetH, src, lighting)
      break
    case 'laptop-stickers':
      renderLaptopLid(ctx, targetW, targetH, src, lighting)
      break
    case 'arcade-cabinet':
      renderArcadeCabinet(ctx, targetW, targetH, src, lighting)
      break
    case 'magazine-cover':
      renderMagazineCover(ctx, targetW, targetH, src, lighting)
      break
    case 'desk-mat':
      renderDeskMat(ctx, targetW, targetH, src, lighting)
      break
    default:
      renderGalleryFrame(ctx, targetW, targetH, src, lighting, finish)
      break
  }
}

// -------------------------------------------------------------
// Scene Renderers
// -------------------------------------------------------------

function applyLightingGradient(ctx: CanvasRenderingContext2D, w: number, h: number, lighting: EnvironmentLight) {
  if (lighting === 'neon') {
    const grad = ctx.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#0c071e')
    grad.addColorStop(0.5, '#05030e')
    grad.addColorStop(1, '#021017')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Ambient colored glow cones
    const glow1 = ctx.createRadialGradient(w * 0.15, h * 0.15, 10, w * 0.15, h * 0.15, w * 0.7)
    glow1.addColorStop(0, 'rgba(255, 0, 128, 0.18)')
    glow1.addColorStop(1, 'transparent')
    ctx.fillStyle = glow1
    ctx.fillRect(0, 0, w, h)

    const glow2 = ctx.createRadialGradient(w * 0.85, h * 0.85, 10, w * 0.85, h * 0.85, w * 0.7)
    glow2.addColorStop(0, 'rgba(0, 240, 255, 0.18)')
    glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, w, h)
  } else if (lighting === 'gallery') {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.2, 50, w * 0.5, h * 0.5, w * 0.9)
    grad.addColorStop(0, '#2b2620')
    grad.addColorStop(0.6, '#181512')
    grad.addColorStop(1, '#0e0c0a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  } else if (lighting === 'darkroom') {
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.5, w * 0.8)
    grad.addColorStop(0, '#280c0c')
    grad.addColorStop(0.7, '#120404')
    grad.addColorStop(1, '#050101')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  } else {
    // Studio Daylight
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.35, 80, w * 0.5, h * 0.5, w * 0.85)
    grad.addColorStop(0, '#22252c')
    grad.addColorStop(0.7, '#131519')
    grad.addColorStop(1, '#0b0c0e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }
}

// 1. Phone Wallpaper Lockscreen
function renderPhoneWallpaper(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  // Phone outer body
  const phoneW = Math.round(w * 0.72)
  const phoneH = Math.round(h * 0.88)
  const phoneX = Math.round((w - phoneW) / 2)
  const phoneY = Math.round((h - phoneH) / 2)
  const radius = Math.round(phoneW * 0.12)

  // Phone drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 24
  ctx.fillStyle = '#1c1d22'
  ctx.beginPath()
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, radius)
  ctx.fill()
  ctx.restore()

  // Phone bezel
  ctx.save()
  ctx.strokeStyle = '#2d3139'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(phoneX, phoneY, phoneW, phoneH, radius)
  ctx.stroke()
  ctx.restore()

  // Phone screen inner clipping
  const border = Math.round(phoneW * 0.035)
  const screenX = phoneX + border
  const screenY = phoneY + border
  const screenW = phoneW - border * 2
  const screenH = phoneH - border * 2
  const screenRadius = radius - border

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(screenX, screenY, screenW, screenH, screenRadius)
  ctx.clip()

  // Draw ASCII art inside screen (aspect cover)
  drawCoverImage(ctx, src, screenX, screenY, screenW, screenH)

  // Subtle glass vignette over screen
  const screenVignette = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH)
  screenVignette.addColorStop(0, 'rgba(0, 0, 0, 0.45)')
  screenVignette.addColorStop(0.3, 'transparent')
  screenVignette.addColorStop(0.7, 'transparent')
  screenVignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = screenVignette
  ctx.fillRect(screenX, screenY, screenW, screenH)

  // Dynamic Island / Camera Notch
  const notchW = Math.round(screenW * 0.32)
  const notchH = Math.round(screenH * 0.036)
  const notchX = screenX + (screenW - notchW) / 2
  const notchY = screenY + Math.round(screenH * 0.02)
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.roundRect(notchX, notchY, notchW, notchH, notchH / 2)
  ctx.fill()

  // Lockscreen Clock & Date
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const mins = String(now.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${mins}`
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 12

  ctx.font = `600 ${Math.round(screenW * 0.048)}px -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif`
  ctx.fillText(dateStr, screenX + screenW / 2, screenY + screenH * 0.12)

  ctx.font = `bold ${Math.round(screenW * 0.2)}px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif`
  ctx.fillText(timeStr, screenX + screenW / 2, screenY + screenH * 0.22)

  // Notification card
  const notifW = Math.round(screenW * 0.88)
  const notifH = Math.round(screenH * 0.09)
  const notifX = screenX + (screenW - notifW) / 2
  const notifY = screenY + screenH * 0.72
  ctx.fillStyle = 'rgba(30, 32, 40, 0.75)'
  ctx.beginPath()
  ctx.roundRect(notifX, notifY, notifW, notifH, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#00f0ff'
  ctx.font = `bold ${Math.round(screenW * 0.034)}px sans-serif`
  ctx.fillText('⚡ ASCII STUDIO PRO', notifX + 20, notifY + notifH * 0.38)
  ctx.fillStyle = '#d0d5e2'
  ctx.font = `${Math.round(screenW * 0.03)}px sans-serif`
  ctx.fillText('105+ Styles, 3D Lighting & MCP Active', notifX + 20, notifY + notifH * 0.7)

  // Lockscreen home bar
  const barW = Math.round(screenW * 0.36)
  const barH = 5
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.beginPath()
  ctx.roundRect(screenX + (screenW - barW) / 2, screenY + screenH - 18, barW, barH, 3)
  ctx.fill()

  ctx.restore()
}

// 2. Museum Framed Wall Poster
function renderGalleryFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight,
  finish: FrameFinish
) {
  applyLightingGradient(ctx, w, h, lighting)

  // Frame outer dimensions
  const frameW = Math.round(w * 0.76)
  const frameH = Math.round(h * 0.82)
  const frameX = Math.round((w - frameW) / 2)
  const frameY = Math.round((h - frameH) / 2)

  // Wall drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 54
  ctx.shadowOffsetY = 28
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(frameX, frameY, frameW, frameH)
  ctx.restore()

  // Frame finish border
  const borderThickness = Math.round(frameW * 0.045)
  let finishFill: string | CanvasGradient = '#2e2015'
  if (finish === 'oak') finishFill = '#4a3728'
  else if (finish === 'walnut') finishFill = '#2a1d13'
  else if (finish === 'aluminum') finishFill = '#60646b'
  else if (finish === 'gold') finishFill = '#85642b'
  else if (finish === 'neon-chrome') finishFill = '#00f0ff'
  else finishFill = '#111215'

  ctx.fillStyle = finishFill
  ctx.fillRect(frameX, frameY, frameW, frameH)

  // Matting (Passe-partout)
  const mattingMargin = Math.round(frameW * 0.065)
  const matX = frameX + borderThickness
  const matY = frameY + borderThickness
  const matW = frameW - borderThickness * 2
  const matH = frameH - borderThickness * 2

  ctx.fillStyle = '#f2efe9'
  ctx.fillRect(matX, matY, matW, matH)

  // Inner art window
  const artX = matX + mattingMargin
  const artY = matY + mattingMargin
  const artW = matW - mattingMargin * 2
  const artH = matH - mattingMargin * 2

  // Mat inner bevel shadow
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.lineWidth = 2
  ctx.strokeRect(artX, artY, artW, artH)

  // Draw ASCII artwork inside mat
  ctx.beginPath()
  ctx.rect(artX, artY, artW, artH)
  ctx.clip()
  drawCoverImage(ctx, src, artX, artY, artW, artH)

  // Glass diagonal reflection streak
  const glassReflect = ctx.createLinearGradient(artX, artY, artX + artW, artY + artH)
  glassReflect.addColorStop(0, 'rgba(255, 255, 255, 0.08)')
  glassReflect.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)')
  glassReflect.addColorStop(0.5, 'transparent')
  glassReflect.addColorStop(0.7, 'rgba(255, 255, 255, 0.06)')
  glassReflect.addColorStop(1, 'transparent')
  ctx.fillStyle = glassReflect
  ctx.fillRect(artX, artY, artW, artH)
  ctx.restore()

  // Artist plaque on bottom of frame
  const plaqueW = Math.round(frameW * 0.32)
  const plaqueH = Math.round(frameW * 0.04)
  const plaqueX = frameX + (frameW - plaqueW) / 2
  const plaqueY = frameY + frameH + 16

  ctx.fillStyle = '#1c1e24'
  ctx.beginPath()
  ctx.roundRect(plaqueX, plaqueY, plaqueW, plaqueH, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#00f0ff'
  ctx.font = `bold ${Math.round(plaqueH * 0.42)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ASCII STUDIO · EXHIBIT', plaqueX + plaqueW / 2, plaqueY + plaqueH / 2)
}

// 3. Vintage 12" Vinyl Album Jacket
function renderVinylSleeve(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const jacketSize = Math.round(w * 0.58)
  const jacketX = Math.round(w * 0.12)
  const jacketY = Math.round((h - jacketSize) / 2)

  // Black vinyl disc peeking out of sleeve
  const discRadius = jacketSize * 0.47
  const discCenterX = jacketX + jacketSize + discRadius * 0.32
  const discCenterY = jacketY + jacketSize / 2

  ctx.save()
  // Vinyl drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 36
  ctx.shadowOffsetX = 12
  ctx.fillStyle = '#0f1013'
  ctx.beginPath()
  ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Vinyl grooves
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.lineWidth = 1
  for (let r = discRadius * 0.35; r < discRadius * 0.96; r += 6) {
    ctx.beginPath()
    ctx.arc(discCenterX, discCenterY, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Glossy reflection sheen on disc
  const discSheen = ctx.createLinearGradient(discCenterX - discRadius, discCenterY, discCenterX + discRadius, discCenterY)
  discSheen.addColorStop(0, 'transparent')
  discSheen.addColorStop(0.48, 'rgba(255, 255, 255, 0.12)')
  discSheen.addColorStop(0.52, 'rgba(255, 255, 255, 0.12)')
  discSheen.addColorStop(1, 'transparent')
  ctx.fillStyle = discSheen
  ctx.beginPath()
  ctx.arc(discCenterX, discCenterY, discRadius, 0, Math.PI * 2)
  ctx.fill()

  // Center vinyl sticker label
  const labelRadius = discRadius * 0.32
  ctx.fillStyle = '#ff0055'
  ctx.beginPath()
  ctx.arc(discCenterX, discCenterY, labelRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(labelRadius * 0.22)}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('33⅓ RPM', discCenterX, discCenterY - 10)
  ctx.font = `${Math.round(labelRadius * 0.18)}px monospace`
  ctx.fillText('SIDE A', discCenterX, discCenterY + 12)

  // Spindle center hole
  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(discCenterX, discCenterY, discRadius * 0.05, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Jacket Cardboard Drop Shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 20
  ctx.fillStyle = '#14151a'
  ctx.fillRect(jacketX, jacketY, jacketSize, jacketSize)
  ctx.restore()

  // Draw artwork on jacket cover
  ctx.save()
  ctx.beginPath()
  ctx.rect(jacketX, jacketY, jacketSize, jacketSize)
  ctx.clip()
  drawCoverImage(ctx, src, jacketX, jacketY, jacketSize, jacketSize)

  // Cardboard vinyl ring wear effect
  const ringGrad = ctx.createRadialGradient(
    jacketX + jacketSize / 2,
    jacketY + jacketSize / 2,
    jacketSize * 0.2,
    jacketX + jacketSize / 2,
    jacketY + jacketSize / 2,
    jacketSize * 0.48
  )
  ringGrad.addColorStop(0, 'transparent')
  ringGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.08)')
  ringGrad.addColorStop(0.95, 'rgba(255, 255, 255, 0.12)')
  ringGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = ringGrad
  ctx.fillRect(jacketX, jacketY, jacketSize, jacketSize)

  // Jacket spine crease
  const spineGrad = ctx.createLinearGradient(jacketX, jacketY, jacketX + 16, jacketY)
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
  spineGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = spineGrad
  ctx.fillRect(jacketX, jacketY, 16, jacketSize)

  // Retro Parental Advisory label
  const advW = Math.round(jacketSize * 0.26)
  const advH = Math.round(jacketSize * 0.14)
  const advX = jacketX + jacketSize - advW - 16
  const advY = jacketY + jacketSize - advH - 16
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(advX, advY, advW, advH)
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${Math.round(advH * 0.24)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('PARENTAL', advX + advW / 2, advY + advH * 0.35)
  ctx.fillText('ADVISORY', advX + advW / 2, advY + advH * 0.62)
  ctx.font = `bold ${Math.round(advH * 0.18)}px monospace`
  ctx.fillText('EXPLICIT ASCII', advX + advW / 2, advY + advH * 0.86)

  ctx.restore()
}

// 4. Cyberpunk Neon Billboard
function renderBillboardNeon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting === 'studio' ? 'neon' : lighting)

  // City skyline silhouette in background
  ctx.fillStyle = '#04020a'
  const bldgW = 48
  for (let x = 0; x < w; x += bldgW) {
    const bldgH = 120 + Math.sin(x * 0.05) * 80 + (x % 7) * 20
    ctx.fillRect(x, h - bldgH, bldgW - 4, bldgH)
  }

  // Giant LED billboard container
  const boardW = Math.round(w * 0.78)
  const boardH = Math.round(h * 0.68)
  const boardX = Math.round((w - boardW) / 2)
  const boardY = Math.round(h * 0.12)

  // Truss support scaffolding
  ctx.strokeStyle = '#252936'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(boardX + 60, boardY + boardH)
  ctx.lineTo(boardX + 10, h)
  ctx.moveTo(boardX + boardW - 60, boardY + boardH)
  ctx.lineTo(boardX + boardW - 10, h)
  ctx.stroke()

  // Billboard glow halo
  ctx.save()
  ctx.shadowColor = '#00f0ff'
  ctx.shadowBlur = 64
  ctx.fillStyle = '#000000'
  ctx.fillRect(boardX, boardY, boardW, boardH)
  ctx.restore()

  // Billboard bezel
  ctx.fillStyle = '#161922'
  ctx.fillRect(boardX, boardY, boardW, boardH)

  const screenMargin = 16
  const screenX = boardX + screenMargin
  const screenY = boardY + screenMargin
  const screenW = boardW - screenMargin * 2
  const screenH = boardH - screenMargin * 2

  // Artwork on LED display
  ctx.save()
  ctx.beginPath()
  ctx.rect(screenX, screenY, screenW, screenH)
  ctx.clip()
  drawCoverImage(ctx, src, screenX, screenY, screenW, screenH)

  // LED pixel dot grid mesh overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  for (let y = screenY; y < screenY + screenH; y += 4) {
    ctx.fillRect(screenX, y, screenW, 1.5)
  }

  // Rain streaks
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  for (let i = 0; i < 40; i++) {
    const rx = screenX + ((i * 47) % screenW)
    const ry = screenY + ((i * 73) % screenH)
    ctx.beginPath()
    ctx.moveTo(rx, ry)
    ctx.lineTo(rx - 8, ry + 24)
    ctx.stroke()
  }

  ctx.restore()

  // Bottom neon floodlights
  ctx.fillStyle = '#00f0ff'
  const lightCount = 6
  for (let i = 0; i < lightCount; i++) {
    const lx = boardX + ((i + 1) * boardW) / (lightCount + 1)
    const ly = boardY + boardH + 8
    ctx.beginPath()
    ctx.arc(lx, ly, 6, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 5. 1984 CRT Curved Monitor
function renderRetroCrt(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting === 'studio' ? 'darkroom' : lighting)

  // CRT chassis bezel
  const crtW = Math.round(w * 0.8)
  const crtH = Math.round(h * 0.82)
  const crtX = Math.round((w - crtW) / 2)
  const crtY = Math.round((h - crtH) / 2)
  const chassisRadius = 28

  // Chassis shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
  ctx.shadowBlur = 60
  ctx.shadowOffsetY = 24
  ctx.fillStyle = '#222327'
  ctx.beginPath()
  ctx.roundRect(crtX, crtY, crtW, crtH, chassisRadius)
  ctx.fill()
  ctx.restore()

  // Beige/Grey plastic texture gradient
  const plasticGrad = ctx.createLinearGradient(crtX, crtY, crtX, crtY + crtH)
  plasticGrad.addColorStop(0, '#363840')
  plasticGrad.addColorStop(0.5, '#26272e')
  plasticGrad.addColorStop(1, '#1b1c20')
  ctx.fillStyle = plasticGrad
  ctx.beginPath()
  ctx.roundRect(crtX, crtY, crtW, crtH, chassisRadius)
  ctx.fill()

  // Curved Glass Screen Bezel Inner Cutout
  const glassMargin = Math.round(crtW * 0.08)
  const glassX = crtX + glassMargin
  const glassY = crtY + Math.round(glassMargin * 0.8)
  const glassW = crtW - glassMargin * 2
  const glassH = crtH - Math.round(glassMargin * 2.2)

  ctx.fillStyle = '#06070a'
  ctx.beginPath()
  ctx.roundRect(glassX, glassY, glassW, glassH, 22)
  ctx.fill()

  // Draw Artwork inside CRT bulb
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(glassX, glassY, glassW, glassH, 22)
  ctx.clip()
  drawCoverImage(ctx, src, glassX, glassY, glassW, glassH)

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  for (let y = glassY; y < glassY + glassH; y += 3) {
    ctx.fillRect(glassX, y, glassW, 1.2)
  }

  // Phosphor curved bulb reflection highlight
  const bulbGlow = ctx.createRadialGradient(
    glassX + glassW * 0.35,
    glassY + glassH * 0.35,
    10,
    glassX + glassW * 0.5,
    glassY + glassH * 0.5,
    glassW * 0.6
  )
  bulbGlow.addColorStop(0, 'rgba(255, 255, 255, 0.12)')
  bulbGlow.addColorStop(0.5, 'transparent')
  bulbGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
  ctx.fillStyle = bulbGlow
  ctx.fillRect(glassX, glassY, glassW, glassH)
  ctx.restore()

  // Bottom bezel controls: Brand badge, vents, power switch & LED
  const ctrlY = crtY + crtH - Math.round(glassMargin * 1.1)

  // Badge
  ctx.fillStyle = '#00f0ff'
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('ASCII-84', crtX + glassMargin + 10, ctrlY + 14)

  // Ventilation slots
  ctx.fillStyle = '#141518'
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(crtX + crtW * 0.38 + i * 8, ctrlY + 6, 4, 16)
  }

  // Power LED (Green)
  ctx.save()
  ctx.shadowColor = '#00ff66'
  ctx.shadowBlur = 12
  ctx.fillStyle = '#00ff66'
  ctx.beginPath()
  ctx.arc(crtX + crtW - glassMargin - 20, ctrlY + 14, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// 6. Streetwear Hoodie
function renderHoodieMockup(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const bodyW = Math.round(w * 0.72)
  const bodyH = Math.round(h * 0.78)
  const bodyX = Math.round((w - bodyW) / 2)
  const bodyY = Math.round(h * 0.16)

  // Draw hoodie silhouette with shoulders, chest, and kangaroo pocket
  ctx.save()
  ctx.fillStyle = '#18191f'
  ctx.beginPath()
  ctx.moveTo(bodyX + bodyW * 0.3, bodyY)
  ctx.lineTo(bodyX + bodyW * 0.7, bodyY)
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH * 0.45)
  ctx.lineTo(bodyX + bodyW * 0.85, bodyY + bodyH)
  ctx.lineTo(bodyX + bodyW * 0.15, bodyY + bodyH)
  ctx.lineTo(bodyX, bodyY + bodyH * 0.45)
  ctx.closePath()
  ctx.fill()

  // Kangaroo pocket
  ctx.fillStyle = '#14151a'
  ctx.beginPath()
  ctx.moveTo(bodyX + bodyW * 0.25, bodyY + bodyH * 0.65)
  ctx.lineTo(bodyX + bodyW * 0.75, bodyY + bodyH * 0.65)
  ctx.lineTo(bodyX + bodyW * 0.8, bodyY + bodyH * 0.92)
  ctx.lineTo(bodyX + bodyW * 0.2, bodyY + bodyH * 0.92)
  ctx.closePath()
  ctx.fill()

  // Center chest print zone
  const printW = Math.round(bodyW * 0.46)
  const printH = Math.round(bodyH * 0.42)
  const printX = Math.round(bodyX + (bodyW - printW) / 2)
  const printY = Math.round(bodyY + bodyH * 0.18)

  ctx.save()
  ctx.beginPath()
  ctx.rect(printX, printY, printW, printH)
  ctx.clip()
  drawCoverImage(ctx, src, printX, printY, printW, printH)

  // Fabric weave texture overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  for (let py = printY; py < printY + printH; py += 3) {
    ctx.fillRect(printX, py, printW, 1)
  }
  ctx.restore()

  // Hood opening strings
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(bodyX + bodyW * 0.44, bodyY)
  ctx.lineTo(bodyX + bodyW * 0.43, bodyY + bodyH * 0.28)
  ctx.moveTo(bodyX + bodyW * 0.56, bodyY)
  ctx.lineTo(bodyX + bodyW * 0.57, bodyY + bodyH * 0.28)
  ctx.stroke()
  ctx.restore()
}

// 7. Ceramic Coffee Mug
function renderCoffeeMug(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const mugW = Math.round(w * 0.46)
  const mugH = Math.round(h * 0.6)
  const mugX = Math.round((w - mugW) / 2)
  const mugY = Math.round((h - mugH) / 2)

  // Table shadow
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.beginPath()
  ctx.ellipse(mugX + mugW / 2 + 20, mugY + mugH + 10, mugW * 0.6, 24, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Mug handle
  ctx.save()
  ctx.strokeStyle = '#f0ede6'
  ctx.lineWidth = Math.round(mugW * 0.14)
  ctx.beginPath()
  ctx.arc(mugX + mugW + 30, mugY + mugH * 0.5, mugH * 0.26, -Math.PI * 0.5, Math.PI * 0.5)
  ctx.stroke()
  ctx.restore()

  // Mug body
  ctx.save()
  ctx.fillStyle = '#f8f6f0'
  ctx.beginPath()
  ctx.roundRect(mugX, mugY, mugW, mugH, [8, 8, 32, 32])
  ctx.fill()

  // Printed graphic on cylinder
  const printMargin = Math.round(mugW * 0.08)
  const pX = mugX + printMargin
  const pY = mugY + Math.round(mugH * 0.12)
  const pW = mugW - printMargin * 2
  const pH = Math.round(mugH * 0.72)

  ctx.beginPath()
  ctx.rect(pX, pY, pW, pH)
  ctx.clip()
  drawCoverImage(ctx, src, pX, pY, pW, pH)

  // Ceramic cylindrical gloss highlight
  const gloss = ctx.createLinearGradient(mugX, mugY, mugX + mugW, mugY)
  gloss.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
  gloss.addColorStop(0.2, 'rgba(255, 255, 255, 0.45)')
  gloss.addColorStop(0.5, 'transparent')
  gloss.addColorStop(0.9, 'rgba(0, 0, 0, 0.25)')
  gloss.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = gloss
  ctx.fillRect(mugX, mugY, mugW, mugH)
  ctx.restore()
}

// 8. 90s Cassette Tape
function renderCassetteTape(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const casW = Math.round(w * 0.82)
  const casH = Math.round(h * 0.68)
  const casX = Math.round((w - casW) / 2)
  const casY = Math.round((h - casH) / 2)

  // Clear plastic housing
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 16
  ctx.fillStyle = '#1c1f28'
  ctx.beginPath()
  ctx.roundRect(casX, casY, casW, casH, 16)
  ctx.fill()
  ctx.restore()

  // Center paper label with ASCII artwork
  const labelW = Math.round(casW * 0.86)
  const labelH = Math.round(casH * 0.62)
  const labelX = casX + (casW - labelW) / 2
  const labelY = casY + Math.round(casH * 0.12)

  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(labelX, labelY, labelW, labelH, 8)
  ctx.fill()
  ctx.clip()

  drawCoverImage(ctx, src, labelX, labelY, labelW, labelH)

  // Two spool holes
  const spoolR = Math.round(casW * 0.05)
  const spoolY = labelY + labelH / 2
  const leftSpoolX = labelX + labelW * 0.32
  const rightSpoolX = labelX + labelW * 0.68

  ctx.fillStyle = '#000000'
  ctx.beginPath()
  ctx.arc(leftSpoolX, spoolY, spoolR, 0, Math.PI * 2)
  ctx.arc(rightSpoolX, spoolY, spoolR, 0, Math.PI * 2)
  ctx.fill()

  // Teeth inside spools
  ctx.fillStyle = '#ffffff'
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    ctx.fillRect(leftSpoolX + Math.cos(a) * (spoolR - 4), spoolY + Math.sin(a) * (spoolR - 4), 3, 3)
    ctx.fillRect(rightSpoolX + Math.cos(a) * (spoolR - 4), spoolY + Math.sin(a) * (spoolR - 4), 3, 3)
  }

  ctx.restore()

  // Screws in corners
  ctx.fillStyle = '#656b78'
  const screwR = 4
  ctx.beginPath()
  ctx.arc(casX + 16, casY + 16, screwR, 0, Math.PI * 2)
  ctx.arc(casX + casW - 16, casY + 16, screwR, 0, Math.PI * 2)
  ctx.arc(casX + 16, casY + casH - 16, screwR, 0, Math.PI * 2)
  ctx.arc(casX + casW - 16, casY + casH - 16, screwR, 0, Math.PI * 2)
  ctx.fill()
}

// 9. Developer Laptop Lid
function renderLaptopLid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const lidW = Math.round(w * 0.8)
  const lidH = Math.round(h * 0.74)
  const lidX = Math.round((w - lidW) / 2)
  const lidY = Math.round((h - lidH) / 2)

  // Brushed aluminum laptop lid
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 20
  ctx.fillStyle = '#2b2e36'
  ctx.beginPath()
  ctx.roundRect(lidX, lidY, lidW, lidH, 20)
  ctx.fill()
  ctx.restore()

  // Metal sheen
  const metalGrad = ctx.createLinearGradient(lidX, lidY, lidX + lidW, lidY + lidH)
  metalGrad.addColorStop(0, '#3a3e49')
  metalGrad.addColorStop(0.5, '#282b33')
  metalGrad.addColorStop(1, '#1b1d22')
  ctx.fillStyle = metalGrad
  ctx.beginPath()
  ctx.roundRect(lidX, lidY, lidW, lidH, 20)
  ctx.fill()

  // Centered Main ASCII Art Decal / Sticker
  const stickerW = Math.round(lidW * 0.44)
  const stickerH = Math.round(lidH * 0.54)
  const stickerX = lidX + (lidW - stickerW) / 2
  const stickerY = lidY + (lidH - stickerH) / 2

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 16
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(stickerX - 6, stickerY - 6, stickerW + 12, stickerH + 12, 12)
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(stickerX, stickerY, stickerW, stickerH, 8)
  ctx.clip()
  drawCoverImage(ctx, src, stickerX, stickerY, stickerW, stickerH)
  ctx.restore()

  // Surrounding developer stickers
  drawMiniSticker(ctx, lidX + lidW * 0.12, lidY + lidH * 0.16, 'RUST', '#ff5722')
  drawMiniSticker(ctx, lidX + lidW * 0.76, lidY + lidH * 0.2, 'MCP', '#00f0ff')
  drawMiniSticker(ctx, lidX + lidW * 0.14, lidY + lidH * 0.68, 'ASCII', '#00ff66')
  drawMiniSticker(ctx, lidX + lidW * 0.74, lidY + lidH * 0.7, 'LINUX', '#ffbb00')
}

function drawMiniSticker(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, 70, 32, 6)
  ctx.fill()
  ctx.fillStyle = '#000000'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + 35, y + 16)
  ctx.restore()
}

// 10. Arcade Cabinet Marquee & Screen
function renderArcadeCabinet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting === 'studio' ? 'darkroom' : lighting)

  const cabW = Math.round(w * 0.72)
  const cabH = Math.round(h * 0.88)
  const cabX = Math.round((w - cabW) / 2)
  const cabY = Math.round((h - cabH) / 2)

  // Arcade Cabinet Shell
  ctx.fillStyle = '#14151b'
  ctx.beginPath()
  ctx.roundRect(cabX, cabY, cabW, cabH, 16)
  ctx.fill()

  // Glowing Marquee Header
  const marqW = cabW - 32
  const marqH = Math.round(cabH * 0.15)
  const marqX = cabX + 16
  const marqY = cabY + 16

  ctx.save()
  ctx.shadowColor = '#00f0ff'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#0a2233'
  ctx.fillRect(marqX, marqY, marqW, marqH)

  ctx.fillStyle = '#00f0ff'
  ctx.font = 'bold 24px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('⚡ ASCII ARCADE ⚡', marqX + marqW / 2, marqY + marqH / 2)
  ctx.restore()

  // CRT Arcade Screen Area
  const scrW = cabW - 48
  const scrH = Math.round(cabH * 0.52)
  const scrX = cabX + 24
  const scrY = marqY + marqH + 20

  ctx.fillStyle = '#050608'
  ctx.beginPath()
  ctx.roundRect(scrX, scrY, scrW, scrH, 14)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(scrX, scrY, scrW, scrH, 14)
  ctx.clip()
  drawCoverImage(ctx, src, scrX, scrY, scrW, scrH)

  // Scanline filter
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  for (let y = scrY; y < scrY + scrH; y += 3) {
    ctx.fillRect(scrX, y, scrW, 1.2)
  }
  ctx.restore()

  // Coin door / credit
  const coinY = scrY + scrH + 24
  ctx.fillStyle = '#0c0d12'
  ctx.fillRect(cabX + 40, coinY, cabW - 80, cabH - (coinY - cabY) - 16)

  ctx.fillStyle = '#ff0055'
  ctx.font = 'bold 15px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('INSERT 25¢ FOR 1 CREDIT', cabX + cabW / 2, coinY + 36)
}

// 11. Cyberpunk Art Magazine Cover
function renderMagazineCover(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const magW = Math.round(w * 0.68)
  const magH = Math.round(h * 0.86)
  const magX = Math.round((w - magW) / 2)
  const magY = Math.round((h - magH) / 2)

  // Magazine drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 24
  ctx.fillStyle = '#111218'
  ctx.fillRect(magX, magY, magW, magH)
  ctx.restore()

  // Full bleed artwork
  ctx.save()
  ctx.beginPath()
  ctx.rect(magX, magY, magW, magH)
  ctx.clip()
  drawCoverImage(ctx, src, magX, magY, magW, magH)

  // Header Masthead Typography
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
  ctx.shadowBlur = 12
  ctx.font = `900 ${Math.round(magW * 0.16)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText('ASCII', magX + magW / 2, magY + magH * 0.14)

  ctx.font = `bold ${Math.round(magW * 0.038)}px monospace`
  ctx.fillStyle = '#00f0ff'
  ctx.fillText('ISSUE #404 · CREATIVE CODING & TEXT GRAPHICS', magX + magW / 2, magY + magH * 0.2)

  // Bottom Article Teasers
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ff007f'
  ctx.font = `bold ${Math.round(magW * 0.045)}px sans-serif`
  ctx.fillText('SPECIAL REPORT:', magX + 24, magY + magH * 0.76)
  ctx.fillStyle = '#ffffff'
  ctx.font = `${Math.round(magW * 0.038)}px sans-serif`
  ctx.fillText('The Renaissance of 105+ Terminal Styles', magX + 24, magY + magH * 0.81)

  // Barcode
  const bcW = Math.round(magW * 0.26)
  const bcH = Math.round(magH * 0.065)
  const bcX = magX + magW - bcW - 20
  const bcY = magY + magH - bcH - 20
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(bcX, bcY, bcW, bcH)
  ctx.fillStyle = '#000000'
  for (let x = bcX + 4; x < bcX + bcW - 4; x += 3) {
    if ((x % 7) !== 0) ctx.fillRect(x, bcY + 4, 1.5, bcH - 8)
  }

  ctx.restore()
}

// 12. Gaming Desk Mat
function renderDeskMat(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  src: HTMLCanvasElement,
  lighting: EnvironmentLight
) {
  applyLightingGradient(ctx, w, h, lighting)

  const matW = Math.round(w * 0.86)
  const matH = Math.round(h * 0.62)
  const matX = Math.round((w - matW) / 2)
  const matY = Math.round((h - matH) / 2)

  // Mat drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 16
  ctx.fillStyle = '#0f1118'
  ctx.beginPath()
  ctx.roundRect(matX, matY, matW, matH, 16)
  ctx.fill()
  ctx.restore()

  // Stitched border
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(matX, matY, matW, matH, 16)
  ctx.clip()

  drawCoverImage(ctx, src, matX, matY, matW, matH)

  ctx.strokeStyle = '#00f0ff'
  ctx.lineWidth = 4
  ctx.setLineDash([8, 6])
  ctx.strokeRect(matX + 6, matY + 6, matW - 12, matH - 12)

  // Keyboard silhouette on left
  const kbW = Math.round(matW * 0.44)
  const kbH = Math.round(matH * 0.55)
  const kbX = matX + Math.round(matW * 0.08)
  const kbY = matY + Math.round(matH * 0.22)
  ctx.fillStyle = 'rgba(20, 22, 30, 0.88)'
  ctx.beginPath()
  ctx.roundRect(kbX, kbY, kbW, kbH, 8)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.stroke()

  // Mouse silhouette on right
  const mX = matX + Math.round(matW * 0.7)
  const mY = matY + Math.round(matH * 0.3)
  ctx.fillStyle = 'rgba(20, 22, 30, 0.88)'
  ctx.beginPath()
  ctx.roundRect(mX, mY, 60, 95, 28)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.stroke()

  ctx.restore()
}

// -------------------------------------------------------------
// Image Aspect Cover Helper
// -------------------------------------------------------------
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const sw = src.width
  const sh = src.height
  if (sw === 0 || sh === 0) return

  const srcAspect = sw / sh
  const dstAspect = dw / dh

  let sx = 0, sy = 0, sWidth = sw, sHeight = sh

  if (srcAspect > dstAspect) {
    // Source is wider than dest: crop left and right
    sWidth = Math.round(sh * dstAspect)
    sx = Math.round((sw - sWidth) / 2)
  } else {
    // Source is taller than dest: crop top and bottom
    sHeight = Math.round(sw / dstAspect)
    sy = Math.round((sh - sHeight) / 2)
  }

  ctx.drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dw, dh)
}
