// Animated ASCII Art Engine & Catalog for ASCII Studio.
// High-performance procedural and keyframed ASCII animation generators,
// multi-palette renderer, GIF/Video/ANSI exporters, and dynamic catalog loader.
// Written by Saad Khalid (@saadkhalidhere).

import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { createZip, type ZipFileEntry } from './exporters'

export interface AnimatedPieceMeta {
  slug: string
  name: string
  category: string
  note: string
  tags: string[]
  cols: number
  rows: number
  fps: number
  author?: string
  source?: 'native' | 'catalog'
  palette?: Record<string, string>
  cell?: 'text' | 'square'
}

export interface FrameData {
  text: string
  color?: string
}

export type RenderFrameFn = (t: number, frameIndex?: number) => FrameData

export interface PieceModule {
  meta: AnimatedPieceMeta
  default: () => RenderFrameFn
}

export type ThemePaletteId = 'original' | 'matrix' | 'cyberpunk' | 'amber' | 'gameboy' | 'monochrome' | 'synthwave' | 'ocean'

export const PALETTE_THEMES: Record<ThemePaletteId, { name: string; bg: string; defaultInk: string; colors: string[] }> = {
  original: {
    name: 'Original Art',
    bg: '#0a0d14',
    defaultInk: '#d8dee9',
    colors: ['#0a0d14', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#ffffff'],
  },
  matrix: {
    name: 'Matrix Core',
    bg: '#040d06',
    defaultInk: '#00ff66',
    colors: ['#040d06', '#003b11', '#007022', '#00a333', '#00e047', '#33ff77', '#88ffb0', '#ffffff'],
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    bg: '#08051a',
    defaultInk: '#00fff5',
    colors: ['#08051a', '#ff0055', '#ff5500', '#ffe600', '#00fff5', '#ff00aa', '#9d00ff', '#ffffff'],
  },
  amber: {
    name: 'Amber CRT',
    bg: '#140c02',
    defaultInk: '#ffb000',
    colors: ['#140c02', '#4a2800', '#7a4200', '#b86600', '#ff9900', '#ffb000', '#ffd270', '#ffffff'],
  },
  gameboy: {
    name: 'Game Boy DMG',
    bg: '#0f380f',
    defaultInk: '#9bbc0f',
    colors: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  },
  monochrome: {
    name: 'Monochrome Silver',
    bg: '#0d0f12',
    defaultInk: '#e2e8f0',
    colors: ['#0d0f12', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f8fafc', '#ffffff'],
  },
  synthwave: {
    name: 'Synthwave 84',
    bg: '#110426',
    defaultInk: '#f24443',
    colors: ['#110426', '#320b5e', '#7b155c', '#c72d62', '#f24443', '#ff884d', '#ffe866', '#ffffff'],
  },
  ocean: {
    name: 'Ocean Deep',
    bg: '#03111e',
    defaultInk: '#38bdf8',
    colors: ['#03111e', '#072e4a', '#0c4a6e', '#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff'],
  },
}

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Pieces',
  featured: '⭐ Featured',
  '3d-math': '📐 3D Math & Shapes',
  'retro-memes': '👾 Retro Gaming & Memes',
  'scifi-cyberpunk': '⚡ Sci-Fi & Cyberpunk',
  'vfx-dynamics': '🔥 VFX & Dynamics',
  'loaders-ui': '⏳ Loaders & UI',
  'animals-nature': '🐾 Animals & Nature',
  landscapes: '🌄 Landscapes',
  screens: '🖥️ UI & Screens',
  cities: '🏙️ Cities & Places',
  india: '🛕 Heritage & Culture',
  lettering: '🔤 Kinetic Lettering',
  explainers: '💡 Explainers & Diagrams',
  'live-data': '📊 Live Data & Charts',
  solids: '🎲 3D Solids',
  algorithms: '🧠 Algorithms',
  demoscene: '✨ Demoscene FX',
  retro: '📼 Vintage Retro',
  science: '🔬 Science & Cosmos',
  food: '🍕 Food & Drinks',
  music: '🎵 Music & Sound',
  mascots: '🐱 Mascots & Characters',
  arcade: '🕹️ Arcade Classics',
  weather: '⛈️ Weather & Skies',
  things: '⚙️ Machines & Things',
  occasions: '🎉 Occasions & Seasons',
  frames: '🖼️ Animated Frames',
  'empty-states': '📭 Empty States',
}

// ─────────────────────────────────────────────────────────────────────────────
// Color & Grid Utilities
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

export class FastGrid {
  cols: number
  rows: number
  ch: string[]
  co: string[]

  constructor(cols: number, rows: number) {
    this.cols = cols
    this.rows = rows
    this.ch = new Array(cols * rows).fill(' ')
    this.co = new Array(cols * rows).fill(' ')
  }

  clear(ch = ' ', co = ' ') {
    this.ch.fill(ch)
    this.co.fill(co)
    return this
  }

  set(x: number, y: number, ch: string, co?: string) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return
    const idx = x + y * this.cols
    this.ch[idx] = ch
    if (co !== undefined) this.co[idx] = co
  }

  text(x: number, y: number, str: string, co?: string) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], co)
    }
  }

  frame(): FrameData {
    const lines: string[] = []
    const cl: string[] = []
    let hasColor = false
    for (let y = 0; y < this.rows; y++) {
      const start = y * this.cols
      const end = start + this.cols
      lines.push(this.ch.slice(start, end).join(''))
      const c = this.co.slice(start, end).join('')
      if (!hasColor && c.trim()) hasColor = true
      cl.push(c)
    }
    return hasColor ? { text: lines.join('\n'), color: cl.join('\n') } : { text: lines.join('\n') }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Native Flagship Animation Generators
// ─────────────────────────────────────────────────────────────────────────────

/** 1. Donut 3D (Torus Raymarcher) */
function createDonut3D(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const R1 = 1
  const R2 = 2
  const K2 = 5
  const K1 = (cols * K2 * 3) / (8 * (R1 + R2))
  const ramp = '.,-~:;=!*#$@'

  return (t: number) => {
    const A = t * 1.6
    const B = t * 0.9
    const cosA = Math.cos(A), sinA = Math.sin(A)
    const cosB = Math.cos(B), sinB = Math.sin(B)

    const output = new Array(cols * rows).fill(' ')
    const colors = new Array(cols * rows).fill(' ')
    const zbuffer = new Float32Array(cols * rows)

    for (let theta = 0; theta < 6.28; theta += 0.07) {
      const costheta = Math.cos(theta), sintheta = Math.sin(theta)
      for (let phi = 0; phi < 6.28; phi += 0.02) {
        const cosphi = Math.cos(phi), sinphi = Math.sin(phi)

        const circlex = R2 + R1 * costheta
        const circley = R1 * sintheta

        const x = circlex * (cosB * cosphi + sinA * sinB * sinphi) - circley * cosA * sinB
        const y = circlex * (sinB * cosphi - sinA * cosB * sinphi) + circley * cosA * cosB
        const z = K2 + cosA * circlex * sinphi + circley * sinA
        const ooz = 1 / z

        const xp = Math.floor(cols / 2 + K1 * ooz * x)
        const yp = Math.floor(rows / 2 - K1 * ooz * y * 0.52)

        const L = cosphi * costheta * sinB - cosA * costheta * sinphi - sinA * sintheta + cosB * (cosA * sintheta - costheta * sinA * sinphi)

        if (L > 0) {
          if (xp >= 0 && xp < cols && yp >= 0 && yp < rows) {
            const idx = xp + yp * cols
            if (ooz > zbuffer[idx]) {
              zbuffer[idx] = ooz
              const lumIdx = Math.floor(L * 8)
              const charIdx = Math.max(0, Math.min(ramp.length - 1, lumIdx))
              output[idx] = ramp[charIdx]
              colors[idx] = KEYS[Math.min(7, Math.floor(L * 7))]
            }
          }
        }
      }
    }

    const textLines: string[] = []
    const colLines: string[] = []
    for (let r = 0; r < rows; r++) {
      textLines.push(output.slice(r * cols, (r + 1) * cols).join(''))
      colLines.push(colors.slice(r * cols, (r + 1) * cols).join(''))
    }
    return { text: textLines.join('\n'), color: colLines.join('\n') }
  }
}

/** 2. Rotating 3D Cube */
function createRotatingCube(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)
  const vertices = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
  ]
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const ax = t * 1.1, ay = t * 1.5, az = t * 0.7
    const cx = Math.cos(ax), sx = Math.sin(ax)
    const cy = Math.cos(ay), sy = Math.sin(ay)
    const cz = Math.cos(az), sz = Math.sin(az)

    const proj = vertices.map(([x, y, z]) => {
      // Rotate X
      let y1 = y * cx - z * sx
      let z1 = y * sx + z * cx
      // Rotate Y
      let x2 = x * cy + z1 * sy
      let z2 = -x * sy + z1 * cy
      // Rotate Z
      let x3 = x2 * cz - y1 * sz
      let y3 = x2 * sz + y1 * cz
      const dist = 3.5 + z2
      const fov = 32
      const px = cols / 2 + (x3 / dist) * fov
      const py = rows / 2 + (y3 / dist) * (fov * 0.5)
      return [px, py, z2]
    })

    // Draw edges
    edges.forEach(([i, j], edgeIdx) => {
      const [x0, y0, z0] = proj[i]
      const [x1, y1, z1] = proj[j]
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) * 2, 1) * 2
      const colorKey = KEYS[Math.floor(((z0 + z1) * 0.5 + 2) * 1.4) % 6 + 1]
      for (let s = 0; s <= steps; s++) {
        const f = s / steps
        const x = Math.round(x0 + (x1 - x0) * f)
        const y = Math.round(y0 + (y1 - y0) * f)
        g.set(x, y, edgeIdx < 4 ? '█' : edgeIdx < 8 ? '▓' : '▒', colorKey)
      }
    })

    // Draw vertex nodes
    proj.forEach(([x, y]) => {
      g.set(Math.round(x), Math.round(y), '●', '7')
    })

    return g.frame()
  }
}

