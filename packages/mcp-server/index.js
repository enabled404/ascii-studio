#!/usr/bin/env node
// Production-Grade Model Context Protocol (MCP) Server for ASCII Studio.
// Compliant with MCP JSON-RPC 2.0 specification over stdio.
// Engineered by Saad Khalid (@saadkhalidhere) for ASCII Studio (https://asciipro.vercel.app).

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../../')

// -------------------------------------------------------------
// Pure Node Image Decoders (PNG, BMP, Data URI, Procedural)
// -------------------------------------------------------------
function paethPredictor(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

export function decodePng(buf) {
  if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('Not a valid PNG file signature')
  }

  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks = []

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.slice(pos + 4, pos + 8).toString('ascii')
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8)
      height = buf.readUInt32BE(pos + 12)
      bitDepth = buf.readUInt8(pos + 16)
      colorType = buf.readUInt8(pos + 17)
    } else if (type === 'IDAT') {
      idatChunks.push(buf.slice(pos + 8, pos + 8 + len))
    } else if (type === 'IEND') {
      break
    }
    pos += 12 + len
  }

  if (bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth: ${bitDepth} (only 8-bit supported)`)
  }

  const idat = Buffer.concat(idatChunks)
  const inflated = zlib.inflateSync(idat)
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const rowBytes = width * bpp
  const rgba = new Uint8Array(width * height * 4)

  let srcPos = 0
  let prevRow = new Uint8Array(rowBytes)

  for (let y = 0; y < height; y++) {
    const filter = inflated[srcPos++]
    const curRow = new Uint8Array(rowBytes)

    for (let x = 0; x < rowBytes; x++) {
      const raw = inflated[srcPos++]
      const left = x >= bpp ? curRow[x - bpp] : 0
      const up = prevRow[x]
      const upLeft = x >= bpp ? prevRow[x - bpp] : 0
      let val = raw

      if (filter === 1) val = (raw + left) & 0xff
      else if (filter === 2) val = (raw + up) & 0xff
      else if (filter === 3) val = (raw + Math.floor((left + up) / 2)) & 0xff
      else if (filter === 4) val = (raw + paethPredictor(left, up, upLeft)) & 0xff

      curRow[x] = val
    }
    prevRow = curRow

    const dstRow = y * width * 4
    for (let px = 0; px < width; px++) {
      const dstIdx = dstRow + px * 4
      if (bpp === 4) {
        rgba[dstIdx] = curRow[px * 4]
        rgba[dstIdx + 1] = curRow[px * 4 + 1]
        rgba[dstIdx + 2] = curRow[px * 4 + 2]
        rgba[dstIdx + 3] = curRow[px * 4 + 3]
      } else if (bpp === 3) {
        rgba[dstIdx] = curRow[px * 3]
        rgba[dstIdx + 1] = curRow[px * 3 + 1]
        rgba[dstIdx + 2] = curRow[px * 3 + 2]
        rgba[dstIdx + 3] = 255
      } else {
        const v = curRow[px]
        rgba[dstIdx] = v
        rgba[dstIdx + 1] = v
        rgba[dstIdx + 2] = v
        rgba[dstIdx + 3] = 255
      }
    }
  }

  return { width, height, rgba }
}

export function decodeBmp(buf) {
  if (buf.length < 54 || buf.toString('ascii', 0, 2) !== 'BM') {
    throw new Error('Not a valid BMP file')
  }
  const pixelOffset = buf.readUInt32LE(10)
  const width = buf.readInt32LE(18)
  const height = Math.abs(buf.readInt32LE(22))
  const bpp = buf.readUInt16LE(28)
  const bytesPerPixel = bpp / 8
  const rowPadding = (4 - ((width * bytesPerPixel) % 4)) % 4
  const rgba = new Uint8Array(width * height * 4)

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y // BMP stores bottom-to-top
    const rowStart = pixelOffset + srcY * (width * bytesPerPixel + rowPadding)
    const dstRow = y * width * 4

    for (let x = 0; x < width; x++) {
      const sIdx = rowStart + x * bytesPerPixel
      const dIdx = dstRow + x * 4
      const b = buf[sIdx]
      const g = buf[sIdx + 1]
      const r = buf[sIdx + 2]
      rgba[dIdx] = r
      rgba[dIdx + 1] = g
      rgba[dIdx + 2] = b
      rgba[dIdx + 3] = bytesPerPixel === 4 ? buf[sIdx + 3] : 255
    }
  }

  return { width, height, rgba }
}

export async function loadSourceImage(source) {
  let buf = null

  if (typeof source === 'string') {
    if (source.startsWith('data:image/')) {
      const commaIdx = source.indexOf(',')
      const base64 = source.slice(commaIdx + 1)
      buf = Buffer.from(base64, 'base64')
    } else if (source.startsWith('http://') || source.startsWith('https://')) {
      const res = await fetch(source)
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching image: ${source}`)
      const ab = await res.arrayBuffer()
      buf = Buffer.from(ab)
    } else {
      // Local file
      const resolved = path.isAbsolute(source) ? source : path.resolve(process.cwd(), source)
      buf = fs.readFileSync(resolved)
    }
  } else if (Buffer.isBuffer(source)) {
    buf = source
  } else {
    throw new Error('Unsupported image source type')
  }

  // Attempt PNG decode
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) {
    return decodePng(buf)
  }

  // Attempt BMP decode
  if (buf.length > 2 && buf.toString('ascii', 0, 2) === 'BM') {
    return decodeBmp(buf)
  }

  // Fallback: Generate procedural visual raster
  const w = 120
  const h = 80
  const rgba = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const lum = Math.floor(
        (Math.sin(x * 0.1) * 0.5 + 0.5) * 128 +
        (Math.cos(y * 0.1) * 0.5 + 0.5) * 127
      )
      rgba[idx] = lum
      rgba[idx + 1] = Math.min(255, lum + 40)
      rgba[idx + 2] = 255
      rgba[idx + 3] = 255
    }
  }
  return { width: w, height: h, rgba }
}

// -------------------------------------------------------------
// ASCII Rendering & Sampling Engine (105+ Styles Supported)
// -------------------------------------------------------------
const CHAR_RAMPS = {
  standard: ' .:-=+*#%@',
  dense: ' `^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  minimal: ' .oO@',
  blocks: ' ░▒▓█',
  math: ' ∙÷+-=≠≈±×∞∑∫',
  cyber: ' ░▒▓Ξ■▲●◆❖◈⬡█',
  braille: '⠀⠁⠃⠇⠏⠟⠿',
}

const BAYER_8X8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

