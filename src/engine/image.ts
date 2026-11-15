// Image pipeline helpers: sampling, tone adjustments, warps, dither.
// Original implementations written for ASCII Studio using standard Canvas APIs.

export interface GridCell {
  r: number
  g: number
  b: number
  lum: number // 0..1 luminance after adjustments
  edge: number // 0..1 edge strength
}

export interface Grid {
  cols: number
  rows: number
  cells: GridCell[]
  aspect: number // source width / height
}

/** Draw a source (image/video/canvas) into a small grid canvas and return per-cell data. */
export function sampleGrid(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  cols: number,
  rows: number,
  adjustments: { brightness: number; contrast: number; saturation: number; gamma: number; invert: boolean },
  warp: string | null,
  warpAmount: number,
  lut?: import('../types').LutId,
): Grid {
  const aspect = srcW / srcH
  const work = document.createElement('canvas')
  work.width = cols
  work.height = rows
  const ctx = work.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, cols, rows)
  let img = ctx.getImageData(0, 0, cols, rows)
  if (warp) {
    img = applyWarp(img, warp, warpAmount)
  }
  applyAdjustments(img, adjustments)
  if (lut && lut !== 'none') {
    applyLut(img, lut)
  }
  const data = img.data
  const cells: GridCell[] = new Array(cols * rows)
  const lumArr = new Float32Array(cols * rows)
  for (let i = 0; i < cols * rows; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    lumArr[i] = lum
    cells[i] = { r, g, b, lum, edge: 0 }
  }
  // Sobel edge magnitude on luminance
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const at = (xx: number, yy: number) => {
        const cx = Math.min(cols - 1, Math.max(0, xx))
        const cy = Math.min(rows - 1, Math.max(0, yy))
        return lumArr[cy * cols + cx]
      }
      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)
      cells[y * cols + x].edge = Math.min(1, Math.sqrt(gx * gx + gy * gy) / 4)
    }
  }
  return { cols, rows, cells, aspect }
}

/** Brightness/contrast/saturation/gamma/invert via per-channel LUT + saturation matrix. */
export function applyAdjustments(
  img: ImageData,
  a: { brightness: number; contrast: number; saturation: number; gamma: number; invert: boolean },
) {
  const d = img.data
  const b = a.brightness / 100
  const c = a.contrast / 100
  const g = Math.max(0.05, a.gamma)
  const lut = new Uint8ClampedArray(256)
  for (let i = 0; i < 256; i++) {
    let v = i / 255
    v = Math.pow(v, 1 / g)
    v = (v - 0.5) * c + 0.5
    v = v * b
    v = a.invert ? 1 - v : v
    lut[i] = Math.max(0, Math.min(255, Math.round(v * 255)))
  }
  const s = a.saturation / 100
  // Luminance-preserving saturation matrix
  const m00 = 0.2126 + 0.7874 * s
  const m01 = 0.7152 * (1 - s)
  const m02 = 0.0722 * (1 - s)
  const m10 = 0.2126 * (1 - s)
  const m11 = 0.7152 + 0.2848 * s
  const m12 = 0.0722 * (1 - s)
  const m20 = 0.2126 * (1 - s)
  const m21 = 0.7152 * (1 - s)
  const m22 = 0.0722 + 0.9278 * s
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v))
  for (let i = 0; i < d.length; i += 4) {
    const r = lut[d[i]]
    const gg = lut[d[i + 1]]
    const bb = lut[d[i + 2]]
    d[i] = clamp(m00 * r + m01 * gg + m02 * bb)
    d[i + 1] = clamp(m10 * r + m11 * gg + m12 * bb)
    d[i + 2] = clamp(m20 * r + m21 * gg + m22 * bb)
  }
}

