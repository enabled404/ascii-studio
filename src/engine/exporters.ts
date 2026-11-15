// Exporters: PNG/JPG, animated GIF (gifenc), MP4/WebM (MediaRecorder),
// colour HTML, TXT, clipboard, share links and recipe codes.
// Original code written for ASCII Studio.

import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { sampleGrid, type Grid } from './image'
import type { Settings } from '../types'
import { renderGrid, textArt, htmlArt, svgArt, ansiArt, markdownArt, jsonGrid, sampleDims, renderTextLayers } from './render'
import { applyEffects } from './effects'

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function downloadText(text: string, filename: string, mime = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename)
}

/** Render the current grid to a fresh canvas at the requested scale, effects included. */
export function renderExportCanvas(
  grid: Grid,
  s: Settings,
  scale: number,
  time: number,
  src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null,
  maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  renderGrid(c, grid, s, { time, seed: s.glitchSeed, scale, src, stamps })
  applyEffects(c, s, time)
  if (maskCanvas && src) {
    const comp = document.createElement('canvas')
    comp.width = c.width
    comp.height = c.height
    const ctx = comp.getContext('2d')
    if (ctx) {
      ctx.drawImage(src, 0, 0, comp.width, comp.height)
      const cCtx = c.getContext('2d')
      if (cCtx) {
        cCtx.save()
        cCtx.globalCompositeOperation = maskInvert ? 'destination-out' : 'destination-in'
        cCtx.drawImage(maskCanvas, 0, 0, c.width, c.height)
        cCtx.restore()
      }
      ctx.drawImage(c, 0, 0)
      renderTextLayers(comp, s.layers)
      return comp
    }
  }
  renderTextLayers(c, s.layers)
  return c
}

export async function exportPNG(
  grid: Grid, s: Settings, scale: number, time: number, src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null, maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): Promise<Blob> {
  const c = renderExportCanvas(grid, s, scale, time, src, maskCanvas, maskInvert, stamps)
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })
}

export async function exportJPG(
  grid: Grid, s: Settings, scale: number, time: number, src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null, maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): Promise<Blob> {
  const c = renderExportCanvas(grid, s, scale, time, src, maskCanvas, maskInvert, stamps)
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('JPG encode failed'))), 'image/jpeg', 0.92)
  })
}

/** WebP export, smaller files than PNG at similar quality. */
export async function exportWebP(
  grid: Grid, s: Settings, scale: number, time: number, src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null, maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): Promise<Blob> {
  const c = renderExportCanvas(grid, s, scale, time, src, maskCanvas, maskInvert, stamps)
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('WebP encode failed'))), 'image/webp', 0.92)
  })
}

/** Render the art cover-fit onto an exact W×H canvas (wallpaper / phone sizes). */
export function exportSized(
  grid: Grid,
  s: Settings,
  w: number,
  h: number,
  time: number,
  src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null,
  maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): Promise<Blob> {
  const art = renderExportCanvas(grid, s, 1, time, src, maskCanvas, maskInvert, stamps)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.fillStyle = s.bg
  ctx.fillRect(0, 0, w, h)
  const scale = Math.max(w / art.width, h / art.height)
  const dw = art.width * scale
  const dh = art.height * scale
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(art, (w - dw) / 2, (h - dh) / 2, dw, dh)
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Sized export failed'))), 'image/png')
  })
}

/** Animated GIF: re-render the grid across `frames` time steps. */
export async function exportGIF(
  grid: Grid,
  s: Settings,
  frames: number,
  delayMs: number,
  src?: HTMLCanvasElement | null,
  maskCanvas?: HTMLCanvasElement | null,
  maskInvert = false,
  stamps?: Map<string, { char: string; color?: string }>,
): Promise<Blob> {
  const gif = GIFEncoder()
  for (let f = 0; f < frames; f++) {
    const c = renderExportCanvas(grid, s, 1, f / s.fps, src, maskCanvas, maskInvert, stamps)
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, c.width, c.height, { palette, delay: delayMs })
  }
  gif.finish()
  const bytes = gif.bytes()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' })
}

