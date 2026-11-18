// Interactive Multi-Modal Scientific & Creative Visualizer & Mockup Studio Component.
// Features:
// 1. Real-World Mockup & Scene Visualizer: 12 photorealistic mockups (Phone lockscreen,
//    Museum frame, 12" Vinyl album, Cyberpunk billboard, 1984 CRT monitor, Hoodie, Coffee mug,
//    90s Cassette tape, Laptop lid, Arcade cabinet, Magazine cover, Desk mat) with lighting moods,
//    frame finishes, 1x/2x exports, and canvas injection.
// 2. Interactive Multi-Modal Scientific Visualizer: Oscilloscope, 3D Waterfall, Frequency Radar,
//    Equalizer, Mandelbrot, Julia, Lorenz Attractor, Game of Life, 3D Parametric Surfaces.
//    Instant exports to GIF, WebP, Video (MP4/WebM), PNG, ANSI, and Plain ASCII.
// Written by Saad Khalid (@saadkhalidhere) for ASCII Studio (https://asciipro.vercel.app).

import { useEffect, useRef, useState } from 'react'
import {
  type VisualizerConfig,
  type ColormapId,
  DEFAULT_VISUALIZER_CONFIG,
  COLORMAPS,
  GameOfLife,
  LorenzAttractor,
  WaterfallBuffer,
  EqualizerEngine,
  renderVisualizerToCanvas,
  renderVisualizerToText,
} from '../engine/visualizer'
import {
  type MockupId,
  type EnvironmentLight,
  type FrameFinish,
  MOCKUP_CATALOG,
  renderMockupToCanvas,
} from '../engine/mockup'
import { audioEngine } from '../engine/audio'
import { downloadBlob, downloadText, copyTextToClipboard } from '../engine/exporters'
import { GIFEncoder, quantize, applyPalette } from 'gifenc'

export interface VisualizerStudioProps {
  sourceCanvas?: HTMLCanvasElement | null
  onSendToStudio?: (canvas: HTMLCanvasElement) => void
  onClose?: () => void
  isTab?: boolean
  initialMockup?: MockupId
}

