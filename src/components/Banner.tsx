// Banner generator panel (FIGlet-style text to ASCII art) with multi-font and color styling.
// Original UI code written for ASCII Studio.

import { useMemo, useState } from 'react'
import {
  BANNER_FONTS, BANNER_STYLES, BORDER_STYLES, frameBanner, renderBanner,
  type BannerFont, type BannerStyle, type BorderStyle,
} from '../engine/banner'
import { copyTextToClipboard } from '../engine/exporters'
import { Section } from './Controls'

type BannerColorTheme = 'default' | 'terminal' | 'amber' | 'cyber' | 'matrix'

export default function BannerPanel({ toast }: { toast: (m: string) => void }) {
  const [text, setText] = useState('ASCII STUDIO')
  const [font, setFont] = useState<BannerFont>('standard')
  const [style, setStyle] = useState<BannerStyle>('block')
  const [border, setBorder] = useState<BorderStyle>('single')
  const [fill, setFill] = useState('#')
  const [size, setSize] = useState(1)
  const [colorTheme, setColorTheme] = useState<BannerColorTheme>('terminal')

  const art = useMemo(() => {
    const raw = renderBanner(text || ' ', style, fill, font)
    const scaled = size <= 1
      ? raw
      : raw
          .split('\n')
          .map((line) => line.split('').map((c) => c.repeat(size)).join(''))
          .join('\n')
    return frameBanner(scaled, border)
  }, [text, style, border, fill, size, font])

  const copyShellCmd = async () => {
    const cmd = `cat << 'EOF'\n${art}\nEOF`
    await copyTextToClipboard(cmd)
    toast('Shell cat script copied — paste straight into Terminal!')
  }

  const getThemeClass = () => {
    switch (colorTheme) {
      case 'terminal': return 'banner-theme-terminal'
      case 'amber': return 'banner-theme-amber'
      case 'cyber': return 'banner-theme-cyber'
      case 'matrix': return 'banner-theme-matrix'
      default: return ''
    }
  }

  return (
    <div className="banner-panel">
      <Section title="Text to ASCII Banner (FIGlet)">
        <label className="ctl">
          <span className="ctl-label">Your banner text</span>
          <input
            className="text-input"
            type="text"
            value={text}
            maxLength={36}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type banner text…"
          />
        </label>

        <div className="row-2">
          <label className="ctl">
            <span className="ctl-label">Banner Font</span>
            <select value={font} onChange={(e) => setFont(e.target.value as BannerFont)}>
              {BANNER_FONTS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="ctl">
            <span className="ctl-label">Color Theme</span>
            <select value={colorTheme} onChange={(e) => setColorTheme(e.target.value as BannerColorTheme)}>
              <option value="terminal">Terminal Green (#00ff41)</option>
              <option value="amber">Amber P39 CRT (#ffaa00)</option>
              <option value="cyber">Cyberpunk Neon</option>
              <option value="matrix">Matrix Phosphor</option>
              <option value="default">Monochrome White</option>
            </select>
          </label>
        </div>

        <div className="chip-row">
          {BANNER_STYLES.map((s) => (
            <button key={s.id} className={`chip ${style === s.id ? 'active' : ''}`} onClick={() => setStyle(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="row-2">
          <label className="ctl">
            <span className="ctl-label">Frame border</span>
            <select value={border} onChange={(e) => setBorder(e.target.value as BorderStyle)}>
              {BORDER_STYLES.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </label>
          <label className="ctl">
            <span className="ctl-label">Fill glyph</span>
            <input
              className="text-input"
              type="text"
              value={fill}
              maxLength={1}
              onChange={(e) => setFill(e.target.value || '#')}
            />
          </label>
          <label className="ctl">
            <span className="ctl-label">Width scale</span>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              <option value={1}>1x Normal</option>
              <option value={2}>2x Wide</option>
            </select>
          </label>
        </div>
      </Section>

      <pre className={`banner-out ${getThemeClass()}`}>{art}</pre>

      <div className="btn-row">
        <button
          className="btn primary"
          onClick={async () => {
            await copyTextToClipboard(art)
            toast('Banner text copied')
          }}
        >
          Copy Text
        </button>
        <button
          className="btn"
          onClick={async () => {
            await copyTextToClipboard('```text\n' + art + '\n```')
            toast('Markdown README codeblock copied')
          }}
        >
          Copy Markdown
        </button>
        <button className="btn" onClick={() => void copyShellCmd()}>
          Copy Shell cat cmd
        </button>
        <button
          className="btn"
          onClick={() => {
            const blob = new Blob([art], { type: 'text/plain;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'ascii-banner.txt'
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
            toast('Banner downloaded as .txt')
          }}
        >
          Download .txt
        </button>
      </div>
    </div>
  )
}