/** Record the live render canvas to video. Prefers MP4, falls back to WebM. */
export async function recordVideo(
  canvas: HTMLCanvasElement,
  seconds: number,
  fps: number,
  audioStream?: MediaStream | null,
): Promise<{ blob: Blob; ext: string }> {
  const candidates = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4',
    'video/webm;codecs="vp9,opus"',
    'video/webm;codecs="vp8,opus"',
    'video/webm',
  ]
  const mime = candidates.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m)
    } catch {
      return false
    }
  })
  if (!mime) throw new Error('No supported video recorder in this browser')
  const stream = canvas.captureStream(fps)
  if (audioStream) {
    for (const track of audioStream.getAudioTracks()) {
      stream.addTrack(track)
    }
  }
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const done = new Promise<void>((resolve) => {
    rec.onstop = () => resolve()
  })
  rec.start(200)
  await new Promise((r) => setTimeout(r, seconds * 1000))
  rec.stop()
  await done
  const ext = mime.includes('mp4') ? 'mp4' : 'webm'
  return { blob: new Blob(chunks, { type: mime }), ext }
}

export function exportTXT(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  return textArt(grid, s, stamps)
}

export function exportSVG(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  return svgArt(grid, s, stamps)
}

export function exportANSI(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  return ansiArt(grid, s, stamps)
}

export function exportMarkdown(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  return markdownArt(grid, s, stamps)
}

export function exportJSON(grid: Grid, s: Settings): string {
  return jsonGrid(grid, s)
}

