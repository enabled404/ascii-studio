// Interactive Multi-Modal Scientific & Creative Visualizer Engine for ASCII Studio.
// Audio Oscilloscope, 3D Acoustic Waterfall, Polar Frequency Radar, Peak Equalizer,
// Mandelbrot & Julia Fractals, 3D Lorenz Attractor Chaos, Conway's Game of Life,
// and 3D Parametric Surface Meshes (Torus, Klein Bottle, Mobius Strip, Resonant Wave).
// Original implementation written for ASCII Studio.

export type VisualizerMode =
  | 'oscilloscope'
  | 'waterfall'
  | 'radar'
  | 'equalizer'
  | 'mandelbrot'
  | 'julia'
  | 'lorenz'
  | 'life'
  | 'parametric'

export type ParametricShape = 'torus' | 'klein' | 'mobius' | 'ripple' | 'hyperboloid'
export type LifePattern = 'gosper' | 'pulsar' | 'pentadecathlon' | 'acorn' | 'gliders' | 'random'
export type ColormapId = 'matrix' | 'cyberpunk' | 'amber' | 'flir' | 'ice' | 'synthwave' | 'rainbow' | 'monochrome'

export interface VisualizerConfig {
  mode: VisualizerMode
  parametricShape: ParametricShape
  lifePattern: LifePattern
  cols: number // grid width (e.g. 80)
  rows: number // grid height (e.g. 40)
  colormap: ColormapId
  speed: number // 0.2 .. 3.0
  zoom: number // 0.1 .. 1000
  panX: number
  panY: number
  iterations: number // for fractals, 20 .. 300
  juliaC: [number, number]
  lorenzSigma: number
  lorenzRho: number
  lorenzBeta: number
  rotationX: number // 3D Euler angles
  rotationY: number
  rotationZ: number
  audioGain: number
  charRamp: string
}

export const DEFAULT_VISUALIZER_CONFIG: VisualizerConfig = {
  mode: 'oscilloscope',
  parametricShape: 'torus',
  lifePattern: 'gosper',
  cols: 80,
  rows: 40,
  colormap: 'cyberpunk',
  speed: 1.0,
  zoom: 1.0,
  panX: 0,
  panY: 0,
  iterations: 80,
  juliaC: [-0.7, 0.27015],
  lorenzSigma: 10,
  lorenzRho: 28,
  lorenzBeta: 8 / 3,
  rotationX: 0.5,
  rotationY: 0.6,
  rotationZ: 0.0,
  audioGain: 1.2,
  charRamp: ' .:-=+*#%@',
}

export interface RGB {
  r: number
  g: number
  b: number
}

// Colormap lookup palettes
export const COLORMAPS: Record<ColormapId, { name: string; stops: [number, RGB][] }> = {
  matrix: {
    name: 'Matrix Phosphor',
    stops: [
      [0.0, { r: 5, g: 20, b: 5 }],
      [0.2, { r: 10, g: 70, b: 15 }],
      [0.5, { r: 20, g: 180, b: 40 }],
      [0.8, { r: 80, g: 245, b: 110 }],
      [1.0, { r: 220, g: 255, b: 230 }],
    ],
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    stops: [
      [0.0, { r: 8, g: 5, b: 24 }],
      [0.25, { r: 120, g: 10, b: 160 }],
      [0.5, { r: 255, g: 0, b: 128 }],
      [0.75, { r: 0, g: 240, b: 255 }],
      [1.0, { r: 255, g: 255, b: 255 }],
    ],
  },
  amber: {
    name: 'Amber CRT',
    stops: [
      [0.0, { r: 20, g: 10, b: 0 }],
      [0.3, { r: 140, g: 60, b: 0 }],
      [0.6, { r: 240, g: 140, b: 0 }],
      [0.85, { r: 255, g: 195, b: 30 }],
      [1.0, { r: 255, g: 245, b: 200 }],
    ],
  },
  flir: {
    name: 'FLIR Ironbow',
    stops: [
      [0.0, { r: 10, g: 0, b: 30 }],
      [0.25, { r: 120, g: 15, b: 120 }],
      [0.5, { r: 220, g: 40, b: 30 }],
      [0.75, { r: 250, g: 180, b: 20 }],
      [1.0, { r: 255, g: 255, b: 255 }],
    ],
  },
  ice: {
    name: 'Glacial Ice',
    stops: [
      [0.0, { r: 2, g: 15, b: 35 }],
      [0.3, { r: 10, g: 60, b: 130 }],
      [0.6, { r: 60, g: 150, b: 230 }],
      [0.85, { r: 160, g: 220, b: 255 }],
      [1.0, { r: 255, g: 255, b: 255 }],
    ],
  },
  synthwave: {
    name: 'Synthwave Sunset',
    stops: [
      [0.0, { r: 20, g: 5, b: 40 }],
      [0.3, { r: 130, g: 20, b: 110 }],
      [0.6, { r: 240, g: 60, b: 90 }],
      [0.85, { r: 255, g: 170, b: 40 }],
      [1.0, { r: 255, g: 255, b: 200 }],
    ],
  },
  rainbow: {
    name: 'Spectral Rainbow',
    stops: [
      [0.0, { r: 255, g: 0, b: 0 }],
      [0.17, { r: 255, g: 150, b: 0 }],
      [0.33, { r: 255, g: 255, b: 0 }],
      [0.5, { r: 0, g: 255, b: 0 }],
      [0.67, { r: 0, g: 220, b: 255 }],
      [0.83, { r: 120, g: 0, b: 255 }],
      [1.0, { r: 255, g: 0, b: 180 }],
    ],
  },
  monochrome: {
    name: 'Monochrome White',
    stops: [
      [0.0, { r: 15, g: 15, b: 20 }],
      [0.5, { r: 140, g: 145, b: 155 }],
      [1.0, { r: 245, g: 250, b: 255 }],
    ],
  },
}