/** 3. Torus Knot 3D */
function createTorusKnot(): RenderFrameFn {
  const cols = 64
  const rows = 32
  const g = new FastGrid(cols, rows)
  const zbuf = new Float32Array(cols * rows)

  return (t: number) => {
    g.clear(' ', ' ')
    zbuf.fill(-9999)
    const p = 2, q = 3
    const rot = t * 1.2
    const cosR = Math.cos(rot), sinR = Math.sin(rot)

    for (let u = 0; u < Math.PI * 2; u += 0.02) {
      const r = Math.cos(q * u) + 2.2
      const kx = r * Math.cos(p * u)
      const ky = r * Math.sin(p * u)
      const kz = -Math.sin(q * u) * 1.8

      // Rotate around Y and X
      const rx = kx * cosR - kz * sinR
      const rz = kx * sinR + kz * cosR
      const ry = ky

      const dist = 5.5 + rz
      const fov = 38
      const sx = Math.floor(cols / 2 + (rx / dist) * fov)
      const sy = Math.floor(rows / 2 + (ry / dist) * (fov * 0.52))

      if (sx >= 0 && sx < cols && sy >= 0 && sy < rows) {
        const idx = sx + sy * cols
        if (rz > zbuf[idx]) {
          zbuf[idx] = rz
          const norm = (rz + 2) / 4
          const char = norm > 0.75 ? '█' : norm > 0.5 ? '▓' : norm > 0.25 ? '▒' : '░'
          const colKey = KEYS[Math.floor(norm * 6) + 1]
          g.set(sx, sy, char, colKey)
        }
      }
    }
    return g.frame()
  }
}

/** 4. Nyan Cat in Space */
function createNyanCat(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)
  const rainbowColors = ['1', '2', '3', '4', '5', '6'] // Red, Orange, Yellow, Green, Cyan, Magenta

  return (t: number) => {
    g.clear(' ', ' ')
    // Background twinkling stars
    const starCycle = Math.floor(t * 8)
    for (let y = 1; y < rows - 1; y += 3) {
      for (let x = 1; x < cols - 1; x += 6) {
        const seed = (x * 37 + y * 59) % 17
        if ((seed + starCycle) % 5 === 0) {
          const glyph = seed % 3 === 0 ? '✦' : seed % 2 === 0 ? '+' : '·'
          g.set(x, y, glyph, '7')
        }
      }
    }

    const catY = Math.floor(rows / 2 - 4 + Math.sin(t * 12) * 1.5)
    const catX = Math.floor(cols * 0.45)

    // Rainbow trail
    for (let rx = 0; rx < catX; rx++) {
      const wave = Math.sin(t * 14 + rx * 0.4) * 1.8
      const ry = Math.floor(rows / 2 - 1 + wave)
      for (let layer = 0; layer < 6; layer++) {
        g.set(rx, ry + layer - 2, '█', rainbowColors[layer])
      }
    }

    // Pop-tart body
    const bodyW = 12, bodyH = 7
    for (let by = 0; by < bodyH; by++) {
      for (let bx = 0; bx < bodyW; bx++) {
        const isBorder = bx === 0 || bx === bodyW - 1 || by === 0 || by === bodyH - 1
        const char = isBorder ? '░' : '█'
        const col = isBorder ? '2' : '6'
        g.set(catX + bx, catY + by, char, col)
      }
    }
    // Sprinkles on pop-tart
    g.set(catX + 3, catY + 2, '•', '1')
    g.set(catX + 8, catY + 2, '•', '4')
    g.set(catX + 5, catY + 4, '•', '3')
    g.set(catX + 9, catY + 4, '•', '1')

    // Cat head
    const headX = catX + bodyW - 1
    const headY = catY + 1
    g.text(headX, headY, ' /\\_/\\ ', '0')
    g.text(headX, headY + 1, '( o.o )', '7')
    g.text(headX, headY + 2, ' > ^ < ', '7')

    // Cat paws
    g.set(catX + 2, catY + bodyH, '🐾', '0')
    g.set(catX + 8, catY + bodyH, '🐾', '0')

    // Cat tail waving
    const tailWag = Math.sin(t * 16) > 0 ? '~' : '^'
    g.set(catX - 1, catY + bodyH - 2, tailWag, '0')

    return g.frame()
  }
}

/** 5. Pac-Man & Ghosts */
function createPacman(): RenderFrameFn {
  const cols = 64
  const rows = 24
  const g = new FastGrid(cols, rows)

  return (t: number) => {
    g.clear(' ', ' ')
    // Maze walls
    g.text(0, 4, '═'.repeat(cols), '4')
    g.text(0, rows - 5, '═'.repeat(cols), '4')

    const pathY = Math.floor(rows / 2)
    // Dots along path
    for (let x = 2; x < cols - 2; x += 4) {
      g.set(x, pathY, '·', '3')
    }
    // Power pellet
    g.set(4, pathY, '●', '7')
    g.set(cols - 6, pathY, '●', '7')

    const speed = 16
    const basePos = Math.floor((t * speed) % (cols + 40)) - 10

    // Pacman
    const pacX = basePos
    const mouthOpen = Math.floor(t * 10) % 2 === 0
    const pacChar = mouthOpen ? 'C' : 'O'
    if (pacX >= 0 && pacX < cols) {
      g.set(pacX, pathY, pacChar, '3')
    }

    // Ghosts chasing
    const ghostDefs = [
      { name: 'Blinky', col: '1', offset: -8 },
      { name: 'Pinky', col: '6', offset: -14 },
      { name: 'Inky', col: '4', offset: -20 },
      { name: 'Clyde', col: '2', offset: -26 },
    ]

    ghostDefs.forEach((gh) => {
      const gx = basePos + gh.offset
      if (gx >= 0 && gx < cols) {
        const eye = Math.floor(t * 6) % 2 === 0 ? 'oo' : '°°'
        g.set(gx, pathY - 1, '∩', gh.col)
        g.set(gx, pathY, eye[0], '7')
        g.set(gx + 1, pathY, eye[1], '7')
        g.set(gx, pathY + 1, 'w', gh.col)
      }
    })

    g.text(2, rows - 2, 'HIGH SCORE: 34,890   STAGE: 01', '7')
    return g.frame()
  }
}

/** 6. Space Invaders 1978 */
function createSpaceInvaders(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)
  const invaders = [
    { type: 'squid', pts: '30', row: 1 },
    { type: 'crab', pts: '20', row: 2 },
    { type: 'crab', pts: '20', row: 3 },
    { type: 'octopus', pts: '10', row: 4 },
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const shift = Math.floor(Math.sin(t * 2) * 6) + 6
    const stepPose = Math.floor(t * 4) % 2 === 0

    invaders.forEach((inv) => {
      const y = inv.row * 3 + 2
      for (let col = 0; col < 8; col++) {
        const x = shift + col * 6
        if (inv.type === 'squid') {
          g.text(x, y, stepPose ? ' /▀\\ ' : ' \\▀/ ', '1')
        } else if (inv.type === 'crab') {
          g.text(x, y, stepPose ? '{●●}' : '}●●{', '2')
        } else {
          g.text(x, y, stepPose ? '<██>' : '>██<', '4')
        }
      }
    })

    // Bunkers
    const bunkY = rows - 7
    for (let b = 0; b < 4; b++) {
      const bx = 8 + b * 14
      g.text(bx, bunkY, ' ▄████▄ ', '3')
      g.text(bx, bunkY + 1, '████████', '3')
      g.text(bx, bunkY + 2, '█▀    ▀█', '3')
    }

    // Player cannon
    const cannonX = Math.floor(cols / 2 + Math.sin(t * 3) * 14)
    g.text(cannonX - 1, rows - 3, '  ▲  ', '3')
    g.text(cannonX - 1, rows - 2, ' ▄█▄ ', '3')
    g.text(cannonX - 1, rows - 1, '█████', '3')

    // Laser beam firing
    const laserY = Math.floor(rows - 4 - ((t * 25) % 18))
    g.set(cannonX + 1, laserY, '│', '7')

    g.text(2, 1, 'SCORE<1>: 01480     LIVES: ▲▲▲', '7')
    return g.frame()
  }
}

/** 7. Cult of the Party Parrot */
function createPartyParrot(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)
  const parrotColors = ['1', '2', '3', '4', '5', '6']

  return (t: number) => {
    g.clear(' ', ' ')
    const phase = Math.floor(t * 14) % 10
    const colorKey = parrotColors[Math.floor(t * 12) % parrotColors.length]

    const bobY = Math.floor(rows / 2 - 6 + Math.sin(t * 18) * 2.2)
    const bobX = Math.floor(cols / 2 - 10 + Math.cos(t * 18) * 3.5)

    const parrotArt = [
      '        .---.         ',
      '       /     \\   _    ',
      '      | () () | / )   ',
      '      |   >   |/ /    ',
      '     / \\  =  /  /     ',
      '    /   \'---\'  /      ',
      '   / /|     |\\ \\      ',
      '  ( ( |     | ) )     ',
      '   \\ \\|     |/ /      ',
      '    \\_\\_____/_/       ',
    ]

    parrotArt.forEach((line, r) => {
      g.text(bobX, bobY + r, line, colorKey)
    })

    // Disco floor
    const floorY = rows - 3
    for (let x = 0; x < cols; x += 2) {
      const tileCol = parrotColors[(Math.floor(x / 4) + phase) % parrotColors.length]
      g.text(x, floorY, '■ ', tileCol)
      g.text(x, floorY + 1, '■ ', parrotColors[(tileCol.charCodeAt(0) + 1) % parrotColors.length])
    }

    g.text(Math.floor(cols / 2 - 12), 2, '★ CULT OF THE PARTY PARROT ★', colorKey)
    return g.frame()
  }
}