/** Color grading LUT filters for styling image tones. */
export function applyLut(img: ImageData, lut: import('../types').LutId) {
  if (!lut || lut === 'none') return
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    switch (lut) {
      case 'cyberpunk': {
        d[i] = Math.min(255, Math.round(r * 1.2 + (1 - lum) * 60))
        d[i + 1] = Math.min(255, Math.round(g * 0.8 + lum * 40))
        d[i + 2] = Math.min(255, Math.round(b * 1.3 + lum * 70))
        break
      }
      case 'synthwave': {
        d[i] = Math.min(255, Math.round(r * 1.3 + lum * 50))
        d[i + 1] = Math.min(255, Math.round(g * 0.7 + (1 - lum) * 20))
        d[i + 2] = Math.min(255, Math.round(b * 1.2 + (1 - lum) * 70))
        break
      }
      case 'sepia': {
        d[i] = Math.min(255, Math.round(lum * 240 + 20))
        d[i + 1] = Math.min(255, Math.round(lum * 200 + 10))
        d[i + 2] = Math.min(255, Math.round(lum * 150))
        break
      }
      case 'matrix': {
        d[i] = Math.min(255, Math.round(r * 0.1))
        d[i + 1] = Math.min(255, Math.round(lum * 255 * 1.1))
        d[i + 2] = Math.min(255, Math.round(b * 0.15))
        break
      }
      case 'thermal': {
        let tr = 0, tg = 0, tb = 0
        if (lum < 0.25) {
          const t = lum / 0.25
          tr = Math.round(20 * t); tg = 0; tb = Math.round(80 + 175 * t)
        } else if (lum < 0.5) {
          const t = (lum - 0.25) / 0.25
          tr = Math.round(20 + 210 * t); tg = 0; tb = Math.round(255 * (1 - t * 0.5))
        } else if (lum < 0.75) {
          const t = (lum - 0.5) / 0.25
          tr = 230 + Math.round(25 * t); tg = Math.round(180 * t); tb = 0
        } else {
          const t = (lum - 0.75) / 0.25
          tr = 255; tg = Math.round(180 + 75 * t); tb = Math.round(255 * t)
        }
        d[i] = tr; d[i + 1] = tg; d[i + 2] = tb
        break
      }
      case 'anime': {
        const quantized = Math.floor(lum * 5) / 4
        const factor = (quantized + 0.2) / (lum + 0.01)
        d[i] = Math.min(255, Math.round(r * factor * 1.1))
        d[i + 1] = Math.min(255, Math.round(g * factor * 1.1))
        d[i + 2] = Math.min(255, Math.round(b * factor * 1.15))
        break
      }
      case 'acid': {
        d[i] = lum > 0.5 ? 255 - r : Math.round(r * 1.4)
        d[i + 1] = lum > 0.3 ? Math.round(g * 1.3) : 255 - g
        d[i + 2] = Math.round(b * 0.8)
        break
      }
      case 'golden': {
        d[i] = Math.min(255, Math.round(r * 1.25 + 25))
        d[i + 1] = Math.min(255, Math.round(g * 1.1 + 10))
        d[i + 2] = Math.min(255, Math.round(b * 0.85))
        break
      }
      case 'monolith': {
        const mono = lum > 0.5 ? Math.min(255, Math.round(lum * 1.4 * 255)) : Math.max(0, Math.round((lum * 0.7) * 255))
        d[i] = mono; d[i + 1] = mono; d[i + 2] = mono
        break
      }
    }
  }
}