export function exportHTML(grid: Grid, s: Settings, pngDataUrl?: string, stamps?: Map<string, { char: string; color?: string }>): string {
  if (pngDataUrl) {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ASCII Studio art</title>
<style>body{background:${s.bg};margin:0;display:grid;place-items:center;min-height:100vh}img{max-width:96vw;max-height:96vh;image-rendering:pixelated}</style>
</head><body><img src="${pngDataUrl}" alt="ASCII art"></body></html>`
  }
  return htmlArt(grid, s, stamps)
}

/** Generate self-contained React component snippet (<AsciiArt />) */
export function exportReactComponent(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const art = textArt(grid, s, stamps)
  const escaped = art.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
  const fg = s.colorMode === 'mono' ? s.fg : '#00f0ff'
  return `// Generated by ASCII Studio (https://asciipro.vercel.app)
import React from 'react'

export interface AsciiArtProps {
  fontSize?: number
  className?: string
  style?: React.CSSProperties
}

export function AsciiArt({ fontSize = 10, className, style }: AsciiArtProps) {
  return (
    <pre
      className={className}
      style={{
        fontFamily: 'ui-monospace, Menlo, Consolas, "Courier New", monospace',
        fontSize: \`\${fontSize}px\`,
        lineHeight: 1,
        letterSpacing: 0,
        backgroundColor: '${s.bg}',
        color: '${fg}',
        whiteSpace: 'pre',
        margin: 0,
        padding: '16px',
        borderRadius: '8px',
        overflowX: 'auto',
        userSelect: 'all',
        ...style,
      }}
    >
      {\`${escaped}\`}
    </pre>
  )
}

export default AsciiArt
`
}

/** Generate Web Component / HTML responsive embed snippet */
export function exportWebComponent(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const art = textArt(grid, s, stamps)
  const escHtml = art
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const fg = s.colorMode === 'mono' ? s.fg : '#00f0ff'
  return `<!-- Generated by ASCII Studio (https://asciipro.vercel.app) -->
<div class="ascii-art-container" style="background:${s.bg};padding:16px;border-radius:8px;overflow-x:auto;">
  <pre style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;line-height:1;letter-spacing:0;color:${fg};margin:0;white-space:pre;">${escHtml}</pre>
</div>
`
}

/** Generate Python CLI script with raw string literal */
export function exportPythonScript(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const art = textArt(grid, s, stamps)
  const safeArt = art.replace(/"""/g, '\\"\\"\\"')
  return `#!/usr/bin/env python3
# Generated by ASCII Studio (https://asciipro.vercel.app)

ASCII_ART = r"""
${safeArt}
"""

if __name__ == "__main__":
    print(ASCII_ART)
`
}

/** Generate C / C++ header string literal */
export function exportCHeader(grid: Grid, s: Settings, stamps?: Map<string, { char: string; color?: string }>): string {
  const art = textArt(grid, s, stamps)
  return `// Generated by ASCII Studio (https://asciipro.vercel.app)
#ifndef ASCII_STUDIO_ART_H
#define ASCII_STUDIO_ART_H

static const char ASCII_ART[] = R"ASCII_STUDIO(
${art}
)ASCII_STUDIO";

#endif // ASCII_STUDIO_ART_H
`
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}

export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
  if (!blob) throw new Error('Could not encode image')
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

// ---------- share links & recipe codes ----------

export function encodeSettings(s: Settings): string {
  const json = JSON.stringify(s)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSettings(code: string): Settings | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(b64)))
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as Settings
  } catch {
    return null
  }
}

export function shareLink(s: Settings): string {
  const url = new URL(window.location.href)
  url.hash = `s=${encodeSettings(s)}`
  return url.toString()
}

export function settingsFromHash(): Settings | null {
  const m = window.location.hash.match(/s=([A-Za-z0-9_-]+)/)
  if (!m) return null
  return decodeSettings(m[1])
}

// ---------- zero-dependency PKZIP archive generator ----------

const CRC32_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  CRC32_TABLE[i] = c
}

export function crc32(buf: Uint8Array): number {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    c = CRC32_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  }
  return (c ^ 0xFFFFFFFF) >>> 0
}

export interface ZipFileEntry {
  name: string
  data: Uint8Array
}

export function createZip(entries: ZipFileEntry[]): Blob {
  const parts: Uint8Array[] = []
  const cdEntries: Uint8Array[] = []
  let offset = 0
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const enc = new TextEncoder()

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name)
    const dataBytes = entry.data
    const checksum = crc32(dataBytes)

    // Local file header (30 bytes)
    const header = new Uint8Array(30)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true) // Bit 11: Language encoding flag (EFS) for UTF-8 filenames
    view.setUint16(8, 0, true) // 0 = stored (uncompressed)
    view.setUint16(10, dosTime, true)
    view.setUint16(12, dosDate, true)
    view.setUint32(14, checksum, true)
    view.setUint32(18, dataBytes.length, true)
    view.setUint32(22, dataBytes.length, true)
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true)

    // Central directory header (46 bytes)
    const cdHeader = new Uint8Array(46)
    const cdView = new DataView(cdHeader.buffer)
    cdView.setUint32(0, 0x02014b50, true)
    cdView.setUint16(4, 20, true)
    cdView.setUint16(6, 20, true)
    cdView.setUint16(8, 0x0800, true) // Bit 11: UTF-8 filenames
    cdView.setUint16(10, 0, true)
    cdView.setUint16(12, dosTime, true)
    cdView.setUint16(14, dosDate, true)
    cdView.setUint32(16, checksum, true)
    cdView.setUint32(20, dataBytes.length, true)
    cdView.setUint32(24, dataBytes.length, true)
    cdView.setUint16(28, nameBytes.length, true)
    cdView.setUint16(30, 0, true)
    cdView.setUint16(32, 0, true)
    cdView.setUint16(34, 0, true)
    cdView.setUint16(36, 0, true)
    cdView.setUint32(38, 0x81A40000, true) // -rw-r--r-- POSIX regular file permissions
    cdView.setUint32(42, offset, true)

    parts.push(header, nameBytes, dataBytes)
    cdEntries.push(cdHeader, nameBytes)

    offset += header.length + nameBytes.length + dataBytes.length
  }

  const cdOffset = offset
  let cdSize = 0
  for (const b of cdEntries) cdSize += b.length

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true)
  eocdView.setUint16(6, 0, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, cdOffset, true)
  eocdView.setUint16(20, 0, true)

  return new Blob([...parts, ...cdEntries, eocd] as unknown as BlobPart[], { type: 'application/zip' })
}

export type BatchFormat = 'png' | 'txt' | 'svg' | 'html'

export async function processBatchImagesToZip(
  files: File[],
  s: Settings,
  formats: BatchFormat[] = ['png', 'txt'],
  onProgress?: (index: number, total: number, fileName: string) => void,
): Promise<Blob> {
  const entries: ZipFileEntry[] = []
  const enc = new TextEncoder()
  const usedNames = new Set<string>()
  const activeFormats = formats.length > 0 ? formats : (['png', 'txt'] as BatchFormat[])

  const getUniqueName = (name: string): string => {
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
    const dot = name.lastIndexOf('.')
    const ext = dot !== -1 ? name.slice(dot) : ''
    const base = dot !== -1 ? name.slice(0, dot) : name
    let counter = 2
    while (usedNames.has(`${base}_${counter}${ext}`)) {
      counter++
    }
    const unique = `${base}_${counter}${ext}`
    usedNames.add(unique)
    return unique
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (onProgress) onProgress(i + 1, files.length, file.name)

    const baseName = (file.name.replace(/\.[^/.]+$/, '').trim()) || `image_${i + 1}`

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        const url = URL.createObjectURL(file)
        el.onload = () => {
          URL.revokeObjectURL(url)
          resolve(el)
        }
        el.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error(`Failed to load image: ${file.name}`))
        }
        el.src = url
      })

      const maxW = 960
      const fw = img.naturalWidth <= maxW ? img.naturalWidth : maxW
      const fh = img.naturalWidth <= maxW ? img.naturalHeight : Math.max(1, Math.round((img.naturalHeight * maxW) / img.naturalWidth))
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width = fw
      srcCanvas.height = fh
      const sctx = srcCanvas.getContext('2d')
      if (sctx) sctx.drawImage(img, 0, 0, fw, fh)

      const dims = sampleDims(s.cols, fw / fh, s.mode)
      const grid = sampleGrid(srcCanvas, fw, fh, dims.cols, dims.rows, {
        brightness: s.brightness,
        contrast: s.contrast,
        saturation: s.saturation,
        gamma: s.gamma,
        invert: s.invert,
      }, null, s.lightingBump ? 0.6 : 0)

      if (activeFormats.includes('png')) {
        const pngBlob = await exportPNG(grid, s, 1, 0, srcCanvas)
        const ab = await pngBlob.arrayBuffer()
        entries.push({ name: getUniqueName(`${baseName}.png`), data: new Uint8Array(ab) })
      }

      if (activeFormats.includes('txt')) {
        const txt = textArt(grid, s)
        entries.push({ name: getUniqueName(`${baseName}.txt`), data: enc.encode(txt) })
      }

      if (activeFormats.includes('svg')) {
        const svg = svgArt(grid, s)
        entries.push({ name: getUniqueName(`${baseName}.svg`), data: enc.encode(svg) })
      }

      if (activeFormats.includes('html')) {
        const html = htmlArt(grid, s)
        entries.push({ name: getUniqueName(`${baseName}.html`), data: enc.encode(html) })
      }
    } catch (err) {
      console.warn(`Failed to process batch image "${file.name}":`, err)
    }
  }

  if (entries.length === 0) {
    throw new Error('No valid images could be processed for batch export.')
  }

  return createZip(entries)
}
