// Core settings types for ASCII Studio. Original code written for this project.

export type ModeId =
  | 'characters' | 'keycap' | 'mixed' | 'block-chars' | 'dots' | 'braille'
  | 'dither' | 'pixel' | 'mosaic' | 'lego' | 'voxel' | 'hexmosaic'
  | 'cross' | 'diamond' | 'lines' | 'diagonal' | 'specimen' | 'lowpoly'
  | 'frostedglass' | 'stainedglass' | 'risograph' | 'stippling' | 'comic' | 'sketch'
  | 'crt' | 'pixelsort' | 'disco' | 'anaglyph' | 'waves' | 'oilpaint'
  | 'watercolor' | 'chrome' | 'motionblur' | 'smudge' | 'pinch' | 'spherize'
  | 'twirl' | 'ripple' | 'zigzag' | 'polar' | 'shear'
  | 'emoji' | 'numbers' | 'arrows' | 'math' | 'katakana' | 'circles'
  | 'halfblock' | 'typewriter' | 'neon' | 'crossstitch' | 'beads'
  | 'halftone-cmyk' | 'blueprint' | 'linocut' | 'triangles' | 'hexagons'
  | 'prism' | 'aurora' | 'laser' | 'vhs' | 'marble' | 'kaleidoscope' | 'bokeh'
  | 'ledmatrix' | 'gameboy-camera' | 'thermal' | 'cyberterminal' | 'ascii-colored-bg'
  | 'circuit' | 'crosshatch' | 'wireframe' | 'voronoi' | 'glitch-cyber'
  | 'matrix-rain' | 'ascii-flow' | 'ascii-box' | 'dot-matrix' | 'glitch-vcr'
  | 'braille-dense' | 'ascii-cinematic' | 'ironbow-flir' | 'ascii-terrain-3d'
  | 'ascii-blueprint-cad' | 'ascii-halftone-news' | 'ascii-synthwave-mesh'
  | 'ascii-glitch-datamosh' | 'ascii-terminal-crt' | 'ascii-quantum-dot' | 'ascii-chladni'
  | 'matrix-cascade' | 'ascii-hex-dense' | 'ascii-woodcut' | 'ascii-radar-hud'
  | 'ascii-emboss' | 'ascii-gameboy-pocket' | 'ascii-c64-petscii' | 'ascii-cyber-hex'
  | 'ascii-moire' | 'ascii-stained-amber' | 'ascii-chalkboard' | 'ascii-synth-equalizer'
  | 'ascii-solari-board' | 'ascii-led-ticker' | 'ascii-thermal-ice'
  | 'ascii-particles'

export type FxId =
  | 'vignette' | 'scanLines' | 'crtCurve' | 'chromatic' | 'rgbSplit'
  | 'glitch' | 'filmGrain' | 'filmDust' | 'noise' | 'bloom'
  | 'charBloom' | 'charChroma' | 'pixelate' | 'halftone' | 'sharpen' | 'advBlur'
  | 'colorOverlay' | 'blur' | 'duotone' | 'posterize' | 'solarize' | 'edgeGlow'
  | 'lensDistortion' | 'lightLeak' | 'scanlinesPro' | 'heatwave' | 'glowDiffusion'
  | 'vhsTracking'

export type DitherAlgo = 'bayer8' | 'bayer16' | 'floyd' | 'halftone'
export type DitherPalette = 'cyberpunk' | 'riso' | 'gameboy' | 'original' | 'c64' | 'pico8' | 'bonsai' | 'vaporwave' | 'sunset'
export type ColorMode = 'color' | 'mono' | 'duotone' | 'tint'
export type CellSize = 'small' | 'medium' | 'large'
export type LutId = 'none' | 'cyberpunk' | 'synthwave' | 'sepia' | 'matrix' | 'thermal' | 'anime' | 'acid' | 'golden' | 'monolith'

export interface LightSource {
  id: string
  name: string
  enabled: boolean
  x: number // 0..1 normalized across width
  y: number // 0..1 normalized across height
  color: string // hex
  intensity: number // 0..200
  radius: number // 0.1..2.0
  type: 'point' | 'rim' | 'spot' | 'ambient'
}