export function sampleColormap(id: ColormapId, t: number): RGB {
  const cmap = COLORMAPS[id] || COLORMAPS.cyberpunk
  const clamped = Math.max(0, Math.min(1, t))
  const stops = cmap.stops
  if (clamped <= stops[0][0]) return stops[0][1]
  if (clamped >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]

  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i]
    const s1 = stops[i + 1]
    if (clamped >= s0[0] && clamped <= s1[0]) {
      const frac = (clamped - s0[0]) / (s1[0] - s0[0])
      return {
        r: Math.round(s0[1].r + (s1[1].r - s0[1].r) * frac),
        g: Math.round(s0[1].g + (s1[1].g - s0[1].g) * frac),
        b: Math.round(s0[1].b + (s1[1].b - s0[1].b) * frac),
      }
    }
  }
  return stops[stops.length - 1][1]
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

export function rgbToAnsi(rgb: RGB): string {
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
}

// -------------------------------------------------------------
// Conway's Game of Life Cellular Automata State Engine
// -------------------------------------------------------------
export class GameOfLife {
  width: number
  height: number
  grid: Uint8Array
  nextGrid: Uint8Array
  age: Uint16Array

  constructor(w = 80, h = 40) {
    this.width = w
    this.height = h
    this.grid = new Uint8Array(w * h)
    this.nextGrid = new Uint8Array(w * h)
    this.age = new Uint16Array(w * h)
    this.loadPattern('gosper')
  }

  resize(w: number, h: number) {
    if (this.width === w && this.height === h) return
    const oldW = this.width
    const oldH = this.height
    const oldGrid = this.grid
    const oldAge = this.age
    this.width = w
    this.height = h
    this.grid = new Uint8Array(w * h)
    this.nextGrid = new Uint8Array(w * h)
    this.age = new Uint16Array(w * h)
    const copyW = Math.min(oldW, w)
    const copyH = Math.min(oldH, h)
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        this.grid[y * w + x] = oldGrid[y * oldW + x]
        this.age[y * w + x] = oldAge[y * oldW + x]
      }
    }
  }

  clear() {
    this.grid.fill(0)
    this.nextGrid.fill(0)
    this.age.fill(0)
  }

  toggleCell(x: number, y: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return
    const idx = y * this.width + x
    this.grid[idx] = this.grid[idx] ? 0 : 1
    this.age[idx] = this.grid[idx] ? 1 : 0
  }

  step() {
    const w = this.width
    const h = this.height
    const g = this.grid
    const next = this.nextGrid
    const age = this.age

    for (let y = 0; y < h; y++) {
      const yUp = ((y - 1 + h) % h) * w
      const yCur = y * w
      const yDn = ((y + 1) % h) * w

      for (let x = 0; x < w; x++) {
        const xL = (x - 1 + w) % w
        const xR = (x + 1) % w

        const neighbors =
          g[yUp + xL] + g[yUp + x] + g[yUp + xR] +
          g[yCur + xL] +            g[yCur + xR] +
          g[yDn + xL] + g[yDn + x] + g[yDn + xR]

        const idx = yCur + x
        const alive = g[idx]

        if (alive) {
          if (neighbors === 2 || neighbors === 3) {
            next[idx] = 1
            age[idx] = Math.min(65535, age[idx] + 1)
          } else {
            next[idx] = 0
            age[idx] = 0
          }
        } else {
          if (neighbors === 3) {
            next[idx] = 1
            age[idx] = 1
          } else {
            next[idx] = 0
            age[idx] = 0
          }
        }
      }
    }

    this.grid.set(next)
  }

  loadPattern(pattern: LifePattern) {
    this.clear()
    const cx = Math.floor(this.width / 2)
    const cy = Math.floor(this.height / 2)

    if (pattern === 'random') {
      for (let i = 0; i < this.grid.length; i++) {
        if (Math.random() < 0.22) {
          this.grid[i] = 1
          this.age[i] = 1
        }
      }
      return
    }

    if (pattern === 'gosper') {
      const gun: [number, number][] = [
        [1, 5], [2, 5], [1, 6], [2, 6],
        [11, 5], [11, 6], [11, 7], [12, 4], [12, 8], [13, 3], [13, 9], [14, 3], [14, 9],
        [15, 6], [16, 4], [16, 8], [17, 5], [17, 6], [17, 7], [18, 6],
        [21, 3], [21, 4], [21, 5], [22, 3], [22, 4], [22, 5], [23, 2], [23, 6],
        [25, 1], [25, 2], [25, 6], [25, 7],
        [35, 3], [35, 4], [36, 3], [36, 4],
      ]
      const ox = Math.max(2, cx - 18)
      const oy = Math.max(2, cy - 6)
      gun.forEach(([gx, gy]) => {
        const x = ox + gx
        const y = oy + gy
        if (x < this.width && y < this.height) {
          this.grid[y * this.width + x] = 1
          this.age[y * this.width + x] = 1
        }
      })
      return
    }

    if (pattern === 'pulsar') {
      const offsets = [
        [-6, -4], [-6, -3], [-6, -2], [-6, 2], [-6, 3], [-6, 4],
        [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 4],
        [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 4],
        [6, -4], [6, -3], [6, -2], [6, 2], [6, 3], [6, 4],
        [-4, -6], [-3, -6], [-2, -6], [2, -6], [3, -6], [4, -6],
        [-4, -1], [-3, -1], [-2, -1], [2, -1], [3, -1], [4, -1],
        [-4, 1], [-3, 1], [-2, 1], [2, 1], [3, 1], [4, 1],
        [-4, 6], [-3, 6], [-2, 6], [2, 6], [3, 6], [4, 6],
      ]
      offsets.forEach(([dx, dy]) => {
        const x = (cx + dx + this.width) % this.width
        const y = (cy + dy + this.height) % this.height
        this.grid[y * this.width + x] = 1
        this.age[y * this.width + x] = 1
      })
      return
    }

    if (pattern === 'pentadecathlon') {
      const pts = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5]
      pts.forEach((dx) => {
        const x = (cx + dx + this.width) % this.width
        const y = cy % this.height
        this.grid[y * this.width + x] = 1
        this.age[y * this.width + x] = 1
      })
      return
    }

    if (pattern === 'acorn') {
      const pts: [number, number][] = [
        [1, 0], [3, 1], [0, 2], [1, 2], [4, 2], [5, 2], [6, 2],
      ]
      pts.forEach(([dx, dy]) => {
        const x = (cx + dx - 3 + this.width) % this.width
        const y = (cy + dy - 1 + this.height) % this.height
        this.grid[y * this.width + x] = 1
        this.age[y * this.width + x] = 1
      })
      return
    }

    if (pattern === 'gliders') {
      const gliders = [
        { ox: cx - 15, oy: cy - 10, dx: 1, dy: 1 },
        { ox: cx + 10, oy: cy - 8, dx: -1, dy: 1 },
        { ox: cx - 12, oy: cy + 6, dx: 1, dy: -1 },
        { ox: cx + 12, oy: cy + 8, dx: -1, dy: -1 },
      ]
      gliders.forEach(({ ox, oy }) => {
        const glider: [number, number][] = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]]
        glider.forEach(([gx, gy]) => {
          const x = (ox + gx + this.width) % this.width
          const y = (oy + gy + this.height) % this.height
          this.grid[y * this.width + x] = 1
          this.age[y * this.width + x] = 1
        })
      })
    }
  }
}