export default function VisualizerStudio({
  sourceCanvas,
  onSendToStudio,
  onClose,
  isTab = false,
  initialMockup = 'phone-wallpaper',
}: VisualizerStudioProps) {
  // Studio primary mode
  const [studioMode, setStudioMode] = useState<'mockup' | 'scientific'>('mockup')

  // Real-world mockup state
  const [selectedMockup, setSelectedMockup] = useState<MockupId>(initialMockup)
  const [mockupLighting, setMockupLighting] = useState<EnvironmentLight>('studio')
  const [mockupFinish, setMockupFinish] = useState<FrameFinish>('oak')
  const [mockupScale, setMockupScale] = useState<number>(1)
  const mockupCanvasRef = useRef<HTMLCanvasElement>(null)

  // Scientific visualizer configuration
  const [cfg, setCfg] = useState<VisualizerConfig>(() => ({ ...DEFAULT_VISUALIZER_CONFIG }))
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  const scientificCanvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const isPlayingRef = useRef(true)

  // Scientific Sub-engines
  const lifeEngineRef = useRef<GameOfLife | null>(null)
  if (!lifeEngineRef.current) lifeEngineRef.current = new GameOfLife(cfg.cols, cfg.rows)

  const lorenzEngineRef = useRef<LorenzAttractor | null>(null)
  if (!lorenzEngineRef.current) lorenzEngineRef.current = new LorenzAttractor()

  const waterfallRef = useRef<WaterfallBuffer | null>(null)
  if (!waterfallRef.current) waterfallRef.current = new WaterfallBuffer(48)

  const eqEngineRef = useRef<EqualizerEngine | null>(null)
  if (!eqEngineRef.current) eqEngineRef.current = new EqualizerEngine(32)

  // Audio source state
  const [audioSource, setAudioSource] = useState<
    'synth-beat' | 'synth-bass' | 'synth-chip' | 'synth-ambient' | 'synth-sweep' | 'mic' | 'file' | 'none'
  >('synth-beat')
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const audioFileInputRef = useRef<HTMLInputElement>(null)

  // Mouse drag interaction
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, rotX: 0, rotY: 0, panX: 0, panY: 0 })

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2800)
  }

  // Render Real-World Mockup Canvas whenever mockup settings or source changes
  useEffect(() => {
    if (studioMode !== 'mockup') return
    const canvas = mockupCanvasRef.current
    if (!canvas) return
    renderMockupToCanvas(canvas, sourceCanvas || null, selectedMockup, {
      lighting: mockupLighting,
      frameFinish: mockupFinish,
      resolutionScale: mockupScale,
    })
  }, [studioMode, selectedMockup, mockupLighting, mockupFinish, mockupScale, sourceCanvas])

  // Handle Audio Source switching
  const handleAudioSourceChange = async (source: typeof audioSource) => {
    setAudioSource(source)
    if (source === 'none') {
      audioEngine.stop()
      return
    }
    if (source === 'mic') {
      const ok = await audioEngine.startMic()
      if (ok) showToast('Microphone input active')
      else showToast('Microphone unavailable, fallback synthesizer active')
      return
    }
    if (source === 'synth-beat') {
      audioEngine.startSynth('beat', 124)
      showToast('120 BPM Synth Beat active')
      return
    }
    if (source === 'synth-bass') {
      audioEngine.startSynth('synthwave', 128)
      showToast('Cyberpunk Bass active')
      return
    }
    if (source === 'synth-chip') {
      audioEngine.startSynth('chiptune', 140)
      showToast('8-Bit Chiptune Melody active')
      return
    }
    if (source === 'synth-ambient') {
      audioEngine.startSynth('ambient')
      showToast('Ambient Harmonic Drone active')
      return
    }
    if (source === 'synth-sweep') {
      audioEngine.startSynth('sweep')
      showToast('Continuous Frequency Sweep active')
      return
    }
    if (source === 'file') {
      audioFileInputRef.current?.click()
      return
    }
  }

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const ok = await audioEngine.startAudioFile(file)
      if (ok) {
        setAudioSource('file')
        showToast(`Loaded audio file: ${file.name}`)
      } else {
        showToast('Could not load audio file')
      }
    }
  }

  // Scientific visualizer render loop
  useEffect(() => {
    if (studioMode !== 'scientific') return
    let lastLifeStep = 0

    const renderLoop = () => {
      if (isPlayingRef.current && scientificCanvasRef.current) {
        const time = (Date.now() - startTimeRef.current) * 0.001
        const timeData = audioEngine.getTimeData()
        const fftData = audioEngine.getFftData()

        if (cfgRef.current.mode === 'life' && lifeEngineRef.current) {
          const now = Date.now()
          const interval = Math.max(25, 200 / (cfgRef.current.speed || 1))
          if (now - lastLifeStep > interval) {
            lifeEngineRef.current.step()
            lastLifeStep = now
          }
        }

        renderVisualizerToCanvas(
          scientificCanvasRef.current,
          cfgRef.current,
          time,
          timeData,
          fftData,
          lifeEngineRef.current || undefined,
          lorenzEngineRef.current || undefined,
          waterfallRef.current || undefined,
          eqEngineRef.current || undefined
        )
      }
      animFrameRef.current = requestAnimationFrame(renderLoop)
    }

    animFrameRef.current = requestAnimationFrame(renderLoop)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [studioMode])

  // Mouse interaction for scientific visualizer
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (cfg.mode === 'life' && lifeEngineRef.current) {
      const gx = Math.floor((x / rect.width) * lifeEngineRef.current.width)
      const gy = Math.floor((y / rect.height) * lifeEngineRef.current.height)
      lifeEngineRef.current.toggleCell(gx, gy)
      return
    }

    isDraggingRef.current = true
    dragStartRef.current = {
      x,
      y,
      rotX: cfg.rotationX,
      rotY: cfg.rotationY,
      panX: cfg.panX,
      panY: cfg.panY,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - dragStartRef.current.x
    const dy = y - dragStartRef.current.y

    if (cfg.mode === 'mandelbrot' || cfg.mode === 'julia') {
      const factor = 2.4 / (cfg.zoom * rect.width)
      setCfg((prev) => ({
        ...prev,
        panX: dragStartRef.current.panX - dx * factor,
        panY: dragStartRef.current.panY - dy * factor,
      }))
    } else {
      setCfg((prev) => ({
        ...prev,
        rotationY: dragStartRef.current.rotY + dx * 0.015,
        rotationX: dragStartRef.current.rotX + dy * 0.015,
      }))
    }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (cfg.mode === 'mandelbrot' || cfg.mode === 'julia') {
      const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8
      setCfg((prev) => ({
        ...prev,
        zoom: Math.max(0.1, prev.zoom * zoomFactor),
      }))
    } else {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
      setCfg((prev) => ({
        ...prev,
        zoom: Math.max(0.2, Math.min(8.0, prev.zoom * zoomFactor)),
      }))
    }
  }

  // ---------------- MOCKUP EXPORTS ----------------
  const handleExportMockupPNG = () => {
    const canvas = mockupCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `mockup-${selectedMockup}-${Date.now()}.png`)
        showToast('Mockup PNG downloaded!')
      }
    }, 'image/png')
  }

  const handleExportMockupJPG = () => {
    const canvas = mockupCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `mockup-${selectedMockup}-${Date.now()}.jpg`)
        showToast('Mockup JPG downloaded!')
      }
    }, 'image/jpeg', 0.92)
  }

  const handleExportIsolatedArt = () => {
    const canvas = sourceCanvas
    if (!canvas) {
      showToast('No isolated artwork loaded')
      return
    }
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `ascii-art-isolated-${Date.now()}.png`)
        showToast('Isolated artwork PNG downloaded!')
      }
    }, 'image/png')
  }

  const handleSendMockupToStudio = () => {
    const canvas = mockupCanvasRef.current
    if (!canvas) return
    if (onSendToStudio) {
      onSendToStudio(canvas)
      showToast('Mockup scene sent to ASCII Studio Canvas!')
    }
  }

  // ---------------- SCIENTIFIC EXPORTS ----------------
  const handleExportScientificPNG = () => {
    const canvas = scientificCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `visualizer-${cfg.mode}-${Date.now()}.png`)
        showToast('PNG image downloaded!')
      }
    }, 'image/png')
  }

  const handleExportScientificWebP = () => {
    const canvas = scientificCanvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `visualizer-${cfg.mode}-${Date.now()}.webp`)
        showToast('WebP image downloaded!')
      }
    }, 'image/webp', 0.92)
  }

  const handleExportScientificVideo = async () => {
    const canvas = scientificCanvasRef.current
    if (!canvas) return
    if (typeof MediaRecorder === 'undefined') {
      showToast('Video recording not supported in this browser')
      return
    }
    setExporting(true)
    showToast('Recording 4-second video clip...')
    try {
      const stream = canvas.captureStream(30)
      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4' : 'video/webm'
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4000000 })
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        downloadBlob(blob, `visualizer-${cfg.mode}-${Date.now()}.${ext}`)
        showToast(`Video (${ext.toUpperCase()}) exported successfully!`)
        setExporting(false)
      }
      recorder.start()
      window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 4000)
    } catch (err) {
      console.error(err)
      showToast('Video export failed')
      setExporting(false)
    }
  }

  const handleExportScientificGIF = async () => {
    const canvas = scientificCanvasRef.current
    if (!canvas) return
    setExporting(true)
    showToast('Recording 3-second animated GIF...')
    try {
      const fps = 20
      const durationSec = 3
      const totalFrames = fps * durationSec
      const delay = Math.round(1000 / fps)

      const w = Math.min(640, canvas.width)
      const h = Math.round((canvas.height * w) / canvas.width)
      const offCanvas = document.createElement('canvas')
      offCanvas.width = w
      offCanvas.height = h
      const offCtx = offCanvas.getContext('2d')
      if (!offCtx) throw new Error('2D context failed')

      const gif = GIFEncoder()
      let time = (Date.now() - startTimeRef.current) * 0.001

      for (let f = 0; f < totalFrames; f++) {
        time += 1 / fps
        const timeData = audioEngine.getTimeData()
        const fftData = audioEngine.getFftData()

        if (cfg.mode === 'life' && lifeEngineRef.current && f % 2 === 0) {
          lifeEngineRef.current.step()
        }

        renderVisualizerToCanvas(
          offCanvas,
          cfg,
          time,
          timeData,
          fftData,
          lifeEngineRef.current || undefined,
          lorenzEngineRef.current || undefined,
          waterfallRef.current || undefined,
          eqEngineRef.current || undefined
        )

        const imgData = offCtx.getImageData(0, 0, w, h)
        const palette = quantize(imgData.data, 128)
        const indexed = applyPalette(imgData.data, palette)
        gif.writeFrame(indexed, w, h, { palette, delay })
      }

      gif.finish()
      const blob = new Blob([gif.bytes() as any], { type: 'image/gif' })
      downloadBlob(blob, `visualizer-${cfg.mode}-${Date.now()}.gif`)
      showToast('Animated GIF export complete!')
    } catch (err) {
      console.error(err)
      showToast('GIF export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleExportANSI = () => {
    const time = (Date.now() - startTimeRef.current) * 0.001
    const ansi = renderVisualizerToText(
      cfg,
      time,
      audioEngine.getTimeData(),
      audioEngine.getFftData(),
      lifeEngineRef.current || undefined,
      'ansi'
    )
    downloadText(ansi, `visualizer-${cfg.mode}.ans`)
    showToast('ANSI terminal file downloaded')
  }

  const handleCopyText = async () => {
    const time = (Date.now() - startTimeRef.current) * 0.001
    const text = renderVisualizerToText(
      cfg,
      time,
      audioEngine.getTimeData(),
      audioEngine.getFftData(),
      lifeEngineRef.current || undefined,
      'plain'
    )
    await copyTextToClipboard(text)
    showToast('Copied ASCII art to clipboard!')
  }

  const handleSendScientificToStudio = () => {
    const canvas = scientificCanvasRef.current
    if (!canvas) return
    if (onSendToStudio) {
      onSendToStudio(canvas)
      showToast('Frame sent to ASCII Studio Canvas!')
    }
  }

  const activeMockupMeta = MOCKUP_CATALOG.find((m) => m.id === selectedMockup) || MOCKUP_CATALOG[0]

  return (
    <div className={`visualizer-studio-container ${isTab ? 'tab-mode' : 'modal-mode'}`}>
      {/* Studio Header */}
      <div className="vis-header">
        <div className="vis-title-group">
          <h2>🔮 Visualize Studio Suite</h2>
          <p className="vis-subtitle">
            Real-World Photorealistic Mockups &amp; Multi-Modal Interactive Scientific Visualizer
          </p>
        </div>

        {/* Primary Tab Switcher */}
        <div className="vis-studio-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={studioMode === 'mockup'}
            className={`vis-tab-pill ${studioMode === 'mockup' ? 'active' : ''}`}
            onClick={() => setStudioMode('mockup')}
          >
            📸 Real-World Mockups (12 Scenes)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioMode === 'scientific'}
            className={`vis-tab-pill ${studioMode === 'scientific' ? 'active' : ''}`}
            onClick={() => setStudioMode('scientific')}
          >
            ⚡ Scientific &amp; Creative Canvas
          </button>
        </div>

        <div className="vis-top-actions">
          {studioMode === 'mockup' ? (
            <button
              type="button"
              className="btn highlight-btn"
              onClick={handleSendMockupToStudio}
              title="Import composited mockup into Studio workspace"
            >
              ⚡ Send Mockup to Studio
            </button>
          ) : (
            <button
              type="button"
              className="btn highlight-btn"
              onClick={handleSendScientificToStudio}
              title="Import current visualizer frame into Studio workspace"
            >
              ⚡ Send Frame to Studio
            </button>
          )}

          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="github-topbar-btn"
            style={{ textDecoration: 'none' }}
            title="View code and algorithms on GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>

          {onClose && (
            <button type="button" className="btn" onClick={onClose} aria-label="Close Visualizer">
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. REAL-WORLD MOCKUP & SCENE VISUALIZER */}
      {/* ========================================================= */}
      {studioMode === 'mockup' && (
        <div className="vis-workspace mockup-workspace">
          {/* Mockup Sidebar Controls */}
          <div className="vis-sidebar">
            <div className="vis-section">
              <label className="vis-section-label">REAL-WORLD SCENE MOCKUPS ({MOCKUP_CATALOG.length})</label>
              <div className="mockup-cards-grid">
                {MOCKUP_CATALOG.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mockup-select-btn ${selectedMockup === m.id ? 'active' : ''}`}
                    onClick={() => setSelectedMockup(m.id)}
                    title={m.description}
                  >
                    <div className="mockup-btn-header">
                      <span className="mockup-btn-name">{m.name}</span>
                      {m.badge && <span className="mockup-btn-badge">{m.badge}</span>}
                    </div>
                    <span className="mockup-btn-sub">
                      {m.aspectRatio} · {m.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lighting Environment */}
            <div className="vis-section">
              <label className="vis-section-label">ENVIRONMENT LIGHTING</label>
              <div className="vis-btn-grid cols-2">
                {(
                  [
                    ['studio', '☀️ Studio Daylight'],
                    ['neon', '🌆 Cyberpunk Neon'],
                    ['gallery', '🏛️ Museum Spotlight'],
                    ['darkroom', '🔴 Moody Amber/Dark'],
                  ] as [EnvironmentLight, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`vis-btn-mini ${mockupLighting === id ? 'active' : ''}`}
                    onClick={() => setMockupLighting(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Finish (for gallery-frame & products) */}
            <div className="vis-section">
              <label className="vis-section-label">BEZEL / FRAME FINISH</label>
              <div className="vis-btn-grid cols-3">
                {(
                  [
                    ['oak', '🪵 Oak'],
                    ['walnut', '🌰 Walnut'],
                    ['aluminum', '💿 Aluminum'],
                    ['black', '⬛ Black'],
                    ['gold', '✨ Gold'],
                    ['neon-chrome', '💠 Chrome'],
                  ] as [FrameFinish, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`vis-btn-mini ${mockupFinish === id ? 'active' : ''}`}
                    onClick={() => setMockupFinish(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Resolution */}
            <div className="vis-section">
              <label className="vis-section-label">RENDER RESOLUTION</label>
              <div className="vis-btn-grid cols-2">
                <button
                  type="button"
                  className={`vis-btn-mini ${mockupScale === 1 ? 'active' : ''}`}
                  onClick={() => setMockupScale(1)}
                >
                  1x HD Preview
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${mockupScale === 2 ? 'active' : ''}`}
                  onClick={() => setMockupScale(2)}
                >
                  2x Ultra-HD Print
                </button>
              </div>
            </div>

            {/* Mockup Exports */}
            <div className="vis-section">
              <label className="vis-section-label">INSTANT EXPORT OPTIONS</label>
              <div className="vis-export-grid">
                <button type="button" className="btn export-btn" onClick={handleExportMockupPNG}>
                  🖼️ Export Mockup (PNG)
                </button>
                <button type="button" className="btn export-btn" onClick={handleExportMockupJPG}>
                  📄 Export Mockup (JPG)
                </button>
                <button type="button" className="btn export-btn secondary" onClick={handleExportIsolatedArt}>
                  🎨 Export Isolated Art
                </button>
              </div>
            </div>
          </div>

          {/* Mockup Canvas Stage */}
          <div className="vis-stage">
            <div className="vis-canvas-wrapper mockup-stage-wrapper">
              <canvas
                ref={mockupCanvasRef}
                className="vis-canvas mockup-canvas"
                role="img"
                aria-label={`Mockup visualizer: ${activeMockupMeta.name}`}
              />
            </div>
            <div className="mockup-meta-hud">
              <span>{activeMockupMeta.name}</span>
              <span>Aspect: {activeMockupMeta.aspectRatio}</span>
              <span>Dimensions: {activeMockupMeta.dimensions.width}x{activeMockupMeta.dimensions.height}px</span>
              <span>Scale: {mockupScale}x</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SCIENTIFIC & CREATIVE VISUALIZER STUDIO */}
      {/* ========================================================= */}
      {studioMode === 'scientific' && (
        <div className="vis-workspace">
          {/* Scientific Sidebar */}
          <div className="vis-sidebar">
            <div className="vis-section">
              <label className="vis-section-label">VISUALIZER ENGINE</label>
              <div className="vis-btn-grid">
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'oscilloscope' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'oscilloscope' }))}
                >
                  〰️ Oscilloscope
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'waterfall' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'waterfall' }))}
                >
                  🏔️ 3D Waterfall
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'radar' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'radar' }))}
                >
                  🎯 Radar HUD
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'equalizer' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'equalizer' }))}
                >
                  📊 Peak Equalizer
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'mandelbrot' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'mandelbrot', zoom: 1.0, panX: -0.5, panY: 0 }))}
                >
                  🌀 Mandelbrot
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'julia' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'julia', zoom: 1.0, panX: 0, panY: 0 }))}
                >
                  🔮 Julia Fractal
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'lorenz' ? 'active' : ''}`}
                  onClick={() => {
                    lorenzEngineRef.current?.reset()
                    setCfg((prev) => ({ ...prev, mode: 'lorenz', zoom: 1.2 }))
                  }}
                >
                  🦋 Lorenz Chaos
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'life' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'life' }))}
                >
                  🧬 Game of Life
                </button>
                <button
                  type="button"
                  className={`vis-mode-btn ${cfg.mode === 'parametric' ? 'active' : ''}`}
                  onClick={() => setCfg((prev) => ({ ...prev, mode: 'parametric', zoom: 1.0 }))}
                >
                  📐 3D Surfaces
                </button>
              </div>
            </div>

            {/* Colormaps */}
            <div className="vis-section">
              <label className="vis-section-label">COLORMAP THEMES</label>
              <div className="vis-colormap-grid">
                {(Object.keys(COLORMAPS) as ColormapId[]).map((cId) => (
                  <button
                    key={cId}
                    type="button"
                    className={`vis-cmap-btn ${cfg.colormap === cId ? 'active' : ''}`}
                    onClick={() => setCfg((prev) => ({ ...prev, colormap: cId }))}
                  >
                    {COLORMAPS[cId].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Signal Source */}
            <div className="vis-section">
              <label className="vis-section-label">AUDIO / SIGNAL SOURCE</label>
              <div className="vis-btn-grid cols-2">
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'synth-beat' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('synth-beat')}
                >
                  🥁 120 BPM Beat
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'synth-bass' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('synth-bass')}
                >
                  🎸 Cyber Bass
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'synth-chip' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('synth-chip')}
                >
                  👾 8-Bit Chiptune
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'synth-ambient' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('synth-ambient')}
                >
                  🌌 Ambient Drone
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'mic' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('mic')}
                >
                  🎙️ Microphone
                </button>
                <button
                  type="button"
                  className={`vis-btn-mini ${audioSource === 'none' ? 'active' : ''}`}
                  onClick={() => handleAudioSourceChange('none')}
                >
                  🔇 Mute Audio
                </button>
              </div>
              <input
                ref={audioFileInputRef}
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleAudioFileChange}
              />
            </div>

            {/* Scientific Exports (GIF, WebP, Video, PNG, ANSI, Text) */}
            <div className="vis-section">
              <label className="vis-section-label">EXPORTS (GIF, WEBP, VIDEO, PNG, ANSI)</label>
              <div className="vis-export-grid">
                <button type="button" className="btn export-btn" onClick={handleExportScientificPNG} disabled={exporting}>
                  🖼️ PNG Image
                </button>
                <button type="button" className="btn export-btn" onClick={handleExportScientificWebP} disabled={exporting}>
                  🌐 WebP Graphic
                </button>
                <button type="button" className="btn export-btn" onClick={handleExportScientificGIF} disabled={exporting}>
                  🎞️ Animated GIF
                </button>
                <button type="button" className="btn export-btn" onClick={handleExportScientificVideo} disabled={exporting}>
                  🎥 MP4/WebM Video
                </button>
                <button type="button" className="btn export-btn secondary" onClick={handleExportANSI}>
                  💻 ANSI Terminal (.ans)
                </button>
                <button type="button" className="btn export-btn secondary" onClick={handleCopyText}>
                  📋 Copy Plain ASCII
                </button>
              </div>
            </div>
          </div>

          {/* Scientific Canvas Stage */}
          <div className="vis-stage">
            <div className="vis-canvas-wrapper">
              <canvas
                ref={scientificCanvasRef}
                className="vis-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                role="img"
                aria-label={`Interactive scientific visualizer: ${cfg.mode}`}
              />
            </div>
            <div className="vis-interaction-hud">
              <span>Mode: {cfg.mode.toUpperCase()}</span>
              <span>Drag: Orbit 3D / Pan</span>
              <span>Wheel: Zoom ({cfg.zoom.toFixed(2)}x)</span>
              <span>Theme: {COLORMAPS[cfg.colormap].name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast notification */}
      {toast && <div className="vis-toast">{toast}</div>}
    </div>
  )
}