/** 8. Matrix Digital Rain */
function createMatrixRain(): RenderFrameFn {
  const cols = 64
  const rows = 32
  const g = new FastGrid(cols, rows)
  const glyphs = '0123456789アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
  const drops = Array.from({ length: cols }, () => ({
    y: Math.random() * rows,
    speed: 0.6 + Math.random() * 1.4,
    length: Math.floor(8 + Math.random() * 14),
  }))

  return (t: number) => {
    g.clear(' ', ' ')
    drops.forEach((drop, col) => {
      const currentY = (drop.y + t * drop.speed * 12) % (rows + drop.length)
      for (let i = 0; i < drop.length; i++) {
        const y = Math.floor(currentY - i)
        if (y >= 0 && y < rows) {
          const char = glyphs[(col * 13 + y * 7 + Math.floor(t * 4)) % glyphs.length]
          let color = '2' // mid green
          if (i === 0) color = '7' // white head
          else if (i < 3) color = '3' // bright lime
          else if (i > drop.length - 4) color = '1' // dark fading green
          g.set(col, y, char, color)
        }
      }
    })
    return g.frame()
  }
}

/** 9. Cyber Skull 3D */
function createCyberSkull(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)

  const skullAscii = [
    '                .ed"""" """$$$$be.                 ',
    '              -"           ^""**$$$e.              ',
    '            ."                   \'$$$c            ',
    '           /                      "4$$b            ',
    '          d  3                      $$$            ',
    '          $  *                   .$$$$$$           ',
    '         .$  ^c           $$$$$e$$$$$$$$.          ',
    '         d$L  4.         4$$$$$$$$$$$$$$b          ',
    '         $$$$$$$be栽培  $$$$$$$$$$$$$$$$$          ',
    '        (   "$$$$$$$b  z$$$$$$$$$$$$$$$$$          ',
    '         `..  $$$$$$$  $$$$$$$$$$$$$$$$$"          ',
    '          `$  $$$$$$$  $F""""**$$$$$$$$$"          ',
    '           $  $$$$$$$  $         "$$$$"            ',
    '           `  $$*$$$$  $       ..  $$"             ',
    '                *$$$P  $        "  d"              ',
    '                 `$$. .M         .P                ',
    '                   $$************/                 ',
    '                    ^**********\'                   ',
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const startY = 4
    const startX = Math.floor((cols - 50) / 2)

    skullAscii.forEach((line, r) => {
      g.text(startX, startY + r, line, '4') // cyan base
    })

    // Scanning laser visor line
    const scanY = Math.floor(startY + 2 + ((Math.sin(t * 3) + 1) * 0.5) * (skullAscii.length - 4))
    for (let x = startX - 4; x < startX + 54; x++) {
      if (x >= 0 && x < cols) {
        g.set(x, scanY, '═', '1') // bright red scan
      }
    }

    // Glowing cyan cyber eyes
    const eyeBlink = Math.sin(t * 8) > -0.8
    if (eyeBlink) {
      g.text(startX + 18, startY + 7, '◉ ◉', '6')
      g.text(startX + 28, startY + 7, '◉ ◉', '6')
    }

    // HUD overlays
    g.text(2, 2, 'CYBER-SKULL // PROTOCOL v4.9', '3')
    g.text(2, rows - 2, `SCAN FREQ: ${(34.2 + Math.sin(t) * 1.5).toFixed(1)} GHz  STATUS: ONLINE`, '7')
    return g.frame()
  }
}

/** 10. Algorithmic Doom Fire */
function createDoomFire(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)
  const fireBuffer = new Uint8Array(cols * rows)
  const ramp = ' ░▒▓█'
  const firePalette = ['0', '1', '2', '3', '7'] // dark, red, orange, yellow, white

  return (t: number) => {
    g.clear(' ', ' ')
    // Set bottom row to maximum heat
    const bottomStart = (rows - 1) * cols
    for (let x = 0; x < cols; x++) {
      fireBuffer[bottomStart + x] = Math.random() > 0.15 ? 36 : 0
    }

    // Propagate upwards
    for (let y = 1; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const fromIdx = y * cols + x
        const pixel = fireBuffer[fromIdx]
        const wind = Math.floor(Math.sin(t * 2) * 1.5)
        if (pixel === 0) {
          fireBuffer[fromIdx - cols] = 0
        } else {
          const rand = Math.floor(Math.random() * 3) + wind
          const toIdx = (y - 1) * cols + ((x - rand + 1 + cols * 2) % cols)
          const decay = Math.floor(Math.random() * 2)
          fireBuffer[toIdx] = pixel >= decay ? pixel - decay : 0
        }
      }
    }

    // Render buffer to ASCII
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const heat = fireBuffer[y * cols + x]
        if (heat > 0) {
          const charIdx = Math.min(ramp.length - 1, Math.floor((heat / 36) * ramp.length))
          const colIdx = Math.min(firePalette.length - 1, Math.floor((heat / 36) * firePalette.length))
          g.set(x, y, ramp[charIdx], firePalette[colIdx])
        }
      }
    }

    return g.frame()
  }
}

/** 11. Ocean Waves & Surf */
function createOceanWaves(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)

  return (t: number) => {
    g.clear(' ', ' ')
    // Sky gradient & setting sun
    const sunX = Math.floor(cols * 0.72)
    const sunY = 5
    g.text(sunX - 3, sunY - 1, '  ▄▄▄  ', '3')
    g.text(sunX - 3, sunY, ' █▀▄▀█ ', '2')
    g.text(sunX - 3, sunY + 1, '  ▀▀▀  ', '1')

    // Sea horizon
    const horizonY = 10
    g.text(0, horizonY, '─'.repeat(cols), '4')

    // 4 wave layers
    for (let layer = 0; layer < 4; layer++) {
      const yBase = horizonY + 3 + layer * 4
      const freq = 0.12 - layer * 0.02
      const speed = (layer + 1) * 2.2
      for (let x = 0; x < cols; x++) {
        const wave = Math.sin(x * freq + t * speed) * (1.2 + layer * 0.8)
        const wy = Math.round(yBase + wave)
        const isFoam = wave > 0.8
        const char = isFoam ? '%' : wave > 0 ? '~' : '='
        const col = isFoam ? '7' : layer === 0 ? '4' : layer === 1 ? '5' : '6'
        g.set(x, wy, char, col)
        if (wy + 1 < rows) {
          g.set(x, wy + 1, '≈', col)
        }
      }
    }

    return g.frame()
  }
}

/** 12. Fireworks Finale */
function createFireworks(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)
  const rockets = [
    { startT: 0, x: 18, apexY: 7, col: '1' },
    { startT: 1.2, x: 46, apexY: 6, col: '3' },
    { startT: 2.4, x: 32, apexY: 5, col: '6' },
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const cycle = t % 3.6

    rockets.forEach((r) => {
      const dt = cycle - r.startT
      if (dt >= 0 && dt < 2.0) {
        if (dt < 0.8) {
          // Rocket ascending
          const progress = dt / 0.8
          const ry = Math.floor(rows - 2 - progress * (rows - 2 - r.apexY))
          g.set(r.x, ry, '▲', '7')
          g.set(r.x, ry + 1, '│', '3')
        } else {
          // Explosion burst
          const burstT = dt - 0.8
          const radius = burstT * 12
          const numSparks = 24
          for (let s = 0; s < numSparks; s++) {
            const angle = (s / numSparks) * Math.PI * 2
            const dist = radius * (0.6 + ((s * 7) % 5) * 0.1)
            const sx = Math.round(r.x + Math.cos(angle) * dist)
            const sy = Math.round(r.apexY + Math.sin(angle) * dist * 0.52 + burstT * burstT * 4) // gravity
            const char = burstT < 0.4 ? '✦' : burstT < 0.8 ? '*' : '·'
            g.set(sx, sy, char, r.col)
          }
        }
      }
    })

    // Ground city silhouette
    for (let x = 0; x < cols; x++) {
      const h = ((x * 17) % 4) + 1
      for (let y = rows - h; y < rows; y++) {
        g.set(x, y, '█', '0')
      }
    }

    return g.frame()
  }
}

/** 13. Spectrum Equalizer */
function createSpectrumEqualizer(): RenderFrameFn {
  const cols = 64
  const rows = 26
  const g = new FastGrid(cols, rows)
  const numBars = 16
  const peaks = new Float32Array(numBars)

  return (t: number) => {
    g.clear(' ', ' ')
    const maxBarH = rows - 6

    for (let b = 0; b < numBars; b++) {
      const bx = 4 + b * 3.6
      // Simulate pulsating frequency energy
      const freq = 1 + b * 0.4
      const energy = (Math.sin(t * 8 * freq) * 0.5 + 0.5) * (0.3 + 0.7 * Math.sin(t * 2 + b))
      const barH = Math.max(1, Math.floor(energy * maxBarH))

      if (barH > peaks[b]) {
        peaks[b] = barH
      } else {
        peaks[b] = Math.max(0, peaks[b] - 0.15)
      }

      // Draw vertical bar with gradient
      for (let h = 0; h < barH; h++) {
        const y = rows - 4 - h
        const ratio = h / maxBarH
        const col = ratio > 0.8 ? '1' : ratio > 0.5 ? '2' : ratio > 0.25 ? '3' : '4'
        const char = ratio > 0.8 ? '█' : '▓'
        g.set(Math.floor(bx), y, char, col)
        g.set(Math.floor(bx + 1), y, char, col)
      }

      // Peak hold indicator
      const peakY = rows - 4 - Math.floor(peaks[b])
      if (peakY >= 2 && peakY < rows - 4) {
        g.set(Math.floor(bx), peakY, '▔', '7')
        g.set(Math.floor(bx + 1), peakY, '▔', '7')
      }
    }

    // Base timeline
    g.text(2, rows - 3, '─'.repeat(cols - 4), '7')
    g.text(2, rows - 2, '32Hz   64Hz   125Hz  250Hz  500Hz  1kHz   2kHz   4kHz   8kHz  16kHz', '4')
    g.text(cols - 16, 2, 'MASTER: +3.2 dB', '1')

    return g.frame()
  }
}