// -------------------------------------------------------------
// 3D Lorenz Attractor Simulation Engine
// -------------------------------------------------------------
export interface Point3D {
  x: number
  y: number
  z: number
  speed: number
}

export class LorenzAttractor {
  points: Point3D[] = []
  maxPoints = 2400
  x = 0.1
  y = 0
  z = 0

  constructor() {
    this.reset()
  }

  reset() {
    this.x = 0.1
    this.y = 0.0
    this.z = 0.0
    this.points = []
    // Pre-warm so attractor is immediately visible
    for (let i = 0; i < 400; i++) {
      this.step(10, 28, 8 / 3, 0.008)
    }
  }

  step(sigma = 10, rho = 28, beta = 8 / 3, dt = 0.008) {
    // Runge-Kutta 4th Order Integration (RK4)
    const deriv = (px: number, py: number, pz: number): [number, number, number] => {
      return [
        sigma * (py - px),
        px * (rho - pz) - py,
        px * py - beta * pz,
      ]
    }

    const [dx1, dy1, dz1] = deriv(this.x, this.y, this.z)
    const [dx2, dy2, dz2] = deriv(this.x + dx1 * dt * 0.5, this.y + dy1 * dt * 0.5, this.z + dz1 * dt * 0.5)
    const [dx3, dy3, dz3] = deriv(this.x + dx2 * dt * 0.5, this.y + dy2 * dt * 0.5, this.z + dz2 * dt * 0.5)
    const [dx4, dy4, dz4] = deriv(this.x + dx3 * dt, this.y + dy3 * dt, this.z + dz3 * dt)

    const vx = (dx1 + 2 * dx2 + 2 * dx3 + dx4) / 6
    const vy = (dy1 + 2 * dy2 + 2 * dy3 + dy4) / 6
    const vz = (dz1 + 2 * dz2 + 2 * dz3 + dz4) / 6

    this.x += vx * dt
    this.y += vy * dt
    this.z += vz * dt

    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
    this.points.push({ x: this.x, y: this.y, z: this.z, speed })
    if (this.points.length > this.maxPoints) {
      this.points.shift()
    }
  }
}

// -------------------------------------------------------------
// 3D Matrix Math & Projections
// -------------------------------------------------------------
export function rotate3D(x: number, y: number, z: number, rx: number, ry: number, rz: number): [number, number, number] {
  // Rotate X
  const cosX = Math.cos(rx)
  const sinX = Math.sin(rx)
  const y1 = y * cosX - z * sinX
  const z1 = y * sinX + z * cosX

  // Rotate Y
  const cosY = Math.cos(ry)
  const sinY = Math.sin(ry)
  const x2 = x * cosY + z1 * sinY
  const z2 = -x * sinY + z1 * cosY

  // Rotate Z
  const cosZ = Math.cos(rz)
  const sinZ = Math.sin(rz)
  const x3 = x2 * cosZ - y1 * sinZ
  const y3 = x2 * sinZ + y1 * cosZ

  return [x3, y3, z2]
}

// -------------------------------------------------------------
// 3D Parametric Surfaces Generator
// -------------------------------------------------------------
export interface MeshPoint {
  x: number
  y: number
  z: number
  u: number
  v: number
  nx: number
  ny: number
  nz: number
}

