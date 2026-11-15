// Mode renderers: draw a sampled Grid onto a canvas per style.
// Original implementations written for ASCII Studio using standard Canvas 2D.

import type { Grid, GridCell } from './image'
import type { ModeId, Settings, TextLayer } from '../types'
import { CHAR_RAMPS, DITHER_PALETTES, MODE_RAMPS } from '../catalog'
import {
  BAYER_8, BAYER_4, nearestPalette, mulberry32, hexToRgb, rgbCss, mixRgb,
} from './image'

export const TEXT_MODES = new Set<ModeId>([
  'characters', 'keycap', 'mixed', 'block-chars', 'dots', 'crt', 'specimen',
  'emoji', 'numbers', 'arrows', 'math', 'katakana', 'circles', 'halfblock',
  'typewriter', 'neon', 'cyberterminal', 'ascii-colored-bg',
  'matrix-rain', 'ascii-flow', 'ascii-box', 'dot-matrix', 'glitch-vcr',
  'ascii-cinematic', 'ascii-terrain-3d', 'ascii-blueprint-cad',
  'ascii-halftone-news', 'ascii-synthwave-mesh', 'ascii-glitch-datamosh',
  'ascii-terminal-crt', 'ascii-quantum-dot', 'ascii-chladni', 'matrix-cascade',
  'ascii-woodcut', 'ascii-radar-hud', 'ascii-emboss', 'ascii-gameboy-pocket',
  'ascii-c64-petscii', 'ascii-cyber-hex', 'ascii-chalkboard', 'ascii-solari-board',
  'ascii-led-ticker', 'ascii-particles',
])

/** Fixed glyph ramp for modes that carry their own (null = use the chosen charSet). */
export function modeRamp(mode: ModeId): string | null {
  return MODE_RAMPS[mode] ?? null
}

function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export const WARP_MODES: Record<string, string> = {
  twirl: 'twirl', pinch: 'pinch', spherize: 'spherize', ripple: 'ripple',
  zigzag: 'zigzag', polar: 'polar', shear: 'shear', waves: 'waves', smudge: 'smudge',
}

export function isTextMode(mode: ModeId): boolean {
  return TEXT_MODES.has(mode) || mode === 'braille' || mode === 'braille-dense'
}

/** Sample-grid dimensions for a given mode (braille samples a 2x4 sub-grid). */
export function sampleDims(cols: number, aspect: number, mode: ModeId): { cols: number; rows: number } {
  if (mode === 'braille' || mode === 'braille-dense') {
    // sub-grid: 2 dots wide x 4 dots tall per braille char; 2.4 factor keeps
    // the rendered art's aspect equal to the source (monospace glyph is 0.6 wide)
    const c = cols * 2
    return { cols: c, rows: Math.max(1, Math.round((2.4 * cols) / aspect)) }
  }
  if (TEXT_MODES.has(mode)) {
    return { cols, rows: Math.max(1, Math.round((cols / aspect) * 0.6)) }
  }
  return { cols, rows: Math.max(1, Math.round(cols / aspect)) }
}

export function cellFontSize(cellSize: string, scale: number): number {
  const base = cellSize === 'small' ? 8 : cellSize === 'large' ? 16 : 12
  return base * scale
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

function cellColor(cell: GridCell, s: Settings): [number, number, number] {
  switch (s.colorMode) {
    case 'color':
      return [cell.r, cell.g, cell.b]
    case 'mono':
      return hexToRgb(s.fg)
    case 'duotone':
      return mixRgb(hexToRgb(s.bg), hexToRgb(s.fg), cell.lum)
    case 'tint':
      return mixRgb([cell.r, cell.g, cell.b], hexToRgb(s.tint), 0.45)
    default:
      return [cell.r, cell.g, cell.b]
  }
}

function effLum(cell: GridCell, s: Settings): number {
  let lum = cell.lum
  if (s.edgeEmphasis > 0 && cell.edge > 0.05) {
    lum = clamp01(lum + (lum - 0.5) * (cell.edge * s.edgeEmphasis) / 50)
  }
  return lum
}

function charFor(lum: number, ramp: string): string {
  const idx = Math.min(ramp.length - 1, Math.max(0, Math.floor(lum * ramp.length)))
  return ramp[idx]
}

/** Plain-text art (TXT export / clipboard). Always available, uses the char ramp. */
export function textArt(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const ramp = modeRamp(s.mode) ?? CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
  if (s.mode === 'braille' || s.mode === 'braille-dense') {
    return brailleText(grid, stamps)
  }
  const lines: string[] = []
  for (let y = 0; y < grid.rows; y++) {
    let line = ''
    for (let x = 0; x < grid.cols; x++) {
      const stamped = stamps?.get(`${x},${y}`)
      line += stamped ? stamped.char : charFor(effLum(grid.cells[y * grid.cols + x], s), ramp)
    }
    lines.push(line.replace(/\s+$/, ''))
  }
  return lines.join('\n')
}

/** Braille text from a 2x4 sub-sampled grid. */
export function brailleText(grid: Grid, stamps?: Map<string, { char: string; color?: string }>): string {
  const charCols = Math.floor(grid.cols / 2)
  const charRows = Math.floor(grid.rows / 4)
  const lines: string[] = []
  // Braille dot bit layout: dots 1,2,3,4,5,6,7,8 map to bits
  const bit = (dx: number, dy: number) => {
    // dot positions: (0,0)=1 (0,1)=2 (0,2)=3 (1,0)=4 (1,1)=5 (1,2)=6 (0,3)=7 (1,3)=8
    const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
    return 1 << map[dy][dx]
  }
  for (let cy = 0; cy < charRows; cy++) {
    let line = ''
    for (let cx = 0; cx < charCols; cx++) {
      const stamped = stamps?.get(`${cx},${cy}`)
      if (stamped) {
        line += stamped.char
        continue
      }
      let code = 0x2800
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const gx = cx * 2 + dx
          const gy = cy * 4 + dy
          const cell = grid.cells[gy * grid.cols + gx]
          if (cell && cell.lum > 0.5) code += bit(dx, dy)
        }
      }
      line += String.fromCharCode(code)
    }
    lines.push(line.replace(/⠀+$/, ''))
  }
  return lines.join('\n')
}

