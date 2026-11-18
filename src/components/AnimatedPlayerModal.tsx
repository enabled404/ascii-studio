// Dedicated Fullscreen Player Modal for Animated ASCII Art with frame scrubbing,
// speed/FPS controls, theme/look switchers, and comprehensive GIF/Video/ANSI export suite.
// Written by Saad Khalid (@saadkhalidhere).

import { useEffect, useRef, useState } from 'react'
import {
  type AnimatedPieceMeta,
  type FrameData,
  type RenderFrameFn,
  type ThemePaletteId,
  PALETTE_THEMES,
  loadPieceRenderer,
  renderFrameToCanvas,
  exportAnimatedPieceGIF,
  exportAnimatedPieceWebP,
  exportAnimatedPieceFramesZip,
  exportAnimatedPieceVideo,
  formatFrameAsANSI,
  generateTerminalScript,
  generateTerminalCurlSnippet,
} from '../engine/animatedArt'

interface AnimatedPlayerModalProps {
  meta: AnimatedPieceMeta
  onClose: () => void
  onOpenInStudio: (meta: AnimatedPieceMeta) => void
  onToast: (msg: string) => void
}

export default function AnimatedPlayerModal({ meta, onClose, onOpenInStudio, onToast }: AnimatedPlayerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isReverse, setIsReverse] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0)
  const [targetFps, setTargetFps] = useState(meta.fps || 20)
  const [scale, setScale] = useState(1.0)
  const [theme, setTheme] = useState<ThemePaletteId>('original')
  const [look, setLook] = useState<'text' | 'dots' | 'blocks'>('text')

  const [currentFrame, setCurrentFrame] = useState(0)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [durationSec] = useState(4.0) // Loop duration for scrubbing
  const totalFrames = Math.max(1, Math.round(durationSec * targetFps))

  const renderFnRef = useRef<RenderFrameFn | null>(null)
  const currentFrameDataRef = useRef<FrameData | null>(null)
  const timeRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  const [isExportingGif, setIsExportingGif] = useState(false)
  const [gifProgress, setGifProgress] = useState(0)
  const [isExportingWebp, setIsExportingWebp] = useState(false)
  const [webpProgress, setWebpProgress] = useState(0)
  const [isExportingVideoMp4, setIsExportingVideoMp4] = useState(false)
  const [videoMp4Progress, setVideoMp4Progress] = useState(0)
  const [isExportingVideoWebm, setIsExportingVideoWebm] = useState(false)
  const [videoWebmProgress, setVideoWebmProgress] = useState(0)
  const [isExportingZip, setIsExportingZip] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)

  // Load renderer
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { render } = await loadPieceRenderer(meta.slug)
        if (!active) return
        renderFnRef.current = render
        const initial = render(0, 0)
        currentFrameDataRef.current = initial
        if (canvasRef.current) {
          renderFrameToCanvas(canvasRef.current, initial, meta, { theme, look, scale })
        }
      } catch (err) {
        console.error('Failed to load player renderer:', err)
      }
    })()
    return () => {
      active = false
    }
  }, [meta])

  // Re-render when theme, look, or scale change
  useEffect(() => {
    if (currentFrameDataRef.current && canvasRef.current) {
      renderFrameToCanvas(canvasRef.current, currentFrameDataRef.current, meta, { theme, look, scale })
    }
  }, [theme, look, scale, meta])

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    const frameInterval = 1000 / (targetFps * speedMultiplier)

    const tick = (now: number) => {
      const dt = now - lastTimeRef.current
      if (dt >= frameInterval && renderFnRef.current && canvasRef.current) {
        lastTimeRef.current = now - (dt % frameInterval)
        const step = (1 / targetFps) * (isReverse ? -1 : 1)
        let nextTime = timeRef.current + step
        if (nextTime < 0) nextTime = durationSec
        if (nextTime > durationSec) nextTime = 0
        timeRef.current = nextTime

        const fIdx = Math.floor(nextTime * targetFps) % totalFrames
        setCurrentFrame(fIdx)
        setCurrentTimeSec(nextTime)

        const frame = renderFnRef.current(nextTime, fIdx)
        currentFrameDataRef.current = frame
        renderFrameToCanvas(canvasRef.current, frame, meta, { theme, look, scale })
      }
      raf = requestAnimationFrame(tick)
    }

    lastTimeRef.current = performance.now()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, isReverse, speedMultiplier, targetFps, durationSec, totalFrames, theme, look, scale, meta])

  // Scrubbing handler
  const handleScrub = (newFrame: number) => {
    setIsPlaying(false)
    setCurrentFrame(newFrame)
    const t = newFrame / targetFps
    timeRef.current = t
    setCurrentTimeSec(t)
    if (renderFnRef.current && canvasRef.current) {
      const frame = renderFnRef.current(t, newFrame)
      currentFrameDataRef.current = frame
      renderFrameToCanvas(canvasRef.current, frame, meta, { theme, look, scale })
    }
  }

  // Step 1 frame forward/backward
  const handleStep = (direction: 1 | -1) => {
    setIsPlaying(false)
    let nextFrame = currentFrame + direction
    if (nextFrame < 0) nextFrame = totalFrames - 1
    if (nextFrame >= totalFrames) nextFrame = 0
    handleScrub(nextFrame)
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((v) => !v)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleStep(1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleStep(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentFrame, totalFrames, targetFps])

  // Export GIF
  const handleExportGif = async () => {
    if (!renderFnRef.current || isExportingGif) return
    setIsExportingGif(true)
    setGifProgress(0)
    try {
      const blob = await exportAnimatedPieceGIF(meta, renderFnRef.current, {
        durationSec: 2.5,
        fps: targetFps,
        scale: 1.0,
        theme,
        look,
        onProgress: (p) => setGifProgress(Math.round(p * 100)),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}-animated.gif`
      a.click()
      URL.revokeObjectURL(url)
      onToast(`Exported ${meta.name} as Animated GIF!`)
    } catch (err) {
      console.error('Failed to export GIF:', err)
      onToast('Error generating Animated GIF')
    } finally {
      setIsExportingGif(false)
    }
  }

  // Export WebP
  const handleExportWebp = async () => {
    if (!renderFnRef.current || isExportingWebp) return
    setIsExportingWebp(true)
    setWebpProgress(0)
    try {
      const blob = await exportAnimatedPieceWebP(meta, renderFnRef.current, {
        durationSec: 2.5,
        fps: targetFps,
        scale: 1.0,
        theme,
        look,
        onProgress: (p) => setWebpProgress(Math.round(p * 100)),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}-animated.webp`
      a.click()
      URL.revokeObjectURL(url)
      onToast(`Exported ${meta.name} as Animated WebP!`)
    } catch (err) {
      console.error('Failed to export WebP:', err)
      onToast('Error generating Animated WebP')
    } finally {
      setIsExportingWebp(false)
    }
  }

  // Export Video (MP4 or WebM)
  const handleExportVideo = async (preferredFormat: 'mp4' | 'webm') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isMp4 = preferredFormat === 'mp4'
    if (isMp4 ? isExportingVideoMp4 : isExportingVideoWebm) return

    if (isMp4) {
      setIsExportingVideoMp4(true)
      setVideoMp4Progress(0)
    } else {
      setIsExportingVideoWebm(true)
      setVideoWebmProgress(0)
    }

    try {
      const { blob, ext } = await exportAnimatedPieceVideo(
        canvas,
        targetFps,
        3.5,
        preferredFormat,
        (p) => {
          const pct = Math.round(p * 100)
          if (isMp4) setVideoMp4Progress(pct)
          else setVideoWebmProgress(pct)
        },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}-video.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      onToast(`Exported ${meta.name} as ${ext.toUpperCase()} Video!`)
    } catch (err) {
      console.error('Video recording failed:', err)
      onToast('Video recording not supported in this browser')
    } finally {
      if (isMp4) setIsExportingVideoMp4(false)
      else setIsExportingVideoWebm(false)
    }
  }

  // Export Frame Files ZIP (Plain text + ANSI truecolor + play.sh)
  const handleExportFramesZip = async () => {
    if (!renderFnRef.current || isExportingZip) return
    setIsExportingZip(true)
    setZipProgress(0)
    try {
      const blob = await exportAnimatedPieceFramesZip(meta, renderFnRef.current, {
        durationSec: 3.0,
        fps: targetFps,
        theme,
        onProgress: (p) => setZipProgress(Math.round(p * 100)),
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}-frames.zip`
      a.click()
      URL.revokeObjectURL(url)
      onToast(`Exported ${meta.name} frames (Text & ANSI) as ZIP!`)
    } catch (err) {
      console.error('Failed to export frames ZIP:', err)
      onToast('Error exporting frame files ZIP')
    } finally {
      setIsExportingZip(false)
    }
  }

  // Copy Plain Text Frame
  const handleCopyText = () => {
    if (currentFrameDataRef.current) {
      void navigator.clipboard.writeText(currentFrameDataRef.current.text)
      onToast(`Copied ${meta.name} frame text!`)
    }
  }

  // Copy ANSI sequence
  const handleCopyANSI = () => {
    if (currentFrameDataRef.current) {
      const ansi = formatFrameAsANSI(currentFrameDataRef.current, meta, theme)
      void navigator.clipboard.writeText(ansi)
      onToast(`Copied 24-bit ANSI color sequence!`)
    }
  }

  // Download Shell Script (.sh)
  const handleDownloadShellScript = () => {
    if (!renderFnRef.current) return
    const script = generateTerminalScript(meta, renderFnRef.current, 3.0)
    const blob = new Blob([script], { type: 'text/x-shellscript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta.slug}.sh`
    a.click()
    URL.revokeObjectURL(url)
    onToast(`Downloaded ${meta.slug}.sh! Run: bash ${meta.slug}.sh`)
  }

  // Copy Terminal curl command
  const handleCopyTerminal = () => {
    const snippet = generateTerminalCurlSnippet(meta.slug)
    void navigator.clipboard.writeText(snippet)
    onToast(`Copied terminal command: ${snippet}`)
  }

  return (
    <div className="animated-player-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Animation player for ${meta.name}`}>
      <div className="animated-player-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="player-modal-head">
          <div className="player-title-col">
            <div className="player-title-row">
              <h3>{meta.name}</h3>
              <span className="player-category-pill">{meta.category}</span>
              <span className="player-meta-badge">{meta.cols}×{meta.rows} chars</span>
              <span className="player-meta-badge">{meta.fps} FPS</span>
            </div>
            <p className="player-note">{meta.note}</p>
          </div>
          <button className="btn icon-btn player-close-btn" onClick={onClose} aria-label="Close Player Modal">✕</button>
        </div>

        {/* Stage Canvas */}
        <div className="player-stage-viewport">
          <canvas ref={canvasRef} className="player-stage-canvas" role="img" aria-label={`Live render of ${meta.name}`} />
        </div>

        {/* Scrubbing Timeline & Playback Bar */}
        <div className="player-timeline-box">
          <div className="player-scrubber-row">
            <span className="player-time-label">{currentTimeSec.toFixed(1)}s / {durationSec.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrame}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="player-scrubber-slider"
              aria-label="Animation timeline scrubber"
            />
            <span className="player-frame-label">F: {currentFrame + 1} / {totalFrames}</span>
          </div>

          <div className="player-controls-row">
            <div className="player-btn-group">
              <button
                type="button"
                className="btn small icon-btn"
                onClick={() => handleStep(-1)}
                title="Step 1 frame backward (Left Arrow)"
              >
                ⏮
              </button>
              <button
                type="button"
                className={`btn small ${isPlaying ? 'primary' : ''}`}
                onClick={() => setIsPlaying((v) => !v)}
                title="Play/Pause (Spacebar)"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                type="button"
                className="btn small icon-btn"
                onClick={() => handleStep(1)}
                title="Step 1 frame forward (Right Arrow)"
              >
                ⏭
              </button>
              <button
                type="button"
                className={`btn small ${isReverse ? 'active' : ''}`}
                onClick={() => setIsReverse((v) => !v)}
                title="Reverse Playback Direction"
              >
                ◀ Reverse
              </button>
            </div>

            {/* Speed & FPS Controls */}
            <div className="player-speed-group">
              <span className="player-control-tag">Speed:</span>
              {[0.25, 0.5, 1.0, 1.5, 2.0].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn tiny ${speedMultiplier === s ? 'primary' : ''}`}
                  onClick={() => setSpeedMultiplier(s)}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Target FPS */}
            <div className="player-fps-group">
              <span className="player-control-tag">FPS: {targetFps}</span>
              <input
                type="range"
                min={5}
                max={60}
                step={1}
                value={targetFps}
                onChange={(e) => setTargetFps(Number(e.target.value))}
                className="player-mini-slider"
                aria-label="Playback FPS slider"
              />
            </div>

            {/* Scale */}
            <div className="player-scale-group">
              <span className="player-control-tag">Zoom: {Math.round(scale * 100)}%</span>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="player-mini-slider"
                aria-label="Scale zoom slider"
              />
            </div>
          </div>
        </div>

        {/* Shading & Palette Switchers */}
        <div className="player-options-toolbar">
          <div className="player-option-set">
            <span className="player-control-tag">Color Theme:</span>
            {(Object.keys(PALETTE_THEMES) as ThemePaletteId[]).map((tid) => (
              <button
                key={tid}
                type="button"
                className={`btn tiny ${theme === tid ? 'primary' : ''}`}
                onClick={() => setTheme(tid)}
              >
                {PALETTE_THEMES[tid].name}
              </button>
            ))}
          </div>

          <div className="player-option-set">
            <span className="player-control-tag">Look:</span>
            <button
              type="button"
              className={`btn tiny ${look === 'text' ? 'primary' : ''}`}
              onClick={() => setLook('text')}
            >
              ASCII Font
            </button>
            <button
              type="button"
              className={`btn tiny ${look === 'dots' ? 'primary' : ''}`}
              onClick={() => setLook('dots')}
            >
              Halftone Dots
            </button>
            <button
              type="button"
              className={`btn tiny ${look === 'blocks' ? 'primary' : ''}`}
              onClick={() => setLook('blocks')}
            >
              Pixel Blocks
            </button>
          </div>
        </div>

        {/* Primary Actions & Export Suite */}
        <div className="player-footer-actions">
          <div className="player-studio-cta">
            <button
              type="button"
              className="btn primary large highlight-btn"
              onClick={() => {
                onClose()
                onOpenInStudio(meta)
              }}
              title="Open inside ASCII Studio with 3D normal lighting, CRT bloom, cinema LUTs, and layers"
            >
              ✨ Open in Studio
            </button>
          </div>

          <div className="player-export-suite">
            <button
              type="button"
              className="btn small"
              onClick={handleExportGif}
              disabled={isExportingGif}
              title="Export loop as Animated GIF"
            >
              {isExportingGif ? `Exporting GIF (${gifProgress}%)...` : '🎬 Export GIF'}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleExportWebp}
              disabled={isExportingWebp}
              title="Export loop as high-efficiency Animated WebP"
            >
              {isExportingWebp ? `Exporting WebP (${webpProgress}%)...` : '🖼 Export WebP'}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => handleExportVideo('mp4')}
              disabled={isExportingVideoMp4}
              title="Record and download MP4 Video"
            >
              {isExportingVideoMp4 ? `Recording MP4 (${videoMp4Progress}%)...` : '🎥 Export MP4'}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => handleExportVideo('webm')}
              disabled={isExportingVideoWebm}
              title="Record and download WebM Video"
            >
              {isExportingVideoWebm ? `Recording WebM (${videoWebmProgress}%)...` : '📹 Export WebM'}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleExportFramesZip}
              disabled={isExportingZip}
              title="Download all frames as .txt and .ans files in a structured ZIP archive"
            >
              {isExportingZip ? `Zipping Frames (${zipProgress}%)...` : '📁 Frame Files (ZIP)'}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleDownloadShellScript}
              title="Download standalone terminal bash animation script"
            >
              💻 Shell Script (.sh)
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleCopyText}
              title="Copy current frame ASCII text"
            >
              📋 Copy Frame
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleCopyANSI}
              title="Copy 24-bit ANSI truecolor escape codes"
            >
              💾 Copy ANSI
            </button>
            <button
              type="button"
              className="btn small"
              onClick={handleCopyTerminal}
              title="Copy curl terminal command"
            >
              ⚡ Terminal curl
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
