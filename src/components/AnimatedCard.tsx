// Animated ASCII Art preview card with hover play/pause, live canvas, and quick actions.
// Written by Saad Khalid (@saadkhalidhere).

import { useEffect, useRef, useState } from 'react'
import {
  type AnimatedPieceMeta,
  type FrameData,
  type RenderFrameFn,
  loadPieceRenderer,
  renderFrameToCanvas,
  generateTerminalCurlSnippet,
} from '../engine/animatedArt'

interface AnimatedCardProps {
  meta: AnimatedPieceMeta
  onOpenPlayer: (meta: AnimatedPieceMeta) => void
  onOpenInStudio: (meta: AnimatedPieceMeta) => void
  onToast: (msg: string) => void
}

export default function AnimatedCard({ meta, onOpenPlayer, onOpenInStudio, onToast }: AnimatedCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const isHoveredRef = useRef(false)
  const renderFnRef = useRef<RenderFrameFn | null>(null)
  const currentFrameRef = useRef<FrameData | null>(null)
  const loadedRef = useRef(false)
  const [copied, setCopied] = useState(false)

  // Initialize renderer and draw initial frame
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { render } = await loadPieceRenderer(meta.slug)
        if (!active) return
        renderFnRef.current = render
        loadedRef.current = true
        const initial = render(0, 0)
        currentFrameRef.current = initial
        if (canvasRef.current) {
          renderFrameToCanvas(canvasRef.current, initial, meta, { scale: 0.62 })
        }
      } catch (err) {
        console.error('Failed to load card thumbnail:', err)
      }
    })()
    return () => {
      active = false
    }
  }, [meta])

  // Playback loop when hovering or toggled playing
  useEffect(() => {
    if (!isPlaying) return
    let raf = 0
    let lastT = performance.now()
    let elapsed = 0
    const fps = meta.fps || 20
    const frameInterval = 1000 / fps

    const tick = (now: number) => {
      const dt = now - lastT
      if (dt >= frameInterval && renderFnRef.current && canvasRef.current) {
        lastT = now - (dt % frameInterval)
        elapsed += dt / 1000
        const frame = renderFnRef.current(elapsed)
        currentFrameRef.current = frame
        renderFrameToCanvas(canvasRef.current, frame, meta, { scale: 0.62 })
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, meta])

  const handleMouseEnter = () => {
    isHoveredRef.current = true
    setIsPlaying(true)
  }

  const handleMouseLeave = () => {
    isHoveredRef.current = false
    setIsPlaying(false)
    // Restore frame 0
    if (renderFnRef.current && canvasRef.current) {
      const frame0 = renderFnRef.current(0, 0)
      currentFrameRef.current = frame0
      renderFrameToCanvas(canvasRef.current, frame0, meta, { scale: 0.62 })
    }
  }

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation()
    const frame = currentFrameRef.current || (renderFnRef.current ? renderFnRef.current(0, 0) : null)
    if (!frame) return
    void navigator.clipboard.writeText(frame.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onToast(`Copied ${meta.name} ASCII frame to clipboard!`)
  }

  const handleCopyTerminal = (e: React.MouseEvent) => {
    e.stopPropagation()
    const snippet = generateTerminalCurlSnippet(meta.slug)
    void navigator.clipboard.writeText(snippet)
    onToast(`Copied terminal command: ${snippet}`)
  }

  const isNative = meta.source === 'native'

  return (
    <div
      className={`animated-art-card ${isPlaying ? 'playing' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onOpenPlayer(meta)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenPlayer(meta)
        }
      }}
      aria-label={`Open animation player for ${meta.name}`}
    >
      <div className="card-stage">
        <canvas ref={canvasRef} className="card-canvas" role="img" aria-label={`Preview of ${meta.name}`} />
        <div className="card-overlay-badge">
          <span className="card-fps-badge">{meta.fps} FPS</span>
          <span className="card-dim-badge">{meta.cols}×{meta.rows}</span>
          {isNative && <span className="card-native-badge">Native 60FPS</span>}
        </div>
        <button
          type="button"
          className="card-play-btn"
          onClick={(e) => {
            e.stopPropagation()
            setIsPlaying((v) => !v)
          }}
          title={isPlaying ? 'Pause' : 'Play animation'}
          aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
      </div>

      <div className="card-info">
        <div className="card-header-row">
          <h4 className="card-title" title={meta.name}>{meta.name}</h4>
          <span className="card-category-pill">{meta.category}</span>
        </div>
        <p className="card-note">{meta.note || `Animated ASCII artwork featuring ${meta.tags.slice(0, 3).join(', ')}.`}</p>

        <div className="card-tags">
          {meta.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="card-tag">#{tag}</span>
          ))}
        </div>

        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn small primary card-action-btn"
            onClick={() => onOpenInStudio(meta)}
            title="Import into ASCII Studio's 3D lighting, CRT bloom, & cinema LUTs"
          >
            🎨 Open in Studio
          </button>
          <button
            type="button"
            className="btn small card-action-btn"
            onClick={() => onOpenPlayer(meta)}
            title="Open fullscreen player with frame scrubbing and GIF export"
          >
            ▶ Player
          </button>
          <button
            type="button"
            className="btn small icon-btn"
            onClick={handleCopyText}
            title="Copy ASCII frame text"
          >
            {copied ? '✓' : '📋'}
          </button>
          <button
            type="button"
            className="btn small icon-btn"
            onClick={handleCopyTerminal}
            title="Copy terminal command"
          >
            ⚡
          </button>
        </div>
      </div>
    </div>
  )
}
