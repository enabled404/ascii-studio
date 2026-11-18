// Landing page for ASCII Studio v3. Hero with a live before/after slider,
// creations gallery, styles showcase, how-to guide, effects showcase, recipes gallery,
// usecases, FAQ, and a footer with tool links. Fully semantic HTML5 & accessible.

import { useCallback, useEffect, useRef, useState } from 'react'
import { sampleGrid } from '../engine/image'
import { renderGrid, sampleDims } from '../engine/render'
import { applyEffects } from '../engine/effects'
import { cloneSettings, DEFAULT_SETTINGS, type FxId, type ModeId, type Settings } from '../types'
import { FX_DEFS, MODES, RECIPES } from '../catalog'
import { SAMPLES } from '../samples'
import DisclaimersModal from './DisclaimersModal'
import { NATIVE_PIECES, type AnimatedPieceMeta } from '../engine/animatedArt'
import AnimatedCard from './AnimatedCard'
import AnimatedPlayerModal from './AnimatedPlayerModal'

const HERO_MODES: { id: ModeId; label: string }[] = [
  { id: 'characters', label: 'Characters' },
  { id: 'matrix-rain', label: 'Matrix Rain' },
  { id: 'dither', label: 'Dither' },
  { id: 'ledmatrix', label: 'LED Matrix' },
  { id: 'thermal', label: 'Thermal FLIR' },
  { id: 'gameboy-camera', label: 'GB Camera' },
  { id: 'cyberterminal', label: 'Cyber Terminal' },
  { id: 'emoji', label: 'Emoji' },
  { id: 'neon', label: 'Neon' },
  { id: 'pixel', label: 'Pixel Art' },
  { id: 'lego', label: 'LEGO' },
  { id: 'beads', label: 'Beads' },
  { id: 'disco', label: 'Disco' },
]

const SHOWCASE_MODES: ModeId[] = [
  'characters', 'matrix-rain', 'dither', 'ledmatrix', 'thermal', 'gameboy-camera', 'cyberterminal',
  'pixel', 'braille', 'lego', 'voxel', 'neon', 'katakana', 'halftone-cmyk', 'beads', 'ascii-flow',
]

const GALLERY: { sample: string; mode: ModeId; label: string }[] = [
  { sample: 'tropical', mode: 'characters', label: 'Tropical Bloom · Characters' },
  { sample: 'tropical', mode: 'dither', label: 'Tropical Bloom · Dither' },
  { sample: 'tropical', mode: 'lego', label: 'Tropical Bloom · LEGO' },
  { sample: 'sunset', mode: 'characters', label: 'Sunset Peaks · Characters' },
  { sample: 'sunset', mode: 'halftone-cmyk', label: 'Sunset Peaks · Halftone CMYK' },
  { sample: 'sunset', mode: 'prism', label: 'Sunset Peaks · Prism' },
  { sample: 'neongrid', mode: 'neon', label: 'Neon Grid · Neon' },
  { sample: 'city', mode: 'crossstitch', label: 'City Lights · Cross Stitch' },
  { sample: 'city', mode: 'blueprint', label: 'City Lights · Blueprint' },
  { sample: 'aurora', mode: 'aurora', label: 'Aurora Peaks · Aurora' },
  { sample: 'aurora', mode: 'characters', label: 'Aurora Peaks · Characters' },
  { sample: 'neongrid', mode: 'vhs', label: 'Neon Grid · VHS' },
]

const HOWTO_STEPS = [
  {
    step: '1',
    title: 'Upload Media or Choose Sample',
    desc: 'Drag & drop any image (JPG, PNG, WebP, GIF), select a video (MP4, WebM), turn on your webcam, or pick an artistic sample. Zero uploads — files stay on your machine.',
  },
  {
    step: '2',
    title: 'Select from 105+ Visual Styles',
    desc: 'Browse Characters, Unicode Braille, Matrix Rain, Dither Bitmaps, Cyber Terminal, Thermal FLIR, Pixel Art, or LEGO mosaics with one tap.',
  },
  {
    step: '3',
    title: 'Tune 3D Lighting & Shaders',
    desc: 'Position directional and point lights with 3D normal-mapped specular shading, enable Web Audio reactivity, use the mask brush, and stack CRT shaders.',
  },
  {
    step: '4',
    title: 'Export in 4K, ANSI Text or Code',
    desc: 'Download crystal-clear 4K PNG, SVG vector, animated GIF, MP4 video, raw ANSI color text, or generate React, Web Component, Python, and C++ code.',
  },
]