/** Colour HTML export for text modes: one <span> per character. */
export function htmlArt(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const fg = s.fg
  const bg = s.bg
  const esc = (c: string) => (c === ' ' ? '&nbsp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c)
  let body = ''

  if (s.mode === 'braille' || s.mode === 'braille-dense') {
    const charCols = Math.floor(grid.cols / 2)
    const charRows = Math.floor(grid.rows / 4)
    const bit = (dx: number, dy: number) => {
      const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
      return 1 << map[dy][dx]
    }
    for (let cy = 0; cy < charRows; cy++) {
      for (let cx = 0; cx < charCols; cx++) {
        const stamped = stamps?.get(`${cx},${cy}`)
        if (stamped) {
          const col = stamped.color || fg
          body += `<span style="color:${col}">${esc(stamped.char)}</span>`
          continue
        }
        let code = 0x2800
        let rSum = 0, gSum = 0, bSum = 0, count = 0
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const cell = grid.cells[(cy * 4 + dy) * grid.cols + (cx * 2 + dx)]
            if (cell && cell.lum > 0.45) {
              code += bit(dx, dy)
              const [r, g, b] = cellColor(cell, s)
              rSum += r; gSum += g; bSum += b; count++
            }
          }
        }
        const ch = String.fromCharCode(code)
        const col = count > 0 && s.colorMode !== 'mono'
          ? rgbCss(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count))
          : fg
        body += `<span style="color:${col}">${esc(ch)}</span>`
      }
      body += '<br>\n'
    }
  } else {
    const ramp = modeRamp(s.mode) ?? CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y * grid.cols + x]
        const stamped = stamps?.get(`${x},${y}`)
        const ch = stamped ? stamped.char : charFor(effLum(cell, s), ramp)
        const [r, g, b] = cellColor(cell, s)
        const col = stamped?.color || (s.colorMode === 'mono' ? fg : rgbCss(r, g, b))
        body += `<span style="color:${col}">${esc(ch)}</span>`
      }
      body += '<br>\n'
    }
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ASCII Studio art</title>
<style>body{background:${bg};margin:0;padding:24px}pre{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1;letter-spacing:0;margin:0}</style>
</head><body><pre>${body}</pre></body></html>`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return [h, s, l]
}

export interface RenderOpts {
  time: number
  seed: number
  scale?: number
  src?: HTMLCanvasElement | null
  stamps?: Map<string, { char: string; color?: string }>
  cursor?: { x: number; y: number; active: boolean; mode?: 'repel' | 'attract' | 'vortex' }
}

interface PhysicsParticle {
  x: number
  y: number
  vx: number
  vy: number
  ox: number
  oy: number
  col: number
  row: number
}

let particleCache: {
  key: string
  particles: PhysicsParticle[]
} | null = null

export function resetPhysicsParticles(): void {
  particleCache = null
}

function renderPhysicsParticles(
  ctx: CanvasRenderingContext2D,
  out: HTMLCanvasElement,
  grid: Grid,
  s: Settings,
  opts: RenderOpts,
  fs: number,
  cellW: number,
  cellH: number,
  charCols: number,
  charRows: number,
): void {
  const ramp = modeRamp(s.mode) ?? CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
  const key = `${charCols}x${charRows}x${out.width}x${out.height}`
  const now = opts.time ?? 0

  if (!particleCache || particleCache.key !== key) {
    const list: PhysicsParticle[] = []
    for (let y = 0; y < charRows; y++) {
      for (let x = 0; x < charCols; x++) {
        const ox = x * cellW + cellW * 0.5
        const oy = y * cellH + cellH * 0.5
        list.push({
          x: ox,
          y: oy,
          vx: 0,
          vy: 0,
          ox,
          oy,
          col: x,
          row: y,
        })
      }
    }
    particleCache = { key, particles: list }
  }

  const cursor = opts.cursor
  const cursorActive = cursor && cursor.active && cursor.x >= 0 && cursor.y >= 0
  const forceMode = cursor?.mode || 'repel'
  const radius = Math.max(90, fs * 8)
  const springK = 0.09
  const damping = 0.85

  ctx.save()
  try {
    ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const particles = particleCache.particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      const cell = grid.cells[p.row * grid.cols + p.col]
      if (!cell) continue
      const lum = effLum(cell, s)
      if (lum < 0.04) continue

      // Spring restoring force
      const fx = (p.ox - p.x) * springK
      const fy = (p.oy - p.y) * springK
      p.vx = (p.vx + fx) * damping
      p.vy = (p.vy + fy) * damping

      // Dynamic cursor force field
      if (cursorActive) {
        const dx = p.x - cursor.x
        const dy = p.y - cursor.y
        const dist = Math.hypot(dx, dy)
        if (dist < radius && dist > 1) {
          const normDist = 1 - dist / radius
          const force = normDist * normDist * 22
          const nx = dx / dist
          const ny = dy / dist
          if (forceMode === 'attract') {
            p.vx -= nx * force * 0.9
            p.vy -= ny * force * 0.9
          } else if (forceMode === 'vortex') {
            p.vx += (-ny * 1.5 + nx * 0.2) * force
            p.vy += (nx * 1.5 + ny * 0.2) * force
          } else {
            // repel
            p.vx += nx * force * 1.6
            p.vy += ny * force * 1.6
          }
        }
      }

      // Gentle organic harmonic vibration
      const wave = Math.sin(now * 3 + p.ox * 0.04 + p.oy * 0.04) * 0.18
      p.vx += wave * 0.3
      p.vy += wave * 0.3

      p.x += p.vx
      p.y += p.vy

      // Guard against non-finite particle coordinates
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        p.x = p.ox
        p.y = p.oy
        p.vx = 0
        p.vy = 0
      }

      const [r, g, b] = cellColor(cell, s)
      ctx.fillStyle = rgbCss(r, g, b)
      const ch = charFor(lum, ramp)

      // Render subtle speed trail if particle is accelerating fast
      const spd = Math.hypot(p.vx, p.vy)
      if (spd > 3.5) {
        ctx.strokeStyle = rgbCss(r, g, b, 0.35)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }

      ctx.fillText(ch, p.x, p.y)
    }
  } finally {
    ctx.restore()
  }
}

/** Main entry: render a sampled grid to the output canvas for the current mode. */
export function renderGrid(
  out: HTMLCanvasElement,
  grid: Grid,
  s: Settings,
  opts: RenderOpts,
): void {
  const ctx = out.getContext('2d')
  if (!ctx) return
  const scale = opts.scale ?? 1
  const fs = cellFontSize(s.cellSize, scale)
  const bgRgb = hexToRgb(s.bg)
  const textMode = TEXT_MODES.has(s.mode)
  const isBraille = s.mode === 'braille' || s.mode === 'braille-dense'
  const cellW = (textMode || isBraille) ? fs * 0.6 : fs
  const cellH = fs

  if (s.mode === 'dither') {
    renderDither(out, grid, s, opts)
  } else {
    const charCols = isBraille ? Math.floor(grid.cols / 2) : grid.cols
    const charRows = isBraille ? Math.floor(grid.rows / 4) : grid.rows
    out.width = Math.max(1, Math.round(charCols * cellW))
    out.height = Math.max(1, Math.round(charRows * cellH))
    ctx.fillStyle = s.bg
    ctx.fillRect(0, 0, out.width, out.height)
    if (s.bgBlur > 0 && opts.src) {
      ctx.save()
      ctx.filter = `blur(${s.bgBlur}px)`
      ctx.globalAlpha = 0.35
      ctx.drawImage(opts.src, 0, 0, out.width, out.height)
      ctx.restore()
      ctx.fillStyle = rgbCss(bgRgb[0], bgRgb[1], bgRgb[2], 0.55)
      ctx.fillRect(0, 0, out.width, out.height)
    }

    const ramp = CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
    const blocks = CHAR_RAMPS.blocks.chars

    switch (s.mode) {
    case 'characters':
    case 'crt': {
      ctx.font = `${s.mode === 'crt' ? 'bold ' : ''}${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      if (s.mode === 'crt') ctx.shadowColor = s.colorMode === 'mono' ? s.fg : '#33ff66'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          if (s.mode === 'crt') ctx.shadowBlur = 6
          ctx.fillText(charFor(lum, ramp), x * cellW, y * cellH)
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'emoji':
    case 'numbers':
    case 'arrows':
    case 'math':
    case 'katakana':
    case 'circles':
    case 'halfblock':
    case 'typewriter':
    case 'neon': {
      const mramp = modeRamp(s.mode) ?? ramp
      const fontScale = s.mode === 'emoji' ? 0.85 : 1
      ctx.font = `${fs * fontScale}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      if (s.mode === 'neon') {
        ctx.shadowColor = s.colorMode === 'mono' ? s.fg : '#ff2a6d'
        ctx.shadowBlur = 8
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          let ox = 0
          let oy = 0
          if (s.mode === 'typewriter') {
            ox = (hash2(x, y) - 0.5) * cellW * 0.16
            oy = (hash2(y, x) - 0.5) * cellH * 0.12
          }
          if (s.mode === 'halfblock') {
            ctx.fillStyle = rgbCss(Math.round(r * 0.4), Math.round(g * 0.4), Math.round(b * 0.4))
            ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          }
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(charFor(lum, mramp), x * cellW + ox, y * cellH + oy)
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'keycap': {
      ctx.font = `bold ${fs * 0.7}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const pad = cellW * 0.08
          ctx.fillStyle = rgbCss(Math.round(r * 0.25 + 20), Math.round(g * 0.25 + 20), Math.round(b * 0.25 + 20))
          roundRect(ctx, px + pad, py + pad, cellW - pad * 2, cellH - pad * 2, 2)
          ctx.fill()
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(charFor(lum, ramp), px + cellW / 2, py + cellH / 2 + 1)
        }
      }
      ctx.textAlign = 'left'
      break
    }
    case 'mixed': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText((x + y) % 2 === 0 ? charFor(lum, ramp) : charFor(lum, blocks), x * cellW, y * cellH)
        }
      }
      break
    }
    case 'block-chars': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(charFor(effLum(cell, s), blocks), x * cellW, y * cellH)
        }
      }
      break
    }
    case 'dots': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const rad = (1 - lum) * (cellW * 0.5)
          if (rad < 0.4) continue
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath()
          ctx.arc(x * cellW + cellW / 2, y * cellH + cellH / 2, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'braille': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let cy = 0; cy < charRows; cy++) {
        for (let cx = 0; cx < charCols; cx++) {
          let code = 0x2800
          let rr = 0, gg = 0, bb = 0, n = 0
          for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const cell = grid.cells[(cy * 4 + dy) * grid.cols + cx * 2 + dx]
              if (!cell) continue
              rr += cell.r; gg += cell.g; bb += cell.b; n++
              if (cell.lum > 0.5) {
                const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
                code += 1 << map[dy][dx]
              }
            }
          }
          if (code === 0x2800) continue
          const [r, g, b] = s.colorMode === 'mono' ? hexToRgb(s.fg) : [Math.round(rr / Math.max(1, n)), Math.round(gg / Math.max(1, n)), Math.round(bb / Math.max(1, n))]
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(String.fromCharCode(code), cx * cellW, cy * cellH)
        }
      }
      break
    }
    case 'specimen': {
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const size = fs * (0.6 + lum * 0.9)
          ctx.font = `${size.toFixed(1)}px ui-monospace, Menlo, Consolas, monospace`
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(charFor(lum, ramp), x * cellW, y * cellH + (cellH - size) / 2)
        }
      }
      ctx.font = `${Math.max(9, fs * 0.7)}px ui-monospace, Menlo, Consolas, monospace`
      ctx.fillStyle = s.fg
      ctx.fillText(ramp.split('').join(' '), 4, out.height - fs * 0.9)
      break
    }
    case 'pixel':
    case 'mosaic': {
      const inset = s.mode === 'mosaic' ? Math.max(1, fs * 0.06) : 0
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW + inset, y * cellH + inset, cellW - inset * 2, cellH - inset * 2)
        }
      }
      break
    }
    case 'lego': {
      const studR = cellW * 0.26
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const cx = px + cellW / 2
          const cy = py + cellH / 2

          // Brick base drop shadow & outline
          ctx.fillStyle = rgbCss(Math.max(0, r - 55), Math.max(0, g - 55), Math.max(0, b - 55))
          roundRect(ctx, px + 0.5, py + 0.5, cellW - 1, cellH - 1, 2)
          ctx.fill()

          // Brick top plate
          ctx.fillStyle = rgbCss(r, g, b)
          roundRect(ctx, px + 1, py + 1, cellW - 2.5, cellH - 2.5, 2)
          ctx.fill()

          // Brick top/left highlight bevel
          ctx.strokeStyle = rgbCss(Math.min(255, r + 45), Math.min(255, g + 45), Math.min(255, b + 45), 0.7)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(px + 1, py + cellH - 2)
          ctx.lineTo(px + 1, py + 1)
          ctx.lineTo(px + cellW - 2, py + 1)
          ctx.stroke()

          // Stud shadow
          ctx.fillStyle = rgbCss(Math.max(0, r - 45), Math.max(0, g - 45), Math.max(0, b - 45))
          ctx.beginPath()
          ctx.arc(cx + 0.75, cy + 1, studR, 0, Math.PI * 2)
          ctx.fill()

          // Stud body disc
          ctx.fillStyle = rgbCss(Math.min(255, r + 25), Math.min(255, g + 25), Math.min(255, b + 25))
          ctx.beginPath()
          ctx.arc(cx, cy, studR, 0, Math.PI * 2)
          ctx.fill()

          // Stud top highlight arc (specular crescent)
          ctx.strokeStyle = rgbCss(Math.min(255, r + 75), Math.min(255, g + 75), Math.min(255, b + 75), 0.85)
          ctx.lineWidth = Math.max(1, cellW * 0.08)
          ctx.beginPath()
          ctx.arc(cx, cy, studR * 0.75, Math.PI * 0.9, Math.PI * 1.8)
          ctx.stroke()
        }
      }
      break
    }
    case 'voxel': {
      const hw = cellW / 2
      const hh = cellH / 2
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const elevation = lum * hh * 0.65
          const py = y * cellH + hh * 0.5 - elevation
          // top face
          ctx.fillStyle = rgbCss(Math.min(255, r + 45), Math.min(255, g + 45), Math.min(255, b + 45))
          ctx.beginPath()
          ctx.moveTo(px + hw, py)
          ctx.lineTo(px + cellW, py + hh * 0.5)
          ctx.lineTo(px + hw, py + hh)
          ctx.lineTo(px, py + hh * 0.5)
          ctx.closePath(); ctx.fill()
          // left face
          ctx.fillStyle = rgbCss(Math.round(r * 0.62), Math.round(g * 0.62), Math.round(b * 0.62))
          ctx.beginPath()
          ctx.moveTo(px, py + hh * 0.5)
          ctx.lineTo(px + hw, py + hh)
          ctx.lineTo(px + hw, py + hh * 2 + elevation)
          ctx.lineTo(px, py + hh * 1.5 + elevation)
          ctx.closePath(); ctx.fill()
          // right face
          ctx.fillStyle = rgbCss(Math.round(r * 0.82), Math.round(g * 0.82), Math.round(b * 0.82))
          ctx.beginPath()
          ctx.moveTo(px + cellW, py + hh * 0.5)
          ctx.lineTo(px + hw, py + hh)
          ctx.lineTo(px + hw, py + hh * 2 + elevation)
          ctx.lineTo(px + cellW, py + hh * 1.5 + elevation)
          ctx.closePath(); ctx.fill()
        }
      }
      break
    }
    case 'hexmosaic': {
      const w = cellW
      const h = cellH * 0.9
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * w * 0.75 + (y % 2 === 0 ? 0 : w * 0.375)
          const cyp = y * h
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath()
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI / 3) * k + Math.PI / 6
            const vx = cxp + Math.cos(ang) * w * 0.5
            const vy = cyp + Math.sin(ang) * h * 0.55
            if (k === 0) ctx.moveTo(vx, vy)
            else ctx.lineTo(vx, vy)
          }
          ctx.closePath(); ctx.fill()
        }
      }
      break
    }
    case 'cross':
    case 'diamond':
    case 'lines':
    case 'diagonal': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const cxp = px + cellW / 2
          const cyp = py + cellH / 2
          const sz = (1 - lum) * Math.min(cellW, cellH) * 0.48
          if (sz < 0.5) continue
          ctx.strokeStyle = rgbCss(r, g, b)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.lineWidth = Math.max(1, cellW * 0.12)
          if (s.mode === 'cross') {
            ctx.beginPath()
            ctx.moveTo(cxp - sz, cyp); ctx.lineTo(cxp + sz, cyp)
            ctx.moveTo(cxp, cyp - sz); ctx.lineTo(cxp, cyp + sz)
            ctx.stroke()
          } else if (s.mode === 'diamond') {
            ctx.beginPath()
            ctx.moveTo(cxp, cyp - sz); ctx.lineTo(cxp + sz, cyp)
            ctx.lineTo(cxp, cyp + sz); ctx.lineTo(cxp - sz, cyp)
            ctx.closePath(); ctx.fill()
          } else if (s.mode === 'lines') {
            ctx.beginPath()
            ctx.moveTo(px + 1, cyp); ctx.lineTo(px + cellW - 1, cyp)
            ctx.lineWidth = Math.max(1, (1 - lum) * cellH * 0.8)
            ctx.stroke()
          } else {
            ctx.beginPath()
            ctx.moveTo(cxp - sz, cyp + sz); ctx.lineTo(cxp + sz, cyp - sz)
            ctx.stroke()
          }
        }
      }
      break
    }
    case 'lowpoly': {
      const rnd = mulberry32(opts.seed)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const jx = (rnd() - 0.5) * cellW * 0.5
          const jy = (rnd() - 0.5) * cellH * 0.5
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath()
          ctx.moveTo(px, py); ctx.lineTo(px + cellW, py); ctx.lineTo(px + cellW / 2 + jx, py + cellH / 2 + jy)
          ctx.closePath(); ctx.fill()
          ctx.fillStyle = rgbCss(Math.round(r * 0.8), Math.round(g * 0.8), Math.round(b * 0.8))
          ctx.beginPath()
          ctx.moveTo(px, py + cellH); ctx.lineTo(px + cellW, py + cellH); ctx.lineTo(px + cellW / 2 + jx, py + cellH / 2 + jy)
          ctx.closePath(); ctx.fill()
        }
      }
      break
    }
    case 'frostedglass': {
      if (opts.src) {
        ctx.save()
        ctx.filter = `blur(${Math.max(2, fs * 0.8)}px) saturate(1.2)`
        ctx.drawImage(opts.src, 0, 0, out.width, out.height)
        ctx.restore()
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          ctx.strokeStyle = 'rgba(255,255,255,0.28)'
          ctx.lineWidth = 1
          ctx.strokeRect(x * cellW + 0.5, y * cellH + 0.5, cellW, cellH)
        }
      }
      break
    }
    case 'stainedglass': {
      const rnd = mulberry32(opts.seed)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const j = () => (rnd() - 0.5) * cellW * 0.24
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath()
          ctx.moveTo(px + j(), py + j())
          ctx.lineTo(px + cellW + j(), py + j())
          ctx.lineTo(px + cellW + j(), py + cellH + j())
          ctx.lineTo(px + j(), py + cellH + j())
          ctx.closePath(); ctx.fill()
          ctx.strokeStyle = 'rgba(10,10,14,0.85)'
          ctx.lineWidth = Math.max(1, cellW * 0.1)
          ctx.stroke()
        }
      }
      break
    }
    case 'risograph': {
      const rnd = mulberry32(opts.seed)
      const ink1: [number, number, number] = [255, 72, 176]
      const ink2: [number, number, number] = [0, 120, 191]
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ink = lum < 0.5 ? ink1 : ink2
          const t = lum < 0.5 ? lum * 2 : (lum - 0.5) * 2
          const col = mixRgb([245, 240, 230], ink, 0.25 + t * 0.65)
          ctx.fillStyle = rgbCss(col[0], col[1], col[2])
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          if (rnd() < 0.12) {
            ctx.fillStyle = 'rgba(20,16,12,0.25)'
            ctx.fillRect(x * cellW + rnd() * cellW, y * cellH + rnd() * cellH, 1.5, 1.5)
          }
        }
      }
      break
    }
    case 'stippling': {
      const rnd = mulberry32(opts.seed)
      ctx.fillStyle = '#f5f1e8'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.fillStyle = '#141414'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const dots = Math.round((1 - lum) * 5)
          for (let k = 0; k < dots; k++) {
            const dx = x * cellW + rnd() * cellW
            const dy = y * cellH + rnd() * cellH
            ctx.beginPath()
            ctx.arc(dx, dy, 0.9, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      break
    }
    case 'comic': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const levels = 4
          const q = Math.round(lum * (levels - 1)) / (levels - 1)
          const [r, g, b] = cellColor({ ...cell, lum: q }, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          if (cell.edge > 0.35) {
            ctx.fillStyle = '#0a0a0a'
            ctx.fillRect(x * cellW, y * cellH, cellW, Math.max(1, cellH * 0.18))
          }
        }
      }
      break
    }
    case 'sketch': {
      ctx.fillStyle = '#f7f4ec'
      ctx.fillRect(0, 0, out.width, out.height)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (cell.edge > 0.12) {
            ctx.strokeStyle = `rgba(20,20,20,${Math.min(0.9, cell.edge)})`
            ctx.lineWidth = Math.max(0.7, cell.edge * 2)
            ctx.beginPath()
            ctx.moveTo(x * cellW, y * cellH + cellH / 2)
            ctx.lineTo(x * cellW + cellW, y * cellH + cellH / 2)
            ctx.stroke()
          }
          if (lum < 0.45) {
            ctx.fillStyle = `rgba(40,40,40,${(0.45 - lum) * 0.5})`
            ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          }
        }
      }
      break
    }
    case 'oilpaint': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const levels = 6
          const q = Math.round(lum * (levels - 1)) / (levels - 1)
          const [r, g, b] = cellColor({ ...cell, lum: q }, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath()
          ctx.ellipse(x * cellW + cellW / 2, y * cellH + cellH / 2, cellW * 0.62, cellH * 0.62, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'watercolor': {
      ctx.fillStyle = '#fbf8f1'
      ctx.fillRect(0, 0, out.width, out.height)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const grad = ctx.createRadialGradient(
            x * cellW + cellW / 2, y * cellH + cellH / 2, 0,
            x * cellW + cellW / 2, y * cellH + cellH / 2, cellW * 0.75,
          )
          grad.addColorStop(0, rgbCss(r, g, b, 0.85))
          grad.addColorStop(1, rgbCss(r, g, b, 0))
          ctx.fillStyle = grad
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'chrome': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          let col: [number, number, number]
          if (lum < 0.25) col = mixRgb([8, 12, 30], [60, 70, 110], lum / 0.25)
          else if (lum < 0.55) col = mixRgb([60, 70, 110], [210, 220, 235], (lum - 0.25) / 0.3)
          else if (lum < 0.8) col = mixRgb([210, 220, 235], [255, 255, 255], (lum - 0.55) / 0.25)
          else col = mixRgb([255, 255, 255], [40, 45, 70], (lum - 0.8) / 0.2)
          ctx.fillStyle = rgbCss(col[0], col[1], col[2])
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'disco': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const [h, sat, l] = rgbToHsl(r, g, b)
          const hue = (h + (x * 7 + y * 13 + opts.time * 40) % 360 + 360) % 360
          const [rr, gg, bb] = hslToRgb(hue, Math.min(1, sat + 0.35), Math.min(0.62, l + 0.12))
          ctx.fillStyle = rgbCss(rr, gg, bb)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'anaglyph': {
      const off = Math.max(1, Math.round(cellW * 0.35))
      const tmp = document.createElement('canvas')
      tmp.width = out.width; tmp.height = out.height
      const tctx = tmp.getContext('2d')
      if (tctx) {
        tctx.fillStyle = s.bg
        tctx.fillRect(0, 0, tmp.width, tmp.height)
        for (let y = 0; y < charRows; y++) {
          for (let x = 0; x < charCols; x++) {
            const cell = grid.cells[y * grid.cols + x]
            tctx.fillStyle = rgbCss(cell.r, 0, 0)
            tctx.fillRect(x * cellW - off, y * cellH, cellW, cellH)
            tctx.fillStyle = rgbCss(0, cell.g, cell.b)
            tctx.fillRect(x * cellW + off, y * cellH, cellW, cellH)
          }
        }
        ctx.drawImage(tmp, 0, 0)
      }
      break
    }
    case 'pixelsort': {
      // sort runs within each row by luminance, then draw as blocks
      const sorted: GridCell[] = [...grid.cells]
      const rnd = mulberry32(opts.seed)
      for (let y = 0; y < charRows; y++) {
        let x = 0
        while (x < charCols) {
          const len = Math.min(charCols - x, 4 + Math.floor(rnd() * 18))
          const seg = sorted.slice(y * grid.cols + x, y * grid.cols + x + len)
          seg.sort((a, b) => a.lum - b.lum)
          for (let k = 0; k < seg.length; k++) sorted[y * grid.cols + x + k] = seg[k]
          x += len
        }
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = sorted[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'crossstitch': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          const sz = Math.min(cellW, cellH) * 0.42
          ctx.strokeStyle = rgbCss(r, g, b)
          ctx.lineWidth = Math.max(1, (1 - lum) * cellW * 0.28 + 0.6)
          ctx.beginPath()
          ctx.moveTo(cxp - sz, cyp - sz); ctx.lineTo(cxp + sz, cyp + sz)
          ctx.moveTo(cxp + sz, cyp - sz); ctx.lineTo(cxp - sz, cyp + sz)
          ctx.stroke()
        }
      }
      break
    }
    case 'beads': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath(); ctx.arc(cxp, cyp, cellW * 0.42, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = rgbCss(Math.min(255, r + 50), Math.min(255, g + 50), Math.min(255, b + 50))
          ctx.beginPath(); ctx.arc(cxp - cellW * 0.12, cyp - cellH * 0.12, cellW * 0.14, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(cxp, cyp, cellW * 0.42, 0, Math.PI * 2); ctx.stroke()
        }
      }
      break
    }
    case 'halftone-cmyk': {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, out.width, out.height)
      const dotR = cellW * 0.5
      const chans: [number, number, string][] = [[-0.22, -0.22, '#00aeef'], [0.22, -0.22, '#ec008c'], [-0.22, 0.22, '#fff200'], [0.22, 0.22, '#111111']]
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const vals = [1 - cell.r / 255, 1 - cell.g / 255, 1 - cell.b / 255, Math.min(1 - cell.r / 255, 1 - cell.g / 255, 1 - cell.b / 255)]
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          for (let i = 0; i < 4; i++) {
            const rad = vals[i] * dotR * 0.55
            if (rad < 0.4) continue
            ctx.fillStyle = chans[i][2]
            ctx.beginPath()
            ctx.arc(cxp + (chans[i][0] as number) * cellW, cyp + (chans[i][1] as number) * cellH, rad, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
      break
    }
    case 'blueprint': {
      ctx.fillStyle = '#274b8f'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      for (let x = 0; x <= charCols; x++) {
        ctx.beginPath(); ctx.moveTo(x * cellW, 0); ctx.lineTo(x * cellW, out.height); ctx.stroke()
      }
      for (let y = 0; y <= charRows; y++) {
        ctx.beginPath(); ctx.moveTo(0, y * cellH); ctx.lineTo(out.width, y * cellH); ctx.stroke()
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (lum > 0.85) continue
          ctx.strokeStyle = `rgba(255,255,255,${0.25 + (1 - lum) * 0.65})`
          ctx.lineWidth = Math.max(1, (1 - lum) * cellH * 0.5)
          ctx.beginPath()
          ctx.moveTo(x * cellW + 1, y * cellH + cellH / 2)
          ctx.lineTo(x * cellW + cellW - 1, y * cellH + cellH / 2)
          ctx.stroke()
        }
      }
      break
    }
    case 'linocut': {
      ctx.fillStyle = '#f5f1e8'
      ctx.fillRect(0, 0, out.width, out.height)
      const rnd = mulberry32(opts.seed)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (lum > 0.55) continue
          const w = cellW * (0.7 + (0.55 - lum) * 0.6)
          const h = cellH * (0.7 + (0.55 - lum) * 0.6)
          ctx.fillStyle = '#141414'
          ctx.save()
          ctx.translate(x * cellW + cellW / 2, y * cellH + cellH / 2)
          ctx.rotate((rnd() - 0.5) * 0.5)
          ctx.fillRect(-w / 2, -h / 2, w, h)
          ctx.restore()
        }
      }
      break
    }
    case 'triangles': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const sz = (1 - lum) * Math.min(cellW, cellH) * 0.48
          if (sz < 0.5) continue
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          ctx.strokeStyle = rgbCss(r, g, b)
          ctx.lineWidth = Math.max(1, cellW * 0.12)
          ctx.beginPath()
          ctx.moveTo(cxp, cyp - sz)
          ctx.lineTo(cxp + sz, cyp + sz)
          ctx.lineTo(cxp - sz, cyp + sz)
          ctx.closePath(); ctx.stroke()
        }
      }
      break
    }
    case 'hexagons': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          ctx.beginPath()
          for (let k = 0; k < 6; k++) {
            const ang = (Math.PI / 3) * k
            const vx = cxp + Math.cos(ang) * cellW * 0.48
            const vy = cyp + Math.sin(ang) * cellH * 0.48
            if (k === 0) ctx.moveTo(vx, vy)
            else ctx.lineTo(vx, vy)
          }
          ctx.closePath()
          ctx.globalAlpha = 0.25 + lum * 0.55
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.strokeStyle = rgbCss(r, g, b)
          ctx.lineWidth = Math.max(1, cellW * 0.12)
          ctx.stroke()
        }
      }
      break
    }
    case 'prism': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const hue = (x * 7 + y * 11) % 360
          const [pr, pg, pb] = hslToRgb(hue, 0.85, 0.55)
          const t = 0.45 + effLum(cell, s) * 0.3
          const col = mixRgb([r, g, b], [pr, pg, pb], t)
          ctx.fillStyle = rgbCss(col[0], col[1], col[2])
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'
          ctx.lineWidth = 1
          ctx.strokeRect(x * cellW + 0.5, y * cellH + 0.5, cellW, cellH)
        }
      }
      break
    }
    case 'aurora': {
      ctx.fillStyle = '#04101f'
      ctx.fillRect(0, 0, out.width, out.height)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const band = Math.sin((x / Math.max(1, charCols)) * Math.PI * 2 + y * 0.08 + opts.time * 0.4)
          const glow = Math.max(0, band) * (0.35 + lum * 0.65)
          if (glow < 0.03) continue
          const hue = 150 + ((x + y) % 60)
          const [ar, ag, ab] = hslToRgb(hue, 0.9, 0.5)
          const col = mixRgb([r, g, b], [ar, ag, ab], 0.6)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          const grad = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, cellW * 0.9)
          grad.addColorStop(0, rgbCss(col[0], col[1], col[2], glow))
          grad.addColorStop(1, rgbCss(col[0], col[1], col[2], 0))
          ctx.fillStyle = grad
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'laser': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const bright = 1 - lum
          if (bright < 0.15) continue
          ctx.strokeStyle = rgbCss(Math.min(255, r + 80), Math.min(255, g + 80), Math.min(255, b + 80))
          ctx.globalAlpha = 0.3 + bright * 0.7
          ctx.lineWidth = Math.max(1, bright * cellH * 0.22)
          ctx.beginPath()
          ctx.moveTo(x * cellW + 1, y * cellH + cellH / 2)
          ctx.lineTo(x * cellW + cellW - 1, y * cellH + cellH / 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
      break
    }
    case 'vhs': {
      const rnd = mulberry32(opts.seed + Math.floor(opts.time * 6))
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      for (let i = 0; i < 5; i++) {
        const ty = rnd() * out.height
        const th = 2 + rnd() * 10
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        ctx.fillRect(0, ty, out.width, th)
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.fillRect(0, ty + th, out.width, 2)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (let i = 0; i < 40; i++) {
        ctx.fillRect(rnd() * out.width, rnd() * out.height, 1.5, 1.5)
      }
      break
    }
    case 'marble': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const vein = Math.abs(Math.sin((x * 0.35 + y * 0.12) * Math.PI + Math.sin(y * 0.3) * 1.2))
          const t = Math.max(0, 1 - vein * 3)
          const col = mixRgb([r, g, b], [245, 242, 235], Math.min(0.55, t * 0.7))
          ctx.fillStyle = rgbCss(col[0], col[1], col[2])
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'kaleidoscope': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const mx = x < charCols / 2 ? x : charCols - 1 - x
          const my = y < charRows / 2 ? y : charRows - 1 - y
          const cell = grid.cells[my * grid.cols + mx]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'bokeh': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const rad = (1 - lum) * cellW * 0.55
          if (rad < 0.6) continue
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          const grad = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad)
          grad.addColorStop(0, rgbCss(Math.min(255, r + 40), Math.min(255, g + 40), Math.min(255, b + 40), 0.9))
          grad.addColorStop(0.7, rgbCss(r, g, b, 0.55))
          grad.addColorStop(1, rgbCss(r, g, b, 0))
          ctx.fillStyle = grad
          ctx.beginPath(); ctx.arc(cxp, cyp, rad, 0, Math.PI * 2); ctx.fill()
        }
      }
      break
    }
    case 'ledmatrix': {
      ctx.fillStyle = '#06060a'
      ctx.fillRect(0, 0, out.width, out.height)
      const dotRad = Math.max(1, cellW * 0.38)
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          ctx.fillStyle = '#111116'
          ctx.beginPath(); ctx.arc(cxp, cyp, dotRad + 0.6, 0, Math.PI * 2); ctx.fill()
          if (lum > 0.15) {
            ctx.fillStyle = rgbCss(r, g, b, 0.28)
            ctx.beginPath(); ctx.arc(cxp, cyp, dotRad * 1.6, 0, Math.PI * 2); ctx.fill()
          }
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.beginPath(); ctx.arc(cxp, cyp, dotRad * 0.85, 0, Math.PI * 2); ctx.fill()
          if (lum > 0.2) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)'
            ctx.beginPath(); ctx.arc(cxp - dotRad * 0.3, cyp - dotRad * 0.3, dotRad * 0.25, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
      break
    }
    case 'gameboy-camera': {
      const gbPal: [number, number, number][] = [
        [15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15],
      ]
      const mat = BAYER_4
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const t = mat[y % 4][x % 4]
          const shadeIdx = lum > 0.75 ? 3 : lum > 0.5 ? (t > 0.5 ? 3 : 2) : lum > 0.25 ? (t > 0.5 ? 2 : 1) : 0
          const [r, g, b] = gbPal[shadeIdx]
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5)
        }
      }
      ctx.strokeStyle = '#0f380f'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, out.width - 2, out.height - 2)
      break
    }
    case 'thermal': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          let tr = 0, tg = 0, tb = 0
          if (lum < 0.25) {
            const t = lum / 0.25
            tr = Math.round(15 * t); tg = 0; tb = Math.round(80 + 175 * t)
          } else if (lum < 0.5) {
            const t = (lum - 0.25) / 0.25
            tr = Math.round(20 + 220 * t); tg = 0; tb = Math.round(255 * (1 - t * 0.7))
          } else if (lum < 0.75) {
            const t = (lum - 0.5) / 0.25
            tr = 240 + Math.round(15 * t); tg = Math.round(180 * t); tb = 0
          } else {
            const t = (lum - 0.75) / 0.25
            tr = 255; tg = Math.round(180 + 75 * t); tb = Math.round(255 * t)
          }
          ctx.fillStyle = rgbCss(tr, tg, tb)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'cyberterminal': {
      const margin = Math.max(32, Math.round(fs * 2.2))
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      ctx.shadowColor = s.colorMode === 'mono' ? s.fg : '#00ff66'
      ctx.shadowBlur = 5
      for (let y = 0; y < charRows; y++) {
        ctx.fillStyle = 'rgba(0,255,102,0.35)'
        ctx.fillText(String(y + 1).padStart(3, '0') + '│', 2, y * cellH)
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          const xp = margin + x * (cellW * 0.95)
          if (xp + cellW < out.width) {
            ctx.fillText(charFor(lum, ramp), xp, y * cellH)
          }
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'ascii-colored-bg': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(Math.round(r * 0.28), Math.round(g * 0.28), Math.round(b * 0.28))
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
          ctx.fillStyle = rgbCss(Math.min(255, Math.round(r * 1.35 + 20)), Math.min(255, Math.round(g * 1.35 + 20)), Math.min(255, Math.round(b * 1.35 + 20)))
          ctx.fillText(charFor(lum, ramp), x * cellW, y * cellH)
        }
      }
      break
    }
    case 'circuit': {
      ctx.fillStyle = '#03170a'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.lineWidth = 1.2
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const cxp = x * cellW + cellW / 2
          const cyp = y * cellH + cellH / 2
          if (cell.edge > 0.18) {
            ctx.strokeStyle = rgbCss(Math.min(255, r + 50), Math.min(255, g + 30), Math.min(255, b + 10), 0.85)
            ctx.beginPath()
            ctx.moveTo(cxp, cyp)
            const ang = ((Math.floor(lum * 8) * 45) * Math.PI) / 180
            ctx.lineTo(cxp + Math.cos(ang) * cellW * 0.8, cyp + Math.sin(ang) * cellH * 0.8)
            ctx.stroke()
            ctx.fillStyle = '#d4af37'
            ctx.beginPath(); ctx.arc(cxp, cyp, Math.max(1, cellW * 0.2), 0, Math.PI * 2); ctx.fill()
          } else if (lum > 0.6) {
            ctx.fillStyle = rgbCss(r, g, b, 0.6)
            ctx.fillRect(cxp - cellW * 0.25, cyp - cellH * 0.25, cellW * 0.5, cellH * 0.5)
          }
        }
      }
      break
    }
    case 'crosshatch': {
      ctx.lineWidth = 1
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.strokeStyle = rgbCss(r, g, b)
          const x0 = x * cellW, y0 = y * cellH
          const x1 = x0 + cellW, y1 = y0 + cellH
          if (lum < 0.8) {
            ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y0); ctx.stroke()
          }
          if (lum < 0.6) {
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke()
          }
          if (lum < 0.4) {
            ctx.beginPath(); ctx.moveTo(x0, y0 + cellH / 2); ctx.lineTo(x1, y0 + cellH / 2); ctx.stroke()
          }
          if (lum < 0.2) {
            ctx.beginPath(); ctx.moveTo(x0 + cellW / 2, y0); ctx.lineTo(x0 + cellW / 2, y1); ctx.stroke()
          }
        }
      }
      break
    }
    case 'wireframe': {
      ctx.lineWidth = 1
      for (let y = 0; y < charRows - 1; y++) {
        for (let x = 0; x < charCols - 1; x++) {
          const c00 = grid.cells[y * grid.cols + x]
          const c10 = grid.cells[y * grid.cols + (x + 1)]
          const c01 = grid.cells[(y + 1) * grid.cols + x]
          const lum = effLum(c00, s)
          const [r, g, b] = cellColor(c00, s)
          const elev = (1 - lum) * cellH * 0.5
          const p0x = x * cellW, p0y = y * cellH - elev
          const p1x = (x + 1) * cellW, p1y = y * cellH - (1 - effLum(c10, s)) * cellH * 0.5
          const p2x = x * cellW, p2y = (y + 1) * cellH - (1 - effLum(c01, s)) * cellH * 0.5
          ctx.strokeStyle = rgbCss(r, g, b, 0.8)
          ctx.beginPath()
          ctx.moveTo(p0x, p0y); ctx.lineTo(p1x, p1y)
          ctx.moveTo(p0x, p0y); ctx.lineTo(p2x, p2y)
          ctx.stroke()
        }
      }
      break
    }
    case 'voronoi': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const jx = (hash2(x, y) - 0.5) * cellW * 0.4
          const jy = (hash2(y, x) - 0.5) * cellH * 0.4
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.strokeStyle = 'rgba(0,0,0,0.45)'
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.rect(x * cellW + jx, y * cellH + jy, cellW, cellH)
          ctx.fill()
          ctx.stroke()
        }
      }
      break
    }
    case 'glitch-cyber': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        const rowGlitch = hash2(y, s.glitchSeed) > 0.82
        const shiftX = rowGlitch ? Math.round((hash2(y, 11) - 0.5) * cellW * 4) : 0
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW + shiftX
          if (rowGlitch && hash2(x, y) > 0.7) {
            ctx.fillStyle = rgbCss(255 - r, 255 - g, 255 - b)
            ctx.fillRect(px, y * cellH, cellW * 1.5, cellH)
          } else {
            ctx.fillStyle = rgbCss(r, g, b)
            ctx.fillRect(px, y * cellH, cellW, cellH)
            if (lum > 0.3) {
              ctx.fillStyle = 'rgba(0, 240, 255, 0.45)'
              ctx.fillText(charFor(lum, ramp), px - 1, y * cellH)
            }
          }
        }
      }
      break
    }
    case 'waves': {
      ctx.lineWidth = 1.4
      for (let y = 0; y < charRows; y++) {
        ctx.beginPath()
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const waveY = y * cellH + Math.sin(x * 0.2 + (opts.time ?? 0) * 3) * (cellH * 0.4)
          ctx.strokeStyle = rgbCss(r, g, b)
          if (x === 0) ctx.moveTo(x * cellW, waveY)
          else ctx.lineTo(x * cellW, waveY)
        }
        ctx.stroke()
      }
      break
    }
    case 'twirl':
    case 'pinch':
    case 'spherize':
    case 'ripple':
    case 'zigzag':
    case 'polar':
    case 'shear':
    case 'smudge':
    case 'motionblur': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          if (s.mode === 'motionblur' || s.mode === 'smudge') {
            ctx.fillRect(x * cellW, y * cellH, cellW * 1.25, cellH)
          } else {
            ctx.fillText(charFor(lum, ramp), x * cellW, y * cellH)
          }
        }
      }
      break
    }
    case 'matrix-rain': {
      ctx.font = `bold ${fs * 0.9}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['matrix-rain'] ?? ' ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ12345789:・."=*+-<>¦｜'
      const time = opts.time ?? 0
      for (let x = 0; x < charCols; x++) {
        const colSeed = hash2(x, 137)
        const speed = 6 + colSeed * 9
        const trailLen = 8 + Math.floor(colSeed * 14)
        const headPos = (time * speed + colSeed * 50) % (charRows + trailLen + 10)
        for (let y = 0; y < charRows; y++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (lum < 0.05) continue
          const dist = headPos - y
          if (dist < 0 || dist > trailLen) continue
          const trailFade = 1 - dist / trailLen
          const charIdx = (Math.floor(y + colSeed * 70 + time * 3)) % mramp.length
          const ch = mramp[charIdx]

          if (dist < 1.2) {
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = s.colorMode === 'mono' ? s.fg : '#00ff66'
            ctx.shadowBlur = 10
          } else {
            const [r, g, b] = cellColor(cell, s)
            const alpha = trailFade * (0.35 + lum * 0.65)
            ctx.fillStyle = s.colorMode === 'mono'
              ? `rgba(0, 255, 65, ${alpha.toFixed(2)})`
              : rgbCss(r, g, b, alpha)
            ctx.shadowBlur = dist < 3 ? 5 : 0
          }
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'ascii-flow': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const flowChars = ['-', '/', '|', '\\', ')', '(', '~', '=']
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (lum < 0.08) continue
          const angle = (cell.edge > 0.08)
            ? Math.atan2(y - charRows / 2, x - charCols / 2) + Math.PI / 2
            : Math.sin(x * 0.15) * Math.cos(y * 0.15) * Math.PI
          const normAngle = ((angle % Math.PI + Math.PI) % Math.PI) / Math.PI
          const idx = Math.min(flowChars.length - 1, Math.floor(normAngle * flowChars.length))
          const ch = flowChars[idx]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-box': {
      ctx.font = `${fs * 0.95}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const boxGlyphs = [' ', '─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼']
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          if (lum < 0.1) continue
          let glyphIdx = 1
          if (cell.edge > 0.25) {
            glyphIdx = 3 + ((x + y * 3) % 9)
          } else if (x % 2 === 0) {
            glyphIdx = 1
          } else {
            glyphIdx = 2
          }
          const ch = boxGlyphs[glyphIdx]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'dot-matrix': {
      const subW = cellW / 3
      const subH = cellH / 3
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const px = x * cellW
          const py = y * cellH
          const pinsActive = Math.round((1 - lum) * 9)
          for (let pyi = 0; pyi < 3; pyi++) {
            for (let pxi = 0; pxi < 3; pxi++) {
              const pinIdx = pyi * 3 + pxi
              if (pinIdx >= pinsActive) continue
              const dx = (hash2(x * 3 + pxi, y * 3 + pyi) - 0.5) * subW * 0.18
              const dy = (hash2(y * 3 + pyi, x * 3 + pxi) - 0.5) * subH * 0.18
              ctx.fillStyle = rgbCss(r, g, b, 0.88)
              ctx.beginPath()
              ctx.arc(px + pxi * subW + subW / 2 + dx, py + pyi * subH + subH / 2 + dy, subW * 0.38, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
      }
      break
    }
    case 'glitch-vcr': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const time = opts.time ?? 0
      const mramp = MODE_RAMPS['glitch-vcr'] ?? ' _░▒▓█'
      const glitchLine = Math.floor(((time * 20) % charRows))
      for (let y = 0; y < charRows; y++) {
        const isGlitchY = Math.abs(y - glitchLine) < 2
        const xShift = isGlitchY ? Math.round(Math.sin(y * 14 + time * 9) * cellW * 1.6) : 0
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          if (isGlitchY && x % 3 === 0) {
            ctx.fillStyle = '#00ffff'
            ctx.fillText(ch, x * cellW + xShift - 2, y * cellH)
            ctx.fillStyle = '#ff0055'
            ctx.fillText(ch, x * cellW + xShift + 2, y * cellH)
          } else {
            ctx.fillStyle = rgbCss(r, g, b)
            ctx.fillText(ch, x * cellW + xShift, y * cellH)
          }
        }
      }
      break
    }
    case 'braille-dense': {
      ctx.font = `${fs * 1.05}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const charCols = Math.floor(grid.cols / 2)
      const charRows = Math.floor(grid.rows / 4)
      const bit = (dx: number, dy: number) => {
        const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
        return 1 << map[dy][dx]
      }
      for (let cy = 0; cy < charRows; cy++) {
        for (let cx = 0; cx < charCols; cx++) {
          let code = 0x2800
          let rSum = 0, gSum = 0, bSum = 0, count = 0
          for (let dy = 0; dy < 4; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const cell = grid.cells[(cy * 4 + dy) * grid.cols + (cx * 2 + dx)]
              if (cell && cell.lum > 0.38) {
                code += bit(dx, dy)
                const [r, g, b] = cellColor(cell, s)
                rSum += r; gSum += g; bSum += b; count++
              }
            }
          }
          if (code === 0x2800) continue
          const ch = String.fromCharCode(code)
          const col = count > 0 && s.colorMode !== 'mono'
            ? rgbCss(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count))
            : s.fg
          ctx.fillStyle = col
          ctx.fillText(ch, cx * cellW, cy * cellH)
        }
      }
      break
    }
    case 'ascii-cinematic': {
      ctx.font = `600 ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      ctx.shadowColor = 'rgba(255, 140, 40, 0.45)'
      ctx.shadowBlur = 4
      const mramp = MODE_RAMPS['ascii-cinematic'] ?? ramp
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          const cr = Math.min(255, Math.round(r * 1.1 + 10))
          const cg = Math.round(g * 0.98)
          const cb = Math.min(255, Math.round(b * 0.92 + (1 - lum) * 20))
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : rgbCss(cr, cg, cb)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'ironbow-flir': {
      const ironbow = (t: number): [number, number, number] => {
        const cl = Math.max(0, Math.min(1, t))
        if (cl < 0.2) {
          const u = cl / 0.2
          return [Math.round(15 + u * 40), Math.round(5 + u * 10), Math.round(35 + u * 120)]
        } else if (cl < 0.5) {
          const u = (cl - 0.2) / 0.3
          return [Math.round(55 + u * 180), Math.round(15 + u * 20), Math.round(155 - u * 95)]
        } else if (cl < 0.8) {
          const u = (cl - 0.5) / 0.3
          return [Math.round(235 + u * 20), Math.round(35 + u * 190), Math.round(60 - u * 50)]
        } else {
          const u = (cl - 0.8) / 0.2
          return [255, Math.round(225 + u * 30), Math.round(10 + u * 245)]
        }
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [ir, ig, ib] = ironbow(lum)
          ctx.fillStyle = rgbCss(ir, ig, ib)
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5)
        }
      }
      break
    }
    case 'ascii-terrain-3d': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-terrain-3d'] ?? ' _.-~+=^"\'#'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          const elev = Math.round(lum * 3.5)
          if (elev > 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
            ctx.fillText(ch, x * cellW + 1.5, y * cellH + 1.5 - elev)
          }
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH - elev)
        }
      }
      break
    }
    case 'ascii-blueprint-cad': {
      ctx.font = `${fs * 0.95}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-blueprint-cad'] ?? ' +─│┌┐└┘├┤┬┴┼'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : lum > 0.6 ? '#62ecff' : '#1479b8'
          ctx.fillText(ch, x * cellW, y * cellH)
          if (x % 16 === 0 && y % 8 === 0) {
            ctx.fillStyle = 'rgba(98, 236, 255, 0.35)'
            ctx.fillText('+', x * cellW - 2, y * cellH - 2)
          }
        }
      }
      break
    }
    case 'ascii-halftone-news': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-halftone-news'] ?? ' .•●⬤'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-synthwave-mesh': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-synthwave-mesh'] ?? ' _/\\|#*'
      for (let y = 0; y < charRows; y++) {
        const rowGradT = y / charRows
        const rowCol = mixRgb([255, 0, 140], [0, 240, 255], rowGradT)
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : rgbCss(rowCol[0], rowCol[1], rowCol[2])
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-glitch-datamosh': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-glitch-datamosh'] ?? ' _░▒▓█'
      const time = opts.time ?? 0
      const sliceY = Math.floor(((time * 15 + 4) % charRows))
      for (let y = 0; y < charRows; y++) {
        const isSlice = Math.abs(y - sliceY) < 3
        const xShift = isSlice ? Math.sin(y * 8 + time * 12) * cellW * 2.2 : 0
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          if (isSlice && x % 2 === 0) {
            ctx.fillStyle = '#ff0055'
            ctx.fillText(ch, x * cellW + xShift - 3, y * cellH)
            ctx.fillStyle = '#00f0ff'
            ctx.fillText(ch, x * cellW + xShift + 3, y * cellH)
          } else {
            ctx.fillStyle = rgbCss(r, g, b)
            ctx.fillText(ch, x * cellW + xShift, y * cellH)
          }
        }
      }
      break
    }
    case 'ascii-terminal-crt': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      ctx.shadowColor = s.colorMode === 'mono' ? s.fg : '#ffaa00'
      ctx.shadowBlur = 7
      const mramp = MODE_RAMPS['ascii-terminal-crt'] ?? ' .:;+=#%@'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : '#ffaa00'
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      ctx.shadowBlur = 0
      break
    }
    case 'ascii-quantum-dot': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-quantum-dot'] ?? ' ·:•●'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-chladni': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-chladni'] ?? ' ~-=/|\\'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'matrix-cascade': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const time = opts.time ?? 0
      const mramp = MODE_RAMPS['matrix-cascade'] ?? ' ｦｱｳｴｵｶｷｹｺｻｼｽｾｿ123456789:・."=*+-<>'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const streamLead = (Math.floor(x * 13.7 + time * 18)) % charRows
          const isLeader = Math.abs(y - streamLead) === 0
          const isTrail = y < streamLead && streamLead - y < 8
          const ch = charFor(lum, mramp)
          if (isLeader) {
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = '#00ff66'
            ctx.shadowBlur = 8
            ctx.fillText(ch, x * cellW, y * cellH)
            ctx.shadowBlur = 0
          } else if (isTrail) {
            const decay = 1 - (streamLead - y) / 8
            ctx.fillStyle = `rgba(0, 255, 90, ${0.4 + decay * 0.6})`
            ctx.fillText(ch, x * cellW, y * cellH)
          } else {
            const [r, g, b] = cellColor(cell, s)
            ctx.fillStyle = s.colorMode === 'mono' ? s.fg : rgbCss(Math.round(r * 0.25), Math.round(g * 1.1 + 30), Math.round(b * 0.25))
            ctx.fillText(ch, x * cellW, y * cellH)
          }
        }
      }
      break
    }
    case 'ascii-hex-dense': {
      const hexR = cellW * 0.85
      for (let y = 0; y < charRows; y++) {
        const rowOffset = (y % 2) * (cellW * 0.5)
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const cx = x * cellW + rowOffset + cellW * 0.5
          const cy = y * cellH + cellH * 0.5
          ctx.beginPath()
          for (let a = 0; a < 6; a++) {
            const ang = (a * Math.PI) / 3
            const px = cx + hexR * Math.cos(ang)
            const py = cy + hexR * Math.sin(ang)
            if (a === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fill()
          ctx.strokeStyle = s.bg
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }
      break
    }
    case 'ascii-woodcut': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-woodcut'] ?? " .'`^,:;!|/tfvzCLQ0#MW&8%B@"
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : '#1a1410'
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-radar-hud': {
      ctx.font = `${fs * 0.9}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const time = opts.time ?? 0
      const sweepAngle = (time * 2.5) % (Math.PI * 2)
      const cx = (charCols * cellW) / 2
      const cy = (charRows * cellH) / 2
      const mramp = MODE_RAMPS['ascii-radar-hud'] ?? ' .:+*#@'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const dx = x * cellW - cx
          const dy = y * cellH - cy
          const ang = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)
          let diff = (sweepAngle - ang + Math.PI * 2) % (Math.PI * 2)
          const radarFade = Math.max(0.2, 1 - diff / (Math.PI * 0.9))
          ctx.fillStyle = `rgba(0, 255, 120, ${Math.min(1, radarFade * (lum + 0.3))})`
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-emboss': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-emboss'] ?? ' .:-=+*#%@'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
          ctx.fillText(ch, x * cellW - 1, y * cellH - 1)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
          ctx.fillText(ch, x * cellW + 1, y * cellH + 1)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : '#c8c2b8'
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-gameboy-pocket': {
      const pocketPalette: [number, number, number][] = [
        [220, 222, 214],
        [160, 164, 152],
        [88, 92, 82],
        [24, 26, 22],
      ]
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const palIdx = Math.min(3, Math.max(0, 3 - Math.floor(lum * 4)))
          const [r, g, b] = pocketPalette[palIdx]
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW - 0.5, cellH - 0.5)
        }
      }
      break
    }
    case 'ascii-c64-petscii': {
      ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-c64-petscii'] ?? '  ▂▃▄▅▆▇█▌▎▏'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-cyber-hex': {
      ctx.font = `bold ${fs * 0.85}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-cyber-hex'] ?? ' 01_[]/\\<>=+-*#'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = s.colorMode === 'mono' ? s.fg : lum > 0.5 ? '#00f0ff' : '#0070a0'
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-moire': {
      const cx = (charCols * cellW) / 2
      const cy = (charRows * cellH) / 2
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const d1 = Math.sqrt((x * cellW - cx) ** 2 + (y * cellH - cy) ** 2)
          const d2 = Math.sqrt((x * cellW - cx * 0.7) ** 2 + (y * cellH - cy * 1.2) ** 2)
          const moire = (Math.sin(d1 * 0.15) + Math.sin(d2 * 0.18)) * 0.5
          const alpha = Math.min(1, Math.max(0, lum * 0.8 + moire * 0.4))
          ctx.fillStyle = rgbCss(r, g, b, alpha)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
    case 'ascii-stained-amber': {
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          const ar = Math.min(255, Math.round(r * 1.2 + 20))
          const ag = Math.min(255, Math.round(g * 1.05 + 10))
          const ab = Math.round(b * 0.55)
          ctx.fillStyle = rgbCss(ar, ag, ab)
          ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1)
        }
      }
      break
    }
    case 'ascii-chalkboard': {
      ctx.font = `${fs}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-chalkboard'] ?? " .'`^,:;!|/tf#"
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          const alpha = 0.3 + lum * 0.7
          ctx.fillStyle = `rgba(240, 244, 238, ${alpha})`
          ctx.fillText(ch, x * cellW, y * cellH)
        }
      }
      break
    }
    case 'ascii-synth-equalizer': {
      for (let x = 0; x < charCols; x++) {
        let colLum = 0
        for (let y = 0; y < charRows; y++) {
          colLum += grid.cells[y * grid.cols + x].lum
        }
        colLum /= charRows
        const activeRows = Math.round(colLum * charRows)
        for (let y = 0; y < charRows; y++) {
          const rowFromBot = charRows - 1 - y
          if (rowFromBot <= activeRows) {
            const frac = rowFromBot / charRows
            const col = frac > 0.8 ? [255, 40, 40] : frac > 0.5 ? [255, 200, 20] : [0, 240, 100]
            ctx.fillStyle = rgbCss(col[0], col[1], col[2])
            ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1)
          }
        }
      }
      break
    }
    case 'ascii-solari-board': {
      ctx.font = `bold ${fs * 0.88}px ui-monospace, Menlo, Consolas, monospace`
      ctx.textBaseline = 'top'
      const mramp = MODE_RAMPS['ascii-solari-board'] ?? ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const ch = charFor(lum, mramp)
          ctx.fillStyle = '#1c1c22'
          ctx.fillRect(x * cellW, y * cellH, cellW - 1, cellH - 1)
          ctx.fillStyle = '#0a0a0e'
          ctx.fillRect(x * cellW, y * cellH + cellH * 0.48, cellW - 1, 1)
          ctx.fillStyle = '#f0f0f5'
          ctx.fillText(ch, x * cellW + 1, y * cellH + 1)
        }
      }
      break
    }
    case 'ascii-led-ticker': {
      const radius = Math.min(cellW, cellH) * 0.42
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [r, g, b] = cellColor(cell, s)
          const cx = x * cellW + cellW * 0.5
          const cy = y * cellH + cellH * 0.5
          ctx.beginPath()
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          if (lum > 0.25) {
            ctx.fillStyle = s.colorMode === 'mono' ? s.fg : rgbCss(r, g, b)
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
          }
          ctx.fill()
        }
      }
      break
    }
    case 'ascii-thermal-ice': {
      const cryo = (t: number): [number, number, number] => {
        const cl = Math.max(0, Math.min(1, t))
        if (cl < 0.25) {
          const u = cl / 0.25
          return [Math.round(4 + u * 10), Math.round(8 + u * 25), Math.round(30 + u * 120)]
        } else if (cl < 0.6) {
          const u = (cl - 0.25) / 0.35
          return [Math.round(14 + u * 20), Math.round(33 + u * 180), Math.round(150 + u * 95)]
        } else if (cl < 0.85) {
          const u = (cl - 0.6) / 0.25
          return [Math.round(34 + u * 160), Math.round(213 + u * 35), 255]
        } else {
          const u = (cl - 0.85) / 0.15
          return [Math.round(194 + u * 61), Math.round(248 + u * 7), 255]
        }
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = grid.cells[y * grid.cols + x]
          const lum = effLum(cell, s)
          const [cr, cg, cb] = cryo(lum)
          ctx.fillStyle = rgbCss(cr, cg, cb)
          ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5)
        }
      }
      break
    }
    case 'ascii-particles': {
      renderPhysicsParticles(ctx, out, grid, s, opts, fs, cellW, cellH, charCols, charRows)
      break
    }
    default: {
      // warp / blur distort modes render as colour blocks (warp applied at sample time)
      let cells = grid.cells
      if (s.mode === 'motionblur') {
        cells = grid.cells.map((cell, i) => {
          const x = i % grid.cols
          let r = 0, g = 0, b = 0, n = 0
          for (let k = -3; k <= 3; k++) {
            const xx = Math.min(grid.cols - 1, Math.max(0, x + k))
            const c = grid.cells[Math.floor(i / grid.cols) * grid.cols + xx]
            r += c.r; g += c.g; b += c.b; n++
          }
          return { ...cell, r: r / n, g: g / n, b: b / n }
        })
      }
      for (let y = 0; y < charRows; y++) {
        for (let x = 0; x < charCols; x++) {
          const cell = cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          ctx.fillStyle = rgbCss(r, g, b)
          ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
        }
      }
      break
    }
  }
}

  if (s.focusMask?.enabled) {
    ctx.save()
    const cx = out.width / 2
    const cy = out.height / 2
    const maxDim = Math.max(out.width, out.height)
    const r = (s.focusMask.radius / 100) * (maxDim / 2)
    const feather = (s.focusMask.feather / 100) * r
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, r - feather), cx, cy, r + feather)
    if (!s.focusMask.invert) {
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, s.bg)
    } else {
      g.addColorStop(0, s.bg)
      g.addColorStop(1, 'rgba(0,0,0,0)')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.restore()
  }

  if (opts.stamps && opts.stamps.size > 0) {
    ctx.save()
    ctx.font = `bold ${fs}px ui-monospace, Menlo, Consolas, monospace`
    ctx.textBaseline = 'top'
    for (const [key, stamp] of opts.stamps.entries()) {
      const [cx, cy] = key.split(',').map(Number)
      ctx.fillStyle = stamp.color || (s.colorMode === 'mono' ? s.fg : '#00f0ff')
      ctx.fillText(stamp.char, cx * cellW, cy * cellH)
    }
    ctx.restore()
  }

  if (s.rotation !== 0 || s.flipH || s.flipV) {
    const tmp = document.createElement('canvas')
    tmp.width = out.width
    tmp.height = out.height
    tmp.getContext('2d')?.drawImage(out, 0, 0)
    const isRot90 = s.rotation === 90 || s.rotation === 270
    const finalW = isRot90 ? tmp.height : tmp.width
    const finalH = isRot90 ? tmp.width : tmp.height
    out.width = finalW
    out.height = finalH
    ctx.save()
    ctx.translate(finalW / 2, finalH / 2)
    if (s.rotation) ctx.rotate((s.rotation * Math.PI) / 180)
    ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1)
    ctx.drawImage(tmp, -tmp.width / 2, -tmp.height / 2)
    ctx.restore()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Dither mode: pixel-level ordered / error-diffusion / halftone dither. */