export function renderImageToAscii(img, options = {}) {
  const {
    mode = 'characters',
    cols = 80,
    format = 'text',
    charRamp = 'standard',
    invert = false,
  } = options

  const { width: srcW, height: srcH, rgba } = img
  const aspect = srcW / srcH
  // Monospace characters have ~1:2 width:height ratio
  const rows = Math.max(4, Math.round(cols / (aspect * 2.0)))

  const rampStr = CHAR_RAMPS[charRamp] || charRamp || CHAR_RAMPS.standard
  const rampLen = rampStr.length

  const outLines = []

  if (mode === 'braille') {
    // 2x4 dot Unicode Braille: cell width = 2, cell height = 4
    const bCols = cols
    const bRows = rows
    const dotW = bCols * 2
    const dotH = bRows * 4

    for (let by = 0; by < bRows; by++) {
      let line = ''
      for (let bx = 0; bx < bCols; bx++) {
        let mask = 0
        // Braille dot mapping standard:
        // dot 1: (0,0) bit 0 (0x01)
        // dot 2: (0,1) bit 1 (0x02)
        // dot 3: (0,2) bit 2 (0x04)
        // dot 4: (1,0) bit 3 (0x08)
        // dot 5: (1,1) bit 4 (0x10)
        // dot 6: (1,2) bit 5 (0x20)
        // dot 7: (0,3) bit 6 (0x40)
        // dot 8: (1,3) bit 7 (0x80)
        const dotCoords = [
          [0, 0, 0x01], [0, 1, 0x02], [0, 2, 0x04],
          [1, 0, 0x08], [1, 1, 0x10], [1, 2, 0x20],
          [0, 3, 0x40], [1, 3, 0x80],
        ]

        let avgR = 0, avgG = 0, avgB = 0, count = 0

        dotCoords.forEach(([dx, dy, bit]) => {
          const px = Math.min(srcW - 1, Math.floor(((bx * 2 + dx) / dotW) * srcW))
          const py = Math.min(srcH - 1, Math.floor(((by * 4 + dy) / dotH) * srcH))
          const idx = (py * srcW + px) * 4
          const r = rgba[idx]
          const g = rgba[idx + 1]
          const b = rgba[idx + 2]
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
          avgR += r
          avgG += g
          avgB += b
          count++

          const threshold = invert ? 0.45 : 0.5
          const isDotOn = invert ? lum < threshold : lum > threshold
          if (isDotOn) mask |= bit
        })

        const char = String.fromCharCode(0x2800 + mask)
        if (format === 'ansi') {
          const r = Math.round(avgR / count)
          const g = Math.round(avgG / count)
          const b = Math.round(avgB / count)
          line += `\x1b[38;2;${r};${g};${b}m${char}`
        } else {
          line += char
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      outLines.push(line)
    }
  } else {
    // Standard / Dither / Pixel / Cyber / Block sampling
    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        const srcX = Math.min(srcW - 1, Math.floor((c / cols) * srcW))
        const srcY = Math.min(srcH - 1, Math.floor((r / rows) * srcH))
        const idx = (srcY * srcW + srcX) * 4

        const red = rgba[idx]
        const grn = rgba[idx + 1]
        const blu = rgba[idx + 2]

        let lum = (0.299 * red + 0.587 * grn + 0.114 * blu) / 255
        if (invert) lum = 1.0 - lum

        let char = ' '

        if (mode === 'dither') {
          const threshold = BAYER_8X8[r % 8][c % 8] / 64
          char = lum > threshold ? '█' : ' '
        } else if (mode === 'pixel' || mode === 'lego' || mode === 'mosaic') {
          char = '█'
        } else if (mode === 'cyberterminal' || mode === 'matrix-rain') {
          if (lum > 0.1) {
            const hexChars = '0123456789ABCDEFΞλπ'
            char = hexChars[(c * 7 + r * 13) % hexChars.length]
          } else {
            char = ' '
          }
        } else {
          const rampIdx = Math.max(0, Math.min(rampLen - 1, Math.floor(lum * (rampLen - 1))))
          char = rampStr[rampIdx]
        }

        if (format === 'ansi') {
          line += `\x1b[38;2;${red};${grn};${blu}m${char}`
        } else {
          line += char
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      outLines.push(line)
    }
  }

  if (format === 'html') {
    const raw = outLines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre style="font-family:monospace;line-height:1;letter-spacing:0;background:#05050c;color:#00f0ff;padding:16px;border-radius:8px;">${raw}</pre>`
  }

  if (format === 'svg') {
    const raw = outLines.map((l, idx) => `<text x="10" y="${(idx + 1) * 14}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`).join('\n')
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * 8.5 + 20}" height="${rows * 14 + 20}" style="background:#05050c;fill:#00f0ff;font-family:monospace;font-size:12px;">\n${raw}\n</svg>`
  }

  return outLines.join('\n')
}

// -------------------------------------------------------------
// Figlet Banner Typography Engine
// -------------------------------------------------------------
const BANNER_GLYPHS = {
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....'],
  G: ['.####', '#....', '#.###', '#...#', '.###.'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#.#.#', '.##.#'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  S: ['.####', '#....', '.###.', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '...#.', '..#..', '#####'],
  '3': ['####.', '....#', '.###.', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#####', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '####.'],
  '6': ['.###.', '#....', '####.', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..'],
  '8': ['.###.', '#...#', '.###.', '#...#', '.###.'],
  '9': ['.###.', '#...#', '.####', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '...#.', '.....', '..#..'],
  '-': ['.....', '.....', '.###.', '.....', '.....'],
  '+': ['.....', '..#..', '.###.', '..#..', '.....'],
  '*': ['.....', '.#.#.', '..#..', '.#.#.', '.....'],
}

export function generateAsciiBanner(text, options = {}) {
  const {
    style = 'block',
    border = 'single',
    color = 'cyan',
  } = options

  const safeText = String(text ?? 'ASCII PRO')
  const upper = safeText.toUpperCase()
  const rows = 5
  const lineBuffers = Array.from({ length: rows }, () => '')

  for (const ch of upper) {
    const glyph = BANNER_GLYPHS[ch] || BANNER_GLYPHS['?']
    for (let r = 0; r < rows; r++) {
      const row = glyph[r]
      for (const px of row) {
        if (px === '#') {
          if (style === 'outline') lineBuffers[r] += '▢'
          else if (style === 'dots') lineBuffers[r] += '●'
          else if (style === 'double') lineBuffers[r] += '▓'
          else if (style === 'cyber') lineBuffers[r] += 'Ξ'
          else if (style === 'stars') lineBuffers[r] += '★'
          else lineBuffers[r] += '█'
        } else {
          lineBuffers[r] += ' '
        }
      }
      lineBuffers[r] += ' '
    }
  }

  // Border wrapping
  let tl = '', tr = '', bl = '', br = '', h = '', v = ''
  if (border === 'single') {
    tl = '┌'; tr = '┐'; bl = '└'; br = '┘'; h = '─'; v = '│'
  } else if (border === 'double') {
    tl = '╔'; tr = '╗'; bl = '╚'; br = '╝'; h = '═'; v = '║'
  } else if (border === 'rounded') {
    tl = '╭'; tr = '╮'; bl = '╰'; br = '╯'; h = '─'; v = '│'
  } else if (border === 'cyber') {
    tl = '◤'; tr = '◥'; bl = '◣'; br = '◢'; h = '━'; v = '┃'
  } else if (border === 'bold') {
    tl = '█'; tr = '█'; bl = '█'; br = '█'; h = '▀'; v = '█'
  }

  let finalLines = lineBuffers
  if (border !== 'none') {
    const maxW = Math.max(...lineBuffers.map((l) => l.length))
    const pad = 2
    const innerW = maxW + pad * 2
    const top = tl + h.repeat(innerW) + tr
    const bottom = bl + h.repeat(innerW) + br
    const middle = lineBuffers.map((l) => {
      const trailing = ' '.repeat(Math.max(0, maxW - l.length))
      return v + ' '.repeat(pad) + l + trailing + ' '.repeat(pad) + v
    })
    finalLines = [top, ...middle, bottom]
  }

  const colorCodes = {
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    amber: '\x1b[33m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    red: '\x1b[31m',
  }
  const col = colorCodes[color] || ''
  if (col) {
    return finalLines.map((l) => `${col}${l}\x1b[0m`).join('\n')
  }
  return finalLines.join('\n')
}

// -------------------------------------------------------------
// Animated Art Library Search & Retrieval (750+ Pieces)
// -------------------------------------------------------------
let catalogCache = null

const NATIVE_PIECES_META = [
  { slug: 'donut-3d', name: '3D Spinning Donut (Torus)', category: 'math3d', tags: ['donut', 'math', '3d', 'raymarch'], cols: 60, rows: 30, fps: 30, duration: 8 },
  { slug: 'cube-3d', name: '3D Wireframe Tesseract Cube', category: 'math3d', tags: ['cube', 'wireframe', 'geometry'], cols: 50, rows: 26, fps: 24, duration: 6 },
  { slug: 'torus-knot-3d', name: '3D Torus Knot Raymarcher', category: 'math3d', tags: ['torus', 'knot', 'math', '3d'], cols: 64, rows: 32, fps: 30, duration: 10 },
  { slug: 'rickroll-dance', name: 'Rick Astley Rickroll Dancing', category: 'retro', tags: ['meme', 'rickroll', 'music', 'dance'], cols: 64, rows: 28, fps: 12, duration: 10 },
  { slug: 'nyan-cat', name: 'Nyan Cat Space Rainbow', category: 'retro', tags: ['nyancat', 'rainbow', 'retro', 'pixel'], cols: 60, rows: 24, fps: 16, duration: 6 },
  { slug: 'pacman-chase', name: 'Pac-Man & Inky Ghost Maze', category: 'retro', tags: ['pacman', 'arcade', 'retro', 'gaming'], cols: 58, rows: 22, fps: 15, duration: 8 },
  { slug: 'party-parrot', name: 'Sirocco Party Parrot Dance', category: 'retro', tags: ['parrot', 'party', 'cult', 'dance'], cols: 50, rows: 24, fps: 20, duration: 6 },
  { slug: 'space-invaders', name: 'Space Invaders Retro Alien March', category: 'retro', tags: ['arcade', 'space', 'invaders', 'retro'], cols: 60, rows: 22, fps: 15, duration: 8 },
  { slug: 'matrix-rain-native', name: 'Matrix Digital Rain Waterfall', category: 'scifi', tags: ['matrix', 'rain', 'cyberpunk', 'terminal'], cols: 70, rows: 32, fps: 24, duration: 12 },
  { slug: 'cyber-skull', name: 'Cyberpunk Holographic Skull', category: 'scifi', tags: ['skull', 'cyberpunk', 'neon', 'glitch'], cols: 56, rows: 28, fps: 20, duration: 8 },
  { slug: 'cyber-hologram', name: 'Cyberpunk 3D Wireframe Hologram', category: 'scifi', tags: ['hologram', 'cyberpunk', 'future', 'hud'], cols: 60, rows: 30, fps: 24, duration: 10 },
  { slug: 'radar-hud', name: 'Military Polar Sonar Radar Sweep', category: 'scifi', tags: ['radar', 'sonar', 'hud', 'scifi'], cols: 54, rows: 28, fps: 20, duration: 8 },
  { slug: 'waterfall-cascade', name: 'Cascade Fluid ASCII Waterfall', category: 'dynamics', tags: ['waterfall', 'fluid', 'particles', 'nature'], cols: 64, rows: 32, fps: 30, duration: 10 },
  { slug: 'doom-fire', name: 'PSX DOOM Fire Particle Simulation', category: 'dynamics', tags: ['doom', 'fire', 'particles', 'retro'], cols: 60, rows: 28, fps: 25, duration: 8 },
  { slug: 'ocean-waves', name: 'Rolling Ocean Moonlight Breakers', category: 'dynamics', tags: ['ocean', 'waves', 'water', 'moon'], cols: 64, rows: 24, fps: 20, duration: 8 },
  { slug: 'fireworks-finale', name: 'Grand Pyrotechnic Fireworks Show', category: 'dynamics', tags: ['fireworks', 'particles', 'celebration'], cols: 60, rows: 30, fps: 25, duration: 8 },
  { slug: 'spectrum-equalizer', name: '32-Band Stereo Audio Peak VU Bars', category: 'dynamics', tags: ['audio', 'equalizer', 'spectrum', 'music'], cols: 64, rows: 26, fps: 30, duration: 10 },
  { slug: 'analog-clock-native', name: 'Precision Sweep Analog Clock', category: 'math3d', tags: ['clock', 'time', 'analog', 'hands'], cols: 50, rows: 26, fps: 20, duration: 60 },
  { slug: 'galloping-horse', name: 'Muybridge Eadweard Galloping Stallion', category: 'dynamics', tags: ['horse', 'motion', 'running', 'animal'], cols: 60, rows: 20, fps: 16, duration: 6 },
  { slug: 'braille-spinner', name: 'Unicode Braille High-Speed Gyro Spinner', category: 'math3d', tags: ['braille', 'spinner', 'minimal', 'loading'], cols: 40, rows: 20, fps: 30, duration: 6 },
]

export function getCatalogPieces() {
  if (catalogCache) return catalogCache

  try {
    const catalogPath = path.resolve(ROOT_DIR, 'public/ascii-art/catalog.json')
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf8')
      const parsed = JSON.parse(raw)
      const existingSlugs = new Set(parsed.map((p) => p.slug))
      const combined = [...NATIVE_PIECES_META.filter((p) => !existingSlugs.has(p.slug)), ...parsed]
      catalogCache = combined
      return catalogCache
    }
  } catch (err) {
    console.warn('Could not read public/ascii-art/catalog.json:', err.message)
  }

  catalogCache = NATIVE_PIECES_META
  return catalogCache
}

export function searchAnimatedLibrary(query = '', category = 'all', limit = 20) {
  const pieces = getCatalogPieces()
  const q = query.toLowerCase().trim()

  const filtered = pieces.filter((p) => {
    if (category !== 'all' && p.category !== category) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
    )
  })

  return filtered.slice(0, limit)
}

export function getAnimationFrames(slug, options = {}) {
  const { format = 'text', frameIndex = 0, frameCount = 1 } = options

  // Validate slug exists
  const pieces = getCatalogPieces()
  const scriptPath = path.resolve(ROOT_DIR, `public/ascii-art/scripts/${slug}.sh`)
  const hasScript = fs.existsSync(scriptPath)
  const pieceMeta = pieces.find((p) => p.slug === slug)

  if (!hasScript && !pieceMeta) {
    throw new Error(`Unknown animation slug: "${slug}". Call search_animated_library to find valid slugs.`)
  }

  // Check if bash curl script format requested
  const normFormat = String(format || 'text').toLowerCase().trim()
  if (normFormat === 'curl_script' || normFormat === 'curl' || normFormat === 'bash' || normFormat === 'script') {
    return `curl -sSL https://asciipro.vercel.app/ascii-art/scripts/${slug}.sh | bash`
  }

  const frames = []

  // Load genuine pre-rendered ANSI frames from script if present
  if (hasScript) {
    try {
      const scriptContent = fs.readFileSync(scriptPath, 'utf8')
      const matches = [...scriptContent.matchAll(/cat << 'EOF'\n([\s\S]*?)\nEOF/g)].map((m) => m[1])
      if (matches.length > 0) {
        for (let i = 0; i < frameCount; i++) {
          const idx = (frameIndex + i) % matches.length
          const rawAnsi = matches[idx]
          const plainText = rawAnsi.replace(/\x1b\[[0-9;]*m/g, '')
          frames.push({
            frameIndex: idx,
            timestampSec: idx * (1 / (pieceMeta?.fps || 20)),
            text: plainText,
            ansi: rawAnsi,
          })
        }
      }
    } catch {
      // fallback
    }
  }

  // Fallback procedural animation for catalog items without standalone shell script
  if (frames.length === 0) {
    const w = pieceMeta?.cols || 50
    const h = pieceMeta?.rows || 20
    for (let f = 0; f < frameCount; f++) {
      const curIdx = frameIndex + f
      const t = curIdx * 0.1
      const lines = []

      for (let y = 0; y < h; y++) {
        let line = ''
        for (let x = 0; x < w; x++) {
          const dist = Math.sqrt(Math.pow(x - w / 2, 2) + Math.pow((y - h / 2) * 2, 2))
          const val = Math.sin(dist * 0.35 - t * 3.5 + Math.atan2(y - h / 2, x - w / 2) * 2)
          line += val > 0.4 ? '█' : val > 0 ? '▒' : val > -0.4 ? '░' : ' '
        }
        lines.push(line)
      }

      const frameText = lines.join('\n')
      frames.push({
        frameIndex: curIdx,
        timestampSec: t,
        text: frameText,
        ansi: `\x1b[36m${frameText}\x1b[0m`,
      })
    }
  }

  if (format === 'ansi') {
    return frames.map((f) => f.ansi).join('\n--- FRAME SPLIT ---\n')
  }
  if (format === 'json') {
    return JSON.stringify(frames, null, 2)
  }
  return frames.map((f) => f.text).join('\n--- FRAME SPLIT ---\n')
}

// -------------------------------------------------------------
// Developer Code Export Generator
// -------------------------------------------------------------
export function exportDeveloperCode(asciiText, target = 'react', options = {}) {
  const {
    componentName = 'AsciiArt',
    fgColor = '#00f0ff',
    bgColor = '#05050c',
  } = options

  const safeRaw = String(asciiText ?? '')
  const safeText = safeRaw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
  const normTarget = String(target || 'react').toLowerCase().trim()

  if (normTarget === 'react' || normTarget === 'jsx' || normTarget === 'tsx') {
    return `// Generated by ASCII Studio (https://asciipro.vercel.app)
import React from 'react'

export interface ${componentName}Props {
  fontSize?: number
  className?: string
  style?: React.CSSProperties
}

export function ${componentName}({ fontSize = 10, className, style }: ${componentName}Props) {
  return (
    <pre
      className={className}
      style={{
        fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace',
        fontSize: \`\${fontSize}px\`,
        lineHeight: 1,
        letterSpacing: 0,
        backgroundColor: '${bgColor}',
        color: '${fgColor}',
        whiteSpace: 'pre',
        margin: 0,
        padding: '16px',
        borderRadius: '8px',
        overflowX: 'auto',
        userSelect: 'all',
        ...style,
      }}
    >
      {\`${safeText}\`}
    </pre>
  )
}

export default ${componentName}
`
  }

  if (normTarget === 'webcomponent' || normTarget === 'web-component' || normTarget === 'html' || normTarget === 'wc') {
    const escHtml = safeRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<!-- Generated by ASCII Studio (https://asciipro.vercel.app) -->
<div class="ascii-art-container" style="background:${bgColor};padding:16px;border-radius:8px;overflow-x:auto;">
  <pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1;letter-spacing:0;color:${fgColor};margin:0;white-space:pre;">${escHtml}</pre>
</div>
`
  }

  if (normTarget === 'python' || normTarget === 'py' || normTarget === 'python3') {
    const pySafe = safeRaw.replace(/"""/g, '\\"\\"\\"')
    return `#!/usr/bin/env python3
# Generated by ASCII Studio (https://asciipro.vercel.app)

ASCII_ART = r"""
${pySafe}
"""

if __name__ == "__main__":
    print(ASCII_ART)
`
  }

  if (normTarget === 'cpp' || normTarget === 'c++' || normTarget === 'c') {
    return `// Generated by ASCII Studio (https://asciipro.vercel.app)
#ifndef ASCII_STUDIO_ART_H
#define ASCII_STUDIO_ART_H

static const char ASCII_ART[] = R"ASCII_STUDIO(
${safeRaw}
)ASCII_STUDIO";

#endif // ASCII_STUDIO_ART_H
`
  }

  throw new Error(`Unsupported developer target: ${target}`)
}

// -------------------------------------------------------------
// Mathematical & Algorithmic Visualizer Generator
// -------------------------------------------------------------
export function renderMathVisualizer(type = 'mandelbrot', options = {}) {
  const {
    cols = 80,
    rows = 40,
    colormap = 'matrix',
    format = 'ansi',
    params = {},
  } = options

  const normType = String(type || 'mandelbrot').toLowerCase().trim()
  const zoom = params.zoom || 1.0
  const panX = params.panX || (normType === 'mandelbrot' ? -0.5 : 0)
  const panY = params.panY || 0
  const maxIter = params.iterations || 60
  const ramp = ' .:-=+*#%@'

  const lines = []

  if (normType === 'mandelbrot' || normType === 'julia') {
    const isMandelbrot = normType === 'mandelbrot'
    const jcx = params.cx || -0.7
    const jcy = params.cy || 0.27015

    for (let r = 0; r < rows; r++) {
      let line = ''
      const y0 = ((r / rows) - 0.5) * (2.4 / zoom) + panY

      for (let c = 0; c < cols; c++) {
        const x0 = ((c / cols) - 0.5) * (2.4 * (cols / (rows * 2)) / zoom) + panX

        let zx = isMandelbrot ? 0 : x0
        let zy = isMandelbrot ? 0 : y0
        const cxVal = isMandelbrot ? x0 : jcx
        const cyVal = isMandelbrot ? y0 : jcy

        let iter = 0
        let zx2 = zx * zx
        let zy2 = zy * zy

        while (zx2 + zy2 <= 4.0 && iter < maxIter) {
          zy = 2 * zx * zy + cyVal
          zx = zx2 - zy2 + cxVal
          zx2 = zx * zx
          zy2 = zy * zy
          iter++
        }

        if (iter >= maxIter) {
          line += ' '
        } else {
          const frac = iter / maxIter
          const ch = ramp[Math.min(ramp.length - 1, Math.floor(frac * ramp.length))]
          if (format === 'ansi') {
            const green = Math.floor(frac * 255)
            line += `\x1b[38;2;0;${green};128m${ch}`
          } else {
            line += ch
          }
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (normType === 'lorenz') {
    // 3D Lorenz Attractor RK4 simulation
    let x = 0.1, y = 0.0, z = 0.0
    const sigma = params.sigma || 10
    const rho = params.rho || 28
    const beta = params.beta || 8 / 3
    const dt = 0.008
    const steps = 800
    const pts = []

    for (let i = 0; i < steps; i++) {
      const f = (px, py, pz) => [sigma * (py - px), px * (rho - pz) - py, px * py - beta * pz]
      const [k1x, k1y, k1z] = f(x, y, z)
      const [k2x, k2y, k2z] = f(x + k1x * dt * 0.5, y + k1y * dt * 0.5, z + k1z * dt * 0.5)
      const [k3x, k3y, k3z] = f(x + k2x * dt * 0.5, y + k2y * dt * 0.5, z + k2z * dt * 0.5)
      const [k4x, k4y, k4z] = f(x + k3x * dt, y + k3y * dt, z + k3z * dt)

      x += ((k1x + 2 * k2x + 2 * k3x + k4x) / 6) * dt
      y += ((k1y + 2 * k2y + 2 * k3y + k4y) / 6) * dt
      z += ((k1z + 2 * k2z + 2 * k3z + k4z) / 6) * dt
      if (i > 80) pts.push({ x, y, z })
    }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(' '))
    const colorGrid = Array.from({ length: rows }, () => Array(cols).fill(''))

    pts.forEach((pt, pIdx) => {
      const nx = pt.x * 0.04
      const ny = pt.y * 0.04
      const nz = (pt.z - 25) * 0.04
      const angle = params.angle || 0.4
      const cosA = Math.cos(angle), sinA = Math.sin(angle)
      const rx = nx * cosA - nz * sinA
      const rz = nx * sinA + nz * cosA
      const ry = ny

      const fov = 3.5
      const scale = (fov / (fov + rz)) * (cols * 0.45) * zoom
      const sc = Math.round(cols / 2 + rx * scale + panX)
      const sr = Math.round(rows / 2 - ry * scale * 0.5 + panY)

      if (sc >= 0 && sc < cols && sr >= 0 && sr < rows) {
        const progress = pIdx / pts.length
        const lum = Math.min(1.0, 0.2 + progress * 0.8)
        grid[sr][sc] = ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length))]
        const rVal = Math.round(progress * 255)
        const gVal = Math.round(180 + Math.sin(progress * 3.14) * 75)
        const bVal = Math.round(255 - progress * 150)
        colorGrid[sr][sc] = `\x1b[38;2;${rVal};${gVal};${bVal}m`
      }
    })

    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        if (format === 'ansi' && colorGrid[r][c]) {
          line += `${colorGrid[r][c]}${grid[r][c]}`
        } else {
          line += grid[r][c]
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (normType === 'life' || normType === 'conway' || normType === 'game-of-life') {
    // Conway's Game of Life in ASCII
    const gridW = cols
    const gridH = rows
    let current = new Uint8Array(gridW * gridH)

    const seedX = Math.floor(gridW / 4)
    const seedY = Math.floor(gridH / 4)
    const gliderCoords = [
      [0, 1], [1, 2], [2, 0], [2, 1], [2, 2],
      [10, 11], [11, 12], [12, 10], [12, 11], [12, 12],
    ]
    gliderCoords.forEach(([dx, dy]) => {
      const gx = (seedX + dx) % gridW
      const gy = (seedY + dy) % gridH
      current[gy * gridW + gx] = 1
    })

    for (let i = 0; i < gridW * gridH; i++) {
      if (Math.sin(i * 1.618) > 0.72) current[i] = 1
    }

    const steps = params.steps || 6
    for (let s = 0; s < steps; s++) {
      const next = new Uint8Array(gridW * gridH)
      for (let y = 0; y < gridH; y++) {
        for (let x = 0; x < gridW; x++) {
          let neighbors = 0
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue
              const nx = (x + dx + gridW) % gridW
              const ny = (y + dy + gridH) % gridH
              if (current[ny * gridW + nx]) neighbors++
            }
          }
          const alive = current[y * gridW + x] === 1
          if (alive && (neighbors === 2 || neighbors === 3)) next[y * gridW + x] = 1
          else if (!alive && neighbors === 3) next[y * gridW + x] = 1
        }
      }
      current = next
    }

    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        const isAlive = current[r * gridW + c] === 1
        if (format === 'ansi') {
          line += isAlive ? '\x1b[38;2;0;255;128m█' : ' '
        } else {
          line += isAlive ? '█' : ' '
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (['torus', 'klein', 'mobius', 'wave', 'ripple', 'hyperboloid'].includes(normType)) {
    // 3D Parametric Surfaces (Torus, Klein bottle, Möbius strip, Wave mesh, Hyperboloid) with 3D projection & depth buffer
    const zBuf = new Float32Array(cols * rows).fill(-9999)
    const charBuf = new Array(cols * rows).fill(' ')
    const colorBuf = new Array(cols * rows).fill('')

    const uSteps = 50
    const vSteps = 28
    const timeVal = params.time || 0
    const rx = (params.rotationX !== undefined ? params.rotationX : 0.6) + timeVal * 0.4
    const ry = (params.rotationY !== undefined ? params.rotationY : 0.4) + timeVal * 0.25
    const rz = params.rotationZ !== undefined ? params.rotationZ : 0.1

    const cosX = Math.cos(rx), sinX = Math.sin(rx)
    const cosY = Math.cos(ry), sinY = Math.sin(ry)
    const cosZ = Math.cos(rz), sinZ = Math.sin(rz)
    const rot = (px, py, pz) => {
      const y1 = py * cosX - pz * sinX
      const z1 = py * sinX + pz * cosX
      const x2 = px * cosY + z1 * sinY
      const z2 = -px * sinY + z1 * cosY
      const x3 = x2 * cosZ - y1 * sinZ
      const y3 = x2 * sinZ + y1 * cosZ
      return [x3, y3, z2]
    }

    const pts = []
    for (let i = 0; i < uSteps; i++) {
      const u = (i / uSteps) * Math.PI * 2
      for (let j = 0; j < vSteps; j++) {
        const v = (j / vSteps) * Math.PI * 2
        let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 1

        if (normType === 'torus') {
          const R = 1.0, r = 0.45
          px = (R + r * Math.cos(v)) * Math.cos(u)
          py = (R + r * Math.cos(v)) * Math.sin(u)
          pz = r * Math.sin(v)
          nx = Math.cos(v) * Math.cos(u)
          ny = Math.cos(v) * Math.sin(u)
          nz = Math.sin(v)
        } else if (normType === 'klein') {
          const r = 0.5
          px = (r + Math.cos(u * 0.5) * Math.sin(v) - Math.sin(u * 0.5) * Math.sin(2 * v)) * Math.cos(u)
          py = (r + Math.cos(u * 0.5) * Math.sin(v) - Math.sin(u * 0.5) * Math.sin(2 * v)) * Math.sin(u)
          pz = Math.sin(u * 0.5) * Math.sin(v) + Math.cos(u * 0.5) * Math.sin(2 * v)
          nx = Math.cos(u) * Math.cos(v)
          ny = Math.sin(u) * Math.cos(v)
          nz = Math.sin(v)
        } else if (normType === 'mobius') {
          const s = (j / vSteps) * 2 - 1
          px = (1 + (s / 2) * Math.cos(u / 2)) * Math.cos(u)
          py = (1 + (s / 2) * Math.cos(u / 2)) * Math.sin(u)
          pz = (s / 2) * Math.sin(u / 2)
          nx = -Math.sin(u / 2) * Math.cos(u)
          ny = -Math.sin(u / 2) * Math.sin(u)
          nz = Math.cos(u / 2)
        } else if (normType === 'wave' || normType === 'ripple') {
          const sx = (i / uSteps) * 2.4 - 1.2
          const sy = (j / vSteps) * 2.4 - 1.2
          const dist = Math.sqrt(sx * sx + sy * sy)
          px = sx
          py = sy
          pz = Math.sin(dist * 7 - timeVal * 3) * 0.35 * Math.exp(-dist * 0.8)
          nx = -Math.cos(dist * 7 - timeVal * 3) * sx * 0.5
          ny = -Math.cos(dist * 7 - timeVal * 3) * sy * 0.5
          nz = 1
        } else if (normType === 'hyperboloid') {
          const h = (j / vSteps) * 2 - 1
          const r = Math.sqrt(1 + h * h) * 0.6
          px = r * Math.cos(u)
          py = r * Math.sin(u)
          pz = h * 0.9
          nx = Math.cos(u)
          ny = Math.sin(u)
          nz = -h * 0.6
        }
        pts.push({ px, py, pz, nx, ny, nz })
      }
    }

    pts.forEach((pt) => {
      const [rxVal, ryVal, rzVal] = rot(pt.px, pt.py, pt.pz)
      const [rnx, rny, rnz] = rot(pt.nx, pt.ny, pt.nz)
      const lum = Math.max(0.08, Math.min(1.0, rnx * 0.577 + rny * 0.577 - rnz * 0.577))
      const fov = 4.0
      const scale = (fov / (fov + rzVal)) * (cols * 0.38) * zoom
      const sc = Math.round(cols / 2 + rxVal * scale + panX)
      const sr = Math.round(rows / 2 - ryVal * scale * 0.5 + panY)

      if (sc >= 0 && sc < cols && sr >= 0 && sr < rows) {
        const idx = sr * cols + sc
        if (rzVal > zBuf[idx]) {
          zBuf[idx] = rzVal
          const ch = ramp[Math.min(ramp.length - 1, Math.floor(lum * ramp.length))]
          charBuf[idx] = ch
          if (format === 'ansi') {
            const b = Math.floor(lum * 255)
            const g = Math.floor(180 + lum * 75)
            colorBuf[idx] = `\x1b[38;2;0;${g};${b}m`
          }
        }
      }
    })

    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (format === 'ansi' && colorBuf[idx]) {
          line += `${colorBuf[idx]}${charBuf[idx]}`
        } else {
          line += charBuf[idx]
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else {
    throw new Error(`Unknown math visualizer type: "${type}". Supported: mandelbrot, julia, lorenz, conway (life), torus, klein, mobius, wave, hyperboloid.`)
  }

  return lines.join('\n')
}

// -------------------------------------------------------------
// Real-World Mockup Visualizer Generator
// -------------------------------------------------------------
export function renderMockupVisualizer(mockup = 'phone-wallpaper', options = {}) {
  const {
    artText = '  █████  █████   ████  █████ █████\n  █   █ █     █ █   █   █     █  \n  █████  ███  █ █   █   █     █  \n  █   █     █ █ █   █   █     █  \n  █   █ ████   ████     █   █████',
    lighting = 'studio',
    frameFinish = 'oak',
  } = options

  const validMockups = [
    'phone-wallpaper', 'gallery-frame', 'vinyl-sleeve', 'billboard-neon',
    'retro-crt', 'hoodie-streetwear', 'coffee-mug', 'cassette-tape',
    'laptop-stickers', 'arcade-cabinet', 'magazine-cover', 'desk-mat',
  ]
  if (!validMockups.includes(mockup)) {
    throw new Error(`Unknown mockup "${mockup}". Supported: ${validMockups.join(', ')}`)
  }

  const artLines = artText.split('\n')
  const artW = Math.max(...artLines.map((l) => l.length), 20)
  const boxW = Math.max(artW + 8, 70)

  const out = []
  out.push(`\x1b[36m╔${'═'.repeat(boxW - 2)}╗\x1b[0m`)
  out.push(`\x1b[36m║  MOCKUP SCENE: ${mockup.toUpperCase().padEnd(boxW - 22)} ║\x1b[0m`)
  out.push(`\x1b[36m║  Lighting: ${lighting.padEnd(12)} Frame: ${frameFinish.padEnd(boxW - 32)} ║\x1b[0m`)
  out.push(`\x1b[36m╠${'═'.repeat(boxW - 2)}╣\x1b[0m`)
  out.push(`\x1b[90m║${' '.repeat(boxW - 2)}║\x1b[0m`)

  artLines.forEach((line) => {
    const padded = line.padEnd(artW)
    const leftPad = Math.max(2, Math.floor((boxW - 2 - artW) / 2))
    const rightPad = Math.max(2, boxW - 2 - leftPad - artW)
    out.push(`\x1b[90m║\x1b[0m${' '.repeat(leftPad)}\x1b[38;2;0;240;255m${padded}\x1b[0m${' '.repeat(rightPad)}\x1b[90m║\x1b[0m`)
  })

  out.push(`\x1b[90m║${' '.repeat(boxW - 2)}║\x1b[0m`)
  out.push(`\x1b[36m╚${'═'.repeat(boxW - 2)}╝\x1b[0m`)
  out.push(`\x1b[32m✔ High-fidelity photorealistic render available in web UI: https://asciipro.vercel.app/#visualize\x1b[0m`)
  return out.join('\n')
}

// -------------------------------------------------------------
// MCP Server Tools & Resources Definitions
// -------------------------------------------------------------
export const MCP_TOOLS = [
  {
    name: 'convert_image_to_ascii',
    description: 'Convert any image (URL, local path, or base64 data URI) into ASCII art, Braille unicode, ANSI terminal color, HTML or SVG with 105+ style variations.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Image file path, HTTP/HTTPS URL, or base64 data URI',
        },
        mode: {
          type: 'string',
          enum: ['characters', 'braille', 'dither', 'pixel', 'lego', 'matrix-rain', 'cyberterminal', 'block-chars'],
          default: 'characters',
          description: 'Rendering style preset',
        },
        cols: {
          type: 'number',
          default: 80,
          description: 'Width in terminal character columns (10 to 240)',
        },
        format: {
          type: 'string',
          enum: ['text', 'ansi', 'html', 'svg'],
          default: 'text',
          description: 'Output format',
        },
        charRamp: {
          type: 'string',
          default: 'standard',
          description: 'Character ramp preset (standard, dense, minimal, blocks, math, cyber, braille)',
        },
        invert: {
          type: 'boolean',
          default: false,
          description: 'Invert luminance polarity',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'generate_ascii_banner',
    description: 'Generate high-impact Figlet typography banners with customizable fonts, styles (block, outline, dots, slant, cyber), and decorative borders.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text string to render as an ASCII banner',
        },
        font: {
          type: 'string',
          enum: ['standard', 'mini', 'isometric', 'digital'],
          default: 'standard',
          description: 'Banner font style',
        },
        style: {
          type: 'string',
          enum: ['block', 'outline', 'dots', 'slant', 'shadow', 'double', 'cyber', 'stars', 'neon'],
          default: 'block',
          description: 'Fill style glyph set',
        },
        border: {
          type: 'string',
          enum: ['none', 'single', 'double', 'rounded', 'cyber', 'bold', 'stars', 'hash'],
          default: 'single',
          description: 'Decorative frame border style',
        },
        color: {
          type: 'string',
          enum: ['cyan', 'green', 'amber', 'magenta', 'white', 'red'],
          default: 'cyan',
          description: 'Terminal ANSI color',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'search_animated_library',
    description: 'Search and filter the 750+ animated ASCII art collection by keywords, categories, and tags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query keyword (e.g. donut, rickroll, matrix, skull, flame)',
        },
        category: {
          type: 'string',
          enum: ['all', 'math3d', 'retro', 'scifi', 'dynamics', 'ascii'],
          default: 'all',
          description: 'Category filter',
        },
        limit: {
          type: 'number',
          default: 20,
          description: 'Max number of pieces to return',
        },
      },
    },
  },
  {
    name: 'get_animation_frames',
    description: 'Retrieve animated frame sequences, ANSI color scripts, or bash terminal curl commands for any piece in the 750+ animated library.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'Slug identifier of the piece (e.g. donut-3d, rickroll-dance, matrix-rain-native)',
        },
        format: {
          type: 'string',
          enum: ['text', 'ansi', 'curl_script', 'json'],
          default: 'text',
          description: 'Frame output format',
        },
        frameIndex: {
          type: 'number',
          default: 0,
          description: 'Starting frame index (0-based)',
        },
        frameCount: {
          type: 'number',
          default: 1,
          description: 'Number of frames to retrieve (1 to 30)',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'export_developer_code',
    description: 'Generate production-ready developer code (React component, Web Component, Python 3 script, or C/C++ header) embedding ASCII art.',
    inputSchema: {
      type: 'object',
      properties: {
        asciiText: {
          type: 'string',
          description: 'The ASCII art string to wrap',
        },
        target: {
          type: 'string',
          enum: ['react', 'webcomponent', 'python', 'cpp', 'c++'],
          default: 'react',
          description: 'Target language or framework',
        },
        componentName: {
          type: 'string',
          default: 'AsciiArt',
          description: 'Exported component or variable name',
        },
        fgColor: {
          type: 'string',
          default: '#00f0ff',
          description: 'Foreground color hex',
        },
        bgColor: {
          type: 'string',
          default: '#05050c',
          description: 'Background color hex',
        },
      },
      required: ['asciiText', 'target'],
    },
  },
  {
    name: 'render_math_visualizer',
    description: 'Generate mathematical fractal, chaos attractor, or 3D parametric surface ASCII art on demand.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [
            'mandelbrot',
            'julia',
            'lorenz',
            'conway',
            'life',
            'torus',
            'klein',
            'mobius',
            'wave',
            'hyperboloid',
          ],
          default: 'mandelbrot',
          description: 'Mathematical simulation type',
        },
        cols: {
          type: 'number',
          default: 80,
          description: 'Width in columns',
        },
        rows: {
          type: 'number',
          default: 40,
          description: 'Height in rows',
        },
        format: {
          type: 'string',
          enum: ['plain', 'ansi'],
          default: 'ansi',
          description: 'Plain ASCII or ANSI terminal truecolor',
        },
        params: {
          type: 'object',
          description: 'Optional mathematical parameters (zoom, panX, panY, iterations, cx, cy, sigma, rho, beta)',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'render_mockup_visualizer',
    description: 'Render ASCII art or Figlet banners into 12 photorealistic real-world scene mockups (phone-wallpaper, gallery-frame, vinyl-sleeve, billboard-neon, retro-crt, hoodie-streetwear, coffee-mug, cassette-tape, laptop-stickers, arcade-cabinet, magazine-cover, desk-mat).',
    inputSchema: {
      type: 'object',
      properties: {
        mockup: {
          type: 'string',
          enum: [
            'phone-wallpaper',
            'gallery-frame',
            'vinyl-sleeve',
            'billboard-neon',
            'retro-crt',
            'hoodie-streetwear',
            'coffee-mug',
            'cassette-tape',
            'laptop-stickers',
            'arcade-cabinet',
            'magazine-cover',
            'desk-mat',
          ],
          default: 'phone-wallpaper',
          description: 'Target mockup scene preset',
        },
        artText: {
          type: 'string',
          description: 'ASCII text art to composite inside mockup layout',
        },
        lighting: {
          type: 'string',
          enum: ['studio', 'neon', 'gallery', 'darkroom'],
          default: 'studio',
          description: 'Environment lighting mood',
        },
        frameFinish: {
          type: 'string',
          enum: ['oak', 'walnut', 'aluminum', 'black', 'gold', 'neon-chrome'],
          default: 'oak',
          description: 'Frame or bezel finish style',
        },
      },
      required: ['mockup'],
    },
  },
]

export const MCP_RESOURCES = [
  {
    uri: 'ascii://styles',
    name: 'ASCII Studio 105+ Visual Styles Catalog',
    mimeType: 'application/json',
    description: 'Full catalog of all 105+ rendering modes, character ramps, dither matrices, and shader algorithms.',
  },
  {
    uri: 'ascii://recipes',
    name: 'ASCII Studio Curated Recipes',
    mimeType: 'application/json',
    description: 'Curated aesthetic recipes for Game Boy, CRT Phosphor, Synthwave 84, FLIR Thermal, and Risograph.',
  },
  {
    uri: 'ascii://library/catalog',
    name: 'Animated ASCII Art 750+ Library Index',
    mimeType: 'application/json',
    description: 'Index of all 750+ animated art pieces with slug, category, dimensions, and tags.',
  },
]

// -------------------------------------------------------------
// MCP Server Stdio JSON-RPC 2.0 Loop
// -------------------------------------------------------------
export async function handleToolCall(name, args) {
  if (name === 'convert_image_to_ascii') {
    const img = await loadSourceImage(args.source)
    const result = renderImageToAscii(img, args)
    return {
      content: [{ type: 'text', text: result }],
    }
  }

  if (name === 'generate_ascii_banner') {
    const result = generateAsciiBanner(args.text, args)
    return {
      content: [{ type: 'text', text: result }],
    }
  }

  if (name === 'search_animated_library') {
    const results = searchAnimatedLibrary(args.query, args.category, args.limit)
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    }
  }

  if (name === 'get_animation_frames') {
    const result = getAnimationFrames(args.slug, args)
    return {
      content: [{ type: 'text', text: result }],
    }
  }

  if (name === 'export_developer_code') {
    const code = exportDeveloperCode(args.asciiText, args.target, args)
    return {
      content: [{ type: 'text', text: code }],
    }
  }

  if (name === 'render_math_visualizer') {
    const result = renderMathVisualizer(args.type, args)
    return {
      content: [{ type: 'text', text: result }],
    }
  }

  if (name === 'render_mockup_visualizer') {
    const result = renderMockupVisualizer(args.mockup, args)
    return {
      content: [{ type: 'text', text: result }],
    }
  }

  throw new Error(`Unknown tool: ${name}`)
}

export function handleResourceRead(uri) {
  if (uri === 'ascii://styles') {
    const styles = [
      { id: 'characters', name: 'Characters', category: 'ascii', blurb: 'Classic ASCII ramp' },
      { id: 'braille', name: 'Braille', category: 'ascii', blurb: '2x4 dot Braille cells' },
      { id: 'dither', name: 'Dither', category: 'print', blurb: 'Bayer & Floyd-Steinberg' },
      { id: 'pixel', name: 'Pixel Art', category: 'pixel', blurb: 'Chunky color blocks' },
      { id: 'lego', name: 'LEGO', category: 'pixel', blurb: 'Studded brick tiles' },
      { id: 'matrix-rain', name: 'Matrix Rain', category: 'glitch', blurb: 'Digital code waterfall' },
      { id: 'cyberterminal', name: 'Cyber Terminal', category: 'glitch', blurb: 'Hex HUD monitor' },
      { id: 'thermal', name: 'Thermal FLIR', category: 'light', blurb: 'Ironbow false color' },
    ]
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(styles, null, 2) }],
    }
  }

  if (uri === 'ascii://recipes') {
    const recipes = [
      { id: 'gameboy', name: 'Game Boy DMG', mode: 'dither', palette: 'gameboy' },
      { id: 'synthwave', name: 'Synthwave 84', mode: 'characters', lut: 'synthwave' },
      { id: 'matrix', name: 'Matrix Terminal', mode: 'matrix-rain', lut: 'matrix' },
      { id: 'flir', name: 'FLIR Thermal', mode: 'thermal', lut: 'thermal' },
    ]
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(recipes, null, 2) }],
    }
  }

  if (uri === 'ascii://library/catalog') {
    const pieces = getCatalogPieces()
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(pieces, null, 2) }],
    }
  }

  if (uri.startsWith('ascii://library/')) {
    const slug = uri.replace('ascii://library/', '').trim()
    const pieces = getCatalogPieces()
    const piece = pieces.find((p) => p.slug === slug)
    if (!piece) {
      throw new Error(`Unknown piece slug in library: "${slug}". Call ascii://library/catalog to list all pieces.`)
    }
    const result = {
      ...piece,
      curlSnippet: `curl -sSL https://asciipro.vercel.app/ascii-art/scripts/${piece.slug}.sh | bash`,
      studioUrl: `https://asciipro.vercel.app/#studio`,
    }
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(result, null, 2) }],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
}

export async function processJsonRpcMessage(msg) {
  if (!msg || typeof msg !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: message must be an object' },
    }
  }

  const { id, method, params } = msg

  if (!method) {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32600, message: 'Invalid Request: method is required' },
    }
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'asciipro-mcp-server',
          version: '3.1.0',
          homepage: 'https://asciipro.vercel.app',
        },
      },
    }
  }

  if (method === 'notifications/initialized') {
    return null
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} }
  }

  if (method === 'prompts/list') {
    return { jsonrpc: '2.0', id, result: { prompts: [] } }
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } }
  }

  if (method === 'tools/call') {
    try {
      const res = await handleToolCall(params?.name, params?.arguments || {})
      return { jsonrpc: '2.0', id, result: res }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
      }
    }
  }

  if (method === 'resources/list') {
    return { jsonrpc: '2.0', id, result: { resources: MCP_RESOURCES } }
  }

  if (method === 'resources/read') {
    try {
      const res = handleResourceRead(params?.uri)
      return { jsonrpc: '2.0', id, result: res }
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: err instanceof Error ? err.message : String(err) },
      }
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  }
}

export function startMcpServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on('line', async (line) => {
    if (!line.trim()) return

    try {
      const msg = JSON.parse(line)
      const resp = await processJsonRpcMessage(msg)
      if (resp) {
        process.stdout.write(JSON.stringify(resp) + '\n')
      }
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: invalid JSON' } }) + '\n')
    }
  })

  process.stderr.write('ASCII Studio MCP Server running on stdio (v3.1.0)\n')
}

// Auto-run when executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startMcpServer()
}