const EFFECT_SHOWCASE: { label: string; fx: Partial<Record<FxId, { enabled: boolean; intensity: number }>> }[] = [
  { label: 'No effects', fx: {} },
  { label: 'Bloom + Character Bloom', fx: { bloom: { enabled: true, intensity: 75 }, charBloom: { enabled: true, intensity: 80 } } },
  { label: 'Glitch + RGB Split', fx: { glitch: { enabled: true, intensity: 70 }, rgbSplit: { enabled: true, intensity: 60 } } },
  { label: 'Film Noir', fx: { vignette: { enabled: true, intensity: 75 }, filmGrain: { enabled: true, intensity: 60 }, filmDust: { enabled: true, intensity: 40 } } },
]

const USECASES: { glyph: string; title: string; desc: string }[] = [
  { glyph: '◉', title: 'Profile pictures', desc: 'Turn a selfie into a signature avatar that reads at any size.' },
  { glyph: '▦', title: 'Posters & prints', desc: 'Export at 4K and hang your favourite photo as ASCII art.' },
  { glyph: '▚', title: 'Terminal & code art', desc: 'Copy plain text art into a readme, a banner, or a MOTD.' },
  { glyph: '▶', title: 'Stream overlays', desc: 'Record the live preview and cut it into an intro or a loop.' },
  { glyph: '✦', title: 'Social posts', desc: 'One render, one caption. ASCII still stops the scroll.' },
  { glyph: '▤', title: 'Wallpapers', desc: 'Wallpaper and phone-size exports, sized and ready to set.' },
]

const FAQS: { q: string; a: string }[] = [
  { q: 'Is it really free?', a: 'Yes. Every style, every effect, every recipe, and 4K export are free. No account, no watermark, no usage limit.' },
  { q: 'Do my images leave my device?', a: 'No. Everything renders locally in your browser with Canvas 2D. Nothing is uploaded anywhere.' },
  { q: 'What can I upload?', a: 'Images (JPG, PNG, WebP, GIF), video files (MP4, MOV, WebM), or your live webcam. You can also paste straight from the clipboard or drag and drop anywhere.' },
  { q: 'How do I share a look I made?', a: 'Copy the share link from the studio. It encodes every setting, so anyone who opens it sees your exact render. Recipe codes work the same way.' },
  { q: 'Can I use the output anywhere?', a: 'Yes. PNG, JPG, WebP, GIF, MP4, HTML, and plain text exports are yours to use anywhere, including commercially.' },
  { q: 'Does it work on my phone?', a: 'Yes. The studio is responsive, and there are export presets sized for phone screens and desktop wallpapers.' },
]

interface MiniProps {
  sampleId: string
  mode: ModeId
  cols?: number
  fxJson?: string
  ditherPalette?: string
  ditherAlgo?: string
  className?: string
  ariaLabel?: string
}

function MiniCanvas({ sampleId, mode, cols = 72, fxJson = '{}', ditherPalette, ditherAlgo, className, ariaLabel }: MiniProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const sample = SAMPLES.find((x) => x.id === sampleId) ?? SAMPLES[0]
    const src = sample.make()
    const s: Settings = cloneSettings(DEFAULT_SETTINGS)
    s.mode = mode
    s.cols = cols
    s.saturation = 130
    s.contrast = 108
    if (ditherPalette) s.ditherPalette = ditherPalette as Settings['ditherPalette']
    if (ditherAlgo) s.ditherAlgo = ditherAlgo as Settings['ditherAlgo']
    try {
      const fx = JSON.parse(fxJson) as Partial<Record<FxId, { enabled: boolean; intensity: number }>>
      for (const [k, v] of Object.entries(fx)) {
        s.fx[k as FxId] = { ...s.fx[k as FxId], ...v }
      }
    } catch {
      // ignore bad fx json
    }
    const aspect = src.width / src.height
    const dims = sampleDims(s.cols, aspect, mode)
    const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
      brightness: s.brightness, contrast: s.contrast, saturation: s.saturation,
      gamma: s.gamma, invert: false,
    }, null, 0.6)
    renderGrid(el, grid, s, { time: 0, seed: s.glitchSeed, src })
    applyEffects(el, s, 0)
  }, [sampleId, mode, cols, fxJson, ditherPalette, ditherAlgo])
  return (
    <canvas
      ref={ref}
      className={className}
      role="img"
      aria-label={ariaLabel ?? `${mode} ASCII art render`}
    />
  )
}

