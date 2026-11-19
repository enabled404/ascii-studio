// ASCII Studio v3 — main app. Free, local, no-signup image/video to ASCII studio.
// Original UI and wiring code written for this project.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Grid } from './engine/image'
import { sampleGrid, applyLightingToGrid, generateProceduralCanvas, calibrateCharsetDensity } from './engine/image'
import { renderGrid, sampleDims, textArt, WARP_MODES, isTextMode, resetPhysicsParticles, renderTextLayers } from './engine/render'
import { applyEffects } from './engine/effects'
import {
  downloadBlob, downloadText, exportPNG, exportJPG, exportWebP, exportSized, exportGIF, exportHTML,
  exportTXT, exportSVG, exportANSI, exportMarkdown, exportJSON, recordVideo, copyTextToClipboard, copyCanvasToClipboard,
  exportReactComponent, exportWebComponent, exportPythonScript, exportCHeader,
  encodeSettings, decodeSettings, shareLink, settingsFromHash,
  createZip, processBatchImagesToZip, type BatchFormat, renderExportCanvas,
} from './engine/exporters'
import { CATEGORIES, CHAR_RAMPS, DITHER_PALETTES, FX_DEFS, MODES, RECIPES, COLOR_LUTS, LIGHT_PRESETS } from './catalog'
import {
  DEFAULT_SETTINGS, DEFAULT_FX, cloneSettings,
  type FxId, type FxState, type ModeId, type Settings, type LutId, type LightSource,
  type TextLayer, type TextBlendMode, type AudioTarget,
} from './types'
import { SAMPLES } from './samples'
import { ColorInput, Section, Select, Slider, Toggle } from './components/Controls'
import BannerPanel from './components/Banner'
import ToolsPanel from './components/Tools'
import Landing from './components/Landing'
import DisclaimersModal from './components/DisclaimersModal'
import { audioEngine, type AudioMetrics } from './engine/audio'
import AnimatedLibrary from './components/AnimatedLibrary'
import AnimatedPlayerModal from './components/AnimatedPlayerModal'
import {
  type AnimatedPieceMeta,
  type RenderFrameFn,
  NATIVE_PIECES,
  loadPieceRenderer,
  renderFrameToCanvas,
  generateTerminalScript,
  exportAnimatedPieceWebP,
  exportAnimatedPieceFramesZip,
} from './engine/animatedArt'
import VisualizerStudio from './components/VisualizerStudio'
import McpModal from './components/McpModal'
import { DEFAULT_VISUALIZER_CONFIG, renderVisualizerToText } from './engine/visualizer'

type SourceKind = 'sample' | 'image' | 'video' | 'webcam' | 'animation'
type Tab = 'tune' | 'lighting' | 'effects' | 'recipes' | 'layers' | 'export' | 'banner' | 'tools' | 'visualize'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function fitDims(w: number, h: number, maxW = 960): [number, number] {
  if (w <= maxW) return [w, h]
  return [maxW, Math.max(1, Math.round((h * maxW) / w))]
}

/** Lazy-rendered style thumbnail: draws the Tropical Bloom sample at 36 cols
 *  the first time it scrolls into view. */