function renderDither(
  out: HTMLCanvasElement,
  grid: Grid,
  s: Settings,
  opts: RenderOpts,
): void {
  const palette = DITHER_PALETTES[s.ditherPalette].colors
  const scale = Math.max(1, s.ditherScale)
  const px = 4 * (opts.scale ?? 1) // base px per dither cell
  const w = grid.cols * scale
  const h = grid.rows * scale
  const small = document.createElement('canvas')
  small.width = w
  small.height = h
  const sctx = small.getContext('2d')
  if (!sctx) return
  const img = sctx.createImageData(w, h)
  const d = img.data
  const thr = s.threshold / 255

  if (s.ditherAlgo === 'halftone') {
    // draw dots directly on the output canvas
    out.width = grid.cols * px * scale
    out.height = grid.rows * px * scale
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = s.ditherPalette === 'original' ? '#ffffff' : s.bg
    ctx.fillRect(0, 0, out.width, out.height)
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y * grid.cols + x]
        const lum = effLum(cell, s)
        const [r, g, b] = s.ditherPalette === 'original' ? [0, 0, 0] : nearestPalette(cell.r, cell.g, cell.b, palette)
        const rad = (1 - lum) * (px * scale) * 0.55
        if (rad < 0.4) continue
        ctx.fillStyle = rgbCss(r, g, b)
        ctx.beginPath()
        ctx.arc(x * px * scale + (px * scale) / 2, y * px * scale + (px * scale) / 2, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  if (s.ditherAlgo === 'floyd') {
    // Floyd-Steinberg on RGB toward nearest palette colour
    const buf = new Float32Array(w * h * 3)
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y * grid.cols + x]
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const i = ((y * scale + sy) * w + x * scale + sx) * 3
            buf[i] = cell.r; buf[i + 1] = cell.g; buf[i + 2] = cell.b
          }
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3
        const old: [number, number, number] = [buf[i], buf[i + 1], buf[i + 2]]
        const nc = s.ditherPalette === 'original'
          ? (0.2126 * old[0] + 0.7152 * old[1] + 0.0722 * old[2] > thr * 255 ? [255, 255, 255] : [0, 0, 0]) as [number, number, number]
          : nearestPalette(old[0], old[1], old[2], palette)
        const di = (y * w + x) * 4
        d[di] = nc[0]
        d[di + 1] = nc[1]
        d[di + 2] = nc[2]
        d[di + 3] = 255
        const er: [number, number, number] = [old[0] - nc[0], old[1] - nc[1], old[2] - nc[2]]
        const spread = (xx: number, yy: number, f: number) => {
          if (xx < 0 || xx >= w || yy < 0 || yy >= h) return
          const j = (yy * w + xx) * 3
          buf[j] += er[0] * f; buf[j + 1] += er[1] * f; buf[j + 2] += er[2] * f
        }
        spread(x + 1, y, 7 / 16)
        spread(x - 1, y + 1, 3 / 16)
        spread(x, y + 1, 5 / 16)
        spread(x + 1, y + 1, 1 / 16)
      }
    }
  } else {
    // Bayer ordered dither
    const mat = s.ditherAlgo === 'bayer16' ? BAYER_4 : BAYER_8
    const m = mat.length
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = Math.min(grid.cols - 1, Math.floor(x / scale))
        const gy = Math.min(grid.rows - 1, Math.floor(y / scale))
        const cell = grid.cells[gy * grid.cols + gx]
        const t = mat[y % m][x % m]
        const lum = effLum(cell, s)
        let nc: [number, number, number]
        if (s.ditherPalette === 'original') {
          const on = lum > t * (thr * 2)
          nc = on ? [255, 255, 255] : [0, 0, 0]
        } else {
          // pick between the two nearest palette colours by threshold
          const sorted = [...palette].sort((a, b2) => {
            const da = (a[0] - cell.r) ** 2 + (a[1] - cell.g) ** 2 + (a[2] - cell.b) ** 2
            const db = (b2[0] - cell.r) ** 2 + (b2[1] - cell.g) ** 2 + (b2[2] - cell.b) ** 2
            return da - db
          })
          const dark = sorted[0]
          const bright = sorted[sorted.length - 1]
          const base = nearestPalette(cell.r, cell.g, cell.b, palette)
          nc = lum > t ? (bright === base ? base : bright) : (dark === base ? base : dark)
        }
        const i = (y * w + x) * 4
        d[i] = nc[0]; d[i + 1] = nc[1]; d[i + 2] = nc[2]; d[i + 3] = 255
      }
    }
  }
  sctx.putImageData(img, 0, 0)
  out.width = w * px
  out.height = h * px
  const ctx = out.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, out.width, out.height)
  if (opts.stamps && opts.stamps.size > 0) {
    ctx.save()
    ctx.font = `bold ${px}px ui-monospace, Menlo, Consolas, monospace`
    ctx.textBaseline = 'top'
    for (const [key, stamp] of opts.stamps.entries()) {
      const [cx, cy] = key.split(',').map(Number)
      ctx.fillStyle = stamp.color || (s.colorMode === 'mono' ? s.fg : '#00f0ff')
      ctx.fillText(stamp.char, cx * px, cy * px)
    }
    ctx.restore()
  }
}