export interface FocusMask {
  enabled: boolean
  shape: 'circle' | 'vignette' | 'rect'
  radius: number // 0..100
  feather: number // 0..100
  invert: boolean
}

export type AudioTarget = 'cols' | 'bloom' | 'glitch' | 'light' | 'contrast' | 'speed' | 'none'

export interface AudioReactive {
  enabled: boolean
  sensitivity: number // 0..100
  target: 'cols' | 'bloom' | 'glitch' | 'light'
  source?: 'mic' | 'beat' | 'file'
  mode?: 'master' | 'multiband'
  bassTarget?: AudioTarget
  bassSens?: number
  midTarget?: AudioTarget
  midSens?: number
  trebleTarget?: AudioTarget
  trebleSens?: number
}

export type TextBlendMode = 'normal' | 'screen' | 'multiply' | 'overlay' | 'difference' | 'color-dodge'

export interface TextLayer {
  id: string
  text: string
  x: number // 0..1 normalized across width
  y: number // 0..1 normalized across height
  fontSize: number // 10..120 px
  fontFamily: 'monospace' | 'sans-serif' | 'serif' | 'impact'
  color: string // hex
  bgColor: string // hex or 'transparent' or rgba
  bgPadding: number // 0..24
  bgRadius: number // 0..16
  blendMode: TextBlendMode
  opacity: number // 0..1
  rotation: number // -180..180 deg
  border: boolean
  borderColor: string
  enabled: boolean
}

export interface FxState {
  enabled: boolean
  intensity: number // 0..100
}

export interface Settings {
  mode: ModeId
  cols: number // grid columns
  cellSize: CellSize
  contrast: number // 0..200, 100 neutral
  brightness: number // 0..200
  saturation: number // 0..200
  gamma: number // 0.2..3
  invert: boolean
  edgeEmphasis: number // 0..100
  bgBlur: number // 0..20
  charSet: string // ramp id
  threshold: number // 0..255
  ditherAlgo: DitherAlgo
  ditherPalette: DitherPalette
  ditherScale: number // 1..4
  ditherContrast: number // 0..200
  colorMode: ColorMode
  fg: string // mono foreground
  bg: string // background
  tint: string // duotone/tint color
  loop: boolean
  fps: number
  fx: Record<FxId, FxState>
  glitchSeed: number
  lights: LightSource[]
  lightingEnabled: boolean
  lightingBump: number // 0..100 surface normal bump strength
  dualCompare: boolean
  compareMode: ModeId
  magicLensEnabled: boolean
  magicLensRadius: number
  magicLensZoom: number
  magicLensMode: ModeId
  rotation: number // 0, 90, 180, 270
  flipH: boolean
  flipV: boolean
  focusMask: FocusMask
  audioReactive: AudioReactive
  lut: LutId
  layers: TextLayer[]
}

export interface Recipe {
  id: string
  name: string
  desc: string
  patch: Partial<Omit<Settings, 'fx'>> & { fx?: Partial<Record<FxId, FxState>> }
}

export interface ModeDef {
  id: ModeId
  label: string
  category: string
  isNew?: boolean
  featured?: boolean
  blurb: string
}

export const DEFAULT_FX: Record<FxId, FxState> = {
  vignette: { enabled: false, intensity: 40 },
  scanLines: { enabled: false, intensity: 30 },
  crtCurve: { enabled: false, intensity: 50 },
  chromatic: { enabled: false, intensity: 40 },
  rgbSplit: { enabled: false, intensity: 50 },
  glitch: { enabled: false, intensity: 50 },
  filmGrain: { enabled: false, intensity: 30 },
  filmDust: { enabled: false, intensity: 25 },
  noise: { enabled: false, intensity: 30 },
  bloom: { enabled: false, intensity: 40 },
  charBloom: { enabled: false, intensity: 50 },
  charChroma: { enabled: false, intensity: 40 },
  pixelate: { enabled: false, intensity: 40 },
  halftone: { enabled: false, intensity: 40 },
  sharpen: { enabled: false, intensity: 50 },
  advBlur: { enabled: false, intensity: 40 },
  colorOverlay: { enabled: false, intensity: 35 },
  blur: { enabled: false, intensity: 40 },
  duotone: { enabled: false, intensity: 70 },
  posterize: { enabled: false, intensity: 50 },
  solarize: { enabled: false, intensity: 50 },
  edgeGlow: { enabled: false, intensity: 50 },
  lensDistortion: { enabled: false, intensity: 35 },
  lightLeak: { enabled: false, intensity: 40 },
  scanlinesPro: { enabled: false, intensity: 30 },
  heatwave: { enabled: false, intensity: 35 },
  glowDiffusion: { enabled: false, intensity: 45 },
  vhsTracking: { enabled: false, intensity: 45 },
}

