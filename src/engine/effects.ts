// Post-processing effects applied to the rendered output canvas.
// Original implementations written for ASCII Studio using standard Canvas 2D.

import type { FxId, Settings } from '../types'
import { mulberry32 } from './image'

let noiseCache: { w: number; h: number; seed: number; canvas: HTMLCanvasElement } | null = null

function noiseCanvas(w: number, h: number, seed: number): HTMLCanvasElement {
  if (noiseCache && noiseCache.w === w && noiseCache.h === h && noiseCache.seed === seed) {
    return noiseCache.canvas
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(w, h)
    const rnd = mulberry32(seed)
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.floor(rnd() * 255)
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }
  noiseCache = { w, h, seed, canvas: c }
  return c
}

function shiftChannels(canvas: HTMLCanvasElement, dxR: number, dxB: number, dxG = 0) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const src = ctx.getImageData(0, 0, w, h)
  const d = src.data
  const out = new Uint8ClampedArray(d.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const rX = Math.min(w - 1, Math.max(0, x + dxR))
      const bX = Math.min(w - 1, Math.max(0, x + dxB))
      const gX = Math.min(w - 1, Math.max(0, x + dxG))
      out[i] = d[(y * w + rX) * 4]
      out[i + 1] = d[(y * w + gX) * 4 + 1]
      out[i + 2] = d[(y * w + bX) * 4 + 2]
      out[i + 3] = d[i + 3]
    }
  }
  src.data.set(out)
  ctx.putImageData(src, 0, 0)
}

function barrel(canvas: HTMLCanvasElement, k: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const src = ctx.getImageData(0, 0, w, h)
  const d = src.data
  const out = new Uint8ClampedArray(d.length)
  const cx = w / 2
  const cy = h / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = (x - cx) / cx
      const ny = (y - cy) / cy
      const r2 = nx * nx + ny * ny
      const f = 1 + k * r2
      const sx = Math.min(w - 1, Math.max(0, Math.round(cx + nx * f * cx)))
      const sy = Math.min(h - 1, Math.max(0, Math.round(cy + ny * f * cy)))
      const si = (sy * w + sx) * 4
      const di = (y * w + x) * 4
      out[di] = d[si]; out[di + 1] = d[si + 1]; out[di + 2] = d[si + 2]; out[di + 3] = 255
    }
  }
  src.data.set(out)
  ctx.putImageData(src, 0, 0)
}

function convolve(canvas: HTMLCanvasElement, kernel: number[], divisor: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const src = ctx.getImageData(0, 0, w, h)
  const d = src.data
  const out = new Uint8ClampedArray(d.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const xx = Math.min(w - 1, Math.max(0, x + kx))
          const yy = Math.min(h - 1, Math.max(0, y + ky))
          const kv = kernel[(ky + 1) * 3 + (kx + 1)]
          const i = (yy * w + xx) * 4
          r += d[i] * kv; g += d[i + 1] * kv; b += d[i + 2] * kv
        }
      }
      const i = (y * w + x) * 4
      out[i] = Math.max(0, Math.min(255, r / divisor))
      out[i + 1] = Math.max(0, Math.min(255, g / divisor))
      out[i + 2] = Math.max(0, Math.min(255, b / divisor))
      out[i + 3] = d[i + 3]
    }
  }
  src.data.set(out)
  ctx.putImageData(src, 0, 0)
}

function blurCanvas(canvas: HTMLCanvasElement, radius: number, composite: GlobalCompositeOperation, alpha: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const tmp = document.createElement('canvas')
  tmp.width = canvas.width
  tmp.height = canvas.height
  const tctx = tmp.getContext('2d')
  if (!tctx) return
  tctx.filter = `blur(${radius}px)`
  tctx.drawImage(canvas, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = composite
  ctx.globalAlpha = alpha
  ctx.drawImage(tmp, 0, 0)
  ctx.restore()
}

function pixelMap(canvas: HTMLCanvasElement, fn: (r: number, g: number, b: number, a: number) => [number, number, number, number]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b, a] = fn(d[i], d[i + 1], d[i + 2], d[i + 3])
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a
  }
  ctx.putImageData(img, 0, 0)
}