/** 14. Tactical Radar HUD */
function createRadarHUD(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)
  const cx = cols / 2 - 0.5
  const cy = rows / 2 - 0.5
  const maxR = 13

  const targets = [
    { a: 0.8, r: 8, id: 'TGT-01' },
    { a: 2.4, r: 11, id: 'TGT-02' },
    { a: 4.5, r: 6, id: 'BOGEY' },
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    // Range circles
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      [4, 8, 12].forEach((r) => {
        const x = Math.round(cx + Math.cos(a) * r * 2)
        const y = Math.round(cy + Math.sin(a) * r)
        g.set(x, y, '·', '2')
      })
    }

    // Crosshairs
    for (let x = Math.floor(cx - 24); x <= Math.floor(cx + 24); x++) {
      if (x % 4 === 0) g.set(x, Math.floor(cy), '┼', '2')
    }
    for (let y = Math.floor(cy - 12); y <= Math.floor(cy + 12); y++) {
      if (y % 2 === 0) g.set(Math.floor(cx), y, '┼', '2')
    }

    // Sweep line
    const sweepA = (t * 2.5) % (Math.PI * 2)
    for (let r = 0; r <= maxR; r += 0.5) {
      const sx = Math.round(cx + Math.cos(sweepA) * r * 2)
      const sy = Math.round(cy + Math.sin(sweepA) * r)
      g.set(sx, sy, '█', '3')
    }

    // Target blips
    targets.forEach((tgt) => {
      const diff = ((sweepA - tgt.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      if (diff < 2.0) {
        const intensity = 1 - diff / 2.0
        const tx = Math.round(cx + Math.cos(tgt.a) * tgt.r * 2)
        const ty = Math.round(cy + Math.sin(tgt.a) * tgt.r)
        g.set(tx, ty, intensity > 0.5 ? '◆' : '◇', '1')
        g.text(tx + 2, ty, tgt.id, '1')
      }
    })

    // Telemetry readouts
    g.text(2, 2, `AZIMUTH: ${(sweepA * (180 / Math.PI)).toFixed(1)}°`, '3')
    g.text(2, rows - 2, 'TRACKING ACTIVE // RANGE: 40 NM', '3')
    return g.frame()
  }
}

/** 15. Galloping Horse (Muybridge Study) */
function createGallopingHorse(): RenderFrameFn {
  const cols = 64
  const rows = 24
  const g = new FastGrid(cols, rows)

  const frames = [
    [
      '               ..---..             ',
      '             /`       \\__         ',
      '            /            \\__      ',
      '           |      ..---...  \\_    ',
      '          /      /        \\   \\   ',
      '        /`      /          |   |  ',
      '       /       /           |   |  ',
      '     /`       /            /   /  ',
      '    /        /            /   /   ',
      '   /        /            /   /    ',
    ],
    [
      '             ..---..               ',
      '           /`       \\__           ',
      '          /            \\__        ',
      '         |      ..---...  \\_      ',
      '        /      /        \\   \\     ',
      '      /`      /          |   |    ',
      '     /       /           |   |    ',
      '    (       (            /   /    ',
      '     \\       \\          /   /     ',
      '      \\_      \\_       /   /      ',
    ],
    [
      '           ..---..                 ',
      '         /`       \\__             ',
      '        /            \\__          ',
      '       |      ..---...  \\_        ',
      '      /      /        \\   \\       ',
      '    /`      /          |   |      ',
      '   /       /           |   |      ',
      '  (       (            (   (      ',
      '   \\       \\            \\   \\     ',
      '    \\_      \\_           \\_  \\_   ',
    ],
    [
      '             ..---..               ',
      '           /`       \\__           ',
      '          /            \\__        ',
      '         |      ..---...  \\_      ',
      '        /      /        \\   \\     ',
      '      /`      /          |   |    ',
      '     /       /           |   |    ',
      '    /       /            (   (    ',
      '   /       /              \\   \\   ',
      '  /       /                \\_  \\_ ',
    ],
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const frameIdx = Math.floor(t * 10) % frames.length
    const currentFrame = frames[frameIdx]

    const groundY = rows - 4
    g.text(0, groundY, '─'.repeat(cols), '7')

    const startX = Math.floor(cols / 2 - 18)
    const startY = Math.floor(rows / 2 - 6)

    currentFrame.forEach((line, r) => {
      g.text(startX, startY + r, line, '7')
    })

    // Hoof dust particles
    const dustX = startX + 4
    g.text(dustX - 2, groundY - 1, '░▒', '2')

    g.text(2, 2, 'MUYBRIDGE ANIMAL LOCOMOTION // 1878', '4')
    return g.frame()
  }
}

/** 16. Quantum Braille Spinner & UI Loader */
function createBrailleSpinner(): RenderFrameFn {
  const cols = 64
  const rows = 24
  const g = new FastGrid(cols, rows)
  const braillePhases = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const ringBraille = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']

  return (t: number) => {
    g.clear(' ', ' ')
    const spin1 = braillePhases[Math.floor(t * 15) % braillePhases.length]
    const spin2 = ringBraille[Math.floor(t * 12) % ringBraille.length]

    const cx = Math.floor(cols / 2)
    const cy = Math.floor(rows / 2 - 2)

    g.set(cx - 1, cy, spin1, '3')
    g.set(cx + 1, cy, spin2, '4')

    // Concentric Braille ring
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const rx = Math.round(cx + Math.cos(a + t * 4) * 6)
      const ry = Math.round(cy + Math.sin(a + t * 4) * 3)
      g.set(rx, ry, '•', '2')
    }

    const pct = Math.min(100, Math.floor((t * 22) % 100))
    const barW = 32
    const filledW = Math.floor((pct / 100) * barW)
    const barStr = '█'.repeat(filledW) + '░'.repeat(barW - filledW)

    g.text(cx - Math.floor(barW / 2), cy + 4, `[${barStr}] ${pct}%`, '7')
    g.text(cx - 14, cy + 6, 'SYNCHRONIZING QUANTUM MATRIX...', '6')

    return g.frame()
  }
}

/** 17. Rickroll Dancing (Never Gonna Give You Up) */
function createRickrollDance(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)

  const lyrics = [
    '♪ NEVER GONNA GIVE YOU UP ♪',
    '♫ NEVER GONNA LET YOU DOWN ♫',
    '♪ NEVER GONNA RUN AROUND AND DESERT YOU ♪',
    '♫ NEVER GONNA MAKE YOU CRY ♫',
    '♪ NEVER GONNA SAY GOODBYE ♪',
    '♫ NEVER GONNA TELL A LIE AND HURT YOU ♫',
  ]

  const notes = ['♪', '♫', '♬', '♩', '♪', '♫']

  // 6 distinct dance keyframes
  const poses = [
    {
      headX: 28, headY: 5,
      torsoX: 25, torsoY: 10,
      legsX: 25, legsY: 15,
      head: [
        '  .---~~~---.  ',
        ' /  _     _  \\ ',
        '|  (o)   (o)  |',
        ' \\     ^     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        '   /|  |\\   ',
        '  / |  | \\  ',
        ' *  |==|  🎤',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '    /    \\    ',
        '   /  /\\  \\   ',
        '  /  /  \\  \\  ',
        ' /  /    \\  \\ ',
        '(__)      (__)',
      ],
    },
    {
      headX: 28, headY: 6,
      torsoX: 25, torsoY: 11,
      legsX: 25, legsY: 16,
      head: [
        '  .---~~~---.  ',
        ' /  -     -  \\ ',
        '|  (o)   (o)  |',
        ' \\     _     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        '  //|  |\\\\  ',
        ' // |  | \\\\ ',
        '*   |==|   🎤',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '   (  /\\  )   ',
        '    \\ \\/ /    ',
        '    / /\\ \\    ',
        '   (______)   ',
      ],
    },
    {
      headX: 27, headY: 5,
      torsoX: 24, torsoY: 10,
      legsX: 24, legsY: 15,
      head: [
        '  .---~~~---.  ',
        ' /  _     _  \\ ',
        '|  (o)   (o)  |',
        ' \\     ^     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        '   /|  |\\   ',
        '  / |  | \\  ',
        ' 🎤 |==|  * ',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '    /    \\    ',
        '   /  /\\  \\   ',
        '  /  /  \\  \\  ',
        ' /  /    \\  \\ ',
        '(__)      (__)',
      ],
    },
    {
      headX: 29, headY: 5,
      torsoX: 26, torsoY: 10,
      legsX: 26, legsY: 15,
      head: [
        '  .---~~~---.  ',
        ' /  ^     ^  \\ ',
        '|  (o)   (o)  |',
        ' \\     v     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        '   /|  |\\   ',
        '  / |  | \\  ',
        ' 🎤 |==| ===>',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '     /    \\   ',
        '    /  /\\  \\  ',
        '   /  /  \\  \\ ',
        '  /  /    \\  \\',
        ' (__)      (__)',
      ],
    },
    {
      headX: 28, headY: 5,
      torsoX: 25, torsoY: 10,
      legsX: 25, legsY: 15,
      head: [
        '  .---~~~---.  ',
        ' /  >     <  \\ ',
        '|  (o)   (o)  |',
        ' \\     -     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        '   /|  |\\   ',
        '  / |  | \\  ',
        ' *  |==|  🎤',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '     /  \\     ',
        '    / /\\ \\    ',
        '   / /  \\ \\   ',
        '  /_/    \\_\\  ',
        ' (__)    (__) ',
      ],
    },
    {
      headX: 27, headY: 6,
      torsoX: 24, torsoY: 11,
      legsX: 24, legsY: 16,
      head: [
        '  .---~~~---.  ',
        ' /  ~     ~  \\ ',
        '|  (o)   (o)  |',
        ' \\     o     / ',
        '  `--.===.--\'  ',
      ],
      torso: [
        ' 🎤 |  | /  ',
        '  \\ |  |/   ',
        '   \\|==|    ',
        '    |==|    ',
        '    /  \\    ',
      ],
      legs: [
        '    /\\  /\\    ',
        '   /  \\/  \\   ',
        '  /        \\  ',
        ' (___)  (___) ',
      ],
    },
  ]

  return (t: number) => {
    g.clear(' ', ' ')
    const poseIdx = Math.floor(t * 6) % poses.length
    const pose = poses[poseIdx]

    // Stage spotlights in background
    for (let r = 0; r < 20; r++) {
      const lx = Math.floor(r * 1.5)
      const rx = cols - 1 - Math.floor(r * 1.5)
      if (lx < cols) g.set(lx, r, '\\', '3')
      if (rx >= 0) g.set(rx, r, '/', '5')
    }

    // Dancing Rick Astley
    pose.head.forEach((line, i) => g.text(pose.headX, pose.headY + i, line, '3'))
    pose.torso.forEach((line, i) => g.text(pose.torsoX, pose.torsoY + i, line, '4'))
    pose.legs.forEach((line, i) => g.text(pose.legsX, pose.legsY + i, line, '7'))

    // Floating musical notes
    for (let i = 0; i < 4; i++) {
      const ny = 14 - Math.floor(((t * 3 + i * 2.5) % 12))
      const nx = 12 + i * 12 + Math.floor(Math.sin(t * 3 + i) * 2)
      if (ny >= 4 && ny < rows - 4) {
        g.set(nx, ny, notes[i % notes.length], '1')
      }
    }

    // Dynamic Lyrics marquee at top
    const lyricIdx = Math.floor(t / 2.2) % lyrics.length
    const lyric = lyrics[lyricIdx]
    const lx = Math.max(1, Math.floor((cols - lyric.length) / 2))
    g.text(lx, 2, lyric, '2')

    // Disco floor at bottom (rows 22 to 27)
    const floorY = rows - 5
    for (let y = floorY; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = (Math.floor(x / 4) + y + Math.floor(t * 5)) % 2 === 0
        g.set(x, y, tile ? '█' : '░', KEYS[1 + ((x + y + Math.floor(t * 3)) % 6)])
      }
    }

    return g.frame()
  }
}

