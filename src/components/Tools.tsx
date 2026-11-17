// Mini-tools suite: Glitch Text, Text Faces, Blur Text, Censor Text,
// Gradient Shader maker, Dither animation builder. Original code.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { sampleGrid } from '../engine/image'
import { renderGrid, sampleDims, textArt } from '../engine/render'
import { copyTextToClipboard, downloadBlob } from '../engine/exporters'
import { cloneSettings, DEFAULT_SETTINGS, type DitherAlgo, type DitherPalette } from '../types'
import { CHAR_RAMPS, DITHER_PALETTES } from '../catalog'
import { SAMPLES } from '../samples'

type ToolId = 'glitch' | 'faces' | 'blur' | 'censor' | 'gradient' | 'dither-anim' | 'table' | 'watermark' | 'glyph'

const TOOL_TABS: { id: ToolId; label: string }[] = [
  { id: 'glyph', label: '8x8 Glyph Editor' },
  { id: 'glitch', label: 'Glitch Text' },
  { id: 'faces', label: 'Text Faces' },
  { id: 'blur', label: 'Blur Text' },
  { id: 'censor', label: 'Censor Text' },
  { id: 'gradient', label: 'Gradient Shader' },
  { id: 'dither-anim', label: 'Dither Animator' },
  { id: 'table', label: 'ASCII Table' },
  { id: 'watermark', label: 'Watermark Stamp' },
]

const KAOMOJI: string[] = [
  '( ͡° ͜ʖ ͡°)', '(╯°□°）╯︵ ┻━┻', '¯\\_(ツ)_/¯', '(づ｡◕‿‿◕｡)づ', '(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧',
  'ʕ•ᴥ•ʔ', '(ಥ﹏ಥ)', '(ง\'̀-\'́)ง', '(¬‿¬)', '(◕‿◕)', '( ͡ᵔ ͜ʖ ͡ᵔ )',
  '( ͡° ʖ̯ ͡°)', '(✿◠‿◠)', '(⌐■_■)', '♪┏(・o･)┛♪', '(☞ﾟヮﾟ)☞', '(╥﹏╥)',
  '(ノಠ益ಠ)ノ彡┻━┻', '(─‿‿─)', '( ͡◉ ͜ʖ ͡◉)', '(*・∀・*)', '(｡♥‿♥｡)',
  '(°ロ°)☝', '( ͡• ͜ʖ ͡• )', 'ヽ(´▽`)/', '(⊙_⊙)', '(づ￣ ³￣)づ', '( •_•)>⌐■-■',
  '(>_<)', '(>ᴗ<)', '(/¯-¯)/', '(>‿◠)✌', '(◕ᴥ◕)', '(๑˃̵ᴗ˂̵)',
  '(¬_¬)', '(•_•)', '(◠‿◠)', '(─‿‿─)✧', '(≧◡≦)', '(ʘ‿ʘ)', '(＾▽＾)',
  '(´• ω •`)', '(>_<)〆', '(o・ω・o)', '( ˘⌣˘ )', '(｡◕‿◕｡)', '(⊃｡•́‿•̀｡)⊃',
  '(╬ Ò﹏Ó)', '(ಠ_ಠ)', '(ᗒᗩᗕ)', '(❁´◡`❁)',
]

const ZALGO_MARKS = [
  '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307',
  '\u0308', '\u0309', '\u030a', '\u030b', '\u030c', '\u030d', '\u030e', '\u030f',
  '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315', '\u0316', '\u0317',
  '\u0318', '\u0319', '\u031a', '\u031b', '\u031c', '\u031d', '\u031e', '\u031f',
  '\u0320', '\u0321', '\u0322', '\u0323', '\u0324', '\u0325', '\u0326', '\u0327',
  '\u0328', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f',
  '\u0330', '\u0331', '\u0332', '\u0333', '\u0334', '\u0335', '\u0336', '\u0337',
  '\u0338', '\u0339', '\u033a', '\u033b', '\u033c', '\u033d', '\u033e', '\u033f',
  '\u0340', '\u0341', '\u0342', '\u0343', '\u0344', '\u0345', '\u0346', '\u0347',
  '\u0348', '\u0349', '\u034a', '\u034b', '\u034c', '\u034d', '\u034e', '\u034f',
  '\u0350', '\u0351', '\u0352', '\u0353', '\u0354', '\u0355', '\u0356', '\u0357',
  '\u0358', '\u0359', '\u035a', '\u035b', '\u035c', '\u035d', '\u035e', '\u035f',
  '\u0360', '\u0361', '\u0362', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367',
  '\u0368', '\u0369', '\u036a', '\u036b', '\u036c', '\u036d', '\u036e', '\u036f',
]