function ModeThumb({ mode, label, isNew, active, onClick }: {
  mode: ModeId
  label: string
  isNew?: boolean
  active: boolean
  onClick: () => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderedRef = useRef(false)

  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || renderedRef.current) return
      renderedRef.current = true
      const sample = SAMPLES.find((x) => x.id === 'tropical') ?? SAMPLES[0]
      const src = sample.make()
      const s = cloneSettings(DEFAULT_SETTINGS)
      s.mode = mode
      s.cols = 36
      s.saturation = 130
      s.contrast = 108
      const dims = sampleDims(s.cols, src.width / src.height, mode)
      const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
        brightness: 100, contrast: 108, saturation: 130, gamma: 1, invert: false,
      }, null, 0.6)
      const canvas = canvasRef.current
      if (canvas) renderGrid(canvas, grid, s, { time: 0, seed: 7, src })
      io.disconnect()
    }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [mode])

  return (
    <button
      ref={btnRef}
      className={`mode-thumb ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={`Select ${label} style`}
    >
      <canvas ref={canvasRef} role="img" aria-label={`${label} thumbnail preview`} />
      <span className="mode-thumb-label">{label}</span>
      {isNew && <span className="badge-new">NEW</span>}
    </button>
  )
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    const fromHash = settingsFromHash()
    return fromHash ? { ...cloneSettings(DEFAULT_SETTINGS), ...fromHash } : cloneSettings(DEFAULT_SETTINGS)
  })
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const [source, setSource] = useState<{ kind: SourceKind; name: string }>({ kind: 'sample', name: 'Tropical Bloom' })
  const [tab, setTab] = useState<Tab>('tune')
  const [compare, setCompare] = useState(true)
  const [comparePos, setComparePos] = useState(50)
  const [view, setView] = useState<'landing' | 'studio'>(() => {
    if (new URLSearchParams(window.location.search).has('selftest')) return 'studio'
    if (window.location.hash === '#studio') return 'studio'
    if (settingsFromHash()) return 'studio'
    return 'landing'
  })
  const pendingFileRef = useRef<File | null>(null)
  const [toast, setToast] = useState('')
  const [stats, setStats] = useState({ ms: 0, cols: 0, rows: 0, px: 0 })
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(recording)
  recordingRef.current = recording
  const [exporting, setExporting] = useState(false)
  const [recipeCode, setRecipeCode] = useState('')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showDisclaimers, setShowDisclaimers] = useState(false)
  const [disclaimersTarget, setDisclaimersTarget] = useState<string | null>(null)

  const openDisclaimers = (sectionId: string | null = null) => {
    setDisclaimersTarget(sectionId)
    setShowDisclaimers(true)
  }

  const [showAnimatedLibrary, setShowAnimatedLibrary] = useState(false)
  const [showMcpModal, setShowMcpModal] = useState(false)
  const [activePieceMeta, setActivePieceMeta] = useState<AnimatedPieceMeta | null>(null)
  const [playerModalPiece, setPlayerModalPiece] = useState<AnimatedPieceMeta | null>(null)
  const activePieceRenderRef = useRef<RenderFrameFn | null>(null)

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash
      if (h === '#animations') {
        setShowAnimatedLibrary(true)
      } else if (h === '#mcp' || h === '#ai') {
        setShowMcpModal(true)
      } else if (h === '#visualize' || h === '#visualizer') {
        setView('studio')
        setTab('visualize')
      } else if (h === '#disclaimers' || h === '#legal' || h === '#privacy') {
        openDisclaimers(h === '#privacy' ? 'disclaimer-zero-storage' : null)
      } else if (h === '#ownership' || h === '#commercial') {
        openDisclaimers('disclaimer-ownership')
      } else if (h === '#permissions' || h === '#camera') {
        openDisclaimers('disclaimer-permissions')
      } else if (h === '#liability' || h === '#warranty') {
        openDisclaimers('disclaimer-liability')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])
  const [selftest, setSelftest] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [styleQuery, setStyleQuery] = useState('')
  const [, setHistTick] = useState(0)
  const [draggingLight, setDraggingLight] = useState<string | null>(null)
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number; char: string; hex: string; lum: number } | null>(null)
  const [recordDuration, setRecordDuration] = useState(3)
  const [audioActive, setAudioActive] = useState(false)
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({ volume: 0, bass: 0, mid: 0, treble: 0, rawFft: new Uint8Array(64) })
  const [videoPlaying, setVideoPlaying] = useState(true)
  const [videoTime, setVideoTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [showPromptSynth, setShowPromptSynth] = useState(false)
  const [synthPrompt, setSynthPrompt] = useState('Cyberpunk Samurai & Matrix Core')
  const [lensPos, setLensPos] = useState({ x: 260, y: 180 })
  const [draggingLens, setDraggingLens] = useState(false)
  const [customRampText, setCustomRampText] = useState(CHAR_RAMPS.custom.chars)
  const [calibratedBreakdown, setCalibratedBreakdown] = useState('')
  const [activeTool, setActiveTool] = useState<'none' | 'mask-brush' | 'mask-erase' | 'stamp'>('none')
  const [maskRadius, setMaskRadius] = useState(40)
  const [maskInvert, setMaskInvert] = useState(false)
  const [maskHasContent, setMaskHasContent] = useState(false)
  const [stampChar, setStampChar] = useState('█')
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas')
  const stampsRef = useRef<Map<string, { char: string; color?: string }>>(new Map())
  const [stampCount, setStampCount] = useState(0)
  const isPaintingRef = useRef(false)

  // Physics simulation cursor & mode
  const cursorRef = useRef<{ x: number; y: number; active: boolean; mode?: 'repel' | 'attract' | 'vortex' }>({
    x: -1, y: -1, active: false, mode: 'repel',
  })
  const [physicsForceMode, setPhysicsForceMode] = useState<'repel' | 'attract' | 'vortex'>('repel')

  // Audio file upload state
  const audioFileRef = useRef<HTMLInputElement>(null)
  const [audioFileName, setAudioFileName] = useState('')
  const [audioFilePlaying, setAudioFilePlaying] = useState(false)

  // Interactive Text Layers State
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ startX: number; startY: number; origX: number; origY: number; rectWidth: number; rectHeight: number } | null>(null)

  // Batch Export ZIP state
  const batchInputRef = useRef<HTMLInputElement>(null)
  const [batchFormats, setBatchFormats] = useState<BatchFormat[]>(['png', 'txt'])
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, name: '' })

  const previewRef = useRef<HTMLCanvasElement>(null)
  const origRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileImageRef = useRef<HTMLInputElement>(null)
  const fileVideoRef = useRef<HTMLInputElement>(null)
  const fileReplaceRef = useRef<HTMLInputElement>(null)
  const videoUrlRef = useRef<string | null>(null)
  const lastStatsRef = useRef(0)
  const lastAudioMetricsRef = useRef(0)
  const renderNowRef = useRef<(time: number) => void>(() => {})
  const streamRef = useRef<MediaStream | null>(null)
  const srcCanvasRef = useRef<HTMLCanvasElement | null>(null)
  if (!srcCanvasRef.current) srcCanvasRef.current = document.createElement('canvas')
  const gridRef = useRef<Grid | null>(null)
  const stageRef = useRef<HTMLElement>(null)

  // ---------- undo / redo ----------
  const undoStack = useRef<Settings[]>([])
  const redoStack = useRef<Settings[]>([])
  const lastPushRef = useRef(0)

  const pushHistory = useCallback((s: Settings) => {
    undoStack.current.push(cloneSettings(s))
    if (undoStack.current.length > 60) undoStack.current.shift()
    redoStack.current = []
    lastPushRef.current = Date.now()
    setHistTick((v) => v + 1)
  }, [])

  const pushHistoryThrottled = useCallback((s: Settings) => {
    if (Date.now() - lastPushRef.current > 600) pushHistory(s)
  }, [pushHistory])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(cloneSettings(settingsRef.current))
    setSettings(prev)
    setHistTick((v) => v + 1)
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(cloneSettings(settingsRef.current))
    setSettings(next)
    setHistTick((v) => v + 1)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2600)
  }, [])

  const addTextLayer = useCallback((preset?: Partial<TextLayer>) => {
    const newId = 'layer-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
    const newLayer: TextLayer = {
      id: newId,
      text: preset?.text || 'OVERLAY TEXT',
      x: preset?.x ?? 0.5,
      y: preset?.y ?? 0.5,
      fontSize: preset?.fontSize ?? 20,
      fontFamily: preset?.fontFamily ?? 'monospace',
      color: preset?.color ?? '#00f0ff',
      bgColor: preset?.bgColor ?? 'rgba(5, 5, 12, 0.8)',
      bgPadding: preset?.bgPadding ?? 6,
      bgRadius: preset?.bgRadius ?? 4,
      blendMode: preset?.blendMode ?? 'screen',
      opacity: preset?.opacity ?? 0.95,
      rotation: preset?.rotation ?? 0,
      border: preset?.border ?? true,
      borderColor: preset?.borderColor ?? '#00f0ff',
      enabled: true,
    }
    setSettings((prev) => ({
      ...prev,
      layers: [...(prev.layers || []), newLayer],
    }))
    setSelectedLayerId(newId)
    setTab('layers')
    showToast('Added new text overlay layer')
  }, [showToast])

  const updateTextLayer = useCallback((id: string, patchObj: Partial<TextLayer>) => {
    setSettings((prev) => ({
      ...prev,
      layers: (prev.layers || []).map((l) => (l.id === id ? { ...l, ...patchObj } : l)),
    }))
  }, [])

  const removeTextLayer = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      layers: (prev.layers || []).filter((l) => l.id !== id),
    }))
    setSelectedLayerId((prev) => (prev === id ? null : prev))
    showToast('Removed text overlay layer')
  }, [showToast])

  const duplicateTextLayer = useCallback((id: string) => {
    const l = settingsRef.current.layers?.find((x) => x.id === id)
    if (!l) return
    const dupId = 'layer-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7)
    const dup: TextLayer = {
      ...l,
      id: dupId,
      x: Math.min(0.9, l.x + 0.04),
      y: Math.min(0.9, l.y + 0.04),
    }
    setSettings((prev) => ({
      ...prev,
      layers: [...(prev.layers || []), dup],
    }))
    setSelectedLayerId(dupId)
    showToast('Duplicated layer')
  }, [showToast])

  const moveTextLayer = useCallback((id: string, dir: 'up' | 'down') => {
    setSettings((prev) => {
      const list = [...(prev.layers || [])]
      const idx = list.findIndex((x) => x.id === id)
      if (idx === -1) return prev
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= list.length) return prev
      const temp = list[idx]
      list[idx] = list[targetIdx]
      list[targetIdx] = temp
      return { ...prev, layers: list }
    })
  }, [])

  const patch = useCallback((p: Partial<Settings>) => {
    pushHistoryThrottled(settingsRef.current)
    setSettings((s) => ({ ...s, ...p }))
  }, [pushHistoryThrottled])

  const patchFx = useCallback((id: FxId, p: Partial<{ enabled: boolean; intensity: number }>) => {
    pushHistoryThrottled(settingsRef.current)
    setSettings((s) => ({ ...s, fx: { ...s.fx, [id]: { ...s.fx[id], ...p } } }))
  }, [pushHistoryThrottled])

  const applyRecipe = useCallback((id: string) => {
    const r = RECIPES.find((x) => x.id === id)
    if (!r) return
    pushHistory(settingsRef.current)
    setSettings((s) => {
      const next = cloneSettings(s)
      const { fx, ...rest } = r.patch as { fx?: Partial<Record<FxId, { enabled: boolean; intensity: number }>> } & Partial<Settings>
      Object.assign(next, rest)
      if (fx) {
        for (const [k, v] of Object.entries(fx)) {
          next.fx[k as FxId] = { ...next.fx[k as FxId], ...v }
        }
      }
      return next
    })
    showToast(`Recipe applied: ${r.name}`)
  }, [pushHistory, showToast])

  // ---------- source loading ----------

  const drawToSource = useCallback((draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) => {
    const src = srcCanvasRef.current!
    const [fw, fh] = fitDims(w, h)
    src.width = fw
    src.height = fh
    const ctx = src.getContext('2d')!
    draw(ctx, fw, fh)

    if (maskCanvasRef.current) {
      maskCanvasRef.current.width = fw
      maskCanvasRef.current.height = fh
      const mctx = maskCanvasRef.current.getContext('2d')
      mctx?.clearRect(0, 0, fw, fh)
    }
    setMaskHasContent(false)
    stampsRef.current.clear()
    setStampCount(0)
  }, [])

  const stopVideo = useCallback(() => {
    const v = videoRef.current
    if (v) {
      v.onloadedmetadata = null
      v.onerror = null
      v.onseeked = null
      v.pause()
      v.srcObject = null
      v.removeAttribute('src')
      v.load()
    }
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current)
      videoUrlRef.current = null
    }
    setVideoPlaying(false)
    setVideoTime(0)
    setVideoDuration(0)
  }, [])

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    stopVideo()
  }, [stopVideo])

  const loadSample = useCallback((id: string) => {
    const s = SAMPLES.find((x) => x.id === id)
    if (!s) return
    stopWebcam()
    activePieceRenderRef.current = null
    setActivePieceMeta(null)
    const c = s.make()
    drawToSource((ctx, w, h) => ctx.drawImage(c, 0, 0, w, h), c.width, c.height)
    setSource({ kind: 'sample', name: s.name })
  }, [drawToSource, stopWebcam])

  const handleGenerateProcedural = useCallback((promptText: string) => {
    stopWebcam()
    const gen = generateProceduralCanvas(promptText, 960, 640)
    drawToSource((ctx, w, h) => ctx.drawImage(gen, 0, 0, w, h), gen.width, gen.height)
    setSource({ kind: 'image', name: `Synth · ${promptText.slice(0, 22)}` })
    showToast(`Synthesized art: ${promptText}`)
    setShowPromptSynth(false)
  }, [drawToSource, stopWebcam, showToast])

  const loadImageFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      stopWebcam()
      drawToSource((ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), img.naturalWidth, img.naturalHeight)
      setSource({ kind: 'image', name: file.name })
      URL.revokeObjectURL(url)
      showToast(`Loaded image: ${file.name}`)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      showToast('Could not read that image file')
    }
    img.src = url
  }, [drawToSource, stopWebcam, showToast])

  const loadVideoFile = useCallback((file: File) => {
    stopWebcam()
    const url = URL.createObjectURL(file)
    videoUrlRef.current = url
    const v = videoRef.current
    if (!v) return
    v.srcObject = null
    v.src = url
    v.loop = true
    v.muted = true
    v.onloadedmetadata = () => {
      const [fw, fh] = fitDims(v.videoWidth, v.videoHeight)
      const src = srcCanvasRef.current!
      src.width = fw
      src.height = fh
      if (maskCanvasRef.current) {
        maskCanvasRef.current.width = fw
        maskCanvasRef.current.height = fh
        const mctx = maskCanvasRef.current.getContext('2d')
        mctx?.clearRect(0, 0, fw, fh)
      }
      setMaskHasContent(false)
      stampsRef.current.clear()
      setStampCount(0)
      v.play().catch(() => undefined)
      setSource({ kind: 'video', name: file.name })
      setVideoPlaying(true)
      setVideoDuration(v.duration || 0)
      showToast(`Loaded video: ${file.name}`)
    }
    v.onseeked = () => {
      const src = srcCanvasRef.current
      if (v && v.readyState >= 2 && src) {
        const sctx = src.getContext('2d')
        sctx?.drawImage(v, 0, 0, src.width, src.height)
        renderNowRef.current(performance.now())
      }
    }
    v.onerror = () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current)
        videoUrlRef.current = null
      }
      showToast('Could not read that video file')
    }
  }, [stopWebcam, showToast])

  const loadAnimatedPiece = useCallback(async (meta: AnimatedPieceMeta) => {
    stopWebcam()
    if (audioActive) {
      audioEngine.stop()
      setAudioActive(false)
      setAudioFileName('')
      setAudioFilePlaying(false)
    }
    try {
      const { render } = await loadPieceRenderer(meta.slug)
      activePieceRenderRef.current = render
      setActivePieceMeta(meta)
      const frame0 = render(0, 0)
      const src = srcCanvasRef.current!
      renderFrameToCanvas(src, frame0, meta, { scale: 1.0 })
      setSource({ kind: 'animation', name: meta.name })
      setView('studio')
      setShowAnimatedLibrary(false)
      showToast(`Imported "${meta.name}" into Studio! Tune 3D lights, CRT shaders, or export GIF/video.`)
    } catch (err) {
      console.error('Failed to import animated piece:', err)
      showToast('Could not load animation into Studio')
    }
  }, [stopWebcam, audioActive, showToast])

  const clearMedia = useCallback(() => {
    stopWebcam()
    if (audioActive) {
      audioEngine.stop()
      setAudioActive(false)
      setAudioFileName('')
      setAudioFilePlaying(false)
    }
    activePieceRenderRef.current = null
    setActivePieceMeta(null)
    loadSample('tropical')
    if (fileImageRef.current) fileImageRef.current.value = ''
    if (fileVideoRef.current) fileVideoRef.current.value = ''
    if (fileReplaceRef.current) fileReplaceRef.current.value = ''
    showToast('Media removed — canvas restored to default sample')
  }, [stopWebcam, audioActive, loadSample, showToast])

  const handleReplaceMedia = useCallback((file: File) => {
    if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|mkv|avi|wmv|flv)$/i.test(file.name)) {
      loadVideoFile(file)
    } else {
      loadImageFile(file)
    }
  }, [loadVideoFile, loadImageFile])

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 } } })
      streamRef.current = stream
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      v.muted = true
      v.onloadedmetadata = () => {
        const [fw, fh] = fitDims(v.videoWidth, v.videoHeight)
        const src = srcCanvasRef.current!
        src.width = fw
        src.height = fh
        v.play().catch(() => undefined)
        setSettings((prev) => ({ ...prev, flipH: true }))
        setSource({ kind: 'webcam', name: 'Live Camera Mirror' })
        showToast('📷 Live camera mirror stream active')
      }
    } catch {
      showToast('Webcam unavailable — check camera permission')
    }
  }, [showToast])

  const captureWebcamSnapshot = useCallback(() => {
    const v = videoRef.current
    const src = srcCanvasRef.current
    if (!src) return
    if (v && v.readyState >= 2) {
      const sctx = src.getContext('2d')
      if (sctx) sctx.drawImage(v, 0, 0, src.width, src.height)
    }
    stopWebcam()
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setSource({ kind: 'image', name: `Camera Snapshot (${nowStr})` })
    showToast('📸 Instant snapshot captured! You can now edit, filter, or export.')
  }, [stopWebcam, showToast])

  // ---------- render pipeline ----------

  const renderNow = useCallback((time: number) => {
    const src = srcCanvasRef.current
    const out = previewRef.current
    if (!src || !out || src.width === 0) return
    const s = cloneSettings(settingsRef.current)
    const t0 = performance.now()
    const aspect = src.width / src.height
    let cols = s.cols
    let glitchSeed = s.glitchSeed
    let effectiveTime = time

    if (s.audioReactive?.enabled && audioActive) {
      const metrics = audioEngine.getMetrics()
      const nowMetrics = performance.now()
      if (nowMetrics - lastAudioMetricsRef.current > 50) {
        lastAudioMetricsRef.current = nowMetrics
        setAudioMetrics(metrics)
      }
      const masterSens = (s.audioReactive.sensitivity ?? 50) / 100

      const applyBandTarget = (energy: number, target: AudioTarget | undefined) => {
        if (!target || target === 'none' || energy <= 0.015) return
        if (target === 'cols') {
          const pulse = Math.round((energy - 0.2) * s.cols * 0.45)
          cols = Math.max(40, Math.min(300, cols + pulse))
        } else if (target === 'bloom') {
          const boost = Math.round(energy * 90)
          s.fx.bloom = { enabled: true, intensity: Math.min(100, (s.fx.bloom?.intensity ?? 40) + boost) }
          s.fx.charBloom = { enabled: true, intensity: Math.min(100, (s.fx.charBloom?.intensity ?? 40) + boost) }
        } else if (target === 'glitch') {
          if (energy > 0.22) {
            s.fx.glitch = { enabled: true, intensity: Math.min(100, Math.round(energy * 100)) }
            glitchSeed += Math.floor(energy * 30)
          }
        } else if (target === 'light') {
          s.lightingEnabled = true
          const boost = energy * 1.8
          s.lights = s.lights.map((l) => ({ ...l, intensity: Math.min(200, Math.round(l.intensity * (1 + boost))) }))
        } else if (target === 'contrast') {
          const boost = Math.round((energy - 0.2) * 55)
          s.contrast = Math.max(40, Math.min(200, s.contrast + boost))
        } else if (target === 'speed') {
          effectiveTime += energy * 4
          glitchSeed += Math.floor(energy * 20)
        }
      }

      if (s.audioReactive.mode === 'master') {
        const energy = s.audioReactive.target === 'bloom'
          ? metrics.bass * masterSens
          : s.audioReactive.target === 'glitch'
          ? (metrics.volume > 0.35 ? metrics.volume * masterSens : 0)
          : s.audioReactive.target === 'light'
          ? metrics.mid * masterSens
          : metrics.volume * masterSens
        applyBandTarget(energy, s.audioReactive.target)
      } else {
        const bSens = ((s.audioReactive.bassSens ?? 60) / 100) * masterSens * 1.5
        const mSens = ((s.audioReactive.midSens ?? 50) / 100) * masterSens * 1.5
        const tSens = ((s.audioReactive.trebleSens ?? 50) / 100) * masterSens * 1.5

        applyBandTarget(metrics.bass * bSens, s.audioReactive.bassTarget ?? 'light')
        applyBandTarget(metrics.mid * mSens, s.audioReactive.midTarget ?? 'bloom')
        applyBandTarget(metrics.treble * tSens, s.audioReactive.trebleTarget ?? 'cols')
      }
    }

    const dims = sampleDims(cols, aspect, s.mode)
    const warp = WARP_MODES[s.mode] ?? null
    const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
      brightness: s.brightness,
      contrast: s.contrast,
      saturation: s.saturation,
      gamma: s.gamma,
      invert: s.invert,
    }, warp, 0.6, s.lut)
    applyLightingToGrid(grid, s)
    gridRef.current = grid
    renderGrid(out, grid, s, { time: effectiveTime, seed: glitchSeed, src, stamps: stampsRef.current, cursor: cursorRef.current })
    applyEffects(out, s, effectiveTime)

    if (maskHasContent && maskCanvasRef.current) {
      const pctx = out.getContext('2d')
      if (pctx) {
        pctx.save()
        pctx.globalCompositeOperation = maskInvert ? 'destination-out' : 'destination-in'
        pctx.drawImage(maskCanvasRef.current, 0, 0, out.width, out.height)
        pctx.restore()
      }
    }

    if (recordingRef.current && s.layers && s.layers.length > 0) {
      renderTextLayers(out, s.layers)
    }

    const orig = origRef.current
    if (orig) {
      orig.width = out.width
      orig.height = out.height
      const octx = orig.getContext('2d')
      if (octx) {
        octx.save()
        if (s.dualCompare) {
          const sB = cloneSettings(s)
          sB.mode = s.compareMode || 'dither'
          const dimsB = sampleDims(cols, aspect, sB.mode)
          const warpB = WARP_MODES[sB.mode] ?? null
          const gridB = sampleGrid(src, src.width, src.height, dimsB.cols, dimsB.rows, {
            brightness: sB.brightness,
            contrast: sB.contrast,
            saturation: sB.saturation,
            gamma: sB.gamma,
            invert: sB.invert,
          }, warpB, 0.6, sB.lut)
          applyLightingToGrid(gridB, sB)
          renderGrid(orig, gridB, sB, { time, seed: glitchSeed, src })
          applyEffects(orig, sB, time)
        } else {
          octx.fillStyle = s.bg
          octx.fillRect(0, 0, orig.width, orig.height)
          octx.translate(orig.width / 2, orig.height / 2)
          if (s.rotation) octx.rotate((s.rotation * Math.PI) / 180)
          octx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1)
          const isRot90 = s.rotation === 90 || s.rotation === 270
          const drawW = isRot90 ? orig.height : orig.width
          const drawH = isRot90 ? orig.width : orig.height
          octx.drawImage(src, -drawW / 2, -drawH / 2, drawW, drawH)
        }
        octx.restore()
      }
    }
    const nowStats = performance.now()
    if (time === 0 || nowStats - lastStatsRef.current > 250) {
      lastStatsRef.current = nowStats
      setStats({ ms: Math.round((nowStats - t0) * 10) / 10, cols: grid.cols, rows: grid.rows, px: out.width * out.height })
    }
  }, [audioActive, maskHasContent, maskInvert])
  renderNowRef.current = renderNow

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current)
        videoUrlRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  const isLive = source.kind === 'video' || source.kind === 'webcam' || source.kind === 'animation' || audioActive || settings.mode === 'matrix-rain' || settings.mode === 'matrix-cascade' || settings.mode === 'ascii-particles' || settings.fx.vhsTracking.enabled
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (t: number) => {
      const v = videoRef.current
      if (v && v.readyState >= 2 && !v.paused && source.kind === 'video') {
        const src = srcCanvasRef.current!
        const sctx = src.getContext('2d')!
        sctx.drawImage(v, 0, 0, src.width, src.height)
        setVideoTime(v.currentTime)
        setVideoDuration(v.duration || 0)
        setVideoPlaying(!v.paused)
      } else if (source.kind === 'animation' && activePieceRenderRef.current && activePieceMeta) {
        const frame = activePieceRenderRef.current(t / 1000)
        const src = srcCanvasRef.current!
        renderFrameToCanvas(src, frame, activePieceMeta, { scale: 1.0 })
      }
      const interval = 1000 / settingsRef.current.fps
      if (t - last >= interval) {
        last = t
        renderNow(t / 1000)
      }
      raf = requestAnimationFrame(tick)
    }
    if (isLive) {
      raf = requestAnimationFrame(tick)
    } else {
      renderNow(0)
    }
    return () => cancelAnimationFrame(raf)
  }, [renderNow, isLive, source.kind])

  // re-render when settings or source change (static sources)
  useEffect(() => {
    if (!isLive) renderNow(0)
  }, [settings, isLive, renderNow, source])

  // render once when entering the studio from the landing page
  useEffect(() => {
    if (view === 'studio' && !isLive) renderNow(0)
  }, [view, isLive, renderNow])

  // switching views always starts at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // a file picked on the landing page loads once the studio is mounted
  const openWithFile = useCallback((f: File) => {
    pendingFileRef.current = f
    setView('studio')
  }, [])
  useEffect(() => {
    if (view === 'studio' && pendingFileRef.current) {
      const f = pendingFileRef.current
      pendingFileRef.current = null
      loadImageFile(f)
    }
  }, [view, loadImageFile])

  // default sample on first mount
  useEffect(() => {
    loadSample('tropical')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // paste to upload
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      const f = files[0]
      if (!f) return
      if (f.type.startsWith('image/')) loadImageFile(f)
      else if (f.type.startsWith('video/')) loadVideoFile(f)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [loadImageFile, loadVideoFile])

  useEffect(() => () => stopWebcam(), [stopWebcam])

  // ---------- exports ----------

  const withGrid = useCallback(<T,>(fn: (g: Grid) => Promise<T> | T): Promise<T | null> => {
    const g = gridRef.current
    if (!g) {
      showToast('Nothing to export yet')
      return Promise.resolve(null)
    }
    return Promise.resolve(fn(g))
  }, [showToast])

  const doExportPNG = useCallback(async (scale: number) => {
    setExporting(true)
    try {
      const mCanvas = maskHasContent ? maskCanvasRef.current : null
      const blob = await withGrid((g) => exportPNG(g, settingsRef.current, scale, 0, srcCanvasRef.current, mCanvas, maskInvert, stampsRef.current))
      if (blob) {
        downloadBlob(blob, `ascii-studio-${scale}x.png`)
        showToast(`PNG exported at ${scale}x`)
      }
    } catch (e) {
      showToast(`PNG export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }, [withGrid, showToast, maskHasContent, maskInvert])

  const doExportJPG = useCallback(async () => {
    setExporting(true)
    try {
      const mCanvas = maskHasContent ? maskCanvasRef.current : null
      const blob = await withGrid((g) => exportJPG(g, settingsRef.current, 1, 0, srcCanvasRef.current, mCanvas, maskInvert, stampsRef.current))
      if (blob) {
        downloadBlob(blob, 'ascii-studio.jpg')
        showToast('JPG exported')
      }
    } catch (e) {
      showToast(`JPG export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }, [withGrid, showToast, maskHasContent, maskInvert])

  const doExportWebP = useCallback(async () => {
    setExporting(true)
    try {
      const mCanvas = maskHasContent ? maskCanvasRef.current : null
      const blob = await withGrid((g) => exportWebP(g, settingsRef.current, 1, 0, srcCanvasRef.current, mCanvas, maskInvert, stampsRef.current))
      if (blob) {
        downloadBlob(blob, 'ascii-studio.webp')
        showToast('WebP exported')
      }
    } catch (e) {
      showToast(`WebP export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }, [withGrid, showToast, maskHasContent, maskInvert])

  const doExportSized = useCallback(async (w: number, h: number, label: string) => {
    setExporting(true)
    try {
      const mCanvas = maskHasContent ? maskCanvasRef.current : null
      const blob = await withGrid((g) => exportSized(g, settingsRef.current, w, h, 0, srcCanvasRef.current, mCanvas, maskInvert, stampsRef.current))
      if (blob) {
        downloadBlob(blob, `ascii-studio-${label}.png`)
        showToast(`${label} exported (${w}×${h})`)
      }
    } catch (e) {
      showToast(`${label} export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }, [withGrid, showToast, maskHasContent, maskInvert])

  const doExportGIF = useCallback(async () => {
    setExporting(true)
    try {
      const mCanvas = maskHasContent ? maskCanvasRef.current : null
      const blob = await withGrid((g) => exportGIF(g, settingsRef.current, 12, 100, srcCanvasRef.current, mCanvas, maskInvert, stampsRef.current))
      if (blob) {
        downloadBlob(blob, 'ascii-studio.gif')
        showToast('Animated GIF exported (12 frames)')
      }
    } catch (e) {
      showToast(`GIF export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setExporting(false)
    }
  }, [withGrid, showToast, maskHasContent, maskInvert])

  const doRecordVideo = useCallback(async () => {
    const canvas = previewRef.current
    if (!canvas) return
    setRecording(true)
    showToast(`Recording ${recordDuration} seconds of the live preview…`)
    try {
      const audioStream = audioActive ? audioEngine.getAudioStream() : null
      const { blob, ext } = await recordVideo(canvas, recordDuration, settingsRef.current.fps, audioStream)
      downloadBlob(blob, `ascii-studio.${ext}`)
      showToast(`Video exported as .${ext}`)
    } catch (e) {
      showToast(`Video export failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setRecording(false)
    }
  }, [showToast, recordDuration])

  const doExportSVG = useCallback(() => {
    const g = gridRef.current
    if (!g) return
    downloadText(exportSVG(g, settingsRef.current, stampsRef.current), 'ascii-studio.svg', 'image/svg+xml')
    showToast('Vector SVG exported')
  }, [showToast])

  const doExportANSI = useCallback(() => {
    const g = gridRef.current
    if (!g) return
    downloadText(exportANSI(g, settingsRef.current, stampsRef.current), 'ascii-studio.ans', 'text/plain')
    showToast('24-bit ANSI terminal art downloaded as .ans')
  }, [showToast])

  const copyAnsiCommand = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    const ansi = exportANSI(g, settingsRef.current, stampsRef.current)
    const cmd = `cat << 'EOF'\n${ansi}\nEOF`
    await copyTextToClipboard(cmd)
    showToast('Shell cat command copied — paste directly into terminal!')
  }, [showToast])

  const copyMarkdown = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(exportMarkdown(g, settingsRef.current, stampsRef.current))
    showToast('Markdown codeblock copied')
  }, [showToast])

  const copyReactComponent = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(exportReactComponent(g, settingsRef.current, stampsRef.current))
    showToast('React <AsciiArt /> component copied to clipboard')
  }, [showToast])

  const copyWebComponent = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(exportWebComponent(g, settingsRef.current, stampsRef.current))
    showToast('Web Component / HTML embed snippet copied')
  }, [showToast])

  const copyPythonScript = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(exportPythonScript(g, settingsRef.current, stampsRef.current))
    showToast('Python CLI script copied')
  }, [showToast])

  const copyCHeader = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(exportCHeader(g, settingsRef.current, stampsRef.current))
    showToast('C/C++ header literal copied')
  }, [showToast])

  const doExportJSON = useCallback(() => {
    const g = gridRef.current
    if (!g) return
    downloadText(exportJSON(g, settingsRef.current), 'ascii-studio-grid.json', 'application/json')
    showToast('JSON Grid matrix downloaded')
  }, [showToast])

  const surpriseMe = useCallback(() => {
    pushHistory(settingsRef.current)
    const randomMode = MODES[Math.floor(Math.random() * MODES.length)]
    const randomLut = COLOR_LUTS[Math.floor(Math.random() * COLOR_LUTS.length)].id
    const charRampKeys = Object.keys(CHAR_RAMPS)
    const randomRamp = charRampKeys[Math.floor(Math.random() * charRampKeys.length)]
    const ditherPalKeys = Object.keys(DITHER_PALETTES) as (keyof typeof DITHER_PALETTES)[]
    const randomPal = ditherPalKeys[Math.floor(Math.random() * ditherPalKeys.length)]
    const randomFx: Record<FxId, FxState> = JSON.parse(JSON.stringify(DEFAULT_FX))
    const fxKeys = Object.keys(randomFx) as FxId[]
    const pick1 = fxKeys[Math.floor(Math.random() * fxKeys.length)]
    const pick2 = fxKeys[Math.floor(Math.random() * fxKeys.length)]
    randomFx[pick1] = { enabled: true, intensity: 30 + Math.floor(Math.random() * 45) }
    randomFx[pick2] = { enabled: true, intensity: 25 + Math.floor(Math.random() * 40) }

    setSettings((prev) => ({
      ...prev,
      mode: randomMode.id,
      lut: randomLut,
      charSet: randomRamp,
      ditherPalette: randomPal,
      contrast: 105 + Math.floor(Math.random() * 25),
      saturation: 110 + Math.floor(Math.random() * 40),
      fx: randomFx,
    }))
    showToast(`🎲 Surprise: ${randomMode.label} + ${randomLut !== 'none' ? randomLut : 'natural'}`)
  }, [pushHistory, showToast])

  const resetSettings = useCallback(() => {
    pushHistory(settingsRef.current)
    setSettings(cloneSettings(DEFAULT_SETTINGS))
    showToast('All settings reset to defaults')
  }, [pushHistory, showToast])

  const doExportHTML = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    setExporting(true)
    try {
      const s = settingsRef.current
      if (isTextMode(s.mode)) {
        downloadText(exportHTML(g, s, undefined, stampsRef.current), 'ascii-studio.html', 'text/html')
        showToast('Colour HTML exported')
      } else {
        const blob = await exportPNG(g, s, 1, 0, srcCanvasRef.current, null, false, stampsRef.current)
        const dataUrl = await new Promise<string>((res) => {
          const r = new FileReader()
          r.onload = () => res(String(r.result))
          r.readAsDataURL(blob)
        })
        downloadText(exportHTML(g, s, dataUrl, stampsRef.current), 'ascii-studio.html', 'text/html')
        showToast('HTML exported (with embedded image)')
      }
    } finally {
      setExporting(false)
    }
  }, [showToast])

  const doExportTXT = useCallback(() => {
    const g = gridRef.current
    if (!g) return
    downloadText(exportTXT(g, settingsRef.current, stampsRef.current), 'ascii-studio.txt')
    showToast('Text art downloaded as .txt')
  }, [showToast])

  const copyText = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    await copyTextToClipboard(textArt(g, settingsRef.current, stampsRef.current))
    showToast('Text art copied to clipboard')
  }, [showToast])

  const copyImage = useCallback(async () => {
    const g = gridRef.current
    if (!g) return
    try {
      const canvas = renderExportCanvas(
        g,
        settingsRef.current,
        1,
        0,
        srcCanvasRef.current,
        maskCanvasRef.current,
        maskInvert,
        stampsRef.current,
      )
      await copyCanvasToClipboard(canvas)
      showToast('Image copied to clipboard')
    } catch {
      showToast('Image copy needs clipboard permission in this browser')
    }
  }, [maskInvert, showToast])

  const copyShareLink = useCallback(async () => {
    await copyTextToClipboard(shareLink(settingsRef.current))
    showToast('Share link copied — it encodes every setting')
  }, [showToast])

  const copyRecipeCode = useCallback(async () => {
    await copyTextToClipboard(encodeSettings(settingsRef.current))
    showToast('Recipe code copied — paste it back in Load recipe')
  }, [showToast])

  const handleAudioFileUpload = useCallback(async (file: File) => {
    patch({ audioReactive: { ...settingsRef.current.audioReactive, enabled: true, source: 'file' } })
    const ok = await audioEngine.startAudioFile(file)
    if (ok) {
      setAudioActive(true)
      setAudioFileName(file.name)
      setAudioFilePlaying(true)
      showToast(`🎵 Playing "${file.name}" — ASCII reacting to music`)
    } else {
      showToast('Could not decode audio file — try an MP3 or WAV')
    }
  }, [patch, showToast])

  const doBatchExport = useCallback(async (filesToProcess: File[]) => {
    if (filesToProcess.length === 0) return
    setBatchProcessing(true)
    try {
      showToast(`Processing & packaging ${filesToProcess.length} images into ASCII ZIP…`)
      const zipBlob = await processBatchImagesToZip(filesToProcess, settingsRef.current, batchFormats, (curr, tot, name) => {
        setBatchProgress({ current: curr, total: tot, name })
      })
      downloadBlob(zipBlob, `ascii-studio-batch-${Date.now()}.zip`)
      showToast(`✅ Successfully exported ${filesToProcess.length} images to ZIP archive!`)
    } catch (err) {
      showToast(`Batch export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBatchProcessing(false)
    }
  }, [batchFormats, showToast])

  const loadRecipeCode = useCallback(() => {
    const s = decodeSettings(recipeCode.trim())
    if (!s) {
      showToast('That recipe code did not decode')
      return
    }
    pushHistory(settingsRef.current)
    setSettings({ ...cloneSettings(DEFAULT_SETTINGS), ...s })
    showToast('Recipe code loaded')
  }, [recipeCode, showToast, pushHistory])

  // drag-drop anywhere on the window
  useEffect(() => {
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onDragEnter = (e: DragEvent) => {
      if (hasFile(e)) {
        e.preventDefault()
        setDragOver(true)
      }
    }
    const onDragOver = (e: DragEvent) => {
      if (hasFile(e)) e.preventDefault()
    }
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragOver(false)
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      if (files.length > 1 && files.every((file) => file.type.startsWith('image/'))) {
        void doBatchExport(files)
        return
      }
      const f = files[0]
      if (f.type.startsWith('image/')) loadImageFile(f)
      else if (f.type.startsWith('video/')) loadVideoFile(f)
      else if (f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(f.name)) void handleAudioFileUpload(f)
      else showToast('Drop an image, video, or audio file')
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [loadImageFile, loadVideoFile, handleAudioFileUpload, doBatchExport, showToast])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void stageRef.current?.requestFullscreen()
    }
  }, [])

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const k = e.key.toLowerCase()
        if (k === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if ((k === 'z' && e.shiftKey) || k === 'y') {
          e.preventDefault()
          redo()
        }
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'e') void doExportPNG(1)
      else if (k === 'c') void copyText()
      else if (k === 'b') setCompare((v) => !v)
      else if (k === '?') setShowShortcuts((v) => !v)
      else if (k === 'f') toggleFullscreen()
      else if (k === '+' || k === '=') setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))
      else if (k === '-') setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
      else if (k === '0') setZoom(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doExportPNG, copyText, undo, redo, toggleFullscreen])

  // in-browser self-test (?selftest=1): mounts, renders, switches styles, exports
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('selftest')) return
    const run = async () => {
      const results: Record<string, unknown> = {}
      try {
        const t0 = performance.now()
        renderNow(0)
        results.mount = !!previewRef.current && previewRef.current.width > 0
        results.initialRenderMs = Math.round(performance.now() - t0)
        const g0 = gridRef.current
        results.grid = g0 ? `${g0.cols}x${g0.rows}` : null
        results.textArtLen = g0 ? textArt(g0, settingsRef.current).length : 0
        // switch styles and re-render, including new elite modes
        for (const m of ['dither', 'pixel', 'braille', 'emoji', 'ledmatrix', 'thermal', 'cyberterminal', 'matrix-rain', 'lego', 'voxel', 'braille-dense', 'ironbow-flir', 'ascii-cinematic', 'ascii-terrain-3d', 'matrix-cascade', 'ascii-particles'] as ModeId[]) {
          setSettings((s) => ({ ...s, mode: m }))
          if (m === 'ascii-particles') {
            cursorRef.current = { x: 120, y: 120, active: true, mode: 'repel' }
          }
          await new Promise((r) => setTimeout(r, 120))
          renderNow(0)
          results[`mode_${m}`] = !!(gridRef.current && previewRef.current && previewRef.current.width > 0)
        }
        // Test client-side ZIP generator
        const testZipBlob = createZip([
          { name: 'test.txt', data: new TextEncoder().encode('ASCII Studio PKZIP') },
          { name: 'sample.json', data: new TextEncoder().encode('{"valid":true}') },
        ])
        results.batchZipGeneratorOk = testZipBlob.size > 80
        // Test client-side procedural synthesis engine
        const synthCanvas = generateProceduralCanvas('Cyberpunk Samurai & Matrix Core', 320, 240)
        results.proceduralSynthOk = synthCanvas && synthCanvas.width === 320 && synthCanvas.height === 240
        // Braille export verification test
        setSettings((s) => ({ ...s, mode: 'braille-dense' }))
        await new Promise((r) => setTimeout(r, 120))
        renderNow(0)
        const bg = gridRef.current
        if (bg) {
          const bsvg = exportSVG(bg, settingsRef.current)
          const bansi = exportANSI(bg, settingsRef.current)
          results.brailleSvgHasUnicode = /[\u2800-\u28ff]/.test(bsvg)
          results.brailleAnsiHasUnicode = /[\u2800-\u28ff]/.test(bansi)
        }
        setSettings((s) => ({ ...s, mode: 'characters' }))
        await new Promise((r) => setTimeout(r, 180))
        renderNow(0)
        // tools tab mounts
        setTab('tools')
        await new Promise((r) => setTimeout(r, 300))
        results.toolsTab = !!document.querySelector('.tools-panel')
        setTab('tune')
        await new Promise((r) => setTimeout(r, 200))
        const g = gridRef.current
        if (g) {
          const blob = await exportPNG(g, settingsRef.current, 1, 0, srcCanvasRef.current)
          results.pngBlobBytes = blob.size
          const gif = await exportGIF(g, settingsRef.current, 3, 100, srcCanvasRef.current)
          results.gifBlobBytes = gif.size
          const webp = await exportWebP(g, settingsRef.current, 1, 0, srcCanvasRef.current)
          results.webpBlobBytes = webp.size
          const sized = await exportSized(g, settingsRef.current, 1920, 1080, 0, srcCanvasRef.current)
          results.sizedBlobBytes = sized.size
          results.svgLen = exportSVG(g, settingsRef.current).length
          results.ansiLen = exportANSI(g, settingsRef.current).length
          results.markdownLen = exportMarkdown(g, settingsRef.current).length
          results.jsonLen = exportJSON(g, settingsRef.current).length

          const testStamps = new Map([['0,0', { char: '★' }]])
          const stampedArt = textArt(g, settingsRef.current, testStamps)
          results.stampInTextExport = stampedArt.startsWith('★')
          results.reactComponentLen = exportReactComponent(g, settingsRef.current, testStamps).length
          results.webComponentLen = exportWebComponent(g, settingsRef.current, testStamps).length
          results.pythonScriptLen = exportPythonScript(g, settingsRef.current, testStamps).length
          results.cHeaderLen = exportCHeader(g, settingsRef.current, testStamps).length
        }
        const testLayerCanvas = document.createElement('canvas')
        testLayerCanvas.width = 200
        testLayerCanvas.height = 100
        renderTextLayers(testLayerCanvas, [
          {
            id: 'selftest-layer',
            text: 'SELFTEST',
            x: 0.5,
            y: 0.5,
            fontSize: 16,
            fontFamily: 'monospace',
            color: '#00f0ff',
            bgColor: '#000000',
            bgPadding: 4,
            bgRadius: 2,
            blendMode: 'normal',
            opacity: 1,
            rotation: 0,
            border: true,
            borderColor: '#00f0ff',
            enabled: true,
          },
        ])
        const tctx = testLayerCanvas.getContext('2d')
        const tpix = tctx ? tctx.getImageData(100, 50, 1, 1).data : null
        results.layersEngineOk = !!tpix && tpix[3] > 0
        const m = audioEngine.getMetrics()
        results.multiBandAudioOk = typeof m.bass === 'number' && typeof m.mid === 'number' && typeof m.treble === 'number'
        const cal = calibrateCharsetDensity('.-#@')
        results.calibrateOk = cal.sorted.length >= 4
        results.shareLinkLen = shareLink(settingsRef.current).length
        const donutPiece = NATIVE_PIECES.find((p) => p.meta.slug === 'donut-3d')
        const rickrollPiece = NATIVE_PIECES.find((p) => p.meta.slug === 'rickroll-dance')
        const hologramPiece = NATIVE_PIECES.find((p) => p.meta.slug === 'cyber-hologram')
        const waterfallPiece = NATIVE_PIECES.find((p) => p.meta.slug === 'waterfall-cascade')
        results.animatedArtOk = !!donutPiece && !!rickrollPiece && !!hologramPiece && !!waterfallPiece
        const visText = renderVisualizerToText(DEFAULT_VISUALIZER_CONFIG, 0)
        results.visualizerEngineOk = visText.length > 50
        const visAnsi = renderVisualizerToText({ ...DEFAULT_VISUALIZER_CONFIG, mode: 'mandelbrot' }, 0, undefined, undefined, undefined, 'ansi')
        results.visualizerMandelbrotOk = visAnsi.includes('\x1b[')
        if (donutPiece) {
          const frame = donutPiece.create()(0, 0)
          results.animatedDonutFrameLen = frame.text.length
        }
        if (rickrollPiece) {
          const rFrame = rickrollPiece.create()(0, 0)
          results.animatedRickrollFrameLen = rFrame.text.length
        }
        if (donutPiece) {
          const webpBlob = await exportAnimatedPieceWebP(donutPiece.meta, donutPiece.create(), { durationSec: 0.2, fps: 10 })
          results.animatedWebpBlobBytes = webpBlob.size
          const zipBlob = await exportAnimatedPieceFramesZip(donutPiece.meta, donutPiece.create(), { durationSec: 0.2, fps: 10 })
          results.animatedFramesZipBytes = zipBlob.size
        }
        ;(window as any).__animatedArt = {
          NATIVE_PIECES,
          generateTerminalScript,
          exportAnimatedPieceWebP,
          exportAnimatedPieceFramesZip,
        }
        results.ok = true
      } catch (err) {
        results.ok = false
        results.error = err instanceof Error ? err.message : String(err)
      }
      setSelftest(JSON.stringify(results))
      document.title = `SELFTEST ${results.ok ? 'PASS' : 'FAIL'}`
    }
    const id = window.setTimeout(run, 800)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const compareDrag = useRef(false)
  const updateComparePos = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const pos = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    setComparePos(Math.round(pos))
  }

  const featured = MODES.filter((m) => m.featured)
  const newModes = MODES.filter((m) => m.isNew)
  const q = styleQuery.trim().toLowerCase()
  const filteredModes = q
    ? MODES.filter((m) => `${m.label} ${m.blurb}`.toLowerCase().includes(q))
    : null

  const modeThumb = (m: (typeof MODES)[number]) => (
    <ModeThumb
      key={m.id}
      mode={m.id as ModeId}
      label={m.label}
      isNew={m.isNew}
      active={settings.mode === m.id}
      onClick={() => {
        pushHistory(settingsRef.current)
        patch({ mode: m.id as ModeId })
      }}
    />
  )

  const paintMask = useCallback((clientX: number, clientY: number) => {
    const canvas = previewRef.current
    const mask = maskCanvasRef.current
    if (!canvas || !mask) return
    const rect = canvas.getBoundingClientRect()
    const nx = (clientX - rect.left) / rect.width
    const ny = (clientY - rect.top) / rect.height
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return

    const mx = nx * mask.width
    const my = ny * mask.height
    const mr = (maskRadius / 100) * (mask.width * 0.15)
    const mctx = mask.getContext('2d')
    if (!mctx) return
    mctx.save()
    if (activeTool === 'mask-erase') {
      mctx.globalCompositeOperation = 'destination-out'
      mctx.beginPath()
      mctx.arc(mx, my, mr, 0, Math.PI * 2)
      mctx.fill()
    } else {
      mctx.globalCompositeOperation = 'source-over'
      mctx.fillStyle = '#ffffff'
      mctx.beginPath()
      mctx.arc(mx, my, mr, 0, Math.PI * 2)
      mctx.fill()
    }
    mctx.restore()
    setMaskHasContent(true)
    renderNow(0)
  }, [activeTool, maskRadius, renderNow])

  const clearMask = useCallback(() => {
    const mask = maskCanvasRef.current
    if (!mask) return
    const mctx = mask.getContext('2d')
    mctx?.clearRect(0, 0, mask.width, mask.height)
    setMaskHasContent(false)
    renderNow(0)
    showToast('Selective mask cleared')
  }, [renderNow, showToast])

  const fillMask = useCallback(() => {
    const mask = maskCanvasRef.current
    if (!mask) return
    const mctx = mask.getContext('2d')
    if (mctx) {
      mctx.fillStyle = '#ffffff'
      mctx.fillRect(0, 0, mask.width, mask.height)
    }
    setMaskHasContent(true)
    renderNow(0)
    showToast('Mask filled across canvas')
  }, [renderNow, showToast])

  const applyStamp = useCallback((clientX: number, clientY: number) => {
    const canvas = previewRef.current
    const g = gridRef.current
    if (!canvas || !g || g.cols <= 0 || g.rows <= 0) return
    const rect = canvas.getBoundingClientRect()
    const nx = (clientX - rect.left) / rect.width
    const ny = (clientY - rect.top) / rect.height
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
    const col = Math.min(g.cols - 1, Math.max(0, Math.floor(nx * g.cols)))
    const row = Math.min(g.rows - 1, Math.max(0, Math.floor(ny * g.rows)))
    if (stampChar === '__erase__') {
      if (stampsRef.current.delete(`${col},${row}`)) {
        setStampCount(stampsRef.current.size)
        renderNow(0)
      }
    } else {
      stampsRef.current.set(`${col},${row}`, { char: stampChar })
      setStampCount(stampsRef.current.size)
      renderNow(0)
    }
  }, [stampChar, renderNow])

  const clearStamps = useCallback(() => {
    stampsRef.current.clear()
    setStampCount(0)
    renderNow(0)
    showToast('All glyph stamps cleared')
  }, [renderNow, showToast])

  const isMediaLoaded = source.kind === 'image' || source.kind === 'video' || source.kind === 'animation'

  if (view === 'landing') {
    return (
      <>
        <Landing
          onOpenStudio={() => setView('studio')}
          onOpenWithFile={openWithFile}
          onOpenWithSample={(sampleId, mode) => {
            loadSample(sampleId)
            pushHistory(settingsRef.current)
            setSettings((s) => ({ ...s, mode }))
            setView('studio')
          }}
          onApplyRecipe={(id) => {
            applyRecipe(id)
            setView('studio')
          }}
          onOpenTab={(t) => {
            setTab(t)
            setView('studio')
          }}
          onOpenAnimations={() => setShowAnimatedLibrary(true)}
          onOpenWithPiece={loadAnimatedPiece}
          onOpenVisualize={() => {
            setView('studio')
            setTab('visualize')
          }}
          onOpenMcp={() => setShowMcpModal(true)}
        />
        <McpModal
          open={showMcpModal}
          onClose={() => setShowMcpModal(false)}
          onToast={showToast}
        />
        {showAnimatedLibrary && (
          <div className="animated-player-modal-backdrop" onClick={() => setShowAnimatedLibrary(false)}>
            <div className="animated-library-modal" style={{ maxWidth: '1320px', height: '92vh' }} onClick={(e) => e.stopPropagation()}>
              <AnimatedLibrary
                onOpenInStudio={loadAnimatedPiece}
                onClose={() => setShowAnimatedLibrary(false)}
                onToast={showToast}
              />
            </div>
          </div>
        )}
        {playerModalPiece && (
          <AnimatedPlayerModal
            meta={playerModalPiece}
            onClose={() => setPlayerModalPiece(null)}
            onOpenInStudio={loadAnimatedPiece}
            onToast={showToast}
          />
        )}
      </>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView('landing')} style={{ cursor: 'pointer' }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setView('landing') }} title="ASCII Studio — Return to Home">
          <span className="logo">▓▒░ ASCII STUDIO</span>
          <span className="tag">Free · Local · No signup · No watermark · 4K export free</span>
        </div>
        <div className="top-actions">
          <button className="btn randomize-btn" onClick={surpriseMe} title="Randomize aesthetic look">Randomize</button>
          <button className="btn synth-btn highlight-btn" onClick={() => setShowPromptSynth((v) => !v)} title="Synthesize procedural canvas from prompts">AI Synthesizer</button>
          <button
            type="button"
            className="btn highlight-btn"
            onClick={() => setShowAnimatedLibrary(true)}
            title="Browse 750+ Animated ASCII Art Library & Player"
          >
            🎬 Animations (750+)
          </button>
          <button
            type="button"
            className={`btn highlight-btn ${tab === 'visualize' ? 'primary' : ''}`}
            onClick={() => {
              setView('studio')
              setTab('visualize')
            }}
            title="Open Interactive Multi-Modal Visualizer Studio (Oscilloscope, Fractals, Chaos, 3D)"
          >
            🔮 Visualizer
          </button>
          <button
            type="button"
            className="btn highlight-btn"
            onClick={() => setShowMcpModal(true)}
            title="Model Context Protocol (MCP) Server Setup for Claude Desktop, Cursor, Antigravity, and Zed"
          >
            🤖 MCP Server
          </button>
          <button className="btn icon-btn" disabled={undoStack.current.length === 0} onClick={undo} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button className="btn icon-btn" disabled={redoStack.current.length === 0} onClick={redo} title="Redo (Ctrl+Shift+Z)">↪ Redo</button>
          <button className="btn" onClick={() => fileImageRef.current?.click()}>Upload image</button>
          <button className="btn" onClick={() => fileVideoRef.current?.click()}>Upload video</button>
          {isMediaLoaded && (
            <>
              <button
                type="button"
                className="btn small media-btn-replace"
                onClick={() => fileReplaceRef.current?.click()}
                title="Swap to another image or video while preserving style & effects"
              >
                📁 Replace
              </button>
              <button
                type="button"
                className="btn small media-btn-delete"
                onClick={clearMedia}
                title="Delete/remove uploaded media (Restore sample)"
              >
                🗑️ Clear Media
              </button>
            </>
          )}
          <button
            className={`btn ${source.kind === 'webcam' ? 'primary' : ''}`}
            onClick={() => {
              if (source.kind === 'webcam') {
                captureWebcamSnapshot()
              } else {
                void startWebcam()
              }
            }}
            title={source.kind === 'webcam' ? 'Capture instant snapshot from live camera' : 'Start live camera mirror stream'}
          >
            {source.kind === 'webcam' ? '📸 Take Snapshot' : 'Webcam'}
          </button>
          <button className="btn" onClick={() => void copyShareLink()}>Share link</button>
          <button className="btn" onClick={resetSettings} title="Reset all settings to defaults">↺ Reset</button>
          <button className="btn" onClick={() => setShowShortcuts((v) => !v)}>Shortcuts</button>
          <button className="btn" onClick={() => openDisclaimers(null)} title="Legal & Privacy Disclaimers">Legal &amp; Privacy</button>
          <a
            href="https://saadkhalidhere.gumroad.com/l/tipjar"
            target="_blank"
            rel="noopener noreferrer"
            className="tipjar-btn"
            title="Support Saad Khalid's work on Gumroad"
            aria-label="Support Saad Khalid's work with a coffee or tip"
          >
            ☕ Support
          </a>
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="github-topbar-btn"
            title="Star & View ASCII Studio on GitHub"
            aria-label="View ASCII Studio repository on GitHub"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
        <input
          type="file" accept="image/*" ref={fileImageRef} hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f); e.target.value = '' }}
        />
        <input
          type="file" accept="video/*" ref={fileVideoRef} hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadVideoFile(f); e.target.value = '' }}
        />
        <input
          type="file" accept="image/*,video/*" ref={fileReplaceRef} hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReplaceMedia(f); e.target.value = '' }}
        />
        <input
          type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" ref={audioFileRef} hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAudioFileUpload(f); e.target.value = '' }}
        />
        <input
          type="file" multiple accept="image/*" ref={batchInputRef} hidden
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length > 0) void doBatchExport(files)
            e.target.value = ''
          }}
        />
        <video ref={videoRef} hidden muted playsInline />
      </header>

      {showShortcuts && (
        <div className="shortcuts-card">
          <b>Keyboard shortcuts</b>
          <span><kbd>E</kbd> Export PNG</span>
          <span><kbd>C</kbd> Copy text art</span>
          <span><kbd>B</kbd> Toggle before / after compare</span>
          <span><kbd>F</kbd> Fullscreen stage</span>
          <span><kbd>+</kbd> / <kbd>−</kbd> Zoom in / out</span>
          <span><kbd>0</kbd> Reset zoom</span>
          <span><kbd>Ctrl</kbd>+<kbd>Z</kbd> Undo</span>
          <span><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> Redo</span>
          <span><kbd>?</kbd> Toggle this card</span>
          <span>Tip: paste an image straight from your clipboard, or drop a file anywhere.</span>
          <button className="btn small" onClick={() => setShowShortcuts(false)}>Close</button>
        </div>
      )}

      {showPromptSynth && (
        <div className="prompt-synth-modal">
          <div className="modal-inner">
            <div className="modal-head">
              <h3>✨ Procedural AI Canvas Synthesizer</h3>
              <button className="btn small icon-btn" onClick={() => setShowPromptSynth(false)}>✕</button>
            </div>
            <p className="modal-desc">
              Client-side procedural generative engine. Synthesizes mathematically rich, high-resolution artwork instantly with zero cloud latency.
            </p>
            <div className="prompt-input-row">
              <input
                type="text"
                className="prompt-input"
                value={synthPrompt}
                onChange={(e) => setSynthPrompt(e.target.value)}
                placeholder="e.g. Cyberpunk Samurai, Deep Space Black Hole, Synthwave Outrun..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateProcedural(synthPrompt)
                }}
              />
              <button className="btn primary" onClick={() => handleGenerateProcedural(synthPrompt)}>
                Synthesize
              </button>
            </div>
            <div className="prompt-presets">
              <span className="preset-label">Instant Presets:</span>
              {[
                'Cyberpunk Samurai & Matrix Core',
                'Deep Space Black Hole Accretion',
                'Synthwave Outrun Neon Sunset',
                'Astronaut Lunar Helmet Void',
                'Geometric Kinetic Energy Mandala',
                'Hacker Terminal Core HUD',
              ].map((pst) => (
                <button
                  key={pst}
                  className="preset-chip"
                  onClick={() => {
                    setSynthPrompt(pst)
                    handleGenerateProcedural(pst)
                  }}
                >
                  {pst}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="layout">
        <aside className="style-browser" aria-label="Style browser">
          <div className="browser-head">
            <h2>Styles <span className="count">{MODES.length}</span></h2>
            <input
              className="style-search"
              type="search"
              placeholder="Search styles…"
              value={styleQuery}
              onChange={(e) => setStyleQuery(e.target.value)}
              aria-label="Search styles"
            />
          </div>
          <div className="browser-scroll">
            {filteredModes ? (
              <Section title={filteredModes.length ? `${filteredModes.length} result${filteredModes.length === 1 ? '' : 's'}` : 'No styles match'}>
                <div className="thumb-grid">{filteredModes.map(modeThumb)}</div>
              </Section>
            ) : (
              <>
                <Section title="Featured">
                  <div className="thumb-grid">{featured.map(modeThumb)}</div>
                </Section>
                <Section title="New in v3">
                  <div className="thumb-grid">{newModes.map(modeThumb)}</div>
                </Section>
                {CATEGORIES.map((cat) => {
                  const modes = MODES.filter((m) => m.category === cat.id)
                  if (modes.length === 0) return null
                  return (
                    <Section key={cat.id} title={cat.label}>
                      <div className="thumb-grid">{modes.map(modeThumb)}</div>
                    </Section>
                  )
                })}
              </>
            )}
            {settings.mode === 'dither' && (
              <Section title="Dither settings">
                <Select
                  label="Algorithm"
                  value={settings.ditherAlgo}
                  options={[
                    { value: 'bayer8', label: 'Bayer 8x8' },
                    { value: 'bayer16', label: 'Bayer 16x16' },
                    { value: 'floyd', label: 'Floyd-Steinberg' },
                    { value: 'halftone', label: 'Halftone dots' },
                  ]}
                  onChange={(v) => patch({ ditherAlgo: v as Settings['ditherAlgo'] })}
                />
                <Select
                  label="Palette"
                  value={settings.ditherPalette}
                  options={Object.entries(DITHER_PALETTES).map(([v, p]) => ({ value: v, label: p.label }))}
                  onChange={(v) => patch({ ditherPalette: v as Settings['ditherPalette'] })}
                />
                <Slider label="Dither scale" value={settings.ditherScale} min={1} max={4} onChange={(v) => patch({ ditherScale: v })} />
                <Slider label="Dither contrast" value={settings.ditherContrast} min={0} max={200} onChange={(v) => patch({ ditherContrast: v })} />
              </Section>
            )}
          </div>
        </aside>

        <section className={`stage ${dragOver ? 'drag-over' : ''}`} ref={stageRef}>
          {isMediaLoaded && (
            <div className="stage-canvas-header" role="toolbar" aria-label="Media management">
              <div className="media-badge" title={`Active file: ${source.name}`}>
                <span className="media-badge-icon" aria-hidden="true">{source.kind === 'video' ? '🎬' : source.kind === 'animation' ? '✨' : '🖼️'}</span>
                <span className="media-badge-label">Active Media:</span>
                <span className="media-badge-name source-name">{source.name}</span>
                <span className="media-badge-kind">{source.kind === 'video' ? 'VIDEO' : source.kind === 'animation' ? 'ANIMATION' : 'IMAGE'}</span>
                <button
                  type="button"
                  className="media-badge-clear"
                  onClick={clearMedia}
                  title="Remove uploaded media (×)"
                  aria-label={`Remove ${source.name}`}
                >
                  ×
                </button>
              </div>

              <div className="media-toolbar-actions">
                {source.kind === 'animation' && activePieceMeta ? (
                  <>
                    <button
                      type="button"
                      className="btn small highlight-btn"
                      onClick={() => setShowAnimatedLibrary(true)}
                      title="Switch to another animated ASCII art piece"
                    >
                      🎬 Change Animation
                    </button>
                    <button
                      type="button"
                      className="btn small primary"
                      onClick={() => setPlayerModalPiece(activePieceMeta)}
                      title="Open full interactive player with frame scrubbing and GIF export"
                    >
                      ▶ Open in Player
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn small media-btn-replace"
                    onClick={() => fileReplaceRef.current?.click()}
                    title="Swap to another image or video while preserving style & effects"
                  >
                    📁 Replace Media
                  </button>
                )}
                <button
                  type="button"
                  className="btn small media-btn-delete"
                  onClick={clearMedia}
                  title="Delete/remove media and restore default sample"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>
          )}

          <div
            className="preview-wrap"
            onPointerDown={(e) => {
              if (draggingLight) return
              if (activeTool === 'mask-brush' || activeTool === 'mask-erase') {
                isPaintingRef.current = true
                paintMask(e.clientX, e.clientY)
                return
              }
              if (activeTool === 'stamp') {
                applyStamp(e.clientX, e.clientY)
                return
              }
              if (compare) {
                compareDrag.current = true
                updateComparePos(e)
              }
            }}
            onPointerMove={(e) => {
              if (draggingLight) {
                const canvas = previewRef.current
                if (!canvas) return
                const rect = canvas.getBoundingClientRect()
                const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
                setSettings((prev) => ({
                  ...prev,
                  lights: prev.lights.map((l) => (l.id === draggingLight ? { ...l, x: +x.toFixed(3), y: +y.toFixed(3) } : l)),
                }))
                return
              }
              if (isPaintingRef.current && (activeTool === 'mask-brush' || activeTool === 'mask-erase')) {
                paintMask(e.clientX, e.clientY)
                return
              }
              if (compareDrag.current) {
                updateComparePos(e)
                return
              }
              const canvas = previewRef.current
              if (canvas) {
                const rect = canvas.getBoundingClientRect()
                let cx = ((e.clientX - rect.left) / rect.width) * canvas.width
                let cy = ((e.clientY - rect.top) / rect.height) * canvas.height
                if (settings.flipH) cx = canvas.width - cx
                if (settings.flipV) cy = canvas.height - cy
                cursorRef.current = { x: cx, y: cy, active: true, mode: physicsForceMode }
              }
              const g = gridRef.current
              if (canvas && g && g.cols > 0 && g.rows > 0) {
                const rect = canvas.getBoundingClientRect()
                let nx = (e.clientX - rect.left) / rect.width
                let ny = (e.clientY - rect.top) / rect.height
                if (settings.flipH) nx = 1 - nx
                if (settings.flipV) ny = 1 - ny
                if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
                  const col = Math.min(g.cols - 1, Math.max(0, Math.floor(nx * g.cols)))
                  const row = Math.min(g.rows - 1, Math.max(0, Math.floor(ny * g.rows)))
                  const cell = g.cells[row * g.cols + col]
                  if (cell) {
                    const ramp = CHAR_RAMPS[settings.charSet]?.chars ?? CHAR_RAMPS.standard.chars
                    const ch = ramp[Math.min(ramp.length - 1, Math.floor(cell.lum * ramp.length))]
                    const hex = `#${((1 << 24) + (cell.r << 16) + (cell.g << 8) + cell.b).toString(16).slice(1)}`
                    setHoverCell({ x: col, y: row, char: ch, hex, lum: Math.round(cell.lum * 100) })
                  }
                }
              }
            }}
            onPointerUp={() => {
              isPaintingRef.current = false
              compareDrag.current = false
              setDraggingLight(null)
              setDraggingLayerId(null)
            }}
            onPointerLeave={() => {
              isPaintingRef.current = false
              compareDrag.current = false
              setDraggingLight(null)
              setDraggingLayerId(null)
              setHoverCell(null)
              cursorRef.current.active = false
            }}
          >
            <div
              className="preview-scale"
              style={{
                transform: `scale(${zoom})`,
                aspectRatio: srcCanvasRef.current && srcCanvasRef.current.height ? `${srcCanvasRef.current.width} / ${srcCanvasRef.current.height}` : undefined,
              }}
            >
              <canvas ref={origRef} className="preview-canvas orig" />
              <canvas
                ref={previewRef}
                className="preview-canvas art"
                style={compare ? { clipPath: `inset(0 0 0 ${comparePos}%)` } : undefined}
              />
              {settings.lightingEnabled && settings.lights.map((l, idx) => {
                if (!l.enabled) return null
                return (
                  <div
                    key={l.id}
                    className={`canvas-light-handle ${draggingLight === l.id ? 'dragging' : ''} ${selectedLightId === l.id ? 'active' : ''}`}
                    style={{
                      left: `${l.x * 100}%`,
                      top: `${l.y * 100}%`,
                      borderColor: l.color,
                      boxShadow: selectedLightId === l.id ? `0 0 24px ${l.color}, 0 0 8px #fff` : `0 0 16px ${l.color}`,
                    }}
                    title={`${l.name}: drag to move, click to inspect`}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                      setDraggingLight(l.id)
                      setSelectedLightId(l.id)
                    }}
                    onPointerMove={(e) => {
                      if (draggingLight === l.id) {
                        const canvas = previewRef.current
                        if (!canvas) return
                        const rect = canvas.getBoundingClientRect()
                        const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
                        const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
                        setSettings((prev) => ({
                          ...prev,
                          lights: prev.lights.map((item) => (item.id === l.id ? { ...item, x: +nx.toFixed(3), y: +ny.toFixed(3) } : item)),
                        }))
                      }
                    }}
                    onPointerUp={(e) => {
                      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
                      setDraggingLight(null)
                    }}
                    onPointerCancel={() => setDraggingLight(null)}
                  >
                    <span className="light-dot" style={{ background: l.color }} />
                    <span className="light-label">{idx + 1}</span>
                  </div>
                )
              })}
              {settings.magicLensEnabled && (
                <div
                  className={`canvas-magic-lens ${draggingLens ? 'dragging' : ''}`}
                  style={{
                    left: `${lensPos.x}px`,
                    top: `${lensPos.y}px`,
                    width: `${settings.magicLensRadius * 2}px`,
                    height: `${settings.magicLensRadius * 2}px`,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                    setDraggingLens(true)
                  }}
                  onPointerMove={(e) => {
                    if (draggingLens) {
                      const canvas = previewRef.current
                      if (!canvas) return
                      const rect = canvas.getBoundingClientRect()
                      const lx = Math.min(rect.width, Math.max(0, e.clientX - rect.left))
                      const ly = Math.min(rect.height, Math.max(0, e.clientY - rect.top))
                      setLensPos({ x: Math.round(lx), y: Math.round(ly) })
                    }
                  }}
                  onPointerUp={(e) => {
                    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
                    setDraggingLens(false)
                  }}
                  onPointerCancel={() => setDraggingLens(false)}
                >
                  <div className="lens-reticle" />
                  <div className="lens-hud">
                    <span>MAG {settings.magicLensZoom}X</span>
                    {hoverCell && <span>[{hoverCell.x},{hoverCell.y}] &apos;{hoverCell.char}&apos; {hoverCell.hex}</span>}
                  </div>
                </div>
              )}
              {settings.layers?.map((layer, idx) => {
                if (!layer.enabled) return null
                const isSelected = selectedLayerId === layer.id
                const isDragging = draggingLayerId === layer.id
                const fontFam = layer.fontFamily === 'monospace' ? 'var(--mono)'
                  : layer.fontFamily === 'serif' ? 'Georgia, serif'
                  : layer.fontFamily === 'impact' ? 'Impact, "Arial Black", sans-serif'
                  : 'var(--display)'

                return (
                  <div
                    key={layer.id}
                    className={`canvas-text-layer ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                    style={{
                      left: `${layer.x * 100}%`,
                      top: `${layer.y * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                      fontSize: `${layer.fontSize}px`,
                      fontFamily: fontFam,
                      color: layer.color,
                      backgroundColor: layer.bgColor === 'transparent' ? 'transparent' : layer.bgColor,
                      padding: layer.bgPadding ? `${layer.bgPadding}px ${layer.bgPadding * 1.5}px` : undefined,
                      borderRadius: `${layer.bgRadius ?? 4}px`,
                      border: layer.border ? `1.5px solid ${layer.borderColor}` : isSelected ? '1px dashed rgba(255, 255, 255, 0.4)' : undefined,
                      mixBlendMode: layer.blendMode === 'normal' ? 'normal' : layer.blendMode,
                      opacity: recording ? 0 : layer.opacity,
                      pointerEvents: recording ? 'none' : undefined,
                      zIndex: 12 + idx,
                      whiteSpace: 'pre-line',
                    }}
                    title={`${layer.text}: Click to select, drag to reposition`}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                      setSelectedLayerId(layer.id)
                      setDraggingLayerId(layer.id)
                      const canvas = previewRef.current
                      if (canvas) {
                        const rect = canvas.getBoundingClientRect()
                        dragOffsetRef.current = {
                          startX: e.clientX,
                          startY: e.clientY,
                          origX: layer.x,
                          origY: layer.y,
                          rectWidth: rect.width,
                          rectHeight: rect.height,
                        }
                      }
                    }}
                    onPointerMove={(e) => {
                      if (draggingLayerId === layer.id && dragOffsetRef.current) {
                        const dx = (e.clientX - dragOffsetRef.current.startX) / (dragOffsetRef.current.rectWidth || 1)
                        const dy = (e.clientY - dragOffsetRef.current.startY) / (dragOffsetRef.current.rectHeight || 1)
                        const nx = Math.min(1, Math.max(0, dragOffsetRef.current.origX + dx))
                        const ny = Math.min(1, Math.max(0, dragOffsetRef.current.origY + dy))
                        setSettings((prev) => ({
                          ...prev,
                          layers: prev.layers.map((l) => (l.id === layer.id ? { ...l, x: +nx.toFixed(3), y: +ny.toFixed(3) } : l)),
                        }))
                      }
                    }}
                    onPointerUp={(e) => {
                      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
                      setDraggingLayerId(null)
                      dragOffsetRef.current = null
                    }}
                    onPointerCancel={() => {
                      setDraggingLayerId(null)
                      dragOffsetRef.current = null
                    }}
                  >
                    {layer.text}
                    {isSelected && <span className="layer-drag-handle" title="Selected layer">✛</span>}
                  </div>
                )
              })}
              {compare && (
                <>
                  <div className="compare-divider" style={{ left: `${comparePos}%` }} />
                  <span className="compare-tag left">
                    {settings.dualCompare
                      ? (MODES.find((m) => m.id === settings.compareMode)?.label ?? 'Compare Style')
                      : 'Original'}
                  </span>
                  <span className="compare-tag right">
                    {MODES.find((m) => m.id === settings.mode)?.label ?? 'Active Style'}
                  </span>
                </>
              )}
            </div>
            {dragOver && <div className="drop-overlay">Drop an image or video to convert</div>}
          </div>

          {source.kind === 'video' && (
            <div className="video-control-bar">
              <button
                className="btn small"
                onClick={() => {
                  const v = videoRef.current
                  if (!v) return
                  if (v.paused) {
                    void v.play()
                    setVideoPlaying(true)
                  } else {
                    v.pause()
                    setVideoPlaying(false)
                  }
                }}
                title={videoPlaying ? 'Pause video' : 'Play video'}
              >
                {videoPlaying ? '❚❚ Pause' : '▶ Play'}
              </button>
              <input
                type="range"
                min={0}
                max={videoDuration || 1}
                step={0.05}
                value={videoTime}
                onChange={(e) => {
                  const v = videoRef.current
                  if (v) v.currentTime = Number(e.target.value)
                  setVideoTime(Number(e.target.value))
                }}
                aria-label="Video scrubber"
              />
              <span className="video-time-display">
                {formatTime(videoTime)} / {formatTime(videoDuration)}
              </span>
            </div>
          )}

          {source.kind === 'webcam' && (
            <div className="webcam-control-bar">
              <span className="webcam-live-indicator">
                <span className="live-dot" /> LIVE CAMERA MIRROR
              </span>
              <button
                className="btn small primary"
                onClick={captureWebcamSnapshot}
                title="Capture instant snapshot from live camera"
              >
                📸 Take Snapshot
              </button>
              <button
                className={`btn small ${settings.flipH ? 'primary' : ''}`}
                onClick={() => patch({ flipH: !settings.flipH })}
                title="Toggle horizontal mirror reflection"
              >
                ⇄ Mirror {settings.flipH ? 'ON' : 'OFF'}
              </button>
              <button
                className="btn small"
                onClick={() => {
                  stopWebcam()
                  loadSample('tropical')
                  showToast('Live camera stopped')
                }}
                title="Stop live camera mirror and return to sample"
              >
                ■ Stop Camera
              </button>
            </div>
          )}

          {settings.mode === 'ascii-particles' && (
            <div className="physics-control-bar">
              <span className="physics-label">⚛ Interactive Physics:</span>
              {(['repel', 'attract', 'vortex'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`btn small ${physicsForceMode === mode ? 'primary' : ''}`}
                  onClick={() => {
                    setPhysicsForceMode(mode)
                    cursorRef.current.mode = mode
                  }}
                  title={`Set cursor force field to ${mode}`}
                >
                  {mode === 'repel' ? '💥 Repel' : mode === 'attract' ? '🧲 Attract' : '🌀 Vortex'}
                </button>
              ))}
              <button
                className="btn small"
                onClick={() => {
                  resetPhysicsParticles()
                  showToast('Physics particles reset to grid positions')
                }}
                title="Reset particles to resting grid coordinates"
              >
                ↺ Reset Particles
              </button>
              <button
                className="btn small"
                onClick={() => patch({ mode: 'characters' })}
                title="Exit physics particles mode"
              >
                ✕ Exit Physics
              </button>
            </div>
          )}

          <div className="stage-bar">
            {isMediaLoaded ? (
              <div className="stage-bar-media">
                <div className="stage-media-badge" title={source.name}>
                  <span className="media-badge-icon" aria-hidden="true">{source.kind === 'video' ? '🎬' : '🖼️'}</span>
                  <span className="media-badge-name source-name">{source.name}</span>
                  <button
                    type="button"
                    className="media-badge-clear"
                    onClick={clearMedia}
                    title="Quick-clear media (×)"
                    aria-label={`Remove ${source.name}`}
                  >
                    ×
                  </button>
                </div>
                <button
                  type="button"
                  className="btn small media-btn-replace"
                  onClick={() => fileReplaceRef.current?.click()}
                  title="Replace current media"
                >
                  📁 Replace
                </button>
                <button
                  type="button"
                  className="btn small media-btn-delete"
                  onClick={clearMedia}
                  title="Delete/remove uploaded media"
                >
                  🗑️ Clear
                </button>
              </div>
            ) : (
              <span className="source-name">{source.kind === 'webcam' ? '● ' : ''}{source.name}</span>
            )}
            <span className="stats">
              {stats.cols}×{stats.rows} grid · {stats.px.toLocaleString()} px · {stats.ms} ms
              {hoverCell && ` · cell [${hoverCell.x},${hoverCell.y}] '${hoverCell.char}' ${hoverCell.hex} (${hoverCell.lum}%)`}
            </span>
            <span className="transform-bar">
              <button
                className="btn small"
                onClick={() => patch({ rotation: ((settings.rotation || 0) + 90) % 360 })}
                title="Rotate 90 degrees"
              >
                ↻ {settings.rotation ? `${settings.rotation}°` : 'Rotate'}
              </button>
              <button
                className={`btn small ${settings.flipH ? 'primary' : ''}`}
                onClick={() => patch({ flipH: !settings.flipH })}
                title="Flip Horizontal"
              >
                ⇄ Flip H
              </button>
              <button
                className={`btn small ${settings.flipV ? 'primary' : ''}`}
                onClick={() => patch({ flipV: !settings.flipV })}
                title="Flip Vertical"
              >
                ⇅ Flip V
              </button>
            </span>
            <span className="zoom-controls">
              <button className="btn small" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out">−</button>
              <span className="zoom-label">{Math.round(zoom * 100)}%</span>
              <button className="btn small" onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} aria-label="Zoom in">+</button>
              <button className="btn small" onClick={toggleFullscreen} title="Fullscreen (F)">⛶ Fullscreen</button>
            </span>
            <button className="btn small" onClick={() => setCompare((v) => !v)}>
              {compare ? 'Hide compare (B)' : 'Before / after (B)'}
            </button>
            {compare && (
              <>
                <button
                  className={`btn small ${settings.dualCompare ? 'primary' : ''}`}
                  onClick={() => patch({ dualCompare: !settings.dualCompare })}
                  title="Toggle between comparing against original source or secondary style"
                >
                  {settings.dualCompare ? 'Style Split' : 'Original'}
                </button>
                {settings.dualCompare && (
                  <select
                    className="select-inline small"
                    value={settings.compareMode}
                    onChange={(e) => patch({ compareMode: e.target.value as ModeId })}
                    aria-label="Compare mode"
                  >
                    {MODES.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                )}
                <input
                  type="range" min={0} max={100} value={comparePos}
                  onChange={(e) => setComparePos(Number(e.target.value))}
                  aria-label="Compare position"
                />
              </>
            )}
            <button
              className={`btn small ${settings.magicLensEnabled ? 'primary' : ''}`}
              onClick={() => patch({ magicLensEnabled: !settings.magicLensEnabled })}
              title="Toggle interactive Magic Lens on canvas"
            >
              🔍 {settings.magicLensEnabled ? 'Lens ON' : 'Magic Lens'}
            </button>
            <button
              className={`btn small ${activeTool === 'mask-brush' || activeTool === 'mask-erase' ? 'primary' : ''}`}
              onClick={() => setActiveTool((t) => (t === 'mask-brush' ? 'none' : 'mask-brush'))}
              title="Selective Region Masking: paint where ASCII art applies"
            >
              🎭 {activeTool === 'mask-brush' || activeTool === 'mask-erase' ? 'Mask Active' : 'Mask Brush'}
            </button>
            {(activeTool === 'mask-brush' || activeTool === 'mask-erase') && (
              <>
                <button
                  className={`btn small ${activeTool === 'mask-erase' ? 'primary' : ''}`}
                  onClick={() => setActiveTool((t) => (t === 'mask-erase' ? 'mask-brush' : 'mask-erase'))}
                  title="Toggle between painting and erasing mask"
                >
                  {activeTool === 'mask-erase' ? 'Eraser' : 'Brush'}
                </button>
                <button
                  className={`btn small ${maskInvert ? 'primary' : ''}`}
                  onClick={() => setMaskInvert((v) => !v)}
                  title="Invert mask coverage"
                >
                  {maskInvert ? 'Inverted' : 'Invert'}
                </button>
                <label className="btn small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span>Size: {maskRadius}</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={maskRadius}
                    onChange={(e) => setMaskRadius(Number(e.target.value))}
                    style={{ width: 60 }}
                  />
                </label>
                <button className="btn small" onClick={fillMask} title="Fill whole canvas with mask">Fill</button>
                <button className="btn small" onClick={clearMask} title="Clear mask">Clear</button>
              </>
            )}
            <button
              className={`btn small ${activeTool === 'stamp' ? 'primary' : ''}`}
              onClick={() => setActiveTool((t) => (t === 'stamp' ? 'none' : 'stamp'))}
              title="Stamp & pencil: click/drag on canvas to stamp characters"
            >
              ✏️ {activeTool === 'stamp' ? 'Stamp Active' : 'Stamp Pencil'}
            </button>
            {activeTool === 'stamp' && (
              <>
                {['█', '░', '★', '▲', '#', '@'].map((ch) => (
                  <button
                    key={ch}
                    className={`btn small ${stampChar === ch ? 'primary' : ''}`}
                    onClick={() => setStampChar(ch)}
                  >
                    {ch}
                  </button>
                ))}
                <input
                  className="text-input"
                  style={{ width: 32, padding: '2px 4px', textAlign: 'center', fontSize: 13 }}
                  maxLength={1}
                  value={stampChar === '__erase__' ? '' : stampChar}
                  placeholder="?"
                  onChange={(e) => setStampChar(e.target.value || '█')}
                  title="Custom stamp character"
                />
                <button
                  className={`btn small ${stampChar === '__erase__' ? 'primary' : ''}`}
                  onClick={() => setStampChar((c) => (c === '__erase__' ? '█' : '__erase__'))}
                  title="Eraser: click/drag over stamped cells to erase them"
                >
                  🧹 {stampChar === '__erase__' ? 'Erasing' : 'Eraser'}
                </button>
                {stampCount > 0 && (
                  <button className="btn small" onClick={clearStamps} title="Clear stamped glyphs">
                    Clear ({stampCount})
                  </button>
                )}
              </>
            )}
            <button
              className={`btn small ${tab === 'layers' ? 'primary' : ''}`}
              onClick={() => {
                setTab('layers')
                if (!settings.layers || settings.layers.length === 0) {
                  addTextLayer({ text: 'ASCII STUDIO // v3', x: 0.5, y: 0.88, fontSize: 18, color: '#00f0ff' })
                }
              }}
              title="Interactive Text Layers & Overlay Engine"
            >
              🏷️ Text Layers {settings.layers?.filter((l) => l.enabled).length ? `(${settings.layers.filter((l) => l.enabled).length})` : ''}
            </button>
          </div>

          <div className="samples-row">
            <span>Try a sample:</span>
            {SAMPLES.map((s) => (
              <button key={s.id} className="btn small" onClick={() => loadSample(s.id)}>
                {s.name}
              </button>
            ))}
            <button className="btn small synth-sample-btn" onClick={() => setShowPromptSynth(true)}>
              ✨ AI Prompt Synth
            </button>
            <span className="hint">or drop a file anywhere, paste from clipboard, or use your webcam</span>
          </div>
        </section>

        <aside className="panel">
          <nav className="tabs">
            {(['tune', 'lighting', 'effects', 'recipes', 'layers', 'export', 'banner', 'tools', 'visualize'] as Tab[]).map((t) => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'visualize' ? '🔮 Visualize' : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </nav>

          {tab === 'tune' && (
            <div className="tab-body">
              <Section title="Tuning">
                <Slider label="Columns" value={settings.cols} min={40} max={300} step={5} onChange={(v) => patch({ cols: v })} />
                <Slider label="Contrast" value={settings.contrast} min={0} max={200} onChange={(v) => patch({ contrast: v })} format={(v) => `${v}%`} />
                <Slider label="Brightness" value={settings.brightness} min={0} max={200} onChange={(v) => patch({ brightness: v })} format={(v) => `${v}%`} />
                <Slider label="Saturation" value={settings.saturation} min={0} max={200} onChange={(v) => patch({ saturation: v })} format={(v) => `${v}%`} />
                <Slider label="Gamma" value={settings.gamma} min={0.2} max={3} step={0.05} onChange={(v) => patch({ gamma: v })} format={(v) => v.toFixed(2)} />
                <Slider label="Edge emphasis" value={settings.edgeEmphasis} min={0} max={100} onChange={(v) => patch({ edgeEmphasis: v })} format={(v) => `${v}%`} />
                <Slider label="Background blur" value={settings.bgBlur} min={0} max={20} onChange={(v) => patch({ bgBlur: v })} format={(v) => `${v}px`} />
                <Slider label="Threshold" value={settings.threshold} min={0} max={255} onChange={(v) => patch({ threshold: v })} />
              </Section>
              <Section title="Color Grading (LUT)">
                <Select
                  label="Preset Tone Grade"
                  value={settings.lut || 'none'}
                  options={COLOR_LUTS.map((l) => ({ value: l.id, label: `${l.label} — ${l.blurb}` }))}
                  onChange={(v) => patch({ lut: v as LutId })}
                />
              </Section>
              <Section title="Focus Mask & Vignette">
                <Toggle
                  label="Enable Focus Mask"
                  checked={settings.focusMask?.enabled ?? false}
                  onChange={(v) => patch({ focusMask: { ...settings.focusMask, enabled: v } })}
                  hint="Highlight center and fade borders"
                />
                {settings.focusMask?.enabled && (
                  <>
                    <Slider
                      label="Radius"
                      value={settings.focusMask.radius}
                      min={10}
                      max={100}
                      onChange={(v) => patch({ focusMask: { ...settings.focusMask, radius: v } })}
                      format={(v) => `${v}%`}
                    />
                    <Slider
                      label="Feather softness"
                      value={settings.focusMask.feather}
                      min={0}
                      max={100}
                      onChange={(v) => patch({ focusMask: { ...settings.focusMask, feather: v } })}
                      format={(v) => `${v}%`}
                    />
                    <Toggle
                      label="Invert mask"
                      checked={settings.focusMask.invert}
                      onChange={(v) => patch({ focusMask: { ...settings.focusMask, invert: v } })}
                    />
                  </>
                )}
              </Section>
              <Section title="Interactive Physics Simulation">
                <Toggle
                  label="Enable Physics Particle Simulation"
                  checked={settings.mode === 'ascii-particles'}
                  onChange={(v) => {
                    patch({ mode: v ? 'ascii-particles' : 'characters' })
                    if (v) resetPhysicsParticles()
                  }}
                  hint="Dynamic ASCII characters react to cursor gravity, repulsion, and vortex forces"
                />
                {settings.mode === 'ascii-particles' && (
                  <>
                    <Select
                      label="Cursor Force Field"
                      value={physicsForceMode}
                      options={[
                        { value: 'repel', label: '💥 Repel (Push away)' },
                        { value: 'attract', label: '🧲 Attract (Gravity pull)' },
                        { value: 'vortex', label: '🌀 Vortex (Swirling cyclone)' },
                      ]}
                      onChange={(v) => {
                        const m = v as 'repel' | 'attract' | 'vortex'
                        setPhysicsForceMode(m)
                        cursorRef.current.mode = m
                      }}
                    />
                    <div className="btn-row" style={{ marginTop: 8 }}>
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => {
                          resetPhysicsParticles()
                          showToast('Physics particles reset to grid origin')
                        }}
                      >
                        ↺ Reset Particles
                      </button>
                    </div>
                  </>
                )}
              </Section>
              <Section title="Web Audio API — Sound to Art">
                <Toggle
                  label="Enable Audio Modulation"
                  checked={settings.audioReactive?.enabled ?? false}
                  onChange={(v) => {
                    patch({ audioReactive: { ...settings.audioReactive, enabled: v } })
                    if (!v) {
                      audioEngine.stop()
                      setAudioActive(false)
                    }
                  }}
                  hint="Real-time acoustic reactivity via microphone or synth beat"
                />
                {settings.audioReactive?.enabled && (
                  <>
                    <div className="btn-row">
                      <button
                        className={`btn small ${audioActive && audioEngine.getMode() === 'mic' ? 'primary' : ''}`}
                        onClick={async () => {
                          if (audioActive && audioEngine.getMode() === 'mic') {
                            audioEngine.stop()
                            setAudioActive(false)
                          } else {
                            const ok = await audioEngine.startMic()
                            if (ok) {
                              setAudioActive(true)
                              showToast('🎙 Microphone audio stream active')
                            } else {
                              showToast('Microphone unavailable, started 120 BPM synth beat')
                              setAudioActive(true)
                            }
                          }
                        }}
                      >
                        {audioActive && audioEngine.getMode() === 'mic' ? '■ Stop Mic' : '🎙 Live Microphone'}
                      </button>
                      <button
                        className={`btn small ${audioActive && audioEngine.getMode() === 'beat' ? 'primary' : ''}`}
                        onClick={() => {
                          if (audioActive && audioEngine.getMode() === 'beat') {
                            audioEngine.stop()
                            setAudioActive(false)
                          } else {
                            const ok = audioEngine.startBeat(120)
                            if (ok) {
                              setAudioActive(true)
                              showToast('▶ 120 BPM Synth Beat active')
                            }
                          }
                        }}
                      >
                        {audioActive && audioEngine.getMode() === 'beat' ? '■ Stop Beat' : '▶ 120 BPM Synth Beat'}
                      </button>
                      <button
                        className={`btn small ${audioActive && audioEngine.getMode() === 'file' ? 'primary' : ''}`}
                        onClick={() => audioFileRef.current?.click()}
                        title="Upload local .mp3, .wav, or audio file"
                      >
                        📁 File (.mp3/.wav)
                      </button>
                    </div>

                    {audioFileName && (
                      <div className="audio-file-bar">
                        <span className="audio-file-name" title={audioFileName}>
                          🎵 {audioFileName}
                        </span>
                        <div className="audio-file-actions">
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => {
                              const playing = audioEngine.toggleFilePlayback()
                              setAudioFilePlaying(playing)
                              setAudioActive(playing)
                            }}
                            title={audioFilePlaying ? 'Pause audio track' : 'Play audio track'}
                          >
                            {audioFilePlaying ? '❚❚ Pause' : '▶ Play'}
                          </button>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => {
                              audioEngine.stop()
                              setAudioActive(false)
                              setAudioFileName('')
                              setAudioFilePlaying(false)
                            }}
                            title="Remove audio track"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {audioActive && (
                      <div className="audio-spectrum-bar" title="Live audio frequency spectrum">
                        {Array.from({ length: 16 }).map((_, i) => {
                          const val = audioMetrics.rawFft ? (audioMetrics.rawFft[i * 2] || 0) / 255 : 0
                          return (
                            <div
                              key={i}
                              className="audio-spectrum-bin"
                              style={{ height: `${Math.max(8, val * 100)}%` }}
                            />
                          )
                        })}
                      </div>
                    )}

                    <div className="chip-row" style={{ marginTop: 8, marginBottom: 8 }}>
                      <button
                        type="button"
                        className={`chip small ${(settings.audioReactive.mode ?? 'multiband') === 'multiband' ? 'active' : ''}`}
                        onClick={() => patch({ audioReactive: { ...settings.audioReactive, mode: 'multiband' } })}
                      >
                        🎛 3-Band Split (Bass / Mid / Treble)
                      </button>
                      <button
                        type="button"
                        className={`chip small ${settings.audioReactive.mode === 'master' ? 'active' : ''}`}
                        onClick={() => patch({ audioReactive: { ...settings.audioReactive, mode: 'master' } })}
                      >
                        🎚 Single Target (Master)
                      </button>
                    </div>

                    {(settings.audioReactive.mode ?? 'multiband') === 'multiband' ? (
                      <div className="audio-multiband-grid">
                        <div className="band-card">
                          <div className="band-card-header">
                            <span>🔊 Bass Band</span>
                            <span className="band-freq-tag">20 – 250 Hz</span>
                          </div>
                          <div className="band-meter" title="Live Bass energy">
                            <div
                              className="band-meter-fill band-meter-bass"
                              style={{ width: `${Math.min(100, Math.round((audioMetrics.bass || 0) * 100))}%` }}
                            />
                          </div>
                          <Select
                            label="Bass Target"
                            value={settings.audioReactive.bassTarget ?? 'light'}
                            options={[
                              { value: 'light', label: '3D Light Intensity Pulse' },
                              { value: 'glitch', label: 'Glitch Jitter Burst' },
                              { value: 'contrast', label: 'Dynamic Contrast Boost' },
                              { value: 'bloom', label: 'Character Glow (Bloom)' },
                              { value: 'cols', label: 'Grid Columns (Density)' },
                              { value: 'none', label: '— Off (Disabled) —' },
                            ]}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, bassTarget: v as AudioTarget } })}
                          />
                          <Slider
                            label="Bass Sensitivity"
                            value={settings.audioReactive.bassSens ?? 60}
                            min={10}
                            max={100}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, bassSens: v } })}
                            format={(v) => `${v}%`}
                          />
                        </div>

                        <div className="band-card">
                          <div className="band-card-header">
                            <span>🎚 Mid Band</span>
                            <span className="band-freq-tag">250 – 2500 Hz</span>
                          </div>
                          <div className="band-meter" title="Live Mid energy">
                            <div
                              className="band-meter-fill band-meter-mid"
                              style={{ width: `${Math.min(100, Math.round((audioMetrics.mid || 0) * 100))}%` }}
                            />
                          </div>
                          <Select
                            label="Mid Target"
                            value={settings.audioReactive.midTarget ?? 'bloom'}
                            options={[
                              { value: 'bloom', label: 'Character Glow (Bloom / Aura)' },
                              { value: 'contrast', label: 'Dynamic Contrast Boost' },
                              { value: 'light', label: '3D Light Intensity' },
                              { value: 'cols', label: 'Grid Columns (Density)' },
                              { value: 'speed', label: 'Glitch / Flow Velocity' },
                              { value: 'none', label: '— Off (Disabled) —' },
                            ]}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, midTarget: v as AudioTarget } })}
                          />
                          <Slider
                            label="Mid Sensitivity"
                            value={settings.audioReactive.midSens ?? 50}
                            min={10}
                            max={100}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, midSens: v } })}
                            format={(v) => `${v}%`}
                          />
                        </div>

                        <div className="band-card">
                          <div className="band-card-header">
                            <span>⚡ Treble Band</span>
                            <span className="band-freq-tag">2.5 – 12 kHz</span>
                          </div>
                          <div className="band-meter" title="Live Treble energy">
                            <div
                              className="band-meter-fill band-meter-treble"
                              style={{ width: `${Math.min(100, Math.round((audioMetrics.treble || 0) * 100))}%` }}
                            />
                          </div>
                          <Select
                            label="Treble Target"
                            value={settings.audioReactive.trebleTarget ?? 'cols'}
                            options={[
                              { value: 'cols', label: 'Grid Columns (Density Pulse)' },
                              { value: 'speed', label: 'Particle / Glitch Velocity' },
                              { value: 'glitch', label: 'High-Freq Glitch Burst' },
                              { value: 'bloom', label: 'Fine Edge Shimmer' },
                              { value: 'none', label: '— Off (Disabled) —' },
                            ]}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, trebleTarget: v as AudioTarget } })}
                          />
                          <Slider
                            label="Treble Sensitivity"
                            value={settings.audioReactive.trebleSens ?? 50}
                            min={10}
                            max={100}
                            onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, trebleSens: v } })}
                            format={(v) => `${v}%`}
                          />
                        </div>
                      </div>
                    ) : (
                      <Select
                        label="Modulation Target"
                        value={settings.audioReactive.target}
                        options={[
                          { value: 'cols', label: 'Grid Columns (Density Pulse)' },
                          { value: 'bloom', label: 'Character Glow (Bloom Pulse)' },
                          { value: 'glitch', label: 'Glitch Jitter Burst' },
                          { value: 'light', label: 'Light Intensity Pulse' },
                        ]}
                        onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, target: v as any } })}
                      />
                    )}

                    <Slider
                      label="Master Audio Sensitivity"
                      value={settings.audioReactive.sensitivity}
                      min={10}
                      max={100}
                      onChange={(v) => patch({ audioReactive: { ...settings.audioReactive, sensitivity: v } })}
                      format={(v) => `${v}%`}
                    />
                  </>
                )}
              </Section>
              <Section title="Characters & colour">
                <Select
                  label="Cell size"
                  value={settings.cellSize}
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' },
                  ]}
                  onChange={(v) => patch({ cellSize: v as Settings['cellSize'] })}
                />
                <Select
                  label="Character ramp"
                  value={settings.charSet}
                  options={Object.entries(CHAR_RAMPS).map(([v, r]) => ({ value: v, label: r.label }))}
                  onChange={(v) => patch({ charSet: v })}
                />
                {settings.charSet === 'custom' && (
                  <div className="ctl">
                    <span className="ctl-label">Custom ramp (dark to dense)</span>
                    <div className="input-with-action">
                      <input
                        className="text-input"
                        type="text"
                        value={customRampText}
                        onChange={(e) => {
                          setCustomRampText(e.target.value)
                          CHAR_RAMPS.custom.chars = e.target.value || ' '
                          renderNow(0)
                        }}
                      />
                      <button
                        className="btn small"
                        type="button"
                        onClick={() => {
                          const { sorted, densities } = calibrateCharsetDensity(customRampText)
                          setCustomRampText(sorted)
                          CHAR_RAMPS.custom.chars = sorted
                          const breakdown = densities.map((d) => `${d.char} ${(d.density * 100).toFixed(0)}%`).join(' · ')
                          setCalibratedBreakdown(breakdown)
                          showToast(`Calibrated ${densities.length} glyphs by optical density`)
                          renderNow(0)
                        }}
                        title="Automatically measure true optical pixel coverage in monospace font and sort from sparse to dense"
                      >
                        ⚡ Calibrate
                      </button>
                    </div>
                    {calibratedBreakdown && (
                      <small className="muted" style={{ display: 'block', marginTop: 6, fontSize: 11, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        Optical ink: {calibratedBreakdown}
                      </small>
                    )}
                  </div>
                )}
                <Select
                  label="Colour mode"
                  value={settings.colorMode}
                  options={[
                    { value: 'color', label: 'Full colour' },
                    { value: 'mono', label: 'Monochrome' },
                    { value: 'duotone', label: 'Duotone' },
                    { value: 'tint', label: 'Tinted' },
                  ]}
                  onChange={(v) => patch({ colorMode: v as Settings['colorMode'] })}
                />
                {settings.colorMode === 'mono' && <ColorInput label="Foreground" value={settings.fg} onChange={(v) => patch({ fg: v })} />}
                {settings.colorMode === 'duotone' && (
                  <>
                    <ColorInput label="Dark ink" value={settings.bg} onChange={(v) => patch({ bg: v })} />
                    <ColorInput label="Light ink" value={settings.fg} onChange={(v) => patch({ fg: v })} />
                  </>
                )}
                {settings.colorMode === 'tint' && <ColorInput label="Tint" value={settings.tint} onChange={(v) => patch({ tint: v })} />}
                <ColorInput label="Background" value={settings.bg} onChange={(v) => patch({ bg: v })} />
                <Toggle label="Invert" checked={settings.invert} onChange={(v) => patch({ invert: v })} />
              </Section>
              <Section title="Animation">
                <Toggle label="Loop live preview" checked={settings.loop} onChange={(v) => patch({ loop: v })} hint="video & webcam" />
                <Slider label="Frame rate" value={settings.fps} min={1} max={60} onChange={(v) => patch({ fps: v })} format={(v) => `${v} fps`} />
              </Section>
              <button
                className="btn"
                onClick={resetSettings}
              >
                Reset all settings
              </button>
            </div>
          )}

          {tab === 'lighting' && (
            <div className="tab-body">
              <Section title="Multi-Light Studio — 3D Illumination">
                <Toggle
                  label="Enable Multi-Light Shading"
                  checked={settings.lightingEnabled}
                  onChange={(v) => patch({ lightingEnabled: v })}
                  hint="Cast colored specular highlights & shadows on artwork"
                />
                {settings.lightingEnabled && (
                  <Slider
                    label="3D Surface Relief Bump"
                    value={settings.lightingBump ?? 45}
                    min={0}
                    max={100}
                    onChange={(v) => patch({ lightingBump: v })}
                    format={(v) => `${v}%`}
                  />
                )}
                <p className="muted">
                  Drag the light orbs directly on the preview canvas to position them in real time.
                </p>
                <div className="btn-row">
                  {LIGHT_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      className="btn small"
                      onClick={() => {
                        pushHistory(settingsRef.current)
                        patch({ lightingEnabled: true, lights: JSON.parse(JSON.stringify(p.lights)) })
                        showToast(`Applied lighting preset: ${p.name}`)
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </Section>

              {settings.lightingEnabled && (
                <Section title="Light Sources (1 to 4)">
                  {settings.lights.map((l, idx) => (
                    <div
                      key={l.id}
                      className={`light-card ${selectedLightId === l.id ? 'selected' : ''}`}
                      onClick={() => setSelectedLightId(l.id)}
                    >
                      <div className="light-card-head">
                        <b>Light {idx + 1} — {l.name}</b>
                        <Toggle
                          label=""
                          checked={l.enabled}
                          onChange={(en) => {
                            const nl = settings.lights.map((item) => (item.id === l.id ? { ...item, enabled: en } : item))
                            patch({ lights: nl })
                          }}
                        />
                      </div>
                      {l.enabled && (
                        <>
                          <div className="row-2">
                            <ColorInput
                              label="Color"
                              value={l.color}
                              onChange={(col) => {
                                const nl = settings.lights.map((item) => (item.id === l.id ? { ...item, color: col } : item))
                                patch({ lights: nl })
                              }}
                            />
                            <Select
                              label="Type"
                              value={l.type}
                              options={[
                                { value: 'point', label: 'Point Light' },
                                { value: 'rim', label: 'Rim Edge Light' },
                                { value: 'spot', label: 'Spotlight' },
                                { value: 'ambient', label: 'Ambient Light' },
                              ]}
                              onChange={(tp) => {
                                const nl = settings.lights.map((item) => (item.id === l.id ? { ...item, type: tp as LightSource['type'] } : item))
                                patch({ lights: nl })
                              }}
                            />
                          </div>
                          <Slider
                            label="Intensity"
                            value={l.intensity}
                            min={0}
                            max={200}
                            onChange={(v) => {
                              const nl = settings.lights.map((item) => (item.id === l.id ? { ...item, intensity: v } : item))
                              patch({ lights: nl })
                            }}
                            format={(v) => `${v}%`}
                          />
                          <Slider
                            label="Radius"
                            value={Math.round(l.radius * 100)}
                            min={10}
                            max={200}
                            onChange={(v) => {
                              const nl = settings.lights.map((item) => (item.id === l.id ? { ...item, radius: v / 100 } : item))
                              patch({ lights: nl })
                            }}
                            format={(v) => `${v}%`}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          {tab === 'effects' && (
            <div className="tab-body">
              <Section
                title="Post effects — stack as many as you like"
                action={
                  <button
                    className="btn small"
                    onClick={() => {
                      pushHistory(settingsRef.current)
                      setSettings((s) => ({ ...s, fx: cloneSettings(DEFAULT_SETTINGS).fx }))
                    }}
                  >
                    Clear all
                  </button>
                }
              >
                {FX_DEFS.map((fx) => (
                  <div key={fx.id} className="fx-row">
                    <Toggle
                      label={fx.label}
                      hint={fx.blurb}
                      checked={settings.fx[fx.id as FxId].enabled}
                      onChange={(v) => patchFx(fx.id as FxId, { enabled: v })}
                    />
                    {settings.fx[fx.id as FxId].enabled && (
                      <Slider
                        label="Intensity"
                        value={settings.fx[fx.id as FxId].intensity}
                        min={0}
                        max={100}
                        onChange={(v) => patchFx(fx.id as FxId, { intensity: v })}
                        format={(v) => `${v}%`}
                      />
                    )}
                  </div>
                ))}
              </Section>
            </div>
          )}

          {tab === 'recipes' && (
            <div className="tab-body">
              <Section title={`One-click recipes — ${RECIPES.length} looks, all free`}>
                <div className="recipe-grid">
                  {RECIPES.map((r) => (
                    <button key={r.id} className="recipe-card" onClick={() => applyRecipe(r.id)}>
                      <b>{r.name}</b>
                      <small>{r.desc}</small>
                    </button>
                  ))}
                </div>
              </Section>
              <Section title="Recipe code">
                <p className="muted">A recipe code holds your exact settings. Copy it, share it, or paste one back to load it.</p>
                <div className="btn-row">
                  <button className="btn" onClick={() => void copyRecipeCode()}>Copy current recipe code</button>
                </div>
                <label className="ctl">
                  <span className="ctl-label">Load a recipe code</span>
                  <input
                    className="text-input"
                    type="text"
                    value={recipeCode}
                    placeholder="Paste a recipe code…"
                    onChange={(e) => setRecipeCode(e.target.value)}
                  />
                </label>
                <button className="btn primary" onClick={loadRecipeCode}>Load recipe</button>
              </Section>
            </div>
          )}

          {tab === 'layers' && (
            <div className="tab-body">
              <Section title="Interactive Multi-Layer Studio">
                <p className="muted" style={{ marginBottom: 12 }}>
                  Add custom text overlays, titles, watermark badges, and captions. Drag on-canvas to position with full blend mode and font control.
                </p>

                <div className="btn-row" style={{ marginBottom: 12 }}>
                  <button className="btn primary small" onClick={() => addTextLayer()}>
                    + Add Text Layer
                  </button>
                  <button
                    className="btn small"
                    onClick={() => addTextLayer({
                      text: 'CYBERPUNK // 0x7F',
                      color: '#00f0ff',
                      bgColor: 'rgba(5, 5, 12, 0.85)',
                      border: true,
                      borderColor: '#00f0ff',
                      blendMode: 'screen',
                      fontFamily: 'monospace',
                      fontSize: 20,
                      x: 0.5,
                      y: 0.88,
                    })}
                  >
                    + Cyberpunk Badge
                  </button>
                  <button
                    className="btn small"
                    onClick={() => addTextLayer({
                      text: '© ASCII STUDIO · ORIGINAL',
                      color: '#ffffff',
                      bgColor: 'transparent',
                      border: false,
                      blendMode: 'overlay',
                      opacity: 0.65,
                      fontFamily: 'monospace',
                      fontSize: 14,
                      x: 0.82,
                      y: 0.94,
                    })}
                  >
                    + Watermark
                  </button>
                  <button
                    className="btn small"
                    onClick={() => addTextLayer({
                      text: 'NEO TOKYO // 2099',
                      color: '#ff2a6d',
                      bgColor: 'rgba(0, 0, 0, 0.75)',
                      border: true,
                      borderColor: '#ff2a6d',
                      blendMode: 'screen',
                      fontSize: 26,
                      x: 0.5,
                      y: 0.12,
                    })}
                  >
                    + Title
                  </button>
                </div>

                {(!settings.layers || settings.layers.length === 0) ? (
                  <p className="muted" style={{ textAlign: 'center', padding: '16px 0' }}>
                    No overlay layers yet. Click &quot;+ Add Text Layer&quot; above to begin!
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {settings.layers.map((l, idx) => {
                      const isSel = (selectedLayerId || settings.layers?.[0]?.id) === l.id
                      return (
                        <div key={l.id} className={`layer-card ${isSel ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            checked={l.enabled}
                            onChange={(e) => updateTextLayer(l.id, { enabled: e.target.checked })}
                            title="Toggle layer visibility"
                          />
                          <span
                            className="layer-card-title"
                            onClick={() => setSelectedLayerId(l.id)}
                            style={{ cursor: 'pointer', color: l.color }}
                          >
                            {idx + 1}. {l.text || '(empty)'}
                          </span>
                          <div className="layer-card-actions">
                            <button
                              className="btn small"
                              disabled={idx === 0}
                              onClick={() => moveTextLayer(l.id, 'up')}
                              title="Move layer backward (send toward back)"
                            >
                              ▲
                            </button>
                            <button
                              className="btn small"
                              disabled={idx === (settings.layers?.length ?? 0) - 1}
                              onClick={() => moveTextLayer(l.id, 'down')}
                              title="Move layer forward (bring toward front)"
                            >
                              ▼
                            </button>
                            <button
                              className="btn small"
                              onClick={() => duplicateTextLayer(l.id)}
                              title="Duplicate layer"
                            >
                              ⧉
                            </button>
                            <button
                              className="btn small"
                              onClick={() => removeTextLayer(l.id)}
                              title="Delete layer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Section>

              {(() => {
                const activeLayer = settings.layers?.find((l) => l.id === (selectedLayerId || settings.layers?.[0]?.id))
                if (!activeLayer) return null

                return (
                  <Section title={`Layer Inspector: "${activeLayer.text.slice(0, 16)}..."`}>
                    <label className="ctl">
                      <span className="ctl-label">Layer Text Content</span>
                      <textarea
                        className="text-input"
                        rows={2}
                        value={activeLayer.text}
                        onChange={(e) => updateTextLayer(activeLayer.id, { text: e.target.value })}
                        placeholder="Enter text or badge label…"
                      />
                    </label>

                    <Slider
                      label="Font Size"
                      value={activeLayer.fontSize}
                      min={10}
                      max={96}
                      onChange={(v) => updateTextLayer(activeLayer.id, { fontSize: v })}
                      format={(v) => `${v}px`}
                    />

                    <Select
                      label="Font Family"
                      value={activeLayer.fontFamily}
                      options={[
                        { value: 'monospace', label: 'Terminal Monospace (JetBrains / SF)' },
                        { value: 'sans-serif', label: 'Clean Modern Sans (Space Grotesk)' },
                        { value: 'serif', label: 'Editorial Serif (Georgia)' },
                        { value: 'impact', label: 'Headline Heavy (Impact)' },
                      ]}
                      onChange={(v) => updateTextLayer(activeLayer.id, { fontFamily: v as any })}
                    />

                    <Select
                      label="Blend Mode"
                      value={activeLayer.blendMode}
                      options={[
                        { value: 'normal', label: 'Normal (Standard Solid)' },
                        { value: 'screen', label: 'Screen (Luminous / Neon Glow)' },
                        { value: 'multiply', label: 'Multiply (Shadow / Darken)' },
                        { value: 'overlay', label: 'Overlay (Contrast Blend)' },
                        { value: 'difference', label: 'Difference (Inversion)' },
                        { value: 'color-dodge', label: 'Color Dodge (High Energy)' },
                      ]}
                      onChange={(v) => updateTextLayer(activeLayer.id, { blendMode: v as TextBlendMode })}
                    />

                    <div className="row-2">
                      <ColorInput
                        label="Text Color"
                        value={activeLayer.color}
                        onChange={(v) => updateTextLayer(activeLayer.id, { color: v })}
                      />
                      <ColorInput
                        label="Background Box"
                        value={activeLayer.bgColor === 'transparent' ? '#000000' : activeLayer.bgColor}
                        onChange={(v) => updateTextLayer(activeLayer.id, { bgColor: v })}
                      />
                    </div>

                    <div className="btn-row" style={{ marginTop: 0, marginBottom: 8 }}>
                      <button
                        className={`btn small ${activeLayer.bgColor === 'transparent' ? 'primary' : ''}`}
                        onClick={() => updateTextLayer(activeLayer.id, { bgColor: 'transparent' })}
                      >
                        Transparent BG
                      </button>
                      <button
                        className="btn small"
                        onClick={() => updateTextLayer(activeLayer.id, { bgColor: 'rgba(5, 5, 12, 0.85)' })}
                      >
                        Dark Glass Box
                      </button>
                    </div>

                    <Slider
                      label="Layer Opacity"
                      value={Math.round(activeLayer.opacity * 100)}
                      min={10}
                      max={100}
                      onChange={(v) => updateTextLayer(activeLayer.id, { opacity: v / 100 })}
                      format={(v) => `${v}%`}
                    />

                    <Slider
                      label="Layer Rotation"
                      value={activeLayer.rotation}
                      min={-180}
                      max={180}
                      onChange={(v) => updateTextLayer(activeLayer.id, { rotation: v })}
                      format={(v) => `${v}°`}
                    />

                    <Toggle
                      label="Badge Outline Border"
                      checked={activeLayer.border}
                      onChange={(v) => updateTextLayer(activeLayer.id, { border: v })}
                    />

                    {activeLayer.border && (
                      <ColorInput
                        label="Border Color"
                        value={activeLayer.borderColor || activeLayer.color}
                        onChange={(v) => updateTextLayer(activeLayer.id, { borderColor: v })}
                      />
                    )}

                    <div className="ctl" style={{ marginTop: 10 }}>
                      <span className="ctl-label">Quick Snap Placement</span>
                      <div className="btn-row">
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.15, y: 0.12 })}>Top Left</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.5, y: 0.12 })}>Top Center</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.85, y: 0.12 })}>Top Right</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.5, y: 0.5 })}>Center</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.15, y: 0.88 })}>Bottom Left</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.5, y: 0.88 })}>Bottom Center</button>
                        <button className="btn small" onClick={() => updateTextLayer(activeLayer.id, { x: 0.85, y: 0.88 })}>Bottom Right</button>
                      </div>
                    </div>

                    <Slider
                      label="Horizontal Position (X)"
                      value={Math.round(activeLayer.x * 100)}
                      min={0}
                      max={100}
                      onChange={(v) => updateTextLayer(activeLayer.id, { x: +(v / 100).toFixed(3) })}
                      format={(v) => `${v}%`}
                    />
                    <Slider
                      label="Vertical Position (Y)"
                      value={Math.round(activeLayer.y * 100)}
                      min={0}
                      max={100}
                      onChange={(v) => updateTextLayer(activeLayer.id, { y: +(v / 100).toFixed(3) })}
                      format={(v) => `${v}%`}
                    />
                  </Section>
                )
              })()}
            </div>
          )}

          {tab === 'export' && (
            <div className="tab-body">
              <Section title="Export — everything free, up to 4K">
                <div className="export-grid">
                  <button className="btn primary" disabled={exporting} onClick={() => void doExportPNG(1)}>PNG · 1x</button>
                  <button className="btn primary" disabled={exporting} onClick={() => void doExportPNG(2)}>PNG · 2x</button>
                  <button className="btn primary" disabled={exporting} onClick={() => void doExportPNG(3)}>PNG · 3x</button>
                  <button className="btn primary" disabled={exporting} onClick={() => void doExportPNG(4)}>PNG · 4x (4K)</button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportJPG()}>JPG</button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportWebP()}>WebP</button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportSized(1920, 1080, 'wallpaper')}>Wallpaper 1920×1080</button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportSized(1080, 1920, 'phone')}>Phone 1080×1920</button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportGIF()}>Animated GIF</button>
                  <button className="btn" disabled={recording} onClick={() => void doRecordVideo()}>
                    {recording ? 'Recording…' : `Record video (${recordDuration}s)`}
                  </button>
                  <button className="btn" disabled={exporting} onClick={() => void doExportHTML()}>Colour HTML</button>
                  <button className="btn" onClick={doExportTXT}>Plain text (.txt)</button>
                  <button className="btn primary" onClick={doExportSVG}>Vector SVG (.svg)</button>
                  <button className="btn" onClick={doExportANSI}>ANSI Terminal (.ans)</button>
                  <button className="btn" onClick={() => void copyAnsiCommand()}>Copy Shell cat cmd</button>
                  <button className="btn" onClick={() => void copyMarkdown()}>Copy Markdown (README)</button>
                  <button className="btn" onClick={doExportJSON}>JSON Grid (.json)</button>
                  <button className="btn" onClick={() => void copyImage()}>Copy image</button>
                  <button className="btn" onClick={() => void copyText()}>Copy text art (C)</button>
                  <button className="btn" onClick={() => void copyShareLink()}>Copy share link</button>
                </div>
                <div className="row-2" style={{ marginTop: 12 }}>
                  <label className="ctl">
                    <span className="ctl-label">Video recording length</span>
                    <select value={recordDuration} onChange={(e) => setRecordDuration(Number(e.target.value))}>
                      <option value={3}>3 seconds</option>
                      <option value={5}>5 seconds</option>
                      <option value={10}>10 seconds</option>
                    </select>
                  </label>
                </div>
                <p className="muted">
                  PNG at 4x is full 4K when your source is large enough. Vector SVG produces infinite-resolution scalable vector artwork.
                  ANSI terminal files print full TrueColor text in macOS Terminal, iTerm2, and Linux shells.
                </p>
              </Section>

              <Section title="Developer & Embed Code">
                <div className="export-grid">
                  <button className="btn" onClick={() => void copyReactComponent()}>Copy React Component</button>
                  <button className="btn" onClick={() => void copyWebComponent()}>Copy Web Component / Embed</button>
                  <button className="btn" onClick={() => void copyPythonScript()}>Copy Python CLI Script</button>
                  <button className="btn" onClick={() => void copyCHeader()}>Copy C/C++ Header Literal</button>
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  Drop ASCII art directly into React apps, websites, Python CLI tools, or C/C++ terminal games without external assets.
                </p>
              </Section>

              <Section title="Batch Image Processing & ZIP Export">
                <p className="muted" style={{ marginBottom: 10 }}>
                  Convert multiple images into ASCII art in one go and download as an uncompressed ZIP archive.
                </p>
                <div className="batch-format-row">
                  {(['png', 'txt', 'svg', 'html'] as BatchFormat[]).map((fmt) => (
                    <label key={fmt} className="batch-format-item">
                      <input
                        type="checkbox"
                        checked={batchFormats.includes(fmt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchFormats([...batchFormats, fmt])
                          } else {
                            if (batchFormats.length > 1) {
                              setBatchFormats(batchFormats.filter((f) => f !== fmt))
                            } else {
                              showToast('Keep at least one export format selected')
                            }
                          }
                        }}
                      />
                      <span>.{fmt.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="btn primary"
                  disabled={batchProcessing}
                  onClick={() => batchInputRef.current?.click()}
                  title="Select multiple images to batch process into ASCII ZIP"
                >
                  {batchProcessing ? 'Processing batch…' : '📦 Batch Export Images to ZIP'}
                </button>
                {batchProcessing && (
                  <div style={{ marginTop: 10 }}>
                    <div className="batch-progress-bar">
                      <div
                        className="batch-progress-fill"
                        style={{
                          width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <small className="muted" style={{ display: 'block', marginTop: 4, fontFamily: 'monospace', fontSize: 11 }}>
                      Packaging [{batchProgress.current}/{batchProgress.total}]: {batchProgress.name}
                    </small>
                  </div>
                )}
              </Section>
            </div>
          )}

          {tab === 'banner' && (
            <div className="tab-body">
              <BannerPanel toast={showToast} />
            </div>
          )}

          {tab === 'tools' && (
            <div className="tab-body">
              <Section title="Batch Image Processing & ZIP Export">
                <p className="muted" style={{ marginBottom: 10 }}>
                  Convert multiple images into ASCII art in one go and download as an uncompressed ZIP archive.
                </p>
                <div className="batch-format-row">
                  {(['png', 'txt', 'svg', 'html'] as BatchFormat[]).map((fmt) => (
                    <label key={fmt} className="batch-format-item">
                      <input
                        type="checkbox"
                        checked={batchFormats.includes(fmt)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBatchFormats([...batchFormats, fmt])
                          } else {
                            if (batchFormats.length > 1) {
                              setBatchFormats(batchFormats.filter((f) => f !== fmt))
                            } else {
                              showToast('Keep at least one export format selected')
                            }
                          }
                        }}
                      />
                      <span>.{fmt.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
                <button
                  className="btn primary"
                  disabled={batchProcessing}
                  onClick={() => batchInputRef.current?.click()}
                  title="Select multiple images to batch process into ASCII ZIP"
                >
                  {batchProcessing ? 'Processing batch…' : '📦 Batch Export Images to ZIP'}
                </button>
                {batchProcessing && (
                  <div style={{ marginTop: 10 }}>
                    <div className="batch-progress-bar">
                      <div
                        className="batch-progress-fill"
                        style={{
                          width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <small className="muted" style={{ display: 'block', marginTop: 4, fontFamily: 'monospace', fontSize: 11 }}>
                      Packaging [{batchProgress.current}/{batchProgress.total}]: {batchProgress.name}
                    </small>
                  </div>
                )}
              </Section>
              <ToolsPanel
                toast={showToast}
                onApplyRamp={(ramp) => {
                  setCustomRampText(ramp)
                  patch({ charSet: 'custom' })
                }}
              />
            </div>
          )}

          {tab === 'visualize' && (
            <div className="tab-body visualizer-tab-body" style={{ padding: 0 }}>
              <VisualizerStudio
                isTab={true}
                sourceCanvas={previewRef.current}
                onSendToStudio={(canvas) => {
                  stopWebcam()
                  activePieceRenderRef.current = null
                  setActivePieceMeta(null)
                  drawToSource((ctx, w, h) => ctx.drawImage(canvas, 0, 0, w, h), canvas.width, canvas.height)
                  setSource({ kind: 'image', name: 'Visualize Snapshot' })
                  setTab('tune')
                  showToast('Visualizer snapshot sent to Studio Workspace!')
                }}
              />
            </div>
          )}
        </aside>
      </main>

      <footer className="footer">
        <div className="footer-content">
          <span>Everything renders locally in your browser. Your images never leave your device.</span>
          <span>No account, no watermark, no usage limit. Output is yours to use anywhere.</span>
          <span className="footer-author">
            Engineered by{' '}
            <a href="https://github.com/enabled404" target="_blank" rel="noopener noreferrer" className="footer-author-link">
              Saad Khalid (<strong>@saadkhalidhere</strong>)
            </a>
          </span>
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="author-pill"
            title="Star & View ASCII Studio Repository on GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub Repo
          </a>
          <a
            href="https://saadkhalidhere.gumroad.com/l/tipjar"
            target="_blank"
            rel="noopener noreferrer"
            className="tipjar-pill"
            title="Support My Work on Gumroad"
          >
            ☕ Support My Work
          </a>
          <button
            type="button"
            className="footer-disclaimers-btn"
            onClick={() => openDisclaimers(null)}
            aria-label="View legal and security disclaimers"
          >
            🛡️ Legal &amp; Privacy Disclaimers
          </button>
        </div>
      </footer>

      <DisclaimersModal open={showDisclaimers} onClose={() => setShowDisclaimers(false)} targetSection={disclaimersTarget} />
      {showAnimatedLibrary && (
        <div className="animated-player-modal-backdrop" onClick={() => setShowAnimatedLibrary(false)}>
          <div className="animated-library-modal" style={{ maxWidth: '1320px', height: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <AnimatedLibrary
              onOpenInStudio={loadAnimatedPiece}
              onClose={() => setShowAnimatedLibrary(false)}
              onToast={showToast}
            />
          </div>
        </div>
      )}
      {playerModalPiece && (
        <AnimatedPlayerModal
          meta={playerModalPiece}
          onClose={() => setPlayerModalPiece(null)}
          onOpenInStudio={loadAnimatedPiece}
          onToast={showToast}
        />
      )}
      <McpModal
        open={showMcpModal}
        onClose={() => setShowMcpModal(false)}
        onToast={showToast}
      />
      {toast && <div className="toast">{toast}</div>}
      {selftest !== '' && <div id="selftest-results" data-testid="selftest">{selftest}</div>}
    </div>
  )
}