export const DEFAULT_LIGHTS: LightSource[] = [
  { id: 'light-1', name: 'Key Light (Cyan)', enabled: true, x: 0.25, y: 0.25, color: '#00f0ff', intensity: 100, radius: 0.7, type: 'point' },
  { id: 'light-2', name: 'Fill Light (Magenta)', enabled: true, x: 0.75, y: 0.35, color: '#ff007f', intensity: 90, radius: 0.7, type: 'point' },
  { id: 'light-3', name: 'Rim Light (Gold)', enabled: false, x: 0.5, y: 0.85, color: '#ffb300', intensity: 110, radius: 0.6, type: 'rim' },
  { id: 'light-4', name: 'Spot Light (White)', enabled: false, x: 0.5, y: 0.15, color: '#ffffff', intensity: 120, radius: 0.5, type: 'spot' },
]

export const DEFAULT_LAYERS: TextLayer[] = [
  {
    id: 'layer-1',
    text: 'ASCII STUDIO // TERMINAL',
    x: 0.5,
    y: 0.9,
    fontSize: 20,
    fontFamily: 'monospace',
    color: '#00f0ff',
    bgColor: 'rgba(4, 4, 10, 0.8)',
    bgPadding: 6,
    bgRadius: 4,
    blendMode: 'screen',
    opacity: 0.95,
    rotation: 0,
    border: true,
    borderColor: '#00f0ff',
    enabled: false,
  },
]

export const DEFAULT_SETTINGS: Settings = {
  mode: 'characters',
  cols: 180,
  cellSize: 'medium',
  contrast: 108,
  brightness: 100,
  saturation: 130,
  gamma: 1,
  invert: false,
  edgeEmphasis: 0,
  bgBlur: 0,
  charSet: 'standard',
  threshold: 128,
  ditherAlgo: 'bayer8',
  ditherPalette: 'original',
  ditherScale: 2,
  ditherContrast: 100,
  colorMode: 'color',
  fg: '#e8e8e8',
  bg: '#040406',
  tint: '#f26522',
  loop: true,
  fps: 24,
  fx: JSON.parse(JSON.stringify(DEFAULT_FX)),
  glitchSeed: 7,
  lights: JSON.parse(JSON.stringify(DEFAULT_LIGHTS)),
  lightingEnabled: false,
  lightingBump: 45,
  dualCompare: false,
  compareMode: 'dither',
  magicLensEnabled: false,
  magicLensRadius: 130,
  magicLensZoom: 2.5,
  magicLensMode: 'braille-dense',
  rotation: 0,
  flipH: false,
  flipV: false,
  focusMask: { enabled: false, shape: 'circle', radius: 45, feather: 30, invert: false },
  audioReactive: {
    enabled: false,
    sensitivity: 50,
    target: 'cols',
    source: 'beat',
    mode: 'multiband',
    bassTarget: 'light',
    bassSens: 60,
    midTarget: 'bloom',
    midSens: 50,
    trebleTarget: 'cols',
    trebleSens: 50,
  },
  lut: 'none',
  layers: JSON.parse(JSON.stringify(DEFAULT_LAYERS)),
}

export function cloneSettings(s: Settings): Settings {
  return JSON.parse(JSON.stringify(s)) as Settings
}