/** 18. Quantum Cyber Hologram 3D */
function createCyberHologram(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)
  const cx = cols / 2 - 0.5
  const cy = 13

  // 3D Octahedron vertices
  const vertices = [
    [0, -5, 0], [0, 5, 0],
    [-6, 0, 0], [6, 0, 0],
    [0, 0, -6], [0, 0, 6],
  ]
  const edges = [
    [0, 2], [0, 3], [0, 4], [0, 5],
    [1, 2], [1, 3], [1, 4], [1, 5],
    [2, 4], [4, 3], [3, 5], [5, 2],
  ]

  return (t: number) => {
    g.clear(' ', ' ')

    // Subtle chromatic glitch
    const isGlitch = Math.sin(t * 7.7) > 0.94
    const glitchOffset = isGlitch ? (Math.floor(Math.random() * 3) - 1) : 0

    // Rotating 3D wireframe polyhedron
    const ax = t * 1.2
    const ay = t * 1.8
    const az = t * 0.7
    const cosX = Math.cos(ax), sinX = Math.sin(ax)
    const cosY = Math.cos(ay), sinY = Math.sin(ay)
    const cosZ = Math.cos(az), sinZ = Math.sin(az)

    const proj = vertices.map(([x, y, z]) => {
      // Rotate Y
      const x1 = x * cosY + z * sinY
      const y1 = y
      const z1 = -x * sinY + z * cosY
      // Rotate X
      const y2 = y1 * cosX - z1 * sinX
      const z2 = y1 * sinX + z1 * cosX
      // Rotate Z
      const x3 = x1 * cosZ - y2 * sinZ
      const y3 = x1 * sinZ + y2 * cosZ
      const fov = 18 / (18 + z2)
      return [cx + x3 * fov * 2.1 + glitchOffset, cy + y3 * fov]
    })

    // Draw edges
    edges.forEach(([i, j]) => {
      const [x0, y0] = proj[i]
      const [x1, y1] = proj[j]
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0) * 2, 2)
      for (let s = 0; s <= steps; s++) {
        const u = s / steps
        const px = Math.round(x0 + (x1 - x0) * u)
        const py = Math.round(y0 + (y1 - y0) * u)
        g.set(px, py, '◆', '4')
      }
    })

    // Draw vertex glow points
    proj.forEach(([px, py]) => {
      g.set(Math.round(px), Math.round(py), '✦', '7')
    })

    // Holographic laser scanline sweeping vertically
    const scanY = Math.floor(4 + ((t * 12) % 18))
    for (let x = 6; x < cols - 6; x++) {
      g.set(x, scanY, '═', '7')
    }

    // Holographic emitter pedestal at bottom
    const pedY = rows - 6
    for (let x = 8; x <= cols - 9; x++) {
      // Light cones from pedestal toward hologram
      if (x % 3 === 0) {
        const dist = Math.abs(x - cx)
        const topX = Math.round(cx + (x - cx) * 0.4)
        for (let y = cy + 6; y < pedY; y++) {
          const ratio = (y - (cy + 6)) / (pedY - (cy + 6))
          const beamX = Math.round(topX + (x - topX) * ratio)
          if (dist < 20) g.set(beamX, y, '·', '4')
        }
      }
    }

    g.text(6, pedY, '┌' + '─'.repeat(cols - 14) + '┐', '4')
    g.text(6, pedY + 1, '│ ░▒▓███ QUANTUM HOLOGRAM PROJECTOR v4.2 ███▓▒░ │', '7')
    g.text(6, pedY + 2, '└' + '─'.repeat(cols - 14) + '┘', '4')

    // Telemetry HUD readouts
    g.text(2, 1, `[HOLO: ${isGlitch ? 'DISRUPTED' : 'STABLE'}]  FREQ: 532nm`, isGlitch ? '1' : '4')
    g.text(cols - 22, 1, 'RES: 4096 VOXELS', '4')
    g.text(2, rows - 2, 'EMISSION: ACTIVE // FLUX: 99.4% // LATENCY: 0.2ms', '4')

    return g.frame()
  }
}

/** 19. Mountain Cascade Waterfall */
function createCascadeWaterfall(): RenderFrameFn {
  const cols = 64
  const rows = 30
  const g = new FastGrid(cols, rows)

  const cliffLeft = 16
  const cliffRight = 48
  const streamW = cliffRight - cliffLeft

  return (t: number) => {
    g.clear(' ', ' ')

    // Granite cliffs on left and right
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cliffLeft; x++) {
        const noise = Math.sin(x * 0.5 + y * 0.7) * Math.cos(x * 0.3)
        const char = noise > 0.4 ? '█' : noise > 0.0 ? '▓' : noise > -0.4 ? '▒' : '░'
        g.set(x, y, char, '6')
      }
      for (let x = cliffRight; x < cols; x++) {
        const noise = Math.cos(x * 0.4 + y * 0.8) * Math.sin(y * 0.3)
        const char = noise > 0.4 ? '█' : noise > 0.0 ? '▓' : noise > -0.4 ? '▒' : '░'
        g.set(x, y, char, '6')
      }
    }

    // Alpine pine trees on cliff edges
    const trees = [
      [2, 3], [7, 8], [12, 14], [4, 20], [9, 24],
      [52, 4], [57, 10], [51, 16], [58, 22], [53, 25],
    ]
    trees.forEach(([tx, ty]) => {
      g.text(tx, ty, '▲', '2')
      g.text(tx, ty + 1, '█', '2')
    })

    // Plunging water torrent
    const waterChars = ['│', '║', '╽', '┃', '░', '▒', '▓']
    for (let y = 0; y < rows - 4; y++) {
      const flowOffset = Math.floor(t * 18 + y * 2)
      for (let x = cliffLeft; x < cliffRight; x++) {
        const edgeDist = Math.min(x - cliffLeft, cliffRight - x)
        if (edgeDist <= 1) {
          g.set(x, y, '▌', '6')
          continue
        }
        // Rocky cataract shelves at rows 8, 16, 23
        if (y === 8 || y === 16 || y === 23) {
          const foam = (x + flowOffset) % 2 === 0 ? '░' : '▒'
          g.set(x, y, foam, '7')
        } else {
          const charIdx = (x * 3 + flowOffset) % waterChars.length
          const isWhiteCap = ((x + flowOffset) % 5 === 0)
          g.set(x, y, waterChars[charIdx], isWhiteCap ? '7' : '4')
        }
      }
    }

    // Rising mist & spray particles (floating upward)
    for (let i = 0; i < 24; i++) {
      const sprayX = cliffLeft + 2 + Math.floor(((i * 7 + t * 9) % (streamW - 4)))
      const sprayY = (rows - 6) - Math.floor(((t * 8 + i * 2.3) % 18))
      if (sprayY >= 2 && sprayY < rows - 4) {
        const pChar = (i % 3 === 0) ? '*' : (i % 2 === 0) ? '°' : '·'
        g.set(sprayX, sprayY, pChar, '7')
      }
    }

    // Plunge pool & ripples at bottom (rows 24 to 29)
    for (let y = rows - 4; y < rows; y++) {
      const rippleOffset = Math.floor(t * 4 + y)
      for (let x = 0; x < cols; x++) {
        const inPool = x >= cliffLeft - 2 && x <= cliffRight + 2
        if (inPool) {
          const rChar = (x + rippleOffset) % 4 === 0 ? '≈' : (x + rippleOffset) % 2 === 0 ? '~' : '─'
          g.set(x, y, rChar, '4')
        } else {
          g.set(x, y, '▒', '6')
        }
      }
    }

    g.text(2, 1, 'CASCADE MOUNTAIN FALLS // 4800 GPM', '4')
    g.text(cols - 20, 1, 'ELEVATION: 2400 FT', '7')

    return g.frame()
  }
}