const LEET: Record<string, string> = {
  a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1', g: '9', b: '8', z: '2',
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

function glitchText(input: string, level: number): string {
  const rnd = (seed: number) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === ' ') {
      out += ch
      continue
    }
    // leet swap at high levels
    if (level > 55 && LEET[ch.toLowerCase()] && rnd(i * 3 + 1) < (level - 55) / 90) {
      out += LEET[ch.toLowerCase()]
      continue
    }
    out += ch
    const marks = Math.floor((level / 100) * 4 * rnd(i * 7 + 2)) + (level > 70 && rnd(i * 11 + 5) < 0.5 ? 1 : 0)
    for (let k = 0; k < marks; k++) {
      out += ZALGO_MARKS[Math.floor(rnd(i * 13 + k * 29 + 7) * ZALGO_MARKS.length)]
    }
  }
  return out
}

function blurText(input: string, level: number): string {
  const shades = [' ', '░', '▒', '▓', '█']
  let out = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === ' ' || ch === '\n') {
      out += ch
      continue
    }
    const r = hashStr(`${i}:${ch}`)
    const idx = Math.min(4, Math.floor(r * (level / 100) * 5) + (level > 60 ? 1 : 0))
    out += level < 12 ? ch : shades[idx]
  }
  return out
}

function censorText(input: string, mode: 'bars' | 'stars' | 'random', keepFirst: boolean): string {
  return input
    .split(/(\s+)/)
    .map((word) => {
      if (/^\s+$/.test(word) || word.length <= 2) return word
      const body = keepFirst ? word.slice(1) : word
      const head = keepFirst ? word[0] : ''
      if (mode === 'bars') return head + '█'.repeat(body.length)
      if (mode === 'stars') return head + '*'.repeat(body.length)
      const syms = ['#', '%', '@', '&', '$', '!']
      return head + body.split('').map((c, i) => syms[(c.charCodeAt(0) + i) % syms.length]).join('')
    })
    .join('')
}

const PRESET_GLYPHS: { id: string; label: string; rows: number[] }[] = [
  { id: 'alien', label: '👾 Invader', rows: [0x3c, 0x7e, 0xdb, 0xff, 0x24, 0x5a, 0xa5, 0x00] },
  { id: 'heart', label: '❤️ Heart', rows: [0x66, 0xff, 0xff, 0xff, 0x7e, 0x3c, 0x18, 0x00] },
  { id: 'skull', label: '💀 Skull', rows: [0x3c, 0x7e, 0xdb, 0xdb, 0xff, 0x56, 0x3c, 0x00] },
  { id: 'star', label: '⭐ Star', rows: [0x18, 0x18, 0xff, 0x7e, 0x3c, 0x5a, 0x81, 0x00] },
  { id: 'ghost', label: '👻 Ghost', rows: [0x3c, 0x7e, 0xdb, 0xff, 0xff, 0xff, 0xab, 0x92] },
  { id: 'sword', label: '⚔️ Sword', rows: [0x01, 0x03, 0x06, 0x0c, 0x38, 0x70, 0x60, 0x80] },
  { id: 'diamond', label: '💎 Diamond', rows: [0x18, 0x3c, 0x7e, 0xff, 0x7e, 0x3c, 0x18, 0x00] },
  { id: 'smiley', label: '🙂 Smiley', rows: [0x3c, 0x42, 0xa5, 0x81, 0xa5, 0x99, 0x42, 0x3c] },
  { id: 'pacman', label: '🟡 Pacman', rows: [0x3e, 0x7f, 0xfb, 0xf0, 0xe0, 0xf8, 0x7f, 0x3e] },
  { id: 'music', label: '🎵 Music', rows: [0x0f, 0x09, 0x09, 0x09, 0x79, 0x79, 0x00, 0x00] },
]

function rowsToGrid(rows: number[]): boolean[][] {
  const grid: boolean[][] = []
  for (let y = 0; y < 8; y++) {
    const row = rows[y] ?? 0
    const line: boolean[] = []
    for (let x = 0; x < 8; x++) {
      line.push((row & (1 << (7 - x))) !== 0)
    }
    grid.push(line)
  }
  return grid
}

function gridToRows(grid: boolean[][]): number[] {
  return grid.map((line) => {
    let row = 0
    for (let x = 0; x < 8; x++) {
      if (line[x]) row |= 1 << (7 - x)
    }
    return row
  })
}

function getBrailleChar(grid: boolean[][], startX: number, startY: number): string {
  const dotMap = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
  ]
  let code = 0x2800
  for (let dy = 0; dy < 4; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      if (grid[startY + dy]?.[startX + dx]) {
        code |= dotMap[dy][dx]
      }
    }
  }
  return String.fromCharCode(code)
}