export function generateParametricMesh(shape: ParametricShape, uSteps = 40, vSteps = 24, time = 0): MeshPoint[] {
  const points: MeshPoint[] = []

  for (let i = 0; i < uSteps; i++) {
    const u = (i / uSteps) * Math.PI * 2
    for (let j = 0; j < vSteps; j++) {
      const v = (j / vSteps) * Math.PI * 2
      let x = 0
      let y = 0
      let z = 0
      let nx = 0
      let ny = 0
      let nz = 1

      if (shape === 'torus') {
        const R = 1.0
        const r = 0.4
        x = (R + r * Math.cos(v)) * Math.cos(u)
        y = (R + r * Math.cos(v)) * Math.sin(u)
        z = r * Math.sin(v)
        nx = Math.cos(v) * Math.cos(u)
        ny = Math.cos(v) * Math.sin(u)
        nz = Math.sin(v)
      } else if (shape === 'klein') {
        // Figure-8 Klein bottle immersion
        const r = 0.5
        x = (r + Math.cos(u * 0.5) * Math.sin(v) - Math.sin(u * 0.5) * Math.sin(2 * v)) * Math.cos(u)
        y = (r + Math.cos(u * 0.5) * Math.sin(v) - Math.sin(u * 0.5) * Math.sin(2 * v)) * Math.sin(u)
        z = Math.sin(u * 0.5) * Math.sin(v) + Math.cos(u * 0.5) * Math.sin(2 * v)
        nx = Math.cos(u) * Math.cos(v)
        ny = Math.sin(u) * Math.cos(v)
        nz = Math.sin(v)
      } else if (shape === 'mobius') {
        const s = (j / vSteps) * 2 - 1 // -1 .. 1
        x = (1 + (s / 2) * Math.cos(u / 2)) * Math.cos(u)
        y = (1 + (s / 2) * Math.cos(u / 2)) * Math.sin(u)
        z = (s / 2) * Math.sin(u / 2)
        nx = -Math.sin(u / 2) * Math.cos(u)
        ny = -Math.sin(u / 2) * Math.sin(u)
        nz = Math.cos(u / 2)
      } else if (shape === 'ripple') {
        // Resonant wave surface
        const sx = (i / uSteps) * 2.4 - 1.2
        const sy = (j / vSteps) * 2.4 - 1.2
        const dist = Math.sqrt(sx * sx + sy * sy)
        x = sx
        y = sy
        z = Math.sin(dist * 7 - time * 3) * 0.35 * Math.exp(-dist * 0.8)
        nx = -Math.cos(dist * 7 - time * 3) * sx * 0.5
        ny = -Math.cos(dist * 7 - time * 3) * sy * 0.5
        nz = 1
      } else if (shape === 'hyperboloid') {
        const h = (j / vSteps) * 2 - 1 // -1 .. 1
        const r = Math.sqrt(1 + h * h) * 0.6
        x = r * Math.cos(u)
        y = r * Math.sin(u)
        z = h * 0.9
        nx = Math.cos(u)
        ny = Math.sin(u)
        nz = -h * 0.6
      }

      points.push({ x, y, z, u, v, nx, ny, nz })
    }
  }

  return points
}

// -------------------------------------------------------------
// Historical Waterfall Ring Buffer
// -------------------------------------------------------------
export class WaterfallBuffer {
  maxSlices: number
  slices: Float32Array[] = []

  constructor(maxSlices = 48) {
    this.maxSlices = maxSlices
  }

  push(fft: Uint8Array) {
    const bins = 64
    const slice = new Float32Array(bins)
    const step = Math.max(1, Math.floor(fft.length / bins))
    for (let i = 0; i < bins; i++) {
      let sum = 0
      for (let s = 0; s < step; s++) {
        sum += fft[Math.min(fft.length - 1, i * step + s)] || 0
      }
      slice[i] = (sum / step) / 255
    }
    this.slices.unshift(slice)
    if (this.slices.length > this.maxSlices) {
      this.slices.pop()
    }
  }
}

// -------------------------------------------------------------
// Peak Equalizer Engine with Gravity Falloff
// -------------------------------------------------------------
export class EqualizerEngine {
  bands: number
  current: Float32Array
  peaks: Float32Array
  peakHold: Int16Array

  constructor(bands = 32) {
    this.bands = bands
    this.current = new Float32Array(bands)
    this.peaks = new Float32Array(bands)
    this.peakHold = new Int16Array(bands)
  }

  update(fft: Uint8Array) {
    const b = this.bands
    const len = fft.length
    for (let i = 0; i < b; i++) {
      // Logarithmic / perceptual frequency bin distribution
      const start = Math.floor(Math.pow(i / b, 1.6) * len * 0.8)
      const end = Math.max(start + 1, Math.floor(Math.pow((i + 1) / b, 1.6) * len * 0.8))
      let sum = 0
      let count = 0
      for (let k = start; k < end && k < len; k++) {
        sum += fft[k]
        count++
      }
      const raw = count > 0 ? (sum / count) / 255 : 0
      // Attack and decay
      if (raw > this.current[i]) {
        this.current[i] = raw // fast attack
      } else {
        this.current[i] = Math.max(0, this.current[i] - 0.04) // smooth decay
      }

      // Peak hold logic
      if (this.current[i] >= this.peaks[i]) {
        this.peaks[i] = this.current[i]
        this.peakHold[i] = 18 // hold for 18 frames
      } else {
        if (this.peakHold[i] > 0) {
          this.peakHold[i]--
        } else {
          this.peaks[i] = Math.max(0, this.peaks[i] - 0.02)
        }
      }
    }
  }
}

