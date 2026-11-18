#!/usr/bin/env node
// ASCII Studio CLI (`npx asciipro`)
// High-performance command line interface for ASCII art conversion, Figlet banners,
// animated terminal playback, mathematical visualizers, and MCP server launch.
// Engineered by Saad Khalid (@saadkhalidhere) for ASCII Studio (https://asciipro.vercel.app).

import fs from 'node:fs'
import path from 'node:path'
import {
  loadSourceImage,
  renderImageToAscii,
  generateAsciiBanner,
  searchAnimatedLibrary,
  getAnimationFrames,
  renderMathVisualizer,
  renderMockupVisualizer,
  startMcpServer,
  getCatalogPieces,
} from '../packages/mcp-server/index.js'

const VERSION = '3.1.0'

function parseArgs(args) {
  const flags = {}
  const positionals = []
  let i = 0
  while (i < args.length) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1]
        i += 2
      } else {
        flags[key] = true
        i += 1
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1)
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1]
        i += 2
      } else {
        flags[key] = true
        i += 1
      }
    } else {
      positionals.push(arg)
      i += 1
    }
  }
  return { positionals, flags }
}

function showHelp() {
  console.log(`
\x1b[36m▓▒░ ASCII STUDIO CLI (asciipro v${VERSION})\x1b[0m
High-Performance ASCII Art, Banners, Terminal Visualizers & MCP Connector
Homepage: https://asciipro.vercel.app

\x1b[1mUSAGE:\x1b[0m
  $ npx asciipro <command> [arguments] [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[32mconvert\x1b[0m <file|url>         Convert image to ASCII/Braille/ANSI/HTML/SVG
  \x1b[32mbanner\x1b[0m "<text>"           Render Figlet typography banner with frames
  \x1b[32mvisual\x1b[0m <mode>              Interactive mathematical visualizer (mandelbrot, lorenz, torus, wave)
  \x1b[32mmockup\x1b[0m <scene>             Render real-world mockup (phone-wallpaper, gallery-frame, vinyl-sleeve, billboard-neon, retro-crt, etc.)
  \x1b[32mplay\x1b[0m <slug>                Play 60 FPS animated ASCII art in terminal
  \x1b[32mlist\x1b[0m <styles|animations>   Browse 105+ styles and 750+ animated pieces
  \x1b[32mmcp\x1b[0m                        Launch Model Context Protocol Server (stdio)
  \x1b[32mhelp\x1b[0m                       Show this documentation
  \x1b[32mversion\x1b[0m                    Show version number

\x1b[1mOPTIONS FOR convert:\x1b[0m
  --mode <name>             Style preset (characters, braille, dither, pixel, lego, matrix-rain)
  --cols <number>           Output columns width (default: 80)
  --format <text|ansi|html> Output format (default: ansi for terminal)
  --ramp <preset>           Character ramp (standard, dense, minimal, blocks, math, cyber)
  --invert                  Invert luminance
  --output <file>           Save output to a destination file

\x1b[1mOPTIONS FOR banner:\x1b[0m
  --font <name>             Font style (standard, mini, isometric, digital)
  --style <name>            Glyph fill (block, outline, dots, slant, cyber, stars)
  --border <name>           Frame border (none, single, double, rounded, cyber, bold)
  --color <name>            Color (cyan, green, amber, magenta, white, red)

\x1b[1mOPTIONS FOR visual:\x1b[0m
  --cols <number>           Grid columns (default: 80)
  --rows <number>           Grid rows (default: 40)
  --animate                 Run real-time animated loop at 30 FPS
  --zoom <number>           Fractal or 3D zoom factor

\x1b[1mEXAMPLES:\x1b[0m
  $ npx asciipro banner "ASCII STUDIO" --border cyber --color cyan
  $ npx asciipro convert photo.png --mode braille --cols 100
  $ npx asciipro visual mandelbrot --animate
  $ npx asciipro visual torus --animate
  $ npx asciipro play donut-3d
  $ npx asciipro mcp
`)
}

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.length === 0 || rawArgs.includes('--help') || rawArgs.includes('-h') || rawArgs[0] === 'help') {
    showHelp()
    return
  }

  if (rawArgs.includes('--version') || rawArgs.includes('-v') || rawArgs[0] === 'version') {
    console.log(`asciipro v${VERSION}`)
    return
  }

  const cmd = rawArgs[0]
  const rest = rawArgs.slice(1)
  const { positionals, flags } = parseArgs(rest)

  if (cmd === 'mcp' || cmd === 'serve-mcp') {
    startMcpServer()
    return
  }

  if (cmd === 'banner') {
    const text = positionals[0] || flags.text || 'ASCII PRO'
    const border = flags.border || 'single'
    const style = flags.style || 'block'
    const color = flags.color || 'cyan'
    const font = flags.font || 'standard'
    const output = generateAsciiBanner(text, { border, style, color, font })
    console.log(output)
    return
  }

  if (cmd === 'convert') {
    const source = positionals[0]
    if (!source) {
      console.error('\x1b[31mError:\x1b[0m Image source file or URL required. Example: npx asciipro convert image.png')
      process.exit(1)
    }
    const cols = flags.cols ? parseInt(flags.cols, 10) : 80
    const mode = flags.mode || 'characters'
    const format = flags.format || (flags.output ? (flags.output.endsWith('.html') ? 'html' : flags.output.endsWith('.svg') ? 'svg' : 'text') : 'ansi')
    const charRamp = flags.ramp || 'standard'
    const invert = Boolean(flags.invert)

    try {
      const img = await loadSourceImage(source)
      const ascii = renderImageToAscii(img, { mode, cols, format, charRamp, invert })

      if (flags.output) {
        fs.writeFileSync(flags.output, ascii, 'utf8')
        console.log(`\x1b[32mSaved ASCII art to ${flags.output}\x1b[0m`)
      } else {
        console.log(ascii)
      }
    } catch (err) {
      console.error(`\x1b[31mConversion error:\x1b[0m ${err.message}`)
      process.exit(1)
    }
    return
  }

  if (cmd === 'visual') {
    const mode = positionals[0] || 'mandelbrot'
    const validModes = [
      'mandelbrot',
      'julia',
      'lorenz',
      'conway',
      'life',
      'torus',
      'klein',
      'mobius',
      'wave',
      'ripple',
      'hyperboloid',
    ]
    if (!validModes.includes(mode)) {
      console.error(`\x1b[31mError:\x1b[0m Unknown visualizer mode "${mode}". Supported: ${validModes.join(', ')}`)
      process.exit(1)
    }

    const cols = flags.cols ? parseInt(flags.cols, 10) : (process.stdout.columns ? Math.min(100, process.stdout.columns) : 80)
    const rows = flags.rows ? parseInt(flags.rows, 10) : 36
    const animate = Boolean(flags.animate)

    if (animate) {
      // Clear screen and hide cursor
      process.stdout.write('\x1b[?25l\x1b[2J')
      let frame = 0
      const timer = setInterval(() => {
        const time = frame * 0.08
        let text = ''
        if (mode === 'mandelbrot') {
          const zoom = 1.0 + Math.sin(time * 0.5) * 0.8
          text = renderMathVisualizer('mandelbrot', { cols, rows, format: 'ansi', params: { zoom } })
        } else if (mode === 'julia') {
          const cx = -0.7 + Math.sin(time) * 0.1
          const cy = 0.27015 + Math.cos(time) * 0.1
          text = renderMathVisualizer('julia', { cols, rows, format: 'ansi', params: { cx, cy } })
        } else if (mode === 'lorenz') {
          text = renderMathVisualizer('lorenz', { cols, rows, format: 'ansi', params: { angle: time * 0.4 } })
        } else if (mode === 'conway' || mode === 'life') {
          text = renderMathVisualizer(mode, { cols, rows, format: 'ansi', params: { steps: frame % 12 } })
        } else if (['torus', 'klein', 'mobius', 'wave', 'ripple', 'hyperboloid'].includes(mode)) {
          text = renderMathVisualizer(mode, { cols, rows, format: 'ansi', params: { time } })
        } else {
          text = renderMathVisualizer(mode, { cols, rows, format: 'ansi' })
        }

        process.stdout.write('\x1b[H' + text + '\n\x1b[36mPress Ctrl+C to exit visualizer\x1b[0m')
        frame++
      }, 50)

      process.on('SIGINT', () => {
        clearInterval(timer)
        process.stdout.write('\x1b[?25h\x1b[0m\n')
        process.exit(0)
      })
      return
    }

    const output = renderMathVisualizer(mode, { cols, rows, format: 'ansi' })
    console.log(output)
    return
  }

  if (cmd === 'mockup') {
    const scene = positionals[0] || 'phone-wallpaper'
    const lighting = flags.lighting || 'studio'
    const frameFinish = flags.frame || 'oak'
    const text = flags.text || '  █████  █████   ████  █████ █████\n  █   █ █     █ █   █   █     █  \n  █████  ███  █ █   █   █     █  \n  █   █     █ █ █   █   █     █  \n  █   █ ████   ████     █   █████'
    try {
      const output = renderMockupVisualizer(scene, { artText: text, lighting, frameFinish })
      console.log(output)
    } catch (err) {
      console.error(`\x1b[31mMockup error:\x1b[0m ${err.message}`)
      process.exit(1)
    }
    return
  }

  if (cmd === 'play') {
    const slug = positionals[0] || 'donut-3d'
    const pieces = getCatalogPieces()
    const valid = pieces.some((p) => p.slug === slug)

    if (!valid) {
      console.error(`\x1b[31mError:\x1b[0m Unknown animation piece "${slug}". Run "npx asciipro list animations" to see available pieces.`)
      process.exit(1)
    }

    const fps = flags.fps ? parseInt(flags.fps, 10) : 20
    const delay = Math.round(1000 / fps)

    // Clear and hide cursor
    process.stdout.write('\x1b[?25l\x1b[2J')
    let frameIdx = 0

    const timer = setInterval(() => {
      const frameData = getAnimationFrames(slug, { format: 'ansi', frameIndex: frameIdx, frameCount: 1 })
      process.stdout.write(`\x1b[H${frameData}\n\x1b[36mPlaying: ${slug} · ${fps} FPS · Press Ctrl+C to stop\x1b[0m`)
      frameIdx++
    }, delay)

    process.on('SIGINT', () => {
      clearInterval(timer)
      process.stdout.write('\x1b[?25h\x1b[0m\n')
      process.exit(0)
    })
    return
  }

  if (cmd === 'list') {
    const sub = positionals[0] || 'all'
    if (sub === 'animations' || sub === 'all') {
      const pieces = getCatalogPieces()
      console.log(`\n\x1b[1m🎬 ANIMATED ASCII ART COLLECTION (${pieces.length}+ pieces):\x1b[0m`)
      pieces.slice(0, 30).forEach((p) => {
        console.log(`  \x1b[36m${p.slug.padEnd(24)}\x1b[0m ${p.name.padEnd(32)} [${p.category}]`)
      })
      if (pieces.length > 30) {
        console.log(`  \x1b[90m... and ${pieces.length - 30} more. Run "npx asciipro play <slug>" to preview.\x1b[0m`)
      }
    }
    if (sub === 'styles' || sub === 'all') {
      console.log(`\n\x1b[1m🎨 105+ VISUAL STYLES:\x1b[0m`)
      console.log(`  Characters, Braille, Dither, Pixel Art, LEGO, Matrix Rain, Cyber Terminal, Thermal FLIR, CRT Phosphor, Risograph, Glass, Low Poly, Anaglyph 3D, and more.`)
      console.log(`  Use: npx asciipro convert <image> --mode <name>\n`)
    }
    return
  }

  console.error(`\x1b[31mUnknown command:\x1b[0m "${cmd}". Run "npx asciipro --help" for list of commands.`)
}

main().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err)
  process.exit(1)
})