/** 20. Precision Chronometer Analog Clock */
function createAnalogClock(): RenderFrameFn {
  const cols = 64
  const rows = 28
  const g = new FastGrid(cols, rows)
  const cx = cols / 2 - 0.5
  const cy = rows / 2 - 1.5
  const radiusX = 22
  const radiusY = 11

  return (t: number) => {
    g.clear(' ', ' ')

    // Outer clock bezel
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const x = Math.round(cx + Math.cos(a) * radiusX)
      const y = Math.round(cy + Math.sin(a) * radiusY)
      g.set(x, y, '·', '4')
    }

    // 12 hour numbers
    const hours = [
      { h: '12', a: -Math.PI / 2 },
      { h: '1', a: -Math.PI / 3 },
      { h: '2', a: -Math.PI / 6 },
      { h: '3', a: 0 },
      { h: '4', a: Math.PI / 6 },
      { h: '5', a: Math.PI / 3 },
      { h: '6', a: Math.PI / 2 },
      { h: '7', a: (2 * Math.PI) / 3 },
      { h: '8', a: (5 * Math.PI) / 6 },
      { h: '9', a: Math.PI },
      { h: '10', a: (-5 * Math.PI) / 6 },
      { h: '11', a: (-2 * Math.PI) / 3 },
    ]
    hours.forEach(({ h, a }) => {
      const x = Math.round(cx + Math.cos(a) * (radiusX - 3))
      const y = Math.round(cy + Math.sin(a) * (radiusY - 2))
      g.text(x - Math.floor(h.length / 2), y, h, '7')
    })

    // Center pivot
    g.set(Math.round(cx), Math.round(cy), '●', '1')

    // Hands calculation based on elapsed time t
    const secAngle = -Math.PI / 2 + ((t * 0.8) % 60) * ((Math.PI * 2) / 60)
    const minAngle = -Math.PI / 2 + ((t * 0.8) / 60) * ((Math.PI * 2) / 60)
    const hrAngle = -Math.PI / 2 + ((t * 0.8) / 3600) * ((Math.PI * 2) / 12) + (Math.PI / 4)

    // Hour hand (length 6)
    for (let r = 0; r <= 6; r += 0.8) {
      const hx = Math.round(cx + Math.cos(hrAngle) * r * 1.8)
      const hy = Math.round(cy + Math.sin(hrAngle) * r * 0.9)
      g.set(hx, hy, '█', '3')
    }

    // Minute hand (length 9)
    for (let r = 0; r <= 9; r += 0.8) {
      const mx = Math.round(cx + Math.cos(minAngle) * r * 1.9)
      const my = Math.round(cy + Math.sin(minAngle) * r * 0.95)
      g.set(mx, my, '▓', '4')
    }

    // Second hand (length 11)
    for (let r = 0; r <= 11; r += 0.6) {
      const sx = Math.round(cx + Math.cos(secAngle) * r * 1.8)
      const sy = Math.round(cy + Math.sin(secAngle) * r * 0.9)
      g.set(sx, sy, '│', '1')
    }

    // Digital readout at bottom
    const totalSec = Math.floor(t * 0.8)
    const s = String(totalSec % 60).padStart(2, '0')
    const m = String(Math.floor(totalSec / 60) % 60).padStart(2, '0')
    const h = String((10 + Math.floor(totalSec / 3600)) % 24).padStart(2, '0')
    const digital = `[ CHRONO: ${h}:${m}:${s} ]`
    g.text(Math.floor(cx - digital.length / 2), rows - 2, digital, '2')
    g.text(2, 1, 'PRECISION SWISS QUARTZ // 60Hz', '4')

    return g.frame()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Native Piece Registry
// ─────────────────────────────────────────────────────────────────────────────

export interface NativePieceDefinition {
  meta: AnimatedPieceMeta
  create: () => RenderFrameFn
}

export const NATIVE_PIECES: NativePieceDefinition[] = [
  {
    meta: {
      slug: 'donut-3d',
      name: '3D Donut Raymarcher',
      category: '3d-math',
      note: 'The legendary mathematical torus donut raymarching algorithm with real-time specular illumination.',
      tags: ['donut', 'math', '3d', 'torus', 'raymarch', 'classic'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createDonut3D,
  },
  {
    meta: {
      slug: 'cube-3d',
      name: 'Rotating 3D Cube',
      category: '3d-math',
      note: 'Wireframe and shaded 3D cube revolving across 3 axes with depth perspective.',
      tags: ['cube', 'wireframe', '3d', 'geometry', 'perspective'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createRotatingCube,
  },
  {
    meta: {
      slug: 'torus-knot-3d',
      name: 'Trefoil Torus Knot 3D',
      category: '3d-math',
      note: 'Hypnotic (2,3) parametric torus knot revolving in 3D space with iridescent depth shading.',
      tags: ['knot', 'trefoil', 'torus', '3d', 'parametric'],
      cols: 64,
      rows: 32,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createTorusKnot,
  },
  {
    meta: {
      slug: 'nyan-cat',
      name: 'Nyan Cat in Deep Space',
      category: 'retro-memes',
      note: 'Pop-tart kitten flying through cosmic space trailing a vibrant waving rainbow with twinkling stars.',
      tags: ['nyan', 'cat', 'meme', 'rainbow', 'retro', 'space'],
      cols: 64,
      rows: 28,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createNyanCat,
  },
  {
    meta: {
      slug: 'pacman-chase',
      name: 'Pac-Man & Ghost Chase',
      category: 'retro-memes',
      note: 'Classic arcade maze corridor featuring Pac-Man eating pellets pursued by Blinky, Pinky, Inky & Clyde.',
      tags: ['pacman', 'ghosts', 'arcade', 'retro', 'gaming', '80s'],
      cols: 64,
      rows: 24,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createPacman,
  },
  {
    meta: {
      slug: 'space-invaders',
      name: 'Space Invaders 1978',
      category: 'retro-memes',
      note: 'Authentic 1978 Taito arcade alien armada stepping and marching across rows with laser defense cannon.',
      tags: ['arcade', 'space-invaders', 'aliens', 'retro', 'shooter'],
      cols: 64,
      rows: 28,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createSpaceInvaders,
  },
  {
    meta: {
      slug: 'party-parrot',
      name: 'Cult of the Party Parrot',
      category: 'retro-memes',
      note: 'The iconic Party Parrot head bobbing and color cycling on a flashing disco floor.',
      tags: ['parrot', 'party', 'meme', 'disco', 'fun', 'dance'],
      cols: 64,
      rows: 28,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createPartyParrot,
  },
  {
    meta: {
      slug: 'matrix-rain-native',
      name: 'Matrix Digital Rain Native',
      category: 'scifi-cyberpunk',
      note: 'High-density cascading green glyph streams with white leading heads and phosphor decay.',
      tags: ['matrix', 'cyberpunk', 'green', 'hacker', 'rain', 'terminal'],
      cols: 64,
      rows: 32,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createMatrixRain,
  },
  {
    meta: {
      slug: 'cyber-skull',
      name: 'Cyber Skull Hologram',
      category: 'scifi-cyberpunk',
      note: 'Futuristic ASCII cybernetic skull with vertical laser visor sweep and pulsing optical sensor eyes.',
      tags: ['skull', 'cyberpunk', 'hologram', 'laser', 'hud', 'terminal'],
      cols: 64,
      rows: 30,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createCyberSkull,
  },
  {
    meta: {
      slug: 'doom-fire',
      name: 'Doom Bonfire Flames',
      category: 'vfx-dynamics',
      note: 'PSX/Doom algorithmic fire buffer simulation with turbulent rising embers and chromatic decay.',
      tags: ['fire', 'flames', 'vfx', 'doom', 'particles', 'retro'],
      cols: 64,
      rows: 28,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createDoomFire,
  },
  {
    meta: {
      slug: 'ocean-waves',
      name: 'Ocean Waves & Sunset Surf',
      category: 'vfx-dynamics',
      note: 'Dynamic multi-layered ocean sine waves with crashing foam crests and setting sun horizon reflection.',
      tags: ['ocean', 'waves', 'water', 'sunset', 'surf', 'nature'],
      cols: 64,
      rows: 28,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createOceanWaves,
  },
  {
    meta: {
      slug: 'fireworks-finale',
      name: 'Night Sky Fireworks Display',
      category: 'vfx-dynamics',
      note: 'Multiple ascending rockets exploding into radial sparkling gravity particle showers over a city skyline.',
      tags: ['fireworks', 'vfx', 'particles', 'celebration', 'night'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createFireworks,
  },
  {
    meta: {
      slug: 'spectrum-equalizer',
      name: 'Audio Spectrum Equalizer',
      category: 'vfx-dynamics',
      note: '16-band audio visualizer bars with floating peak-hold markers and frequency calibration scale.',
      tags: ['equalizer', 'audio', 'visualizer', 'music', 'sound', 'hifi'],
      cols: 64,
      rows: 26,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createSpectrumEqualizer,
  },
  {
    meta: {
      slug: 'radar-hud',
      name: 'Tactical Radar HUD Scanner',
      category: 'scifi-cyberpunk',
      note: 'Military tactical radar scope with rotating sweep arm, range rings, target identification, and azimuth telemetry.',
      tags: ['radar', 'hud', 'military', 'telemetry', 'scanner', 'targeting'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createRadarHUD,
  },
  {
    meta: {
      slug: 'galloping-horse',
      name: 'Galloping Horse (Muybridge)',
      category: 'animals-nature',
      note: 'Eadweard Muybridge 1878 classic Animal Locomotion motion study in dynamic ASCII silhouette.',
      tags: ['horse', 'gallop', 'animals', 'history', 'muybridge', 'motion'],
      cols: 64,
      rows: 24,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createGallopingHorse,
  },
  {
    meta: {
      slug: 'braille-spinner',
      name: 'Quantum Braille Spinner & UI',
      category: 'loaders-ui',
      note: 'Silky smooth counter-rotating Unicode Braille spinner with dynamic progress percentage and status text.',
      tags: ['spinner', 'loader', 'braille', 'progress', 'ui', 'minimal'],
      cols: 64,
      rows: 24,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createBrailleSpinner,
  },
  {
    meta: {
      slug: 'rickroll-dance',
      name: 'Rickroll Dancing (Never Gonna Give You Up)',
      category: 'retro-memes',
      note: 'The legendary Rick Astley dancing groove with swaying trenchcoat, singing microphone, floating lyrics, and retro disco floor.',
      tags: ['rickroll', 'rick-astley', 'meme', 'dance', 'retro', '80s', 'music', 'never-gonna-give-you-up'],
      cols: 64,
      rows: 28,
      fps: 20,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createRickrollDance,
  },
  {
    meta: {
      slug: 'cyber-hologram',
      name: 'Quantum Cyber Hologram 3D',
      category: 'scifi-cyberpunk',
      note: 'Futuristic wireframe 3D geometric hologram with laser scanlines, particle emitter pedestal, and HUD telemetry readouts.',
      tags: ['hologram', 'cyberpunk', '3d', 'hud', 'telemetry', 'laser', 'sci-fi', 'quantum'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createCyberHologram,
  },
  {
    meta: {
      slug: 'waterfall-cascade',
      name: 'Mountain Cascade Waterfall',
      category: 'vfx-dynamics',
      note: 'Majestic multi-tiered mountain canyon waterfall with crashing white-water torrents, rising misty spray particles, and pine cliffs.',
      tags: ['waterfall', 'cascade', 'vfx', 'water', 'nature', 'canyon', 'particles', 'flow'],
      cols: 64,
      rows: 30,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createCascadeWaterfall,
  },
  {
    meta: {
      slug: 'analog-clock-native',
      name: 'Precision Chronometer Clock',
      category: 'loaders-ui',
      note: 'Classic Swiss analog chronometer with sweeping second hand, ticking gears, glowing bezel markers, and digital 24h readout.',
      tags: ['clock', 'chronometer', 'time', 'analog', 'ui', 'loader', 'watch'],
      cols: 64,
      rows: 28,
      fps: 24,
      author: 'Saad Khalid',
      source: 'native',
    },
    create: createAnalogClock,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic Catalog Loader & Resolver
// ─────────────────────────────────────────────────────────────────────────────

let cachedCatalog: AnimatedPieceMeta[] | null = null

export async function fetchArtCatalog(): Promise<AnimatedPieceMeta[]> {
  if (cachedCatalog) return cachedCatalog

  const nativeMeta = NATIVE_PIECES.map((p) => p.meta)

  try {
    const res = await fetch('/ascii-art/catalog.json')
    if (res.ok) {
      const catalogData = (await res.json()) as AnimatedPieceMeta[]
      cachedCatalog = [...nativeMeta, ...catalogData]
      return cachedCatalog
    }
  } catch (err) {
    console.warn('Could not fetch /ascii-art/catalog.json, falling back to native pieces:', err)
  }

  cachedCatalog = nativeMeta
  return cachedCatalog
}

/** Resolves and returns the render function for a piece. */
export async function loadPieceRenderer(slug: string): Promise<{ meta: AnimatedPieceMeta; render: RenderFrameFn }> {
  // Check native pieces first
  const native = NATIVE_PIECES.find((p) => p.meta.slug === slug)
  if (native) {
    return {
      meta: native.meta,
      render: native.create(),
    }
  }

  // Load from static pieces folder
  try {
    const mod = await import(/* @vite-ignore */ `/ascii-art/pieces/${slug}.js`)
    if (typeof mod.default === 'function') {
      const render = mod.default()
      return {
        meta: mod.meta || {
          slug,
          name: slug,
          category: 'catalog',
          note: '',
          tags: [],
          cols: 64,
          rows: 32,
          fps: 20,
        },
        render,
      }
    }
  } catch (err) {
    console.error(`Failed to load piece ${slug}:`, err)
  }

  // Fallback to first native piece
  const fallback = NATIVE_PIECES[0]
  return {
    meta: fallback.meta,
    render: fallback.create(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// High-Performance Monospace & Glyph Canvas Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface RenderCanvasOptions {
  theme?: ThemePaletteId
  look?: 'text' | 'dots' | 'blocks'
  scale?: number
  customPalette?: Record<string, string>
}

export function renderFrameToCanvas(
  canvas: HTMLCanvasElement,
  frame: FrameData,
  meta: AnimatedPieceMeta,
  options: RenderCanvasOptions = {},
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const themeId = options.theme ?? 'original'
  const theme = PALETTE_THEMES[themeId] ?? PALETTE_THEMES.original
  const look = options.look ?? 'text'
  const text = frame.text || ''
  const colorStr = frame.color || ''

  const lines = text.split('\n')
  const colorLines = colorStr.split('\n')
  const rows = lines.length
  const cols = lines[0] ? lines[0].length : meta.cols

  // Square cell for specific scene pieces
  const isSquare = meta.cell === 'square' || look === 'dots'
  const cellAspect = isSquare ? 1.0 : 1.66
  const charWidth = 9 * (options.scale ?? 1.0)
  const charHeight = charWidth * cellAspect

  const targetW = Math.ceil(cols * charWidth)
  const targetH = Math.ceil(rows * charHeight)

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  // Draw background
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, targetW, targetH)

  // Palette lookup
  const piecePalette = options.customPalette || meta.palette || {}

  ctx.font = `${Math.floor(charHeight * 0.85)}px Menlo, Consolas, "DejaVu Sans Mono", monospace`
  ctx.textBaseline = 'top'

  for (let r = 0; r < rows; r++) {
    const line = lines[r]
    if (!line) continue
    const cLine = colorLines[r] || ''
    const y = r * charHeight

    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      if (!char || char === ' ') continue

      const colorKey = cLine[c] || ' '
      let charColor = theme.defaultInk

      if (themeId !== 'original') {
        const themeColors = theme.colors
        const keyIdx = KEYS.indexOf(colorKey)
        if (keyIdx >= 0) {
          charColor = themeColors[keyIdx % themeColors.length]
        }
      } else if (colorKey !== ' ' && piecePalette[colorKey]) {
        charColor = piecePalette[colorKey]
      }

      const x = c * charWidth

      if (look === 'dots') {
        // Halftone dot look
        ctx.fillStyle = charColor
        const radius = charWidth * 0.38
        ctx.beginPath()
        ctx.arc(x + charWidth * 0.5, y + charHeight * 0.5, radius, 0, Math.PI * 2)
        ctx.fill()
      } else if (look === 'blocks') {
        // Pixel block look
        ctx.fillStyle = charColor
        ctx.fillRect(x, y, charWidth - 1, charHeight - 1)
      } else {
        // Standard typography
        ctx.fillStyle = charColor
        ctx.fillText(char, x, y)
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exporters: Animated GIF, Animated WebP, Video (MP4/WebM), Frame ZIP, ANSI, Shell
// ─────────────────────────────────────────────────────────────────────────────

function writeUint24LE(view: DataView, offset: number, value: number) {
  view.setUint8(offset, value & 0xff)
  view.setUint8(offset + 1, (value >> 8) & 0xff)
  view.setUint8(offset + 2, (value >> 16) & 0xff)
}

/** Export animation loop as Animated GIF */
export async function exportAnimatedPieceGIF(
  meta: AnimatedPieceMeta,
  renderFn: RenderFrameFn,
  options: {
    durationSec?: number
    fps?: number
    scale?: number
    theme?: ThemePaletteId
    look?: 'text' | 'dots' | 'blocks'
    onProgress?: (progress: number) => void
  } = {},
): Promise<Blob> {
  const duration = options.durationSec ?? 2.5
  const fps = options.fps ?? meta.fps ?? 20
  const totalFrames = Math.max(1, Math.round(duration * fps))
  const delayMs = Math.round(1000 / fps)

  const offscreen = document.createElement('canvas')
  const gif = GIFEncoder()

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps
    const frame = renderFn(t, f)
    renderFrameToCanvas(offscreen, frame, meta, {
      theme: options.theme,
      look: options.look,
      scale: options.scale ?? 1.0,
    })

    const ctx = offscreen.getContext('2d')!
    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data
    const pal = quantize(imgData, 256)
    const index = applyPalette(imgData, pal)
    gif.writeFrame(index, offscreen.width, offscreen.height, { palette: pal, delay: delayMs })

    if (options.onProgress) {
      options.onProgress((f + 1) / totalFrames)
    }
  }

  gif.finish()
  const bytes = gif.bytes()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' })
}

/** Export animation loop as standard Animated WebP */
export async function exportAnimatedPieceWebP(
  meta: AnimatedPieceMeta,
  renderFn: RenderFrameFn,
  options: {
    durationSec?: number
    fps?: number
    scale?: number
    theme?: ThemePaletteId
    look?: 'text' | 'dots' | 'blocks'
    onProgress?: (progress: number) => void
  } = {},
): Promise<Blob> {
  const duration = options.durationSec ?? 2.5
  const fps = options.fps ?? meta.fps ?? 20
  const totalFrames = Math.max(1, Math.round(duration * fps))
  const frameDurationMs = Math.max(16, Math.round(1000 / fps))

  const offscreen = document.createElement('canvas')
  const subchunks: Uint8Array[] = []
  let canvasW = 0
  let canvasH = 0

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps
    const frame = renderFn(t, f)
    renderFrameToCanvas(offscreen, frame, meta, {
      theme: options.theme,
      look: options.look,
      scale: options.scale ?? 1.0,
    })

    canvasW = offscreen.width
    canvasH = offscreen.height

    const blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, 'image/webp', 0.95))
    if (!blob) throw new Error('WebP canvas export failed')

    const buf = await blob.arrayBuffer()
    const u8 = new Uint8Array(buf)
    const view = new DataView(buf)

    let offset = 12
    let sub: Uint8Array | null = null
    while (offset < u8.length) {
      const tag = String.fromCharCode(u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3])
      const chunkSize = view.getUint32(offset + 4, true)
      const totalChunkLen = 8 + chunkSize + (chunkSize % 2 === 1 ? 1 : 0)
      if (tag === 'VP8 ' || tag === 'VP8L') {
        sub = u8.slice(offset, offset + totalChunkLen)
        break
      }
      offset += totalChunkLen
    }

    if (!sub) {
      sub = u8.slice(12)
    }
    subchunks.push(sub)

    if (options.onProgress) {
      options.onProgress((f + 1) / totalFrames)
    }
  }

  const vp8xSize = 18
  const animSize = 14
  let anmfTotalSize = 0
  const anmfChunks: Uint8Array[] = []

  for (const sub of subchunks) {
    const anmfDataSize = 16 + sub.length
    const anmfTotalLen = 8 + anmfDataSize + (anmfDataSize % 2 === 1 ? 1 : 0)
    anmfTotalSize += anmfTotalLen

    const chunkBuf = new Uint8Array(anmfTotalLen)
    const chunkView = new DataView(chunkBuf.buffer)
    // 'ANMF'
    chunkBuf.set([0x41, 0x4E, 0x4D, 0x46], 0)
    chunkView.setUint32(4, anmfDataSize, true)
    writeUint24LE(chunkView, 8, 0)
    writeUint24LE(chunkView, 11, 0)
    writeUint24LE(chunkView, 14, canvasW - 1)
    writeUint24LE(chunkView, 17, canvasH - 1)
    writeUint24LE(chunkView, 20, frameDurationMs)
    chunkView.setUint8(23, 0x02) // no blend
    chunkBuf.set(sub, 24)
    anmfChunks.push(chunkBuf)
  }

  const totalFileSize = 12 + vp8xSize + animSize + anmfTotalSize
  const finalBuf = new Uint8Array(totalFileSize)
  const finalView = new DataView(finalBuf.buffer)

  // 'RIFF' + totalFileSize - 8 + 'WEBP'
  finalBuf.set([0x52, 0x49, 0x46, 0x46], 0)
  finalView.setUint32(4, totalFileSize - 8, true)
  finalBuf.set([0x57, 0x45, 0x42, 0x50], 8)

  let cursor = 12
  // 'VP8X'
  finalBuf.set([0x56, 0x50, 0x38, 0x58], cursor)
  finalView.setUint32(cursor + 4, 10, true)
  finalView.setUint8(cursor + 8, 0x02) // animation flag
  writeUint24LE(finalView, cursor + 12, canvasW - 1)
  writeUint24LE(finalView, cursor + 15, canvasH - 1)
  cursor += 18

  // 'ANIM'
  finalBuf.set([0x41, 0x4E, 0x49, 0x4D], cursor)
  finalView.setUint32(cursor + 4, 6, true)
  finalView.setUint32(cursor + 8, 0, true)
  finalView.setUint16(cursor + 12, 0, true)
  cursor += 14

  // ANMF chunks
  for (const anmf of anmfChunks) {
    finalBuf.set(anmf, cursor)
    cursor += anmf.length
  }

  return new Blob([finalBuf], { type: 'image/webp' })
}

/** Detect supported video mime type and extension */
export function getSupportedVideoMimeType(preferred: 'mp4' | 'webm' = 'mp4'): { mimeType: string; ext: 'mp4' | 'webm' } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', ext: preferred }
  }
  const order: Array<{ mimeType: string; ext: 'mp4' | 'webm' }> =
    preferred === 'mp4'
      ? [
          { mimeType: 'video/mp4;codecs=avc1', ext: 'mp4' },
          { mimeType: 'video/mp4', ext: 'mp4' },
          { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
          { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
          { mimeType: 'video/webm', ext: 'webm' },
        ]
      : [
          { mimeType: 'video/webm;codecs=vp9', ext: 'webm' },
          { mimeType: 'video/webm;codecs=vp8', ext: 'webm' },
          { mimeType: 'video/webm', ext: 'webm' },
          { mimeType: 'video/mp4;codecs=avc1', ext: 'mp4' },
          { mimeType: 'video/mp4', ext: 'mp4' },
        ]

  for (const opt of order) {
    if (MediaRecorder.isTypeSupported(opt.mimeType)) {
      return opt
    }
  }
  return { mimeType: '', ext: preferred }
}

/** Record live canvas stream to MP4 or WebM video blob */
export async function exportAnimatedPieceVideo(
  canvas: HTMLCanvasElement,
  fps: number,
  durationSec = 3.5,
  preferredFormat: 'mp4' | 'webm' = 'mp4',
  onProgress?: (progress: number) => void,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const { mimeType, ext } = getSupportedVideoMimeType(preferredFormat)
  if (!mimeType) {
    throw new Error('Video recording not supported in this browser environment')
  }

  const stream = canvas.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve({ blob, ext })
    }
    recorder.onerror = (err) => reject(err)

    recorder.start()
    const startTime = performance.now()
    const timer = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000
      if (onProgress) onProgress(Math.min(1.0, elapsed / durationSec))
      if (elapsed >= durationSec) {
        clearInterval(timer)
        if (recorder.state === 'recording') recorder.stop()
      }
    }, 100)
  })
}

/** Export frame-by-frame text & ANSI files in a structured ZIP archive */
export async function exportAnimatedPieceFramesZip(
  meta: AnimatedPieceMeta,
  renderFn: RenderFrameFn,
  options: {
    durationSec?: number
    fps?: number
    theme?: ThemePaletteId
    onProgress?: (progress: number) => void
  } = {},
): Promise<Blob> {
  const duration = options.durationSec ?? 3.0
  const fps = options.fps ?? meta.fps ?? 20
  const totalFrames = Math.max(1, Math.round(duration * fps))
  const enc = new TextEncoder()
  const entries: ZipFileEntry[] = []

  const metadata = {
    slug: meta.slug,
    name: meta.name,
    category: meta.category,
    author: meta.author || 'Saad Khalid (@saadkhalidhere)',
    cols: meta.cols,
    rows: meta.rows,
    fps,
    durationSec: duration,
    totalFrames,
    tags: meta.tags,
    note: meta.note,
    exportedAt: new Date().toISOString(),
    sourceUrl: 'https://asciipro.vercel.app',
  }
  entries.push({
    name: 'metadata.json',
    data: enc.encode(JSON.stringify(metadata, null, 2)),
  })

  // Shell script player
  const shellScript = generateTerminalScript(meta, renderFn, duration)
  entries.push({
    name: 'play.sh',
    data: enc.encode(shellScript),
  })

  // README
  const readme = `${meta.name} - Animated ASCII Art Frames
=========================================================
Author: ${meta.author || 'Saad Khalid (@saadkhalidhere)'}
Platform: ASCII Studio (https://asciipro.vercel.app)
Dimensions: ${meta.cols}x${meta.rows} chars
Native FPS: ${fps} FPS | Total Frames: ${totalFrames}

Folder Contents:
- frames_txt/ : Plain text frames (frame_001.txt .. frame_${String(totalFrames).padStart(3, '0')}.txt)
- frames_ansi/: 24-bit ANSI truecolor escape sequences (.ans files)
- play.sh     : Ready-to-run terminal animation script (bash play.sh)
- metadata.json: JSON specification of this piece

To run locally in your terminal:
  bash play.sh
`
  entries.push({
    name: 'README.txt',
    data: enc.encode(readme),
  })

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps
    const frame = renderFn(t, f)
    const frameNum = String(f + 1).padStart(3, '0')

    // Plain text frame
    entries.push({
      name: `frames_txt/frame_${frameNum}.txt`,
      data: enc.encode(frame.text),
    })

    // ANSI truecolor frame
    const ansi = formatFrameAsANSI(frame, meta, options.theme)
    entries.push({
      name: `frames_ansi/frame_${frameNum}.ans`,
      data: enc.encode(ansi),
    })

    if (options.onProgress) {
      options.onProgress((f + 1) / totalFrames)
    }
  }

  return createZip(entries)
}

export function formatFrameAsANSI(frame: FrameData, meta: AnimatedPieceMeta, themeId: ThemePaletteId = 'original'): string {
  const theme = PALETTE_THEMES[themeId] ?? PALETTE_THEMES.original
  const piecePalette = meta.palette || {}
  const lines = frame.text.split('\n')
  const colLines = (frame.color || '').split('\n')

  let out = ''
  for (let r = 0; r < lines.length; r++) {
    const line = lines[r]
    const cLine = colLines[r] || ''
    let currentColor = ''

    for (let c = 0; c < line.length; c++) {
      const char = line[c]
      const key = cLine[c] || ' '
      let hex = theme.defaultInk

      if (themeId !== 'original') {
        const themeColors = theme.colors
        const keyIdx = KEYS.indexOf(key)
        if (keyIdx >= 0) hex = themeColors[keyIdx % themeColors.length]
      } else if (key !== ' ' && piecePalette[key]) {
        hex = piecePalette[key]
      }

      if (hex !== currentColor) {
        currentColor = hex
        if (hex.startsWith('#') && hex.length === 7) {
          const red = parseInt(hex.slice(1, 3), 16)
          const green = parseInt(hex.slice(3, 5), 16)
          const blue = parseInt(hex.slice(5, 7), 16)
          out += `\x1b[38;2;${red};${green};${blue}m`
        } else {
          out += '\x1b[0m'
        }
      }
      out += char
    }
    out += '\x1b[0m\n'
  }
  return out
}

export function generateTerminalScript(meta: AnimatedPieceMeta, renderFn: RenderFrameFn, durationSec = 3.0): string {
  const fps = Math.min(24, meta.fps || 20)
  const totalFrames = Math.round(durationSec * fps)
  const framesAnsi: string[] = []

  for (let f = 0; f < totalFrames; f++) {
    const frame = renderFn(f / fps, f)
    framesAnsi.push(formatFrameAsANSI(frame, meta))
  }

  const delaySec = (1 / fps).toFixed(3)

  return `#!/usr/bin/env bash
# ${meta.name} - Animated ASCII Art
# Generated by ASCII Studio (https://asciipro.vercel.app)
# Author: ${meta.author || 'ASCII Studio'}

tput civis || printf "\\033[?25l"
trap 'tput cnorm; printf "\\033[0m\\n"; exit' INT TERM EXIT

FRAMES=(
${framesAnsi.map((fa) => `  $(cat << 'EOF'\n${fa}EOF\n)`).join('\n')}
)

while true; do
  for frame in "\${FRAMES[@]}"; do
    printf "\\033[H\\033[2J"
    printf "%s\\n" "$frame"
    sleep ${delaySec}
  done
done
`
}

export function generateTerminalCurlSnippet(slug: string): string {
  return `curl -sL https://asciipro.vercel.app/ascii-art/scripts/${slug}.sh | bash`
}