const FEATURED_SLUGS = [
  'donut-3d',
  'rickroll-dance',
  'cyber-hologram',
  'matrix-rain-native',
  'pacman-chase',
  'waterfall-cascade',
  'doom-fire',
  'nyan-cat',
]
const FEATURED_ANIMATIONS = FEATURED_SLUGS.map((slug) => NATIVE_PIECES.find((p) => p.meta.slug === slug)?.meta)
  .filter(Boolean) as AnimatedPieceMeta[]

export interface LandingProps {
  onOpenStudio: () => void
  onOpenWithFile: (f: File) => void
  onOpenWithSample: (sampleId: string, mode: ModeId) => void
  onApplyRecipe: (recipeId: string) => void
  onOpenTab: (tab: 'banner' | 'tools' | 'visualize') => void
  onOpenAnimations?: () => void
  onOpenWithPiece?: (meta: AnimatedPieceMeta) => void
  onOpenVisualize?: () => void
  onOpenMcp?: () => void
}

export default function Landing({
  onOpenStudio,
  onOpenWithFile,
  onOpenWithSample,
  onApplyRecipe,
  onOpenTab,
  onOpenAnimations,
  onOpenWithPiece,
  onOpenVisualize,
  onOpenMcp,
}: LandingProps) {
  const [mode, setMode] = useState<ModeId>('characters')
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const [showDisclaimers, setShowDisclaimers] = useState(false)
  const [disclaimersTarget, setDisclaimersTarget] = useState<string | null>(null)
  const [landingModalPiece, setLandingModalPiece] = useState<AnimatedPieceMeta | null>(null)
  const [landingToast, setLandingToast] = useState('')
  const beforeRef = useRef<HTMLCanvasElement>(null)
  const afterRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const srcRef = useRef<HTMLCanvasElement | null>(null)

  const openDisclaimers = (sectionId: string | null = null) => {
    setDisclaimersTarget(sectionId)
    setShowDisclaimers(true)
  }

  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash
      if (h === '#disclaimers' || h === '#legal' || h === '#privacy') {
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

  const renderHero = useCallback((m: ModeId) => {
    if (!srcRef.current) {
      const s = SAMPLES.find((x) => x.id === 'tropical') ?? SAMPLES[0]
      const c = s.make()
      const off = document.createElement('canvas')
      off.width = c.width
      off.height = c.height
      off.getContext('2d')!.drawImage(c, 0, 0)
      srcRef.current = off
    }
    const src = srcRef.current
    const before = beforeRef.current
    if (before) {
      before.width = src.width
      before.height = src.height
      before.getContext('2d')!.drawImage(src, 0, 0)
    }
    const after = afterRef.current
    if (!after) return
    const settings = cloneSettings(DEFAULT_SETTINGS)
    settings.mode = m
    settings.cols = 180
    settings.saturation = 130
    settings.contrast = 108
    const aspect = src.width / src.height
    const dims = sampleDims(settings.cols, aspect, m)
    const grid = sampleGrid(src, src.width, src.height, dims.cols, dims.rows, {
      brightness: settings.brightness,
      contrast: settings.contrast,
      saturation: settings.saturation,
      gamma: settings.gamma,
      invert: false,
    }, null, 0.6)
    renderGrid(after, grid, settings, { time: 0, seed: settings.glitchSeed, src })
  }, [])

  useEffect(() => {
    renderHero(mode)
  }, [mode, renderHero])

  const updatePos = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setPos(Math.min(96, Math.max(4, ((clientX - rect.left) / rect.width) * 100)))
  }

  const activeLabel = HERO_MODES.find((m) => m.id === mode)?.label ?? 'Characters'
  const featuredRecipes = RECIPES.slice(0, 8)

  return (
    <div className="landing">
      <a href="#hero-main" className="skip-link">Skip to main content</a>
      <header className="landing-nav" role="banner">
        <span className="logo">▓▒░ ASCII STUDIO</span>
        <span className="landing-nav-tag">Free · Local · No signup · No watermark</span>
        <nav className="landing-links" aria-label="Main Navigation">
          <a href="#animations">Animations (750+)</a>
          <a href="#gallery">Creations</a>
          <a href="#styles">Styles</a>
          <a href="#howto">How It Works</a>
          <a href="#recipes">Recipes</a>
          <a href="#faq">FAQ</a>
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="author-pill"
            title="View ASCII Studio Repository on GitHub"
            aria-label="ASCII Studio GitHub Repository"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </a>
          <a
            href="https://github.com/enabled404"
            target="_blank"
            rel="noopener noreferrer"
            className="author-pill"
            title="Engineered by Saad Khalid (@saadkhalidhere)"
            aria-label="Engineered by Saad Khalid (@saadkhalidhere) on GitHub"
          >
            By @saadkhalidhere
          </a>
        </nav>
        <div className="landing-nav-actions">
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="github-nav-pill"
            title="Star & Fork ASCII Studio on GitHub"
            aria-label="Star ASCII Studio on GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>★ GitHub</span>
          </a>
          <a
            href="https://saadkhalidhere.gumroad.com/l/tipjar"
            target="_blank"
            rel="noopener noreferrer"
            className="tipjar-pill"
            title="Support Saad Khalid's work on Gumroad"
            aria-label="Support Saad Khalid on Gumroad"
          >
            ☕ Support
          </a>
          <button
            type="button"
            className="btn small highlight-btn"
            onClick={onOpenAnimations || onOpenStudio}
            title="Browse 750+ live Animated ASCII Art pieces"
            aria-label="Browse 750+ Animated ASCII Art Library"
          >
            🎬 Animations (750+)
          </button>
          <button className="btn primary" onClick={onOpenStudio} aria-label="Open Studio workspace">
            Open Studio
          </button>
        </div>
      </header>

      <main className="landing-hero" id="hero-main">
        <h1 className="hero-title">
          Free ASCII Art Generator
          <br />
          <span className="hero-accent">Turn photos &amp; videos into retro text art.</span>
        </h1>
        <p className="hero-sub">
          The ultimate browser-native ASCII art generator and image to ASCII converter. {MODES.length} visual styles,
          3D normal-mapped multi-light engine, live Web Audio reactivity, stackable CRT shaders, and free 4K vector export. No signup, no
          watermark, no upload — your images never leave your device.
        </p>

        <div
          className="ba-slider"
          onPointerDown={(e) => {
            setDragging(true)
            e.currentTarget.setPointerCapture(e.pointerId)
            updatePos(e.clientX, e.currentTarget)
          }}
          onPointerMove={(e) => {
            if (dragging) updatePos(e.clientX, e.currentTarget)
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <canvas
            ref={beforeRef}
            className="ba-canvas before"
            role="img"
            aria-label="Original source image before ASCII conversion"
          />
          <canvas
            ref={afterRef}
            className="ba-canvas after"
            role="img"
            aria-label={`ASCII art render in ${activeLabel} style`}
            style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
          />
          <div
            className="ba-divider"
            style={{ left: `${pos}%` }}
            role="slider"
            aria-label="Comparison slider position"
            aria-valuenow={Math.round(pos)}
            aria-valuemin={4}
            aria-valuemax={96}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setPos((p) => Math.max(4, p - 5))
              if (e.key === 'ArrowRight') setPos((p) => Math.min(96, p + 5))
            }}
          >
            <span className="ba-grip">◂ ▸</span>
          </div>
          <span className="ba-tag left">Before</span>
          <span className="ba-tag right">After · {activeLabel}</span>
        </div>

        <div className="style-switcher" role="tablist" aria-label="Preview style">
          {HERO_MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              aria-label={`Preview style: ${m.label}`}
              className={`style-tab ${mode === m.id ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="hero-cta">
          <button className="btn primary big" onClick={onOpenStudio} aria-label="Open Studio workspace">
            Open Studio — it&rsquo;s free
          </button>
          <button className="btn big" onClick={() => fileRef.current?.click()} aria-label="Upload photo to ASCII">
            Try your own photo
          </button>
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="btn big github-hero-btn"
            title="Star & Fork ASCII Studio on GitHub"
            aria-label="View ASCII Studio repository on GitHub"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>
          <input
            type="file"
            accept="image/*"
            ref={fileRef}
            hidden
            aria-label="Select photo from device"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onOpenWithFile(f)
              e.target.value = ''
            }}
          />
        </div>

        <div className="feature-strip">
          <span><b>{MODES.length}</b> styles</span>
          <span><b>750+</b> animations</span>
          <span><b>🔮 Visualize</b> multi-modal</span>
          <span><b>🤖 MCP Server</b> for AI</span>
          <span><b>{FX_DEFS.length}</b> effects</span>
          <span><b>{RECIPES.length}</b> recipes</span>
          <span><b>4K &amp; SVG</b> export</span>
          <span><b>100% Free</b> local &amp; private</span>
        </div>
      </main>

      <section className="landing-section" id="gallery" aria-labelledby="heading-gallery">
        <h2 id="heading-gallery">ASCII Art Gallery &amp; Community Creations</h2>
        <p className="section-sub">Made in the studio, from the built-in samples. Tap any tile to open it and keep editing.</p>
        <div className="gallery-grid">
          {GALLERY.map((g) => (
            <button
              key={`${g.sample}-${g.mode}`}
              className="gallery-tile"
              onClick={() => onOpenWithSample(g.sample, g.mode)}
              aria-label={`Open creation: ${g.label}`}
            >
              <MiniCanvas sampleId={g.sample} mode={g.mode} cols={72} className="gallery-canvas" ariaLabel={g.label} />
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section" id="animations" aria-labelledby="heading-animations">
        <h2 id="heading-animations">🎬 Animated ASCII Art Library &amp; 60 FPS Player</h2>
        <p className="section-sub">
          Explore over 750+ live animated ASCII art pieces: 3D Math (Donut, Cube, Torus Knot), Retro Gaming &amp; Memes
          (Rickroll Dancing, Nyan Cat, Pac-Man, Space Invaders, Party Parrot), Sci-Fi &amp; Cyberpunk (Quantum Hologram, Cyber Skull, Matrix Rain, Radar HUD),
          VFX &amp; Dynamics (Cascade Waterfall, Doom Fire, Ocean Waves, Fireworks). Hover to play live, scrub frames, export animated GIF / WebP / MP4 / ZIP frames,
          or import directly into ASCII Studio.
        </p>
        <div className="library-cards-grid">
          {FEATURED_ANIMATIONS.map((piece) => (
            <AnimatedCard
              key={piece.slug}
              meta={piece}
              onOpenPlayer={(m) => setLandingModalPiece(m)}
              onOpenInStudio={(m) => {
                if (onOpenWithPiece) onOpenWithPiece(m)
                else onOpenStudio()
              }}
              onToast={(msg) => {
                setLandingToast(msg)
                setTimeout(() => setLandingToast(''), 3000)
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            type="button"
            className="btn primary large highlight-btn"
            onClick={onOpenAnimations || onOpenStudio}
            aria-label="Browse full catalog of 750+ animations"
          >
            Browse All 750+ Animations in Full Library →
          </button>
        </div>
      </section>

      <section className="landing-section" id="styles" aria-labelledby="heading-styles">
        <h2 id="heading-styles">{MODES.length} Visual Styles &amp; ASCII Character Sets</h2>
        <p className="section-sub">ASCII, Braille, pixel, print, geometric, glass, glitch, light, material, blur, and distort. A few favourites below — the rest are waiting in the studio.</p>
        <div className="showcase-grid">
          {SHOWCASE_MODES.map((m) => {
            const def = MODES.find((x) => x.id === m)
            return (
              <button
                key={m}
                className="showcase-tile"
                onClick={() => onOpenWithSample('tropical', m)}
                aria-label={`Try style: ${def?.label ?? m}`}
              >
                <MiniCanvas sampleId="tropical" mode={m} cols={64} className="showcase-canvas" ariaLabel={def?.label ?? m} />
                <b>{def?.label ?? m}</b>
                <small>{def?.blurb ?? ''}</small>
              </button>
            )
          })}
        </div>
        <div className="section-cta">
          <button className="btn primary big" onClick={onOpenStudio} aria-label="Browse all styles in studio">
            Browse all {MODES.length} styles
          </button>
        </div>
      </section>

      <section className="landing-section" id="howto" aria-labelledby="heading-howto">
        <h2 id="heading-howto">How to convert images and videos to ASCII art</h2>
        <p className="section-sub">Convert photos, animated GIFs, or videos to ASCII and ANSI terminal text in seconds directly in your web browser.</p>
        <div className="howto-grid">
          {HOWTO_STEPS.map((h) => (
            <article key={h.step} className="howto-card">
              <span className="howto-step" aria-hidden="true">{h.step}</span>
              <h3>{h.title}</h3>
              <p>{h.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="effects" aria-labelledby="heading-effects">
        <h2 id="heading-effects">Post-Processing CRT Shaders &amp; 3D Lighting</h2>
        <p className="section-sub">Stack up to {FX_DEFS.length} effects with individual intensity controls. Same photo, four finishes.</p>
        <div className="effects-grid">
          {EFFECT_SHOWCASE.map((e) => (
            <div key={e.label} className="effect-tile">
              <MiniCanvas sampleId="tropical" mode="characters" cols={72} fxJson={JSON.stringify(e.fx)} className="effect-canvas" ariaLabel={e.label} />
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="recipes" aria-labelledby="heading-recipes">
        <h2 id="heading-recipes">One-Click Retro ASCII Recipes &amp; Presets</h2>
        <p className="section-sub">Named looks with descriptions. Tap one to open the studio with it already applied.</p>
        <div className="recipe-gallery">
          {featuredRecipes.map((r) => (
            <button
              key={r.id}
              className="recipe-card"
              onClick={() => onApplyRecipe(r.id)}
              aria-label={`Apply recipe: ${r.name} — ${r.desc}`}
            >
              <b>{r.name}</b>
              <small>{r.desc}</small>
              <span className="recipe-try">Try it →</span>
            </button>
          ))}
        </div>
      </section>

      <section className="landing-section" id="visualize" aria-labelledby="heading-visualize">
        <h2 id="heading-visualize">🔮 Interactive Multi-Modal Visualize Studio &amp; Scientific Simulations</h2>
        <p className="section-sub">
          A dedicated visualizer suite engineered 10 steps beyond conventional tools: real-time audio oscilloscope,
          3D acoustic waterfall, circular frequency radar, 32-band peak equalizer, Mandelbrot &amp; Julia fractals, 3D Lorenz attractor chaos dynamics,
          Conway&rsquo;s Game of Life cellular automata, and 3D parametric surface meshes.
        </p>
        <div className="usecase-grid">
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">〰️</span>
            <b>Real-Time Oscilloscope</b>
            <small>Phosphor CRT reticle, beam bloom, trigger stabilization, driven by microphone or 5-mode synth engine.</small>
          </article>
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">🏔️</span>
            <b>3D Acoustic Waterfall</b>
            <small>Historical FFT spectrogram in 3D depth perspective with FLIR, Synthwave, Cyberpunk, and Matrix colormaps.</small>
          </article>
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">🎯</span>
            <b>Circular Frequency Radar</b>
            <small>Polar sweep radar HUD with range rings, rotating beam line, and frequency peak blips.</small>
          </article>
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">📊</span>
            <b>32-Band Peak Equalizer</b>
            <small>Segmented LED ladder spectrum with gravity peak-hold indicators and dB markers.</small>
          </article>
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">🌀</span>
            <b>Mandelbrot &amp; Julia Fractals</b>
            <small>Deep continuous zoom, pan navigation, smooth iteration coloring, and ASCII character density mapping.</small>
          </article>
          <article className="usecase-card">
            <span className="usecase-glyph" aria-hidden="true">🦋</span>
            <b>3D Lorenz Attractor Chaos</b>
            <small>Coupled differential equations integrated via RK4 with real-time 3D mouse orbit and velocity heat coloring.</small>
          </article>
        </div>
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <button
            type="button"
            className="btn primary large highlight-btn"
            onClick={onOpenVisualize || onOpenStudio}
            aria-label="Launch Interactive Visualize Studio"
          >
            Launch Interactive Visualize Studio →
          </button>
        </div>
      </section>

      <section className="landing-section" id="mcp" aria-labelledby="heading-mcp">
        <h2 id="heading-mcp">🤖 Model Context Protocol (MCP) Server for AI Assistants</h2>
        <p className="section-sub">
          Seamlessly connect ASCII Studio to Claude Desktop, Cursor, Antigravity, and Zed.
          Allow your AI assistants to autonomously convert images to 105+ styles, render Figlet banners, query 750+ animations,
          and generate standalone React, Web Component, Python, and C++ code.
        </p>
        <div className="howto-grid">
          <article className="howto-card">
            <span className="howto-step" aria-hidden="true">1</span>
            <h3>Claude Desktop Integration</h3>
            <p>One line in <code>claude_desktop_config.json</code> gives Claude full autonomous access to all conversion tools and styles.</p>
          </article>
          <article className="howto-card">
            <span className="howto-step" aria-hidden="true">2</span>
            <h3>Cursor AI &amp; Zed Editors</h3>
            <p>Direct terminal tool calls in your IDE to generate banners, terminal MOTDs, and code components while you write.</p>
          </article>
          <article className="howto-card">
            <span className="howto-step" aria-hidden="true">3</span>
            <h3>NPX Executable (`npx asciipro`)</h3>
            <p>Zero-install instant execution for terminal banners, animated playback, batch image conversion, or starting the MCP server.</p>
          </article>
          <article className="howto-card">
            <span className="howto-step" aria-hidden="true">4</span>
            <h3>6 Tools &amp; 3 Live Resources</h3>
            <p>Compliant JSON-RPC 2.0 stdio server with full JSON schema validation and zero external runtime dependencies.</p>
          </article>
        </div>
        <div style={{ textAlign: 'center', marginTop: '28px' }}>
          <button
            type="button"
            className="btn primary large highlight-btn"
            onClick={onOpenMcp || onOpenStudio}
            aria-label="Open MCP Setup Guide and Developer Documentation"
          >
            Open MCP Setup Guide &amp; Editor Configs →
          </button>
        </div>
      </section>

      <section className="landing-section" id="usecases" aria-labelledby="heading-usecases">
        <h2 id="heading-usecases">Creative Use Cases for ASCII &amp; ANSI Art</h2>
        <div className="usecase-grid">
          {USECASES.map((u) => (
            <article key={u.title} className="usecase-card">
              <span className="usecase-glyph" aria-hidden="true">{u.glyph}</span>
              <b>{u.title}</b>
              <small>{u.desc}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="faq" aria-labelledby="heading-faq">
        <h2 id="heading-faq">Frequently Asked Questions About ASCII Studio</h2>
        <div className="faq-list">
          {FAQS.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="heading-cta">
        <h2 id="heading-cta">Start Creating ASCII Art Online Free</h2>
        <p>Free forever. No signup. No watermark.</p>
        <button className="btn primary big" onClick={onOpenStudio} aria-label="Open Studio workspace for free">
          Open Studio — it&rsquo;s free
        </button>
      </section>

      <footer className="landing-footer" role="contentinfo">
        <div className="footer-cols">
          <div>
            <span className="logo">▓▒░ ASCII STUDIO</span>
            <p>Free, local, no-signup image and video to ASCII art studio.</p>
            <div className="author-branding">
              <b>Creator &amp; Architect</b>
              <p>
                Engineered by{' '}
                <a
                  href="https://github.com/enabled404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-author-link"
                >
                  Saad Khalid (<strong>@saadkhalidhere</strong>)
                </a>
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <a
                  href="https://saadkhalidhere.gumroad.com/l/tipjar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tipjar-pill"
                  title="Support My Work on Gumroad"
                >
                  ☕ Support My Work
                </a>
                <a
                  href="https://x.com/saadkhalidhere"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="author-pill"
                >
                  @saadkhalidhere on X
                </a>
                <a
                  href="https://github.com/enabled404/ascii-studio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="author-pill"
                  title="View ASCII Studio Repository on GitHub"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  GitHub Repo
                </a>
                <a
                  href="https://github.com/enabled404"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="author-pill"
                  title="Saad Khalid GitHub Profile"
                >
                  @enabled404
                </a>
              </div>
            </div>
          </div>
          <div>
            <b>Convert</b>
            <button onClick={onOpenStudio} aria-label="Convert Image to ASCII">Image to ASCII</button>
            <button onClick={onOpenStudio} aria-label="Convert Video to ASCII">Video to ASCII</button>
            <button onClick={() => onOpenTab('banner')} aria-label="Convert Text to ASCII Banner">Text to ASCII</button>
          </div>
          <div>
            <b>Mini tools</b>
            <button onClick={() => onOpenTab('visualize')} aria-label="Open Interactive Visualize Studio">🔮 Visualize Studio</button>
            <button onClick={onOpenMcp} aria-label="Open MCP AI Server Connector">🤖 MCP AI Connector</button>
            <button onClick={() => onOpenTab('tools')} aria-label="Open Glitch Text Generator">Glitch Text Generator</button>
            <button onClick={() => onOpenTab('tools')} aria-label="Open Text Faces Generator">Text Faces</button>
            <button onClick={() => onOpenTab('tools')} aria-label="Open Gradient Shader">Gradient Shader</button>
            <button onClick={() => onOpenTab('tools')} aria-label="Open Dither Animator">Dither Animator</button>
          </div>
          <div>
            <b>Studio</b>
            <button onClick={onOpenStudio} aria-label="Open Studio">Open Studio</button>
            <button onClick={onOpenVisualize || onOpenStudio} aria-label="Open Visualize Studio">🔮 Visualize Suite</button>
            <button onClick={onOpenMcp} aria-label="Open MCP Server Setup">🤖 MCP Configs</button>
            <a href="https://github.com/enabled404/ascii-studio" target="_blank" rel="noopener noreferrer" title="View Source on GitHub">★ GitHub Repo</a>
            <a href="#styles">All styles</a>
            <a href="#howto">How it works</a>
            <a href="#recipes">All recipes</a>
            <a href="#faq">FAQ</a>
          </div>
          <div>
            <b>Legal &amp; Privacy</b>
            <button onClick={() => openDisclaimers(null)} aria-label="View legal and privacy disclaimers">
              🛡️ Privacy &amp; Disclaimers
            </button>
            <button onClick={() => openDisclaimers('disclaimer-zero-storage')} aria-label="View 100% client side privacy warranty">
              100% Client-Side Shield
            </button>
            <button onClick={() => openDisclaimers('disclaimer-ownership')} aria-label="View user commercial rights">
              User Copyright &amp; Rights
            </button>
            <button onClick={() => openDisclaimers('disclaimer-permissions')} aria-label="View ephemeral permissions policy">
              Ephemeral Permissions
            </button>
            <button onClick={() => openDisclaimers('disclaimer-liability')} aria-label="View limitation of liability">
              Limitation of Liability
            </button>
          </div>
        </div>
        <div className="footer-base">
          <div className="footer-base-left">
            <span>Everything renders locally in your browser. Your images never leave your device.</span>
            <span>No account, no watermark, no usage limit. Output is yours to use anywhere commercially.</span>
          </div>
          <div className="footer-base-right">
            <span>
              Engineered by{' '}
              <a
                href="https://github.com/enabled404"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-author-link"
              >
                Saad Khalid (@saadkhalidhere)
              </a>
            </span>
            <a
              href="https://github.com/enabled404/ascii-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="author-pill"
              title="View source on GitHub"
            >
              ★ GitHub Repo
            </a>
            <a
              href="https://saadkhalidhere.gumroad.com/l/tipjar"
              target="_blank"
              rel="noopener noreferrer"
              className="tipjar-pill"
              title="Support My Work on Gumroad"
              aria-label="Support Saad Khalid on Gumroad"
            >
              ☕ Support My Work
            </a>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => openDisclaimers(null)}
              aria-label="Open legal and security disclaimers modal"
            >
              Legal &amp; Privacy Disclaimers →
            </button>
          </div>
        </div>
      </footer>
      <DisclaimersModal open={showDisclaimers} onClose={() => setShowDisclaimers(false)} targetSection={disclaimersTarget} />
      {landingModalPiece && (
        <AnimatedPlayerModal
          meta={landingModalPiece}
          onClose={() => setLandingModalPiece(null)}
          onOpenInStudio={(m) => {
            setLandingModalPiece(null)
            if (onOpenWithPiece) onOpenWithPiece(m)
            else onOpenStudio()
          }}
          onToast={(msg) => {
            setLandingToast(msg)
            setTimeout(() => setLandingToast(''), 3000)
          }}
        />
      )}
      {landingToast && (
        <div className="toast" role="status" aria-live="polite">
          {landingToast}
        </div>
      )}
    </div>
  )
}