export default function ToolsPanel({ toast, onApplyRamp }: { toast: (m: string) => void; onApplyRamp?: (ramp: string) => void }) {
  const [tool, setTool] = useState<ToolId>('glitch')
  const [text, setText] = useState('Hello, world!')
  const [level, setLevel] = useState(45)
  const [censorMode, setCensorMode] = useState<'bars' | 'stars' | 'random'>('bars')
  const [keepFirst, setKeepFirst] = useState(true)

  // 8x8 glyph font editor state
  const [glyphGrid, setGlyphGrid] = useState<boolean[][]>(() => rowsToGrid(PRESET_GLYPHS[0].rows))
  const [glyphCharInput, setGlyphCharInput] = useState('@')
  const [activePreset, setActivePreset] = useState('alien')

  const glyphStats = useMemo(() => {
    let filled = 0
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (glyphGrid[y][x]) filled++
      }
    }
    const density = Math.round((filled / 64) * 100)
    const rows = gridToRows(glyphGrid)
    const hex = rows.map((r) => r.toString(16).padStart(2, '0').toUpperCase()).join('')
    const cArray = `const uint8_t glyph[8] = { ${rows.map((r) => '0x' + r.toString(16).padStart(2, '0').toUpperCase()).join(', ')} };`
    const asciiArt = glyphGrid.map((r) => r.map((c) => (c ? '██' : '  ')).join('')).join('\n')
    const brailleTop = getBrailleChar(glyphGrid, 0, 0) + getBrailleChar(glyphGrid, 2, 0) + getBrailleChar(glyphGrid, 4, 0) + getBrailleChar(glyphGrid, 6, 0)
    const brailleBot = getBrailleChar(glyphGrid, 0, 4) + getBrailleChar(glyphGrid, 2, 4) + getBrailleChar(glyphGrid, 4, 4) + getBrailleChar(glyphGrid, 6, 4)
    const brailleArt = brailleTop + '\n' + brailleBot

    const brailleBlocks = [
      getBrailleChar(glyphGrid, 2, 2),
      getBrailleChar(glyphGrid, 2, 0),
      getBrailleChar(glyphGrid, 4, 0),
      getBrailleChar(glyphGrid, 2, 4),
      getBrailleChar(glyphGrid, 4, 4),
      getBrailleChar(glyphGrid, 0, 0),
      getBrailleChar(glyphGrid, 6, 0),
      getBrailleChar(glyphGrid, 0, 4),
      getBrailleChar(glyphGrid, 6, 4),
    ]
    let bestBraille = '⠀'
    let maxDots = 0
    for (const b of brailleBlocks) {
      const code = b.charCodeAt(0) - 0x2800
      let dots = 0
      for (let bit = 0; bit < 8; bit++) {
        if ((code & (1 << bit)) !== 0) dots++
      }
      if (dots > maxDots) {
        maxDots = dots
        bestBraille = b
      }
    }
    const primaryBraille = bestBraille !== '⠀' ? bestBraille : (brailleBlocks.find((b) => b !== '⠀') ?? '⠀')

    return { filled, density, hex, cArray, asciiArt, brailleArt, primaryBraille, rows }
  }, [glyphGrid])

  const shiftGlyph = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setGlyphGrid((prev) => {
      const next = prev.map((r) => [...r])
      if (dir === 'up') {
        const first = next.shift()
        if (first) next.push(first.fill(false))
      } else if (dir === 'down') {
        const last = next.pop()
        if (last) next.unshift(last.fill(false))
      } else if (dir === 'left') {
        for (let y = 0; y < 8; y++) {
          next[y].shift()
          next[y].push(false)
        }
      } else if (dir === 'right') {
        for (let y = 0; y < 8; y++) {
          next[y].pop()
          next[y].unshift(false)
        }
      }
      return next
    })
  }, [])

  const rasterizeChar = useCallback((ch: string) => {
    const c = document.createElement('canvas')
    c.width = 8
    c.height = 8
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 8, 8)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 8px monospace'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    const symbol = Array.from(ch)[0] || '@'
    ctx.fillText(symbol, 4, 4)
    const data = ctx.getImageData(0, 0, 8, 8).data
    const newGrid: boolean[][] = []
    for (let y = 0; y < 8; y++) {
      const line: boolean[] = []
      for (let x = 0; x < 8; x++) {
        const idx = (y * 8 + x) * 4
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        line.push(lum > 60 || data[idx + 3] > 60)
      }
      newGrid.push(line)
    }
    setGlyphGrid(newGrid)
    toast(`Rasterized character '${symbol}' into 8x8 bitmap`)
  }, [toast])

  const saveToCustomRamp = useCallback((applyNow = false) => {
    const symbol = glyphStats.primaryBraille !== '⠀' ? glyphStats.primaryBraille : '★'
    const current = CHAR_RAMPS.custom.chars
    let updated = current
    if (!current.includes(symbol)) {
      updated = current + symbol
      CHAR_RAMPS.custom.chars = updated
    }
    if (applyNow) {
      onApplyRamp?.(updated)
    }
    toast(`✅ Glyph '${symbol}' saved to Custom Ramp! Ramp: "${updated}"`)
  }, [glyphStats, onApplyRamp, toast])

  const downloadGlyphPng = useCallback((scale: number) => {
    const c = document.createElement('canvas')
    c.width = 8 * scale
    c.height = 8 * scale
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = glyphGrid[y][x] ? '#ffffff' : '#040406'
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
    c.toBlob((b) => {
      if (b) downloadBlob(b, `glyph-${scale * 8}x${scale * 8}.png`)
    })
    toast(`Downloaded glyph PNG (${scale * 8}×${scale * 8})`)
  }, [glyphGrid, toast])

  // table maker state
  const [tableInput, setTableInput] = useState('Feature, ASCII Studio, ASCII Magic\nFree Styles, 105+, 15\n4K Vector Export, Free, Pro $19/mo\n3D Multi-Light Studio, Yes, No\nSelective Masking Brush, Yes, No\nOffline Local Privacy, 100% Client, Cloud Upload\nSound-to-Art Reactivity, Yes (Web Audio), No')
  const [tableStyle, setTableStyle] = useState<'unicode' | 'double' | 'ascii' | 'markdown'>('unicode')

  const renderedTable = useMemo(() => {
    const rows = tableInput.trim().split('\n').map((r) => r.split(',').map((c) => c.trim()))
    if (rows.length === 0 || rows[0].length === 0) return ''
    const numCols = Math.max(...rows.map((r) => r.length))
    const colWidths = new Array(numCols).fill(0)
    for (const r of rows) {
      for (let c = 0; c < numCols; c++) {
        colWidths[c] = Math.max(colWidths[c], (r[c] ?? '').length)
      }
    }

    if (tableStyle === 'markdown') {
      const header = '| ' + rows[0].map((c, i) => c.padEnd(colWidths[i])).join(' | ') + ' |'
      const sep = '| ' + colWidths.map((w) => '-'.repeat(Math.max(3, w))).join(' | ') + ' |'
      const data = rows.slice(1).map((r) => '| ' + r.map((c, i) => (c ?? '').padEnd(colWidths[i])).join(' | ') + ' |')
      return [header, sep, ...data].join('\n')
    }

    let tl = '┌', tm = '┬', tr = '┐', ml = '├', mm = '┼', mr = '┤', bl = '└', bm = '┴', br = '┘', h = '─', v = '│'
    if (tableStyle === 'double') {
      tl = '╔'; tm = '╦'; tr = '╗'; ml = '╠'; mm = '╬'; mr = '╣'; bl = '╚'; bm = '╩'; br = '╝'; h = '═'; v = '║'
    } else if (tableStyle === 'ascii') {
      tl = '+'; tm = '+'; tr = '+'; ml = '+'; mm = '+'; mr = '+'; bl = '+'; bm = '+'; br = '+'; h = '-'; v = '|'
    }

    const top = tl + colWidths.map((w) => h.repeat(w + 2)).join(tm) + tr
    const mid = ml + colWidths.map((w) => h.repeat(w + 2)).join(mm) + mr
    const bot = bl + colWidths.map((w) => h.repeat(w + 2)).join(bm) + br

    const formatRow = (r: string[]) => v + colWidths.map((w, i) => ' ' + (r[i] ?? '').padEnd(w) + ' ').join(v) + v

    const lines = [top, formatRow(rows[0])]
    if (rows.length > 1) {
      lines.push(mid)
      for (let i = 1; i < rows.length; i++) {
        lines.push(formatRow(rows[i]))
      }
    }
    lines.push(bot)
    return lines.join('\n')
  }, [tableInput, tableStyle])

  // watermark state
  const [stampText, setStampText] = useState('ASCII STUDIO')
  const [stampArt, setStampArt] = useState('  .-""""-.\n /        \\\n|  O    O  |\n \\   ▼   /\n  `-...-`')
  const [stampPos, setStampPos] = useState<'br' | 'tr' | 'bl' | 'tl'>('br')

  const watermarkedArt = useMemo(() => {
    const lines = stampArt.split('\n')
    const stamp = `[ ${stampText} ]`
    if (stampPos === 'br') {
      const last = lines[lines.length - 1] ?? ''
      lines[lines.length - 1] = last.padEnd(Math.max(last.length, 30)) + ' ' + stamp
    } else if (stampPos === 'tr') {
      const first = lines[0] ?? ''
      lines[0] = first.padEnd(Math.max(first.length, 30)) + ' ' + stamp
    } else if (stampPos === 'bl') {
      lines[lines.length - 1] = stamp + ' ' + (lines[lines.length - 1] ?? '')
    } else {
      lines[0] = stamp + ' ' + (lines[0] ?? '')
    }
    return lines.join('\n')
  }, [stampText, stampArt, stampPos])

  // gradient shader state
  const [colA, setColA] = useState('#ff2a6d')
  const [colB, setColB] = useState('#05d9e8')
  const [angle, setAngle] = useState(135)
  const [gCols, setGCols] = useState(90)
  const gradCanvasRef = useRef<HTMLCanvasElement>(null)
  const gradText = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 480
    c.height = 300
    const ctx = c.getContext('2d')
    if (!ctx) return ''
    const rad = (angle * Math.PI) / 180
    const x0 = 240 - Math.cos(rad) * 300
    const y0 = 150 - Math.sin(rad) * 300
    const x1 = 240 + Math.cos(rad) * 300
    const y1 = 150 + Math.sin(rad) * 300
    const g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, colA)
    g.addColorStop(1, colB)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 480, 300)
    const s = cloneSettings(DEFAULT_SETTINGS)
    s.mode = 'characters'
    s.cols = gCols
    const dims = sampleDims(s.cols, 480 / 300, 'characters')
    const grid = sampleGrid(c, 480, 300, dims.cols, dims.rows, {
      brightness: 100, contrast: 100, saturation: 100, gamma: 1, invert: false,
    }, null, 0.6)
    return textArt(grid, s)
  }, [colA, colB, angle, gCols])

  useEffect(() => {
    const out = gradCanvasRef.current
    if (!out || tool !== 'gradient') return
    const c = document.createElement('canvas')
    c.width = 480
    c.height = 300
    const ctx = c.getContext('2d')
    if (!ctx) return
    const rad = (angle * Math.PI) / 180
    const g = ctx.createLinearGradient(240 - Math.cos(rad) * 300, 150 - Math.sin(rad) * 300, 240 + Math.cos(rad) * 300, 150 + Math.sin(rad) * 300)
    g.addColorStop(0, colA)
    g.addColorStop(1, colB)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 480, 300)
    const s = cloneSettings(DEFAULT_SETTINGS)
    s.mode = 'characters'
    s.cols = gCols
    const dims = sampleDims(s.cols, 480 / 300, 'characters')
    const grid = sampleGrid(c, 480, 300, dims.cols, dims.rows, {
      brightness: 100, contrast: 100, saturation: 100, gamma: 1, invert: false,
    }, null, 0.6)
    renderGrid(out, grid, s, { time: 0, seed: 7, src: c })
  }, [tool, colA, colB, angle, gCols])

  // dither animator state
  const [animSample, setAnimSample] = useState('tropical')
  const [animPalette, setAnimPalette] = useState<DitherPalette>('cyberpunk')
  const [animAlgo, setAnimAlgo] = useState<DitherAlgo>('bayer8')
  const [animFrames, setAnimFrames] = useState(8)
  const [animPlaying, setAnimPlaying] = useState(true)
  const [animExporting, setAnimExporting] = useState(false)
  const animCanvasRef = useRef<HTMLCanvasElement>(null)

  const renderAnimFrame = useCallback((frame: number) => {
    const out = animCanvasRef.current
    if (!out) return
    const sample = SAMPLES.find((x) => x.id === animSample) ?? SAMPLES[0]
    const src = sample.make()
    const s = cloneSettings(DEFAULT_SETTINGS)
    s.mode = 'dither'
    s.ditherPalette = animPalette
    s.ditherAlgo = animAlgo
    s.ditherScale = 2
    s.cols = 120
    s.threshold = Math.round(128 + 55 * Math.sin((frame / animFrames) * Math.PI * 2))
    const dims = sampleDims(s.cols, src.width / src.height, 'dither')
    const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
      brightness: 100, contrast: 110, saturation: 130, gamma: 1, invert: false,
    }, null, 0.6)
    renderGrid(out, grid, s, { time: 0, seed: 7, src })
  }, [animSample, animPalette, animAlgo, animFrames])

  useEffect(() => {
    if (tool !== 'dither-anim') return
    let raf = 0
    let last = 0
    let frame = 0
    const tick = (t: number) => {
      if (animPlaying && t - last > 120) {
        last = t
        renderAnimFrame(frame % animFrames)
        frame++
      } else if (!animPlaying) {
        renderAnimFrame(0)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tool, animPlaying, animFrames, renderAnimFrame])

  const exportAnimGif = useCallback(async () => {
    setAnimExporting(true)
    try {
      const sample = SAMPLES.find((x) => x.id === animSample) ?? SAMPLES[0]
      const src = sample.make()
      const s = cloneSettings(DEFAULT_SETTINGS)
      s.mode = 'dither'
      s.ditherPalette = animPalette
      s.ditherAlgo = animAlgo
      s.ditherScale = 2
      s.cols = 120
      const dims = sampleDims(s.cols, src.width / src.height, 'dither')
      const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
        brightness: 100, contrast: 110, saturation: 130, gamma: 1, invert: false,
      }, null, 0.6)
      const gif = GIFEncoder()
      for (let f = 0; f < animFrames; f++) {
        const fs = { ...s, threshold: Math.round(128 + 55 * Math.sin((f / animFrames) * Math.PI * 2)) }
        const c = document.createElement('canvas')
        renderGrid(c, grid, fs, { time: 0, seed: 7, src })
        const ctx = c.getContext('2d')
        if (!ctx) continue
        const data = ctx.getImageData(0, 0, c.width, c.height).data
        const palette = quantize(data, 256)
        const index = applyPalette(data, palette)
        gif.writeFrame(index, c.width, c.height, { palette, delay: 120 })
      }
      gif.finish()
      const bytes = gif.bytes()
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' }), 'dither-animation.gif')
      toast(`Dither animation exported (${animFrames} frames)`)
    } catch {
      toast('Dither animation export failed')
    } finally {
      setAnimExporting(false)
    }
  }, [animSample, animPalette, animAlgo, animFrames, toast])

  const glitched = useMemo(() => glitchText(text, level), [text, level])
  const blurred = useMemo(() => blurText(text, level), [text, level])
  const censored = useMemo(() => censorText(text, censorMode, keepFirst), [text, censorMode, keepFirst])
  const cssGradient = `linear-gradient(${angle}deg, ${colA}, ${colB})`

  const copyOut = useCallback(async (value: string, msg: string) => {
    await copyTextToClipboard(value)
    toast(msg)
  }, [toast])

  return (
    <div className="tools-panel">
      <div className="chip-row" role="tablist" aria-label="Mini tools">
        {TOOL_TABS.map((t) => (
          <button key={t.id} className={`chip ${tool === t.id ? 'active' : ''}`} onClick={() => setTool(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tool !== 'gradient' && tool !== 'dither-anim' && tool !== 'glyph' && (
        <label className="ctl">
          <span className="ctl-label">Your text</span>
          <textarea
            className="text-input"
            rows={3}
            value={text}
            maxLength={280}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type something…"
          />
        </label>
      )}

      {tool === 'glitch' && (
        <div>
          <label className="ctl">
            <span className="ctl-label">Chaos level <b>{level}%</b></span>
            <input type="range" min={0} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </label>
          <pre className="banner-out">{glitched}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(glitched, 'Glitched text copied')}>Copy glitched text</button>
          </div>
          <p className="muted">Zalgo marks plus leet swaps at high chaos. Paste it into a bio, a post, or a terminal.</p>
        </div>
      )}

      {tool === 'faces' && (
        <div>
          <div className="faces-grid">
            {KAOMOJI.map((f) => (
              <button key={f} className="face-btn" title="Click to copy" onClick={() => void copyOut(f, `Copied ${f}`)}>
                {f}
              </button>
            ))}
          </div>
          <p className="muted">Tap any face to copy it. Kaomoji work everywhere plain text does.</p>
        </div>
      )}

      {tool === 'blur' && (
        <div>
          <label className="ctl">
            <span className="ctl-label">Blur level <b>{level}%</b></span>
            <input type="range" min={0} max={100} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
          </label>
          <pre className="banner-out">{blurred}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(blurred, 'Blurred text copied')}>Copy blurred text</button>
          </div>
          <p className="muted">Softens text into block shading. Handy for spoilers and redacted previews.</p>
        </div>
      )}

      {tool === 'censor' && (
        <div>
          <div className="chip-row">
            {(['bars', 'stars', 'random'] as const).map((m) => (
              <button key={m} className={`chip ${censorMode === m ? 'active' : ''}`} onClick={() => setCensorMode(m)}>
                {m === 'bars' ? 'Black bars' : m === 'stars' ? 'Asterisks' : 'Random symbols'}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={keepFirst} onChange={(e) => setKeepFirst(e.target.checked)} />
            <span className="toggle-track" />
            <span className="toggle-label">Keep first letter<small>Leaves a hint of each word</small></span>
          </label>
          <pre className="banner-out">{censored}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(censored, 'Censored text copied')}>Copy censored text</button>
          </div>
          <p className="muted">Redacts words longer than two letters. Spaces and punctuation stay readable.</p>
        </div>
      )}

      {tool === 'gradient' && (
        <div>
          <div className="row-2">
            <label className="ctl">
              <span className="ctl-label">Colour A</span>
              <span className="color-row">
                <input type="color" value={colA} onChange={(e) => setColA(e.target.value)} />
                <code>{colA}</code>
              </span>
            </label>
            <label className="ctl">
              <span className="ctl-label">Colour B</span>
              <span className="color-row">
                <input type="color" value={colB} onChange={(e) => setColB(e.target.value)} />
                <code>{colB}</code>
              </span>
            </label>
          </div>
          <label className="ctl">
            <span className="ctl-label">Angle <b>{angle}°</b></span>
            <input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
          </label>
          <label className="ctl">
            <span className="ctl-label">Detail <b>{gCols} cols</b></span>
            <input type="range" min={40} max={180} step={5} value={gCols} onChange={(e) => setGCols(Number(e.target.value))} />
          </label>
          <canvas ref={gradCanvasRef} className="tool-canvas" />
          <pre className="banner-out tool-pre">{gradText}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(gradText, 'Gradient ASCII copied')}>Copy ASCII</button>
            <button className="btn" onClick={() => void copyOut(cssGradient, 'CSS gradient copied')}>Copy CSS gradient</button>
          </div>
          <p className="muted">A gradient turned into ASCII characters. Use the ASCII in a readme, or the CSS anywhere on the web.</p>
        </div>
      )}

      {tool === 'dither-anim' && (
        <div>
          <div className="row-2">
            <label className="ctl">
              <span className="ctl-label">Sample</span>
              <select value={animSample} onChange={(e) => setAnimSample(e.target.value)}>
                {SAMPLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="ctl">
              <span className="ctl-label">Palette</span>
              <select value={animPalette} onChange={(e) => setAnimPalette(e.target.value as DitherPalette)}>
                {Object.entries(DITHER_PALETTES).map(([v, p]) => (
                  <option key={v} value={v}>{p.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="row-2">
            <label className="ctl">
              <span className="ctl-label">Algorithm</span>
              <select value={animAlgo} onChange={(e) => setAnimAlgo(e.target.value as DitherAlgo)}>
                <option value="bayer8">Bayer 8x8</option>
                <option value="bayer16">Bayer 16x16</option>
                <option value="floyd">Floyd-Steinberg</option>
                <option value="halftone">Halftone dots</option>
              </select>
            </label>
            <label className="ctl">
              <span className="ctl-label">Frames <b>{animFrames}</b></span>
              <select value={animFrames} onChange={(e) => setAnimFrames(Number(e.target.value))}>
                <option value={4}>4</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={12}>12</option>
              </select>
            </label>
          </div>
          <canvas ref={animCanvasRef} className="tool-canvas" />
          <div className="btn-row">
            <button className="btn" onClick={() => setAnimPlaying((v) => !v)}>{animPlaying ? 'Pause' : 'Play'}</button>
            <button className="btn primary" disabled={animExporting} onClick={() => void exportAnimGif()}>
              {animExporting ? 'Exporting…' : 'Export animated GIF'}
            </button>
          </div>
          <p className="muted">The dither threshold breathes in a loop. Export it as a looping GIF for a post or a profile.</p>
        </div>
      )}

      {tool === 'table' && (
        <div>
          <label className="ctl">
            <span className="ctl-label">Table CSV data (comma-separated, lines for rows)</span>
            <textarea
              className="text-input"
              rows={5}
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              placeholder="Col 1, Col 2, Col 3..."
            />
          </label>
          <div className="chip-row">
            {(['unicode', 'double', 'ascii', 'markdown'] as const).map((st) => (
              <button key={st} className={`chip ${tableStyle === st ? 'active' : ''}`} onClick={() => setTableStyle(st)}>
                {st === 'unicode' ? 'Unicode Box ┌─┐' : st === 'double' ? 'Double Box ╔═╗' : st === 'ascii' ? 'ASCII +---+' : 'Markdown |---|'}
              </button>
            ))}
          </div>
          <pre className="banner-out tool-pre">{renderedTable}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(renderedTable, 'ASCII table copied')}>Copy table</button>
          </div>
          <p className="muted">Format raw CSV or comma-separated rows into neat, publication-ready Unicode or ASCII box tables.</p>
        </div>
      )}

      {tool === 'watermark' && (
        <div>
          <div className="row-2">
            <label className="ctl">
              <span className="ctl-label">Watermark / Signature text</span>
              <input className="text-input" type="text" value={stampText} onChange={(e) => setStampText(e.target.value)} />
            </label>
            <label className="ctl">
              <span className="ctl-label">Position</span>
              <select value={stampPos} onChange={(e) => setStampPos(e.target.value as 'br' | 'tr' | 'bl' | 'tl')}>
                <option value="br">Bottom Right</option>
                <option value="bl">Bottom Left</option>
                <option value="tr">Top Right</option>
                <option value="tl">Top Left</option>
              </select>
            </label>
          </div>
          <label className="ctl">
            <span className="ctl-label">Art to watermark</span>
            <textarea className="text-input" rows={6} value={stampArt} onChange={(e) => setStampArt(e.target.value)} />
          </label>
          <pre className="banner-out tool-pre">{watermarkedArt}</pre>
          <div className="btn-row">
            <button className="btn primary" onClick={() => void copyOut(watermarkedArt, 'Watermarked art copied')}>Copy watermarked art</button>
          </div>
          <p className="muted">Stamp your artist signature, handle, or license directly into ASCII art before sharing or exporting.</p>
        </div>
      )}

      {tool === 'glyph' && (
        <div className="glyph-editor-suite">
          <div className="chip-row">
            <span className="ctl-label" style={{ alignSelf: 'center', marginRight: 4 }}>Preset:</span>
            {PRESET_GLYPHS.map((p) => (
              <button
                key={p.id}
                className={`chip small ${activePreset === p.id ? 'active' : ''}`}
                onClick={() => {
                  setActivePreset(p.id)
                  setGlyphGrid(rowsToGrid(p.rows))
                  toast(`Loaded '${p.label}' preset`)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="glyph-workspace">
            <div className="glyph-grid-col">
              <div
                className="glyph-grid"
                onPointerLeave={() => {}}
                onPointerUp={() => {}}
              >
                {glyphGrid.map((row, y) => (
                  <div key={y} className="glyph-grid-row">
                    {row.map((active, x) => (
                      <button
                        key={`${x}-${y}`}
                        type="button"
                        className={`glyph-cell ${active ? 'active' : ''}`}
                        title={`Pixel [${x}, ${y}]: ${active ? 'Filled' : 'Empty'}`}
                        onClick={() => {
                          setGlyphGrid((prev) => prev.map((r, ry) => ry === y ? r.map((c, cx) => cx === x ? !c : c) : r))
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="glyph-toolbar">
                <div className="btn-group">
                  <button className="btn small" onClick={() => shiftGlyph('up')} title="Shift Up">▲</button>
                  <button className="btn small" onClick={() => shiftGlyph('down')} title="Shift Down">▼</button>
                  <button className="btn small" onClick={() => shiftGlyph('left')} title="Shift Left">◄</button>
                  <button className="btn small" onClick={() => shiftGlyph('right')} title="Shift Right">►</button>
                </div>
                <div className="btn-group">
                  <button className="btn small" onClick={() => setGlyphGrid((prev) => prev.map((r) => r.map((c) => !c)))} title="Invert bits">Invert</button>
                  <button className="btn small" onClick={() => setGlyphGrid((prev) => prev.map((r) => [...r].reverse()))} title="Flip horizontal">Flip H</button>
                  <button className="btn small" onClick={() => setGlyphGrid((prev) => [...prev].reverse())} title="Flip vertical">Flip V</button>
                </div>
                <div className="btn-group">
                  <button className="btn small" onClick={() => setGlyphGrid(Array.from({ length: 8 }, () => Array(8).fill(false)))} title="Clear all pixels">Clear</button>
                  <button className="btn small" onClick={() => setGlyphGrid(Array.from({ length: 8 }, () => Array(8).fill(true)))} title="Fill all pixels">Fill</button>
                </div>
              </div>
            </div>

            <div className="glyph-meta-col">
              <div className="glyph-preview-card">
                <div className="glyph-preview-header">
                  <span>Previews & Density</span>
                  <span className="glyph-density-tag">{glyphStats.filled}/64 px ({glyphStats.density}%)</span>
                </div>
                <div className="glyph-previews-row">
                  <div className="glyph-mini-box" title="1x Actual (8x8)">
                    <span className="mini-label">1x</span>
                    <div className="glyph-mini-canvas">
                      {glyphGrid.map((row, y) => (
                        <div key={y} className="glyph-mini-row">
                          {row.map((c, x) => (
                            <span key={x} className={`glyph-mini-pixel ${c ? 'on' : ''}`} />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="glyph-mini-box" title="Unicode Braille Symbol">
                    <span className="mini-label">Braille</span>
                    <span className="glyph-braille-sample">{glyphStats.primaryBraille}</span>
                  </div>
                  <div className="glyph-mini-box" title="Hex Byte">
                    <span className="mini-label">Hex</span>
                    <code className="glyph-hex-sample">{glyphStats.hex.slice(0, 4)}..</code>
                  </div>
                </div>
              </div>

              <div className="glyph-rasterize-card">
                <label className="ctl-label">Rasterize / Edit Any Monospace Char</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    maxLength={2}
                    value={glyphCharInput}
                    onChange={(e) => setGlyphCharInput(e.target.value)}
                    className="text-input"
                    style={{ width: 44, textAlign: 'center', fontFamily: 'var(--mono)' }}
                  />
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => rasterizeChar(glyphCharInput)}
                    title="Rasterize character to 8x8 bitmap grid"
                  >
                    Rasterize Char
                  </button>
                </div>
              </div>

              <div className="glyph-ramp-actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => saveToCustomRamp(false)}
                  title="Append this custom glyph to the Custom Character Ramp"
                >
                  💾 Save to Custom Ramp
                </button>
                <button
                  type="button"
                  className="btn highlight-btn"
                  onClick={() => saveToCustomRamp(true)}
                  title="Save and immediately apply Custom Ramp to active art"
                >
                  ⭐ Apply as Active Ramp
                </button>
              </div>
            </div>
          </div>

          <div className="glyph-code-exports">
            <div className="btn-row">
              <button className="btn small" onClick={() => void copyOut(glyphStats.primaryBraille, 'Braille Unicode symbol copied')}>Copy Braille Char</button>
              <button className="btn small" onClick={() => void copyOut(glyphStats.asciiArt, 'ASCII pixel art copied')}>Copy ASCII Art</button>
              <button className="btn small" onClick={() => void copyOut(glyphStats.cArray, 'C header byte array copied')}>Copy C Array</button>
              <button className="btn small" onClick={() => void copyOut(glyphStats.hex, 'Hex bitstring copied')}>Copy Hex</button>
              <button className="btn small" onClick={() => downloadGlyphPng(1)} title="Download 8x8 PNG">PNG · 8×8</button>
              <button className="btn small" onClick={() => downloadGlyphPng(8)} title="Download 64x64 PNG">PNG · 64×64</button>
            </div>
          </div>
          <p className="muted">Design custom 8×8 pixel characters or edit existing font glyphs. Saved characters integrate directly into your custom character ramps for unique ASCII textures.</p>
        </div>
      )}
    </div>
  )
}