// -------------------------------------------------------------
// Visualizer Canvas 2D Renderer
// -------------------------------------------------------------
export function renderVisualizerToCanvas(
  canvas: HTMLCanvasElement,
  cfg: VisualizerConfig,
  time: number,
  timeData: Uint8Array,
  fftData: Uint8Array,
  lifeEngine?: GameOfLife,
  lorenzEngine?: LorenzAttractor,
  waterfallBuf?: WaterfallBuffer,
  eqEngine?: EqualizerEngine
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#05050c'
  ctx.fillRect(0, 0, w, h)

  const cmap = cfg.colormap

  if (cfg.mode === 'oscilloscope') {
    // ---------------- OSCILLOSCOPE ----------------
    // CRT Grid reticle
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)'
    ctx.lineWidth = 1
    const gridCols = 10
    const gridRows = 8
    for (let c = 0; c <= gridCols; c++) {
      const gx = (c / gridCols) * w
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, h)
      ctx.stroke()
    }
    for (let r = 0; r <= gridRows; r++) {
      const gy = (r / gridRows) * h
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
      ctx.stroke()
    }

    // Center crosshairs with sub-division ticks
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)'
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    // Oscilloscope waveform trace
    const len = timeData.length > 0 ? timeData.length : 128
    const points: [number, number][] = []
    const gain = cfg.audioGain || 1.2

    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * w
      let raw = 0
      if (timeData.length > 0) {
        raw = (timeData[i] - 128) / 128
      } else {
        // Procedural synth oscilloscope wave if mic is silent
        raw =
          Math.sin(i * 0.15 + time * 6) * 0.5 +
          Math.sin(i * 0.05 + time * 2) * 0.3 +
          Math.cos(i * 0.3 - time * 4) * 0.2
      }
      const y = h / 2 - raw * (h * 0.38) * gain
      points.push([x, y])
    }

    // Outer bloom glow
    const primaryColor = sampleColormap(cmap, 0.8)
    ctx.save()
    ctx.shadowColor = rgbToHex(primaryColor)
    ctx.shadowBlur = 16
    ctx.strokeStyle = rgbToHex(primaryColor)
    ctx.lineWidth = 3
    ctx.beginPath()
    points.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()
    ctx.restore()

    // Inner bright core
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    points.forEach(([px, py], idx) => {
      if (idx === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.stroke()

    // HUD overlays
    ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'
    ctx.font = '11px monospace'
    ctx.fillText('TIME/DIV: 1.0ms', 14, 22)
    ctx.fillText('CH1: 500mV  AC', 14, 38)
    ctx.fillText('TRIG: AUTO  +0.00V', w - 150, 22)
    ctx.fillText(`RATE: 48.0 kHz`, w - 150, 38)

  } else if (cfg.mode === 'waterfall') {
    // ---------------- 3D ACOUSTIC WATERFALL ----------------
    if (waterfallBuf) {
      if (fftData.length > 0) {
        waterfallBuf.push(fftData)
      } else {
        // Simulated FFT slices
        const dummyFft = new Uint8Array(64)
        for (let i = 0; i < 64; i++) {
          dummyFft[i] = Math.max(0, Math.min(255, Math.floor(
            (Math.sin(i * 0.2 + time * 3) * 0.5 + 0.5) *
            Math.exp(-i * 0.03) * 200 +
            Math.sin(time * 5 + i * 0.4) * 50
          )))
        }
        waterfallBuf.push(dummyFft)
      }

      const slices = waterfallBuf.slices
      const numSlices = slices.length
      const bins = slices[0]?.length || 64

      // Draw from back to front
      for (let s = numSlices - 1; s >= 0; s--) {
        const slice = slices[s]
        const depth = s / waterfallBuf.maxSlices // 0 (front) .. 1 (back)
        const yBase = h * 0.85 - depth * (h * 0.65)
        const scaleX = 1.0 - depth * 0.4
        const wSlice = w * 0.88 * scaleX
        const xOffset = (w - wSlice) / 2

        ctx.beginPath()
        ctx.moveTo(xOffset, yBase)

        for (let b = 0; b < bins; b++) {
          const bx = xOffset + (b / (bins - 1)) * wSlice
          const amp = slice[b] * cfg.audioGain
          const by = yBase - amp * (h * 0.28) * (1 - depth * 0.3)
          ctx.lineTo(bx, by)
        }

        ctx.lineTo(xOffset + wSlice, yBase)
        ctx.closePath()

        const color = sampleColormap(cmap, 1.0 - depth * 0.75)
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.15 + (1 - depth) * 0.35})`
        ctx.fill()
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.4 + (1 - depth) * 0.6})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)'
      ctx.font = '11px monospace'
      ctx.fillText('3D SPECTRAL WATERFALL  [TIME ➔ DEPTH]', 14, 22)
      ctx.fillText('20 Hz ──────────────────────────────── 20 kHz', 14, h - 14)
    }

  } else if (cfg.mode === 'radar') {
    // ---------------- CIRCULAR FREQUENCY RADAR ----------------
    const cx = w / 2
    const cy = h / 2
    const maxR = Math.min(w, h) * 0.42
    const sweepAngle = (time * cfg.speed * 1.5) % (Math.PI * 2)

    // Concentric rings
    const rings = [0.25, 0.5, 0.75, 1.0]
    rings.forEach((rFrac) => {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, maxR * rFrac, 0, Math.PI * 2)
      ctx.stroke()
    })

    // Radial axis crosshairs
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(ang) * maxR, cy + Math.sin(ang) * maxR)
      ctx.stroke()
    }

    // Rotating sweep wedge
    const wedgeGrad = ctx.createConicGradient(sweepAngle, cx, cy)
    const wedgeColor = sampleColormap(cmap, 0.85)
    wedgeGrad.addColorStop(0, `rgba(${wedgeColor.r}, ${wedgeColor.g}, ${wedgeColor.b}, 0.35)`)
    wedgeGrad.addColorStop(0.12, `rgba(${wedgeColor.r}, ${wedgeColor.g}, ${wedgeColor.b}, 0.0)`)
    wedgeGrad.addColorStop(1.0, `rgba(${wedgeColor.r}, ${wedgeColor.g}, ${wedgeColor.b}, 0.0)`)
    ctx.fillStyle = wedgeGrad
    ctx.beginPath()
    ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
    ctx.fill()

    // Sweep line
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR)
    ctx.stroke()

    // Circular frequency spectrum contour
    const bins = 64
    ctx.beginPath()
    for (let i = 0; i <= bins; i++) {
      const ang = (i / bins) * Math.PI * 2 - Math.PI / 2
      const binIdx = i % bins
      let amp = 0
      if (fftData.length > 0) {
        amp = (fftData[binIdx] / 255) * cfg.audioGain
      } else {
        amp = (Math.sin(binIdx * 0.4 + time * 4) * 0.5 + 0.5) * 0.7
      }
      const r = maxR * 0.3 + amp * (maxR * 0.65)
      const px = cx + Math.cos(ang) * r
      const py = cy + Math.sin(ang) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    const contourColor = sampleColormap(cmap, 0.9)
    ctx.strokeStyle = rgbToHex(contourColor)
    ctx.lineWidth = 2
    ctx.stroke()

    // HUD
    ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'
    ctx.font = '11px monospace'
    ctx.fillText(`BEARING: ${Math.round((sweepAngle * 180) / Math.PI)}°`, 14, 22)
    ctx.fillText(`RANGE: 5000m`, 14, 38)
    ctx.fillText(`RADAR HUD · ACTIVE`, w - 160, 22)

  } else if (cfg.mode === 'equalizer') {
    // ---------------- PEAK EQUALIZER BARS ----------------
    if (eqEngine) {
      if (fftData.length > 0) {
        eqEngine.update(fftData)
      } else {
        const dummyFft = new Uint8Array(64)
        for (let i = 0; i < 64; i++) {
          dummyFft[i] = Math.floor(
            (Math.sin(i * 0.35 + time * 5) * 0.4 + 0.5) * 220 +
            (Math.cos(i * 0.1 - time * 2) * 0.3) * 100
          )
        }
        eqEngine.update(dummyFft)
      }

      const bands = eqEngine.bands
      const barW = Math.max(4, Math.floor((w * 0.85) / bands) - 4)
      const startX = (w - (barW + 4) * bands) / 2
      const maxH = h * 0.68
      const baseY = h * 0.82

      for (let b = 0; b < bands; b++) {
        const bx = startX + b * (barW + 4)
        const val = Math.min(1, eqEngine.current[b] * cfg.audioGain)
        const peak = Math.min(1, eqEngine.peaks[b] * cfg.audioGain)

        // Ladder segments
        const numSegments = 24
        const segH = Math.floor(maxH / numSegments)
        const activeSegments = Math.round(val * numSegments)

        for (let s = 0; s < numSegments; s++) {
          const sy = baseY - (s + 1) * segH
          const segFrac = s / numSegments
          if (s < activeSegments) {
            const segColor = sampleColormap(cmap, segFrac)
            ctx.fillStyle = rgbToHex(segColor)
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
          }
          ctx.fillRect(bx, sy, barW, segH - 2)
        }

        // Peak line
        const peakY = baseY - peak * maxH
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(bx, peakY - 2, barW, 3)
      }

      ctx.fillStyle = 'rgba(0, 240, 255, 0.85)'
      ctx.font = '11px monospace'
      ctx.fillText('32-BAND PEAK EQUALIZER  [+6 dB ➔ -48 dB]', 14, 22)
      ctx.fillText('32Hz      125Hz      500Hz      2kHz      8kHz     16kHz', startX, baseY + 20)
    }

  } else if (cfg.mode === 'mandelbrot' || cfg.mode === 'julia') {
    // ---------------- MANDELBROT / JULIA FRACTAL EXPLORER ----------------
    const imgData = ctx.createImageData(w, h)
    const data = imgData.data
    const isMandelbrot = cfg.mode === 'mandelbrot'
    const maxIter = cfg.iterations
    const zoom = Math.max(0.01, cfg.zoom)
    const panX = cfg.panX
    const panY = cfg.panY
    const [jcx, jcy] = cfg.juliaC

    const aspect = w / h

    for (let py = 0; py < h; py++) {
      const y0 = ((py / h) - 0.5) * (2.4 / zoom) + panY
      for (let px = 0; px < w; px++) {
        const x0 = ((px / w) - 0.5) * (2.4 * aspect / zoom) + panX

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

        const idx = (py * w + px) * 4
        if (iter >= maxIter) {
          data[idx] = 0
          data[idx + 1] = 0
          data[idx + 2] = 0
          data[idx + 3] = 255
        } else {
          // Smooth continuous iteration coloring
          const logZn = Math.log(zx2 + zy2) / 2
          const nu = Math.log(logZn / Math.LN2) / Math.LN2
          const continuous = (iter + 1 - nu) / maxIter
          const color = sampleColormap(cmap, (continuous * 3 + time * 0.1) % 1.0)
          data[idx] = color.r
          data[idx + 1] = color.g
          data[idx + 2] = color.b
          data[idx + 3] = 255
        }
      }
    }
    ctx.putImageData(imgData, 0, 0)

    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'
    ctx.font = '11px monospace'
    ctx.fillText(`${isMandelbrot ? 'MANDELBROT SET' : 'JULIA SET'}  ZOOM: ${zoom.toFixed(2)}x  ITER: ${maxIter}`, 14, 22)
    ctx.fillText(`CENTER: (${panX.toFixed(4)}, ${panY.toFixed(4)})`, 14, 38)

  } else if (cfg.mode === 'lorenz') {
    // ---------------- 3D LORENZ ATTRACTOR CHAOS ----------------
    if (lorenzEngine) {
      // Step attractor multiple times per frame for smooth trajectory
      for (let s = 0; s < 6; s++) {
        lorenzEngine.step(cfg.lorenzSigma, cfg.lorenzRho, cfg.lorenzBeta, 0.007 * cfg.speed)
      }

      const pts = lorenzEngine.points
      const numPts = pts.length
      const rx = cfg.rotationX
      const ry = cfg.rotationY + time * 0.3 * cfg.speed
      const rz = cfg.rotationZ

      ctx.lineWidth = 1.4

      for (let i = 1; i < numPts; i++) {
        const p0 = pts[i - 1]
        const p1 = pts[i]

        // Center Lorenz around z=25
        const [r0x, r0y, r0z] = rotate3D(p0.x, p0.y, p0.z - 25, rx, ry, rz)
        const [r1x, r1y, r1z] = rotate3D(p1.x, p1.y, p1.z - 25, rx, ry, rz)

        const fov = 60
        const scale0 = (fov / (fov + r0z)) * 14 * cfg.zoom
        const scale1 = (fov / (fov + r1z)) * 14 * cfg.zoom

        const sx0 = w / 2 + r0x * scale0
        const sy0 = h / 2 - r0y * scale0
        const sx1 = w / 2 + r1x * scale1
        const sy1 = h / 2 - r1y * scale1

        const ageFrac = i / numPts // 0 (old) .. 1 (head)
        const speedFrac = Math.min(1, p1.speed / 45)
        const color = sampleColormap(cmap, (ageFrac * 0.7 + speedFrac * 0.3))

        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${0.1 + ageFrac * 0.9})`
        ctx.beginPath()
        ctx.moveTo(sx0, sy0)
        ctx.lineTo(sx1, sy1)
        ctx.stroke()
      }

      // Draw attractor head
      if (pts.length > 0) {
        const head = pts[pts.length - 1]
        const [hx, hy, hz] = rotate3D(head.x, head.y, head.z - 25, rx, ry, rz)
        const fov = 60
        const scale = (fov / (fov + hz)) * 14 * cfg.zoom
        const sx = w / 2 + hx * scale
        const sy = h / 2 - hy * scale

        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#00f0ff'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(sx, sy, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'
      ctx.font = '11px monospace'
      ctx.fillText(`3D LORENZ ATTRACTOR  σ=${cfg.lorenzSigma} ρ=${cfg.lorenzRho} β=${cfg.lorenzBeta.toFixed(2)}`, 14, 22)
      ctx.fillText(`POINTS: ${pts.length}  CHAOS DYNAMICS`, 14, 38)
    }

  } else if (cfg.mode === 'life') {
    // ---------------- CONWAY'S GAME OF LIFE ----------------
    if (lifeEngine) {
      const gw = lifeEngine.width
      const gh = lifeEngine.height
      const cellW = w / gw
      const cellH = h / gh
      const grid = lifeEngine.grid
      const age = lifeEngine.age

      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const idx = gy * gw + gx
          if (grid[idx]) {
            const cellAge = Math.min(1, age[idx] / 30)
            const color = sampleColormap(cmap, 0.3 + cellAge * 0.7)
            ctx.fillStyle = rgbToHex(color)
            ctx.fillRect(gx * cellW, gy * cellH, cellW - 0.5, cellH - 0.5)
          }
        }
      }

      ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'
      ctx.font = '11px monospace'
      ctx.fillText(`CONWAY'S GAME OF LIFE  PATTERN: ${cfg.lifePattern.toUpperCase()}`, 14, 22)
      ctx.fillText(`GRID: ${gw}x${gh}  CELLULAR AUTOMATA`, 14, 38)
    }

  } else if (cfg.mode === 'parametric') {
    // ---------------- 3D PARAMETRIC SURFACE MESHES ----------------
    const mesh = generateParametricMesh(cfg.parametricShape, 44, 26, time)
    const rx = cfg.rotationX + time * 0.4 * cfg.speed
    const ry = cfg.rotationY + time * 0.25 * cfg.speed
    const rz = cfg.rotationZ

    // Light source vector
    const lx = 0.577
    const ly = 0.577
    const lz = -0.577

    // Project points
    interface ProjPt {
      sx: number
      sy: number
      sz: number
      lum: number
    }
    const projected: ProjPt[] = []

    mesh.forEach((pt) => {
      const [rxVal, ryVal, rzVal] = rotate3D(pt.x, pt.y, pt.z, rx, ry, rz)
      const [rnx, rny, rnz] = rotate3D(pt.nx, pt.ny, pt.nz, rx, ry, rz)

      const lum = Math.max(0.08, rnx * lx + rny * ly + rnz * lz)
      const fov = 4
      const scale = (fov / (fov + rzVal)) * 140 * cfg.zoom
      const sx = w / 2 + rxVal * scale
      const sy = h / 2 - ryVal * scale

      projected.push({ sx, sy, sz: rzVal, lum })
    })

    // Sort by depth (painter's algorithm)
    const indices = projected.map((_, idx) => idx).sort((a, b) => projected[b].sz - projected[a].sz)

    indices.forEach((idx) => {
      const p = projected[idx]
      const color = sampleColormap(cmap, p.lum)
      ctx.fillStyle = rgbToHex(color)
      const size = Math.max(1.5, (1.5 - p.sz * 0.3) * 2.2)
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2)
      ctx.fill()
    })

    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)'
    ctx.font = '11px monospace'
    ctx.fillText(`3D PARAMETRIC SURFACE: ${cfg.parametricShape.toUpperCase()}`, 14, 22)
    ctx.fillText(`MESH NODES: ${mesh.length}  NORMAL LIGHTING`, 14, 38)
  }
}