/** Scalable Vector Graphics (SVG) export: resolution-independent crisp vector art. */
export function svgArt(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const isMono = s.colorMode === 'mono'
  const defColor = s.fg
  const esc = (c: string) => (c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : c)
  const fs = 14
  const charW = fs * 0.6
  const charH = fs

  let content = ''
  let width = 0
  let height = 0

  if (s.mode === 'braille' || s.mode === 'braille-dense') {
    const charCols = Math.floor(grid.cols / 2)
    const charRows = Math.floor(grid.rows / 4)
    width = Math.round(charCols * charW)
    height = Math.round(charRows * charH)
    const bit = (dx: number, dy: number) => {
      const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
      return 1 << map[dy][dx]
    }
    for (let cy = 0; cy < charRows; cy++) {
      const yPos = (cy + 1) * charH - 3
      for (let cx = 0; cx < charCols; cx++) {
        const stamped = stamps?.get(`${cx},${cy}`)
        if (stamped) {
          const col = stamped.color || defColor
          content += `<text x="${(cx * charW).toFixed(1)}" y="${yPos.toFixed(1)}" fill="${col}">${esc(stamped.char)}</text>\n`
          continue
        }
        let code = 0x2800
        let rSum = 0, gSum = 0, bSum = 0, count = 0
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const cell = grid.cells[(cy * 4 + dy) * grid.cols + (cx * 2 + dx)]
            if (cell && cell.lum > 0.45) {
              code += bit(dx, dy)
              const [r, g, b] = cellColor(cell, s)
              rSum += r; gSum += g; bSum += b; count++
            }
          }
        }
        if (code === 0x2800) continue
        const ch = String.fromCharCode(code)
        const col = isMono || count === 0
          ? defColor
          : rgbCss(Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count))
        content += `<text x="${(cx * charW).toFixed(1)}" y="${yPos.toFixed(1)}" fill="${col}">${esc(ch)}</text>\n`
      }
    }
  } else if (isTextMode(s.mode)) {
    width = Math.round(grid.cols * charW)
    height = Math.round(grid.rows * charH)
    const ramp = modeRamp(s.mode) ?? CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
    for (let y = 0; y < grid.rows; y++) {
      const yPos = (y + 1) * charH - 3
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y * grid.cols + x]
        const stamped = stamps?.get(`${x},${y}`)
        const ch = stamped ? stamped.char : charFor(effLum(cell, s), ramp)
        if (ch === ' ') continue
        const [r, g, b] = cellColor(cell, s)
        const col = stamped?.color || (isMono ? defColor : rgbCss(r, g, b))
        content += `<text x="${(x * charW).toFixed(1)}" y="${yPos.toFixed(1)}" fill="${col}">${esc(ch)}</text>\n`
      }
    }
  } else {
    width = Math.round(grid.cols * charW)
    height = Math.round(grid.rows * charH)
    for (let y = 0; y < grid.rows; y++) {
      const yPos = (y + 1) * charH - 3
      for (let x = 0; x < grid.cols; x++) {
        const stamped = stamps?.get(`${x},${y}`)
        if (stamped) {
          const col = stamped.color || defColor
          content += `<text x="${(x * charW).toFixed(1)}" y="${yPos.toFixed(1)}" fill="${col}">${esc(stamped.char)}</text>\n`
        } else {
          const cell = grid.cells[y * grid.cols + x]
          const [r, g, b] = cellColor(cell, s)
          content += `<rect x="${(x * charW).toFixed(1)}" y="${(y * charH).toFixed(1)}" width="${charW.toFixed(1)}" height="${charH.toFixed(1)}" fill="${rgbCss(r, g, b)}"/>\n`
        }
      }
    }
  }

  let layerContent = ''
  if (s.layers && s.layers.length > 0) {
    for (const l of s.layers) {
      if (!l.enabled || !l.text) continue
      const lx = l.x * width
      const ly = l.y * height
      const scaleFactor = Math.max(0.5, width / 800)
      const lfs = Math.max(10, Math.round(l.fontSize * scaleFactor))
      const rot = l.rotation ? ` transform="rotate(${l.rotation} ${lx} ${ly})"` : ''
      const fontFam = l.fontFamily === 'monospace' ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
        : l.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif'
        : l.fontFamily === 'impact' ? 'Impact, "Arial Black", sans-serif'
        : 'Inter, system-ui, -apple-system, sans-serif'
      const blendStyle = l.blendMode && l.blendMode !== 'normal' ? ` style="mix-blend-mode: ${l.blendMode};"` : ''

      layerContent += `<g opacity="${l.opacity ?? 1}"${rot}${blendStyle}>\n`
      const lines = l.text.split('\n')
      const padX = (l.bgPadding ?? 6) * 1.5 * scaleFactor
      const padY = (l.bgPadding ?? 6) * scaleFactor
      const bw = Math.max(...lines.map((line) => line.length)) * lfs * 0.62 + padX * 2
      const bh = lines.length * lfs * 1.3 + padY * 2
      const hasBg = l.bgColor && l.bgColor !== 'transparent'
      const hasBorder = l.border && l.borderColor

      if (hasBg || hasBorder) {
        const fillAttr = hasBg ? `fill="${l.bgColor}"` : 'fill="none"'
        const strokeAttr = hasBorder ? `stroke="${l.borderColor}" stroke-width="${Math.max(1, 1.5 * scaleFactor)}"` : ''
        layerContent += `  <rect x="${(lx - bw / 2).toFixed(1)}" y="${(ly - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${((l.bgRadius ?? 4) * scaleFactor).toFixed(1)}" ${fillAttr} ${strokeAttr} />\n`
      }

      lines.forEach((line, idx) => {
        const offset = (idx - (lines.length - 1) / 2) * lfs * 1.3
        layerContent += `  <text x="${lx.toFixed(1)}" y="${(ly + offset).toFixed(1)}" fill="${l.color}" text-anchor="middle" dominant-baseline="middle" font-family="${fontFam}" font-size="${lfs}px" font-weight="600">${esc(line)}</text>\n`
      })
      layerContent += `</g>\n`
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: ${fs}px; }
  </style>
  <rect width="100%" height="100%" fill="${s.bg}"/>
  ${content}
  ${layerContent}
</svg>`
}

/** 24-bit TrueColor ANSI escape code export for command-line terminals. */
export function ansiArt(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const isMono = s.colorMode === 'mono'
  const monoRgb = hexToRgb(s.fg)
  const lines: string[] = []

  if (s.mode === 'braille' || s.mode === 'braille-dense') {
    const charCols = Math.floor(grid.cols / 2)
    const charRows = Math.floor(grid.rows / 4)
    const bit = (dx: number, dy: number) => {
      const map = [[0, 3], [1, 4], [2, 5], [6, 7]]
      return 1 << map[dy][dx]
    }
    for (let cy = 0; cy < charRows; cy++) {
      let line = ''
      for (let cx = 0; cx < charCols; cx++) {
        const stamped = stamps?.get(`${cx},${cy}`)
        if (stamped) {
          const [r, g, b] = stamped.color ? hexToRgb(stamped.color) : monoRgb
          line += `\x1b[38;2;${r | 0};${g | 0};${b | 0}m${stamped.char}\x1b[0m`
          continue
        }
        let code = 0x2800
        let rSum = 0, gSum = 0, bSum = 0, count = 0
        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const cell = grid.cells[(cy * 4 + dy) * grid.cols + (cx * 2 + dx)]
            if (cell && cell.lum > 0.45) {
              code += bit(dx, dy)
              const [r, g, b] = cellColor(cell, s)
              rSum += r; gSum += g; bSum += b; count++
            }
          }
        }
        const ch = String.fromCharCode(code)
        const [r, g, b] = isMono || count === 0
          ? monoRgb
          : [Math.round(rSum / count), Math.round(gSum / count), Math.round(bSum / count)]
        line += `\x1b[38;2;${r | 0};${g | 0};${b | 0}m${ch}\x1b[0m`
      }
      lines.push(line)
    }
  } else if (isTextMode(s.mode)) {
    const ramp = modeRamp(s.mode) ?? CHAR_RAMPS[s.charSet]?.chars ?? CHAR_RAMPS.standard.chars
    for (let y = 0; y < grid.rows; y++) {
      let line = ''
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y * grid.cols + x]
        const stamped = stamps?.get(`${x},${y}`)
        const ch = stamped ? stamped.char : charFor(effLum(cell, s), ramp)
        const [r, g, b] = stamped?.color ? hexToRgb(stamped.color) : isMono ? monoRgb : cellColor(cell, s)
        line += `\x1b[38;2;${r | 0};${g | 0};${b | 0}m${ch}\x1b[0m`
      }
      lines.push(line)
    }
  } else {
    // Non-text graphics (pixel, lego, mosaic, dither, etc.) -> 24-bit TrueColor half-blocks ▀
    for (let y = 0; y < grid.rows; y += 2) {
      let line = ''
      for (let x = 0; x < grid.cols; x++) {
        const stampedTop = stamps?.get(`${x},${y}`)
        const stampedBot = stamps?.get(`${x},${y + 1}`)
        if (stampedTop) {
          const [r, g, b] = stampedTop.color ? hexToRgb(stampedTop.color) : monoRgb
          line += `\x1b[38;2;${r | 0};${g | 0};${b | 0}m${stampedTop.char}\x1b[0m`
          continue
        }
        const topCell = grid.cells[y * grid.cols + x]
        const botCell = y + 1 < grid.rows ? grid.cells[(y + 1) * grid.cols + x] : null
        const [tr, tg, tb] = isMono ? monoRgb : cellColor(topCell, s)
        if (botCell) {
          const [br, bg, bb] = stampedBot ? (stampedBot.color ? hexToRgb(stampedBot.color) : monoRgb) : isMono ? hexToRgb(s.bg) : cellColor(botCell, s)
          line += `\x1b[38;2;${tr | 0};${tg | 0};${tb | 0}m\x1b[48;2;${br | 0};${bg | 0};${bb | 0}m▀\x1b[0m`
        } else {
          line += `\x1b[38;2;${tr | 0};${tg | 0};${tb | 0}m▀\x1b[0m`
        }
      }
      lines.push(line)
    }
  }
  return lines.join('\n')
}

/** Markdown monospace codeblock export. */
export function markdownArt(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  return '```text\n' + textArt(grid, s, stamps) + '\n```'
}

/** JSON grid cell dump for creative developers and tool integrations. */
export function jsonGrid(grid: Grid, s: Settings): string {
  return JSON.stringify({
    cols: grid.cols,
    rows: grid.rows,
    aspect: grid.aspect,
    mode: s.mode,
    cells: grid.cells.map((c) => ({
      r: c.r, g: c.g, b: c.b, lum: Math.round(c.lum * 1000) / 1000,
    })),
  }, null, 2)
}

/** Render interactive overlay text layers onto a 2D canvas context. */
export function renderTextLayers(canvas: HTMLCanvasElement, layers?: TextLayer[]): void {
  if (!layers || layers.length === 0) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  for (const l of layers) {
    if (!l.enabled || !l.text) continue
    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, l.opacity ?? 1))

    if (l.blendMode === 'screen') ctx.globalCompositeOperation = 'screen'
    else if (l.blendMode === 'multiply') ctx.globalCompositeOperation = 'multiply'
    else if (l.blendMode === 'overlay') ctx.globalCompositeOperation = 'overlay'
    else if (l.blendMode === 'difference') ctx.globalCompositeOperation = 'difference'
    else if (l.blendMode === 'color-dodge') ctx.globalCompositeOperation = 'color-dodge'
    else ctx.globalCompositeOperation = 'source-over'

    const cx = l.x * canvas.width
    const cy = l.y * canvas.height
    ctx.translate(cx, cy)
    if (l.rotation) {
      ctx.rotate((l.rotation * Math.PI) / 180)
    }

    const fontFam = l.fontFamily === 'monospace' ? 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace'
      : l.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif'
      : l.fontFamily === 'impact' ? 'Impact, "Arial Black", sans-serif'
      : 'Inter, system-ui, -apple-system, sans-serif'

    const baseW = 800
    const scaleFactor = Math.max(0.5, canvas.width / baseW)
    const scaledFontSize = Math.round(l.fontSize * scaleFactor)
    ctx.font = `600 ${scaledFontSize}px ${fontFam}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    const lines = l.text.split('\n')
    const lineHeight = scaledFontSize * 1.3
    const totalHeight = lines.length * lineHeight

    let maxWidth = 0
    for (const line of lines) {
      const m = ctx.measureText(line)
      if (m.width > maxWidth) maxWidth = m.width
    }

    const padX = (l.bgPadding ?? 6) * 1.5 * scaleFactor
    const padY = (l.bgPadding ?? 6) * scaleFactor
    const radius = (l.bgRadius ?? 4) * scaleFactor
    const boxW = maxWidth + padX * 2
    const boxH = totalHeight + padY * 2
    const boxX = -boxW / 2
    const boxY = -boxH / 2

    // Background badge box
    if (l.bgColor && l.bgColor !== 'transparent') {
      ctx.fillStyle = l.bgColor
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius)
      } else {
        ctx.rect(boxX, boxY, boxW, boxH)
      }
      ctx.fill()
    }

    // Border
    if (l.border && l.borderColor) {
      ctx.strokeStyle = l.borderColor
      ctx.lineWidth = Math.max(1, 1.5 * scaleFactor)
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(boxX, boxY, boxW, boxH, radius)
      } else {
        ctx.rect(boxX, boxY, boxW, boxH)
      }
      ctx.stroke()
    }

    // Text lines
    ctx.fillStyle = l.color
    const startY = -totalHeight / 2 + lineHeight / 2
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, startY + i * lineHeight)
    }

    ctx.restore()
  }
}