function hexToRgbLocal(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Apply every enabled post effect in a fixed stack order. */
export function applyEffects(canvas: HTMLCanvasElement, s: Settings, time: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  const fx = s.fx
  const on = (id: FxId) => fx[id].enabled
  const inten = (id: FxId) => fx[id].intensity / 100

  if (on('pixelate')) {
    const f = Math.max(2, Math.round(2 + inten('pixelate') * 14))
    const tmp = document.createElement('canvas')
    tmp.width = Math.max(1, Math.round(w / f))
    tmp.height = Math.max(1, Math.round(h / f))
    const tctx = tmp.getContext('2d')
    if (tctx) {
      tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tmp, 0, 0, w, h)
      ctx.imageSmoothingEnabled = true
    }
  }

  if (on('chromatic')) shiftChannels(canvas, Math.round(inten('chromatic') * 4), -Math.round(inten('chromatic') * 4))
  if (on('rgbSplit')) shiftChannels(canvas, Math.round(inten('rgbSplit') * 8), -Math.round(inten('rgbSplit') * 8), Math.round(inten('rgbSplit') * 3))
  if (on('charChroma')) shiftChannels(canvas, Math.round(inten('charChroma') * 2), -Math.round(inten('charChroma') * 2))

  if (on('glitch')) {
    const rnd = mulberry32(s.glitchSeed + Math.floor(time * 8))
    const strips = 4 + Math.floor(inten('glitch') * 14)
    for (let i = 0; i < strips; i++) {
      const sy = Math.floor(rnd() * h)
      const sh = Math.max(2, Math.floor(rnd() * h * 0.06))
      const dx = Math.floor((rnd() - 0.5) * w * 0.25 * inten('glitch'))
      ctx.drawImage(canvas, 0, sy, w, sh, dx, sy, w, sh)
    }
    shiftChannels(canvas, Math.round(inten('glitch') * 6), -Math.round(inten('glitch') * 6))
  }

  if (on('crtCurve')) barrel(canvas, 0.12 * inten('crtCurve'))

  if (on('sharpen')) convolve(canvas, [0, -1, 0, -1, 5, -1, 0, -1, 0], 1)
  if (on('advBlur')) blurCanvas(canvas, 2 + inten('advBlur') * 10, 'source-over', 1)
  if (on('blur')) blurCanvas(canvas, 1 + inten('blur') * 9, 'source-over', 1)

  if (on('duotone')) {
    const dark = hexToRgbLocal(s.bg)
    const light = hexToRgbLocal(s.fg)
    pixelMap(canvas, (r, g, b, a) => {
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return [
        Math.round(dark[0] + (light[0] - dark[0]) * lum),
        Math.round(dark[1] + (light[1] - dark[1]) * lum),
        Math.round(dark[2] + (light[2] - dark[2]) * lum),
        a,
      ]
    })
  }

  if (on('posterize')) {
    const levels = 2 + Math.round(inten('posterize') * 6)
    const step = 255 / (levels - 1)
    pixelMap(canvas, (r, g, b, a) => [
      Math.round(Math.round(r / step) * step),
      Math.round(Math.round(g / step) * step),
      Math.round(Math.round(b / step) * step),
      a,
    ])
  }

  if (on('solarize')) {
    const thr = 255 - inten('solarize') * 1.9
    pixelMap(canvas, (r, g, b, a) => [
      r > thr ? 255 - r : r,
      g > thr ? 255 - g : g,
      b > thr ? 255 - b : b,
      a,
    ])
  }

  if (on('colorOverlay')) {
    const [tr, tg, tb] = hexToRgbLocal(s.tint)
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    ctx.globalAlpha = 0.15 + inten('colorOverlay') * 0.6
    ctx.fillStyle = `rgb(${tr},${tg},${tb})`
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (on('edgeGlow')) {
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    const tctx = tmp.getContext('2d')
    if (tctx) {
      tctx.drawImage(canvas, 0, 0)
      convolve(tmp, [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = 0.35 + inten('edgeGlow') * 0.5
      ctx.drawImage(tmp, 0, 0)
      ctx.restore()
      blurCanvas(canvas, 2 + inten('edgeGlow') * 4, 'screen', 0.25 + inten('edgeGlow') * 0.35)
    }
  }

  if (on('bloom')) blurCanvas(canvas, 6 + inten('bloom') * 10, 'screen', 0.35 + inten('bloom') * 0.45)
  if (on('charBloom')) blurCanvas(canvas, 3 + inten('charBloom') * 6, 'screen', 0.3 + inten('charBloom') * 0.5)

  if (on('halftone')) {
    const cell = 6
    const tw = Math.max(1, Math.round(w / cell))
    const th = Math.max(1, Math.round(h / cell))
    const tmp = document.createElement('canvas')
    tmp.width = tw
    tmp.height = th
    const tctx = tmp.getContext('2d')
    if (tctx) {
      tctx.drawImage(canvas, 0, 0, tw, th)
      const img = tctx.getImageData(0, 0, tw, th)
      const d = img.data
      ctx.save()
      ctx.globalAlpha = 0.25 + inten('halftone') * 0.55
      ctx.fillStyle = '#000'
      for (let y = 0; y < th; y++) {
        for (let x = 0; x < tw; x++) {
          const i = (y * tw + x) * 4
          const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
          const rad = (1 - lum) * (cell / 2) * 0.9
          if (rad < 0.4) continue
          ctx.beginPath()
          ctx.arc(x * cell + cell / 2, y * cell + cell / 2, rad, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }
  }

  if (on('scanLines')) {
    ctx.save()
    ctx.globalAlpha = 0.12 + inten('scanLines') * 0.4
    ctx.fillStyle = '#000'
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1)
    ctx.restore()
  }

  if (on('filmGrain') || on('noise')) {
    const a = on('filmGrain') ? inten('filmGrain') * 0.22 : 0
    const a2 = on('noise') ? inten('noise') * 0.35 : 0
    ctx.save()
    ctx.globalAlpha = Math.min(0.5, a + a2)
    ctx.globalCompositeOperation = 'overlay'
    ctx.drawImage(noiseCanvas(w, h, s.glitchSeed), 0, 0)
    ctx.restore()
  }

  if (on('filmDust')) {
    const rnd = mulberry32(s.glitchSeed + 99)
    ctx.save()
    ctx.globalAlpha = 0.15 + inten('filmDust') * 0.4
    ctx.fillStyle = '#fff'
    const n = Math.floor(inten('filmDust') * 120)
    for (let i = 0; i < n; i++) {
      const x = rnd() * w
      const y = rnd() * h
      const sz = rnd() < 0.85 ? 1 : 1 + rnd() * 3
      ctx.fillRect(x, y, sz, sz)
    }
    ctx.restore()
  }

  if (on('vignette')) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, `rgba(0,0,0,${0.15 + inten('vignette') * 0.65})`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  if (on('lensDistortion')) {
    const k = inten('lensDistortion') * 0.25
    barrel(canvas, k)
    shiftChannels(canvas, Math.round(inten('lensDistortion') * 4), -Math.round(inten('lensDistortion') * 4))
  }

  if (on('heatwave')) {
    const src = ctx.getImageData(0, 0, w, h)
    const d = src.data
    const out = new Uint8ClampedArray(d.length)
    const amp = 1 + inten('heatwave') * 7
    const freq = 0.04
    for (let y = 0; y < h; y++) {
      const shift = Math.round(Math.sin(y * freq + time * 3) * amp)
      for (let x = 0; x < w; x++) {
        const sx = Math.min(w - 1, Math.max(0, x + shift))
        const si = (y * w + sx) * 4
        const di = (y * w + x) * 4
        out[di] = d[si]; out[di + 1] = d[si + 1]; out[di + 2] = d[si + 2]; out[di + 3] = d[si + 3]
      }
    }
    src.data.set(out)
    ctx.putImageData(src, 0, 0)
  }

  if (on('scanlinesPro')) {
    ctx.save()
    ctx.globalAlpha = 0.15 + inten('scanlinesPro') * 0.45
    ctx.globalCompositeOperation = 'overlay'
    // RGB triad phosphor columns
    for (let x = 0; x < w; x += 3) {
      ctx.fillStyle = '#ff0000'; ctx.fillRect(x, 0, 1, h)
      if (x + 1 < w) { ctx.fillStyle = '#00ff00'; ctx.fillRect(x + 1, 0, 1, h) }
      if (x + 2 < w) { ctx.fillStyle = '#0000ff'; ctx.fillRect(x + 2, 0, 1, h) }
    }
    ctx.restore()
  }

  if (on('lightLeak')) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = 0.2 + inten('lightLeak') * 0.5
    const leakG = ctx.createLinearGradient(0, 0, w * 0.6, h * 0.4)
    leakG.addColorStop(0, 'rgba(255, 90, 0, 0.9)')
    leakG.addColorStop(0.35, 'rgba(255, 0, 110, 0.6)')
    leakG.addColorStop(0.7, 'rgba(120, 0, 255, 0.25)')
    leakG.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = leakG
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }

  if (on('glowDiffusion')) {
    blurCanvas(canvas, 14 + inten('glowDiffusion') * 18, 'screen', 0.22 + inten('glowDiffusion') * 0.38)
  }

  if (on('vhsTracking')) {
    const k = inten('vhsTracking')
    const trackY = Math.floor(((time * 45) % (h + 60)) - 30)
    const bandH = Math.max(8, Math.round(18 * k))
    const src = ctx.getImageData(0, 0, w, h)
    const d = src.data
    const rnd = mulberry32((s.glitchSeed + Math.floor(time * 12)) >>> 0)
    for (let by = 0; by < bandH; by++) {
      const cy = trackY + by
      if (cy < 0 || cy >= h) continue
      const jitter = Math.round((rnd() - 0.5) * 28 * k)
      for (let x = 0; x < w; x++) {
        const sx = Math.min(w - 1, Math.max(0, x + jitter))
        const si = (cy * w + sx) * 4
        const di = (cy * w + x) * 4
        d[di] = Math.min(255, d[si] + Math.floor(rnd() * 60 * k))
        d[di + 1] = Math.min(255, d[si + 1] + Math.floor(rnd() * 60 * k))
        d[di + 2] = Math.min(255, d[si + 2] + Math.floor(rnd() * 90 * k))
      }
    }
    // VHS noise snow line
    const snowY = Math.floor(((time * 120 + 40) % h))
    for (let sx = 0; sx < w; sx++) {
      if (rnd() > 0.4) continue
      const si = (snowY * w + sx) * 4
      d[si] = 230; d[si + 1] = 230; d[si + 2] = 255
    }
    ctx.putImageData(src, 0, 0)
  }
}