// -------------------------------------------------------------
// Visualizer Text & ANSI Renderer
// -------------------------------------------------------------
export function renderVisualizerToText(
  cfg: VisualizerConfig,
  time = 0,
  timeData?: Uint8Array,
  fftData?: Uint8Array,
  lifeEngine?: GameOfLife,
  format: 'plain' | 'ansi' = 'plain'
): string {
  const cols = cfg.cols || 80
  const rows = cfg.rows || 40
  const ramp = cfg.charRamp || ' .:-=+*#%@'
  const lines: string[] = []

  const getChar = (lum: number) => {
    const idx = Math.max(0, Math.min(ramp.length - 1, Math.floor(lum * (ramp.length - 1))))
    return ramp[idx]
  }

  if (cfg.mode === 'oscilloscope') {
    // Waveform grid in text
    const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(' '))
    const colorGrid: RGB[][] = Array.from({ length: rows }, () => Array(cols).fill({ r: 0, g: 240, b: 255 }))

    // Reticle
    for (let c = 0; c < cols; c++) {
      grid[Math.floor(rows / 2)][c] = '─'
    }
    for (let r = 0; r < rows; r++) {
      grid[r][Math.floor(cols / 2)] = '│'
    }
    grid[Math.floor(rows / 2)][Math.floor(cols / 2)] = '┼'

    const len = timeData && timeData.length > 0 ? timeData.length : cols
    for (let c = 0; c < cols; c++) {
      let raw = 0
      if (timeData && timeData.length > 0) {
        const sampleIdx = Math.floor((c / cols) * len)
        raw = (timeData[sampleIdx] - 128) / 128
      } else {
        raw = Math.sin(c * 0.2 + time * 5) * 0.6 + Math.cos(c * 0.08 - time * 2) * 0.3
      }
      const normY = (rows / 2) - raw * (rows * 0.42) * cfg.audioGain
      const r = Math.max(0, Math.min(rows - 1, Math.round(normY)))
      grid[r][c] = '█'
      colorGrid[r][c] = sampleColormap(cfg.colormap, 0.85)
    }

    for (let r = 0; r < rows; r++) {
      if (format === 'ansi') {
        const line = grid[r].map((ch, c) => `${rgbToAnsi(colorGrid[r][c])}${ch}`).join('') + '\x1b[0m'
        lines.push(line)
      } else {
        lines.push(grid[r].join(''))
      }
    }
  } else if (cfg.mode === 'mandelbrot' || cfg.mode === 'julia') {
    const isMandelbrot = cfg.mode === 'mandelbrot'
    const maxIter = Math.min(100, cfg.iterations)
    const zoom = cfg.zoom
    const [jcx, jcy] = cfg.juliaC

    for (let r = 0; r < rows; r++) {
      let line = ''
      const y0 = ((r / rows) - 0.5) * (2.4 / zoom) + cfg.panY

      for (let c = 0; c < cols; c++) {
        const x0 = ((c / cols) - 0.5) * (2.4 * (cols / (rows * 2)) / zoom) + cfg.panX

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
          line += format === 'ansi' ? ' ' : ' '
        } else {
          const frac = iter / maxIter
          const ch = getChar(frac)
          if (format === 'ansi') {
            const rgb = sampleColormap(cfg.colormap, frac)
            line += `${rgbToAnsi(rgb)}${ch}`
          } else {
            line += ch
          }
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (cfg.mode === 'life') {
    const life = lifeEngine || new GameOfLife(cols, rows)
    const w = life.width
    const h = life.height
    for (let r = 0; r < Math.min(rows, h); r++) {
      let line = ''
      for (let c = 0; c < Math.min(cols, w); c++) {
        const idx = r * w + c
        if (life.grid[idx]) {
          const ageVal = Math.min(1, life.age[idx] / 20)
          if (format === 'ansi') {
            const rgb = sampleColormap(cfg.colormap, 0.4 + ageVal * 0.6)
            line += `${rgbToAnsi(rgb)}█`
          } else {
            line += '█'
          }
        } else {
          line += ' '
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (cfg.mode === 'lorenz') {
    const lorenz = new LorenzAttractor()
    const steps = 600
    for (let s = 0; s < steps; s++) {
      lorenz.step(cfg.lorenzSigma, cfg.lorenzRho, cfg.lorenzBeta, 0.008)
    }
    const charBuf = new Array(cols * rows).fill(' ')
    const colorBuf: RGB[] = new Array(cols * rows).fill({ r: 0, g: 0, b: 0 })
    const rx = cfg.rotationX + time * 0.3
    const ry = cfg.rotationY + time * 0.2
    const rz = cfg.rotationZ

    lorenz.points.forEach((pt, pIdx) => {
      const nx = pt.x * 0.04
      const ny = pt.y * 0.04
      const nz = (pt.z - 25) * 0.04
      const [rotX, rotY, rotZ] = rotate3D(nx, ny, nz, rx, ry, rz)
      const fov = 3.5
      const scale = (fov / (fov + rotZ)) * (cols * 0.42) * cfg.zoom
      const sc = Math.round(cols / 2 + rotX * scale)
      const sr = Math.round(rows / 2 - rotY * scale * 0.5)

      if (sc >= 0 && sc < cols && sr >= 0 && sr < rows) {
        const idx = sr * cols + sc
        const progress = pIdx / lorenz.points.length
        const lum = Math.min(1.0, 0.3 + progress * 0.7)
        charBuf[idx] = getChar(lum)
        colorBuf[idx] = sampleColormap(cfg.colormap, progress)
      }
    })

    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (format === 'ansi') {
          line += `${rgbToAnsi(colorBuf[idx])}${charBuf[idx]}`
        } else {
          line += charBuf[idx]
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else if (cfg.mode === 'parametric') {
    // 3D parametric surface in ASCII
    const zBuf = new Float32Array(cols * rows).fill(-9999)
    const charBuf = new Array(cols * rows).fill(' ')
    const colorBuf: RGB[] = new Array(cols * rows).fill({ r: 0, g: 0, b: 0 })

    const mesh = generateParametricMesh(cfg.parametricShape, 50, 30, time)
    const rx = cfg.rotationX + time * 0.4
    const ry = cfg.rotationY + time * 0.25
    const rz = cfg.rotationZ

    mesh.forEach((pt) => {
      const [rxVal, ryVal, rzVal] = rotate3D(pt.x, pt.y, pt.z, rx, ry, rz)
      const [rnx, rny, rnz] = rotate3D(pt.nx, pt.ny, pt.nz, rx, ry, rz)

      const lum = Math.max(0.05, Math.min(1.0, rnx * 0.577 + rny * 0.577 - rnz * 0.577))
      const fov = 4
      const scale = (fov / (fov + rzVal)) * (cols * 0.38) * cfg.zoom
      const sc = Math.round(cols / 2 + rxVal * scale)
      const sr = Math.round(rows / 2 - ryVal * scale * 0.5)

      if (sc >= 0 && sc < cols && sr >= 0 && sr < rows) {
        const idx = sr * cols + sc
        if (rzVal > zBuf[idx]) {
          zBuf[idx] = rzVal
          charBuf[idx] = getChar(lum)
          colorBuf[idx] = sampleColormap(cfg.colormap, lum)
        }
      }
    })

    for (let r = 0; r < rows; r++) {
      let line = ''
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c
        if (format === 'ansi') {
          line += `${rgbToAnsi(colorBuf[idx])}${charBuf[idx]}`
        } else {
          line += charBuf[idx]
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  } else {
    // Equalizer / Waterfall ASCII spectral bars
    const numBands = cols
    const levels = new Float32Array(numBands)
    for (let c = 0; c < numBands; c++) {
      if (fftData && fftData.length > 0) {
        const idx = Math.floor((c / numBands) * fftData.length)
        levels[c] = (fftData[idx] / 255) * cfg.audioGain
      } else {
        levels[c] = (Math.sin(c * 0.25 + time * 4) * 0.5 + 0.5) * 0.8
      }
    }
    for (let r = 0; r < rows; r++) {
      let line = ''
      const thresh = (rows - 1 - r) / rows
      for (let c = 0; c < numBands; c++) {
        const active = levels[c] >= thresh
        const char = active ? '█' : ' '
        if (format === 'ansi') {
          const col = sampleColormap(cfg.colormap, 1 - r / rows)
          line += `${rgbToAnsi(col)}${char}`
        } else {
          line += char
        }
      }
      if (format === 'ansi') line += '\x1b[0m'
      lines.push(line)
    }
  }

  return lines.join('\n')
}