/** Warp modes: displacement mapping on a small ImageData. Amount 0..1. */
export function applyWarp(img: ImageData, mode: string, amount: number): ImageData {
  const w = img.width
  const h = img.height
  const src = img.data
  const out = new ImageData(w, h)
  const dst = out.data
  const cx = w / 2
  const cy = h / 2
  const maxR = Math.sqrt(cx * cx + cy * cy)
  const a = amount * 0.9
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = x
      let sy = y
      const nx = (x - cx) / maxR
      const ny = (y - cy) / maxR
      const r = Math.sqrt(nx * nx + ny * ny)
      const theta = Math.atan2(ny, nx)
      switch (mode) {
        case 'twirl': {
          const ang = theta + a * 2.2 * (1 - r)
          sx = cx + Math.cos(ang) * r * maxR
          sy = cy + Math.sin(ang) * r * maxR
          break
        }
        case 'pinch': {
          const k = 1 - a * 0.7 * (1 - r)
          sx = cx + (x - cx) * k
          sy = cy + (y - cy) * k
          break
        }
        case 'spherize': {
          const k = 1 + a * 0.9 * (1 - r)
          sx = cx + (x - cx) * k
          sy = cy + (y - cy) * k
          break
        }
        case 'ripple': {
          sx = x + Math.sin(y * 0.35 + a * 6) * a * 6
          sy = y + Math.cos(x * 0.35) * a * 4
          break
        }
        case 'zigzag': {
          const zz = ((y % 8) < 4 ? 1 : -1) * a * 4
          sx = x + zz
          break
        }
        case 'waves': {
          sx = x + Math.sin(y * 0.25) * a * 10
          sy = y + Math.sin(x * 0.2) * a * 6
          break
        }
        case 'polar': {
          const ang = theta + a * Math.PI
          const rr = r * (1 + a * 0.5 * Math.sin(theta * 3))
          sx = cx + Math.cos(ang) * rr * maxR
          sy = cy + Math.sin(ang) * rr * maxR
          break
        }
        case 'shear': {
          sx = x + (y - cy) * a * 0.6
          break
        }
        case 'smudge': {
          sx = x + Math.sin(y * 0.5 + x * 0.13) * a * 3
          sy = y + Math.cos(x * 0.4) * a * 3
          break
        }
        default:
          break
      }
      const ix = Math.min(w - 1, Math.max(0, Math.round(sx)))
      const iy = Math.min(h - 1, Math.max(0, Math.round(sy)))
      const si = (iy * w + ix) * 4
      const di = (y * w + x) * 4
      dst[di] = src[si]
      dst[di + 1] = src[si + 1]
      dst[di + 2] = src[si + 2]
      dst[di + 3] = 255
    }
  }
  return out
}

/** Bayer threshold matrices (values 0..1). */
export const BAYER_8: number[][] = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64))

export const BAYER_4: number[][] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

/** Nearest palette color by euclidean distance. */
export function nearestPalette(
  r: number, g: number, b: number,
  palette: [number, number, number][],
): [number, number, number] {
  let best = palette[0]
  let bestD = Infinity
  for (const c of palette) {
    const dr = r - c[0]
    const dg = g - c[1]
    const db = b - c[2]
    const d = dr * dr + dg * dg + db * db
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

/** Seeded pseudo-random generator (mulberry32) for stable stipple/grain. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbCss(r: number, g: number, b: number, a = 1): string {
  return a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`
}

export function mixRgb(
  c1: [number, number, number], c2: [number, number, number], t: number,
): [number, number, number] {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

/** Apply multi-source 3D lighting with normal-mapped specular and relief bump onto sampled grid cells. */
export function applyLightingToGrid(grid: Grid, s: import('../types').Settings): void {
  if (!s.lightingEnabled || !s.lights || s.lights.length === 0) return
  const activeLights = s.lights.filter((l) => l.enabled && l.intensity > 0)
  if (activeLights.length === 0) return

  const cols = grid.cols
  const rows = grid.rows
  const aspect = grid.aspect || cols / rows
  const bump = (s.lightingBump ?? 45) / 100

  for (let y = 0; y < rows; y++) {
    const v = y / rows
    const upY = Math.max(0, y - 1)
    const downY = Math.min(rows - 1, y + 1)
    for (let x = 0; x < cols; x++) {
      const u = x / cols
      const leftX = Math.max(0, x - 1)
      const rightX = Math.min(cols - 1, x + 1)
      const idx = y * cols + x
      const cell = grid.cells[idx]

      // Compute surface normal from luminance gradient (relief bump)
      const lumL = grid.cells[y * cols + leftX].lum
      const lumR = grid.cells[y * cols + rightX].lum
      const lumU = grid.cells[upY * cols + x].lum
      const lumD = grid.cells[downY * cols + x].lum
      const nx = (lumL - lumR) * bump * 2.8
      const ny = (lumU - lumD) * bump * 2.8
      const nz = 1.0
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
      const normX = nx / nLen
      const normY = ny / nLen
      const normZ = nz / nLen

      let addR = 0, addG = 0, addB = 0
      let attTotal = 0

      for (let li = 0; li < activeLights.length; li++) {
        const l = activeLights[li]
        const dx = u - l.x
        const dy = (v - l.y) / aspect
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= l.radius) continue

        let att = 1 - dist / l.radius
        att = att * att * (3 - 2 * att)
        const mult = (l.intensity / 100)
        att *= mult

        const [lr, lg, lb] = hexToRgb(l.color)

        // Direction to light in 3D
        const lDirX = l.x - u
        const lDirY = (l.y - v) / aspect
        const lDirZ = 0.45
        const lLen = Math.sqrt(lDirX * lDirX + lDirY * lDirY + lDirZ * lDirZ) || 1
        const lx = lDirX / lLen
        const ly = lDirY / lLen
        const lz = lDirZ / lLen

        // Diffuse Lambertian with relief normals
        const nDotL = Math.max(0.15, normX * lx + normY * ly + normZ * lz)

        // Blinn-Phong specular highlight
        const hx = lx
        const hy = ly
        const hz = lz + 1.0
        const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1
        const nDotH = Math.max(0, normX * (hx / hLen) + normY * (hy / hLen) + normZ * (hz / hLen))
        const spec = Math.pow(nDotH, 14) * 0.55 * mult

        if (l.type === 'rim') {
          const rimFactor = Math.min(2.5, Math.max(0.2, cell.edge * 4.0))
          att *= rimFactor
        } else if (l.type === 'spot') {
          const spotAngle = Math.atan2(dy, dx)
          const targetAngle = Math.atan2(0.5 - l.y, 0.5 - l.x)
          const angleDiff = Math.abs(spotAngle - targetAngle)
          const cone = Math.max(0, Math.cos(angleDiff))
          att *= cone * cone
        }

        const litFactor = att * (0.4 + 0.6 * nDotL)

        addR += lr * litFactor + 255 * spec
        addG += lg * litFactor + 255 * spec
        addB += lb * litFactor + 255 * spec
        attTotal += litFactor
      }

      if (attTotal > 0) {
        const baseFactor = Math.max(0.18, 1 - attTotal * 0.35)
        const nr = Math.min(255, Math.round(cell.r * baseFactor + addR * 0.7))
        const ng = Math.min(255, Math.round(cell.g * baseFactor + addG * 0.7))
        const nb = Math.min(255, Math.round(cell.b * baseFactor + addB * 0.7))
        cell.r = nr
        cell.g = ng
        cell.b = nb
        cell.lum = Math.min(1, Math.max(0, (0.2126 * nr + 0.7152 * ng + 0.0722 * nb) / 255))
      }
    }
  }
}

/** Client-side procedural generative artwork synthesizer. Generates stunning canvases from prompts with zero cloud latency. */
export function generateProceduralCanvas(prompt: string, w = 960, h = 640): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const p = prompt.toLowerCase()

  if (p.includes('synth') || p.includes('outrun') || p.includes('retro') || p.includes('80s')) {
    // Synthwave Sunset & Neon Perspective Grid
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62)
    sky.addColorStop(0, '#0c021e')
    sky.addColorStop(0.4, '#240846')
    sky.addColorStop(0.75, '#78155c')
    sky.addColorStop(1, '#f24443')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h * 0.62)

    // Sun with horizontal blinds
    const sunX = w / 2, sunY = h * 0.44, sunR = Math.min(w, h) * 0.28
    const sunG = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR)
    sunG.addColorStop(0, '#fff44f')
    sunG.addColorStop(0.5, '#ff4b1f')
    sunG.addColorStop(1, '#ff0844')
    ctx.fillStyle = sunG
    ctx.beginPath()
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
    ctx.fill()

    // Sun horizontal cutout slats
    ctx.fillStyle = '#0c021e'
    const slats = 9
    for (let i = 0; i < slats; i++) {
      const sy = sunY + (i / slats) * sunR * 0.95
      const sh = 3 + i * 2.2
      ctx.fillRect(sunX - sunR - 10, sy, sunR * 2 + 20, sh)
    }

    // Distant mountain silhouettes
    ctx.fillStyle = '#110426'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.62)
    for (let x = 0; x <= w; x += 30) {
      const my = h * 0.62 - Math.abs(Math.sin(x * 0.012) * 80 + Math.sin(x * 0.025) * 40)
      ctx.lineTo(x, my)
    }
    ctx.lineTo(w, h * 0.62)
    ctx.closePath()
    ctx.fill()

    // Outrun perspective grid floor
    const floorG = ctx.createLinearGradient(0, h * 0.62, 0, h)
    floorG.addColorStop(0, '#0a0117')
    floorG.addColorStop(1, '#020005')
    ctx.fillStyle = floorG
    ctx.fillRect(0, h * 0.62, w, h * 0.38)

    ctx.strokeStyle = '#00f0ff'
    ctx.lineWidth = 1.5
    // Vanishing perspective rays
    const vX = w / 2, vY = h * 0.62
    for (let x = -w * 0.6; x <= w * 1.6; x += 55) {
      ctx.beginPath()
      ctx.moveTo(vX, vY)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    // Horizontal speed lines
    for (let i = 1; i <= 14; i++) {
      const t = Math.pow(i / 14, 2.2)
      const gy = vY + t * (h - vY)
      ctx.strokeStyle = `rgba(255, 0, 128, ${0.25 + t * 0.75})`
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
    }
  } else if (p.includes('space') || p.includes('hole') || p.includes('cosmos') || p.includes('galaxy') || p.includes('astron')) {
    // Deep Space Gravitational Lensing & Accretion Disk
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, w, h)

    // Starfield
    for (let i = 0; i < 350; i++) {
      const sx = (Math.sin(i * 997.3) * 0.5 + 0.5) * w
      const sy = (Math.cos(i * 613.7) * 0.5 + 0.5) * h
      const bright = Math.random()
      ctx.fillStyle = bright > 0.8 ? '#00f0ff' : bright > 0.6 ? '#ffb300' : '#ffffff'
      ctx.beginPath()
      ctx.arc(sx, sy, Math.random() * 1.6 + 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Volumetric Nebula
    const neb = ctx.createRadialGradient(w * 0.35, h * 0.4, 40, w * 0.45, h * 0.45, w * 0.55)
    neb.addColorStop(0, 'rgba(128, 0, 255, 0.45)')
    neb.addColorStop(0.4, 'rgba(0, 180, 255, 0.25)')
    neb.addColorStop(0.8, 'rgba(255, 0, 128, 0.15)')
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = neb
    ctx.fillRect(0, 0, w, h)

    // Black hole accretion disk
    const cx = w * 0.55, cy = h * 0.5, r = Math.min(w, h) * 0.28
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.38)
    const disk = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.7)
    disk.addColorStop(0, '#ffffff')
    disk.addColorStop(0.2, '#ffaa00')
    disk.addColorStop(0.5, '#ff2200')
    disk.addColorStop(0.8, '#8800ff')
    disk.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = disk
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Event Horizon (Pitch black circle)
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2)
    ctx.fill()

    // Photon Ring (Bright sharp boundary)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.shadowColor = '#00f0ff'
    ctx.shadowBlur = 24
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  } else if (p.includes('cyber') || p.includes('matrix') || p.includes('skull') || p.includes('hacker') || p.includes('samurai')) {
    // Cyberpunk Tactical HUD & Cybernetic Core
    ctx.fillStyle = '#04070a'
    ctx.fillRect(0, 0, w, h)

    // Hex tactical grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)'
    ctx.lineWidth = 1
    const hexR = 36
    for (let gy = 0; gy < h + hexR; gy += hexR * 1.5) {
      for (let gx = 0; gx < w + hexR; gx += hexR * Math.sqrt(3)) {
        ctx.beginPath()
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3
          const px = gx + hexR * Math.cos(ang)
          const py = gy + hexR * Math.sin(ang)
          if (a === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }

    // Glowing Cybernetic Core Geometry
    const cx = w / 2, cy = h / 2
    for (let r = 60; r <= 220; r += 40) {
      ctx.strokeStyle = r % 80 === 0 ? '#00f0ff' : '#ff007f'
      ctx.lineWidth = r === 140 ? 3 : 1.5
      ctx.beginPath()
      ctx.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 1.85)
      ctx.stroke()
    }

    // Crosshairs and telemetry marks
    ctx.strokeStyle = '#00ff66'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx - 260, cy); ctx.lineTo(cx + 260, cy)
    ctx.moveTo(cx, cy - 200); ctx.lineTo(cx, cy + 200)
    ctx.stroke()

    // Inner glowing crystal
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 120)
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.3, '#00f0ff')
    grad.addColorStop(0.7, '#ff007f')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, 120, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Geometric Kinetic Energy Mandala / Neural Field (Universal generative)
    const bgG = ctx.createLinearGradient(0, 0, w, h)
    bgG.addColorStop(0, '#090a14')
    bgG.addColorStop(1, '#020306')
    ctx.fillStyle = bgG
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const rings = 18
    for (let i = 0; i < rings; i++) {
      const radius = 30 + i * 22
      const dots = 12 + i * 6
      const col = i % 3 === 0 ? '#f26522' : i % 3 === 1 ? '#00f0ff' : '#ff00aa'
      ctx.fillStyle = col
      for (let j = 0; j < dots; j++) {
        const theta = (j / dots) * Math.PI * 2 + (i * 0.18)
        const dx = cx + Math.cos(theta) * radius
        const dy = cy + Math.sin(theta) * radius
        const dotR = 2.0 + Math.sin(i * 0.6 + j * 0.4) * 2.0
        ctx.beginPath()
        ctx.arc(dx, dy, Math.max(1, dotR), 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  return canvas
}

/** Auto-calibrates any custom character set by rasterizing each glyph to measure its exact optical ink density in monospace font, sorting from lightest to darkest. */
export function calibrateCharsetDensity(chars: string): { sorted: string; densities: { char: string; density: number }[] } {
  const list = Array.from(new Set(chars.replace(/[\r\n]/g, '').split('')))
  if (list.length <= 1) {
    return { sorted: chars, densities: list.map((c) => ({ char: c, density: 0.5 })) }
  }
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { sorted: chars, densities: [] }

  ctx.font = '24px ui-monospace, Menlo, Consolas, monospace'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  const metrics = list.map((ch) => {
    ctx.clearRect(0, 0, 32, 32)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(ch, 16, 16)
    const imgData = ctx.getImageData(0, 0, 32, 32)
    const d = imgData.data
    let ink = 0
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 10) ink += d[i]
    }
    const density = ink / (32 * 32 * 255)
    return { char: ch, density }
  })

  metrics.sort((a, b) => a.density - b.density)
  const spaceIdx = metrics.findIndex((m) => m.char === ' ')
  if (spaceIdx > 0) {
    const [sp] = metrics.splice(spaceIdx, 1)
    sp.density = 0
    metrics.unshift(sp)
  } else if (!metrics.some((m) => m.char === ' ')) {
    metrics.unshift({ char: ' ', density: 0 })
  }
  const sorted = metrics.map((m) => m.char).join('')
  return { sorted, densities: metrics }
}

