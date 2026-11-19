# ASCII Studio

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-asciipro.vercel.app-00f0ff?style=for-the-badge&logo=vercel&logoColor=white)](https://asciipro.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen?style=for-the-badge)](LICENSE)

**Next-generation browser-native ASCII art generator, video-to-ASCII converter, and creative coding studio.**

[Explore Live Studio](https://asciipro.vercel.app) · [Report Bug](https://github.com/enabled404/ascii-studio/issues) · [Support Creator](https://saadkhalidhere.gumroad.com/l/tipjar)

</div>

---

## Overview

<div align="center">
  <img src="public/demo.gif" alt="ASCII Studio Demo Screen Recording" width="100%" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.6);" />
  <p><em>20-Second Interactive Demo: Style switching, real-time 3D specular lighting, Web Audio modulation, and media management.</em></p>
</div>

**ASCII Studio** is a client-side visual synthesizer that transforms static images, high-framerate videos, and live webcam feeds into stylized typography, ANSI art, retro computer graphics, and vector animations.

Unlike traditional cloud converters, all computations—including 2D canvas transforms, GLSL-inspired post-processing shaders, normal-bump specular shading, and audio analysis—execute entirely inside the client device. Zero bytes leave your browser.

---

## Key Features

| Feature Engine | Description | Capabilities |
| :--- | :--- | :--- |
| **105+ Render Modes** | Multi-category graphic visual styles | Classic ASCII, Braille, Matrix Rain, 3D LEGO Bricks, Voxel, Bayer/Floyd Dither, Thermal FLIR, CRT Phosphor, Stippling, Risograph, Comic, and Halftone. |
| **Animated Art Library (750+)** | World's largest interactive animated ASCII art collection | 750+ categorized pieces: 3D Math (Donut, Cube, Torus), Retro Gaming & Memes (Nyan Cat, Pac-Man, Space Invaders, Party Parrot), Sci-Fi (Cyber Skull, Matrix Rain, Radar HUD), VFX & UI Loaders. |
| **Interactive 60 FPS Player** | Fullscreen scrubber & parameter engine | Real-time scrubbing timeline slider, frame stepping (⏮ / ⏭), reverse playback, speed controls (0.25x-2x), custom FPS (1-60), 8 color themes, and halftone dot looks. |
| **Studio Import Pipeline** | One-click animated import into 3D studio | Inject any animated art piece directly into ASCII Studio's 3D normal-mapped specular lighting, CRT phosphor shaders, cinema LUTs, and audio reactive engine. |
| **3D Lighting Studio** | Dynamic normal-mapped multi-light surface engine | Up to 4 draggable colored lights (Key, Fill, Rim, Spot) with interactive specular reflections, ambient bounce, and 3D surface relief bumping. |
| **Web Audio Modulator** | Multi-band real-time audio reactivity | Live frequency analysis (Sub, Bass, Mid, High) dynamically modulating columns, contrast, saturation, and glitch intensity. |
| **Interactive Physics** | Dynamic particle gravity & forcefields | Repel, Attract, and Vortex cursor physics simulating fluid typographic collision in real time. |
| **Developer Exporters** | Multi-target production-ready code generation | Export crystal-clear 4K PNG, SVG vector, animated GIF, MP4/WebM video, raw ANSI text, or copy production-ready components in **React**, **Web Component**, **Python**, and **C++**. |
| **"Visualize" Studio Suite** | Interactive multi-modal mockups & scientific visualizer | **12 Real-World Mockups**: Smartphone wallpaper, Museum frame, 12" Vinyl album, Cyberpunk billboard, 1984 CRT monitor, Hoodie, Coffee mug, Cassette tape, Laptop lid, Arcade cabinet, Magazine cover, Desk mat. Plus Oscilloscope, 3D Waterfall, Frequency Radar, Equalizer, Mandelbrot, Julia, Lorenz Chaos, Game of Life, 3D Parametric Meshes. Exports to GIF, WebP, Video, PNG, ANSI. |
| **Model Context Protocol (MCP)** | Autonomous AI assistant connector (Remote HTTP/SSE & Stdio) | Compliant MCP server (`@asciipro/mcp-server`) with 7 tools and dynamic resources for Claude Desktop, Cursor, Antigravity, and Zed. Live endpoint: `https://asciipro.vercel.app/api/mcp`. |
| **ASCII Studio CLI (`asciipro`)** | High-performance terminal CLI | Run `npx asciipro banner`, `npx asciipro convert`, `npx asciipro visual`, `npx asciipro mockup`, `npx asciipro play`, and `npx asciipro mcp` directly from the command line. |
| **100% Client-Side Shield** | Absolute privacy & zero tracking | Zero backend dependencies. Works offline as a PWA, no telemetry, no tracking cookies, no accounts, and no watermarks. |

---

## 🔮 Interactive "Visualize" Studio Suite

ASCII Studio includes a dedicated multi-modal scientific and algorithmic visualizer:

- **Audio & Signal Visualization**:
  - **Oscilloscope Waveform**: Authentic analog phosphor CRT reticle with beam bloom, persistent phosphor decay, trigger stabilization, and timebase/volts-per-div readouts.
  - **3D Acoustic Waterfall**: 3D tilted canyon spectrogram displaying rolling historical FFT frequency slices with FLIR, Synthwave, Cyberpunk, and Matrix colormaps.
  - **Circular Frequency Radar HUD**: Polar audio sweep radar with concentric range rings, rotating scanline beam, and frequency peak phosphor blips.
  - **32-Band Peak Equalizer**: Multi-tier LED bar spectrum with gravity peak-hold indicators, RMS levels, and calibrated dB markers.
  - **5 Audio Sources**: Live Microphone, 120 BPM Synth Beat, Cyberpunk Bass Arpeggiator, 8-Bit Chiptune Melody, Ambient Harmonic Drone, Frequency Sweep, or custom uploaded audio track.
- **Mathematical & Algorithmic Visualization**:
  - **Mandelbrot & Julia Fractals**: Continuous deep zoom, drag-to-pan, smooth iteration count coloring $\nu = n + 1 - \frac{\ln(\ln(|z|))}{\ln(2)}$, and ASCII density ramp glyphs.
  - **3D Lorenz Attractor Chaos**: Coupled differential equations integrated in real-time via Runge-Kutta 4th order (RK4) with interactive 3D mouse orbit and velocity-dependent glow.
  - **Conway's Game of Life**: High-speed toroidal cellular automata with built-in patterns (Gosper Glider Gun, Pulsar, Pentadecathlon, Acorn, Glider Fleet, Random Soup), interactive drawing, and generation stepping.
  - **3D Parametric Surface Meshes**: Torus, Figure-8 Klein Bottle, Möbius Strip, Resonant Chladni Wave Mesh, and Hyperboloid with normal-mapped 3D lighting and depth sorting.
- **Instant Exporters**:
  - Download high-res PNG, record 3-second animated GIF with `gifenc`, export ANSI terminal color sequences, copy plain text ASCII, or **Send Frame to Studio** to stack with any of the 105+ studio styles and 3D lighting!

---

## 🤖 Model Context Protocol (MCP) Server

Connect ASCII Studio directly to **Claude Desktop**, **Cursor AI**, **Antigravity / Gemini**, and **Zed**:

### Setup Configurations

#### Remote MCP Endpoint (Zero Install · Cursor & Claude Code)
Connect directly to the live hosted MCP endpoint without installing Node or local dependencies:

**Cursor (`.cursor/mcp.json`):**
```json
{
  "mcpServers": {
    "asciipro": {
      "url": "https://asciipro.vercel.app/api/mcp"
    }
  }
}
```

**Claude Code CLI:**
```bash
claude mcp add asciipro https://asciipro.vercel.app/api/mcp
```

#### Local CLI Stdio (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "asciipro": {
      "command": "npx",
      "args": ["-y", "asciipro", "mcp"]
    }
  }
}
```

#### Zed (`~/.config/zed/settings.json`)
```json
{
  "context_servers": {
    "asciipro": {
      "command": {
        "path": "npx",
        "args": ["-y", "asciipro", "mcp"]
      }
    }
  }
}
```

### Integrated MCP Tools
1. `convert_image_to_ascii`: Convert any image URL, local path, or base64 data URI into ASCII, Braille, ANSI, HTML, or SVG with 105+ styles.
2. `generate_ascii_banner`: Render Figlet typography banners with custom fonts, styles, borders, and colors.
3. `search_animated_library`: Search the 750+ animated ASCII art collection by keywords, categories, and tags.
4. `get_animation_frames`: Retrieve animated frame sequences, ANSI color scripts, or bash terminal curl commands.
5. `export_developer_code`: Generate standalone React (`<AsciiArt />`), Web Component, Python 3, or C++ code embedding ASCII art.
6. `render_math_visualizer`: Generate Mandelbrot, Julia, Lorenz chaos, or 3D surface ASCII art on demand.

### Integrated Resources
- `ascii://styles`: Full specifications of all 105+ visual styles.
- `ascii://recipes`: Curated aesthetic looks and parameters.
- `ascii://library/catalog`: Catalog taxonomy of all 750+ animated art pieces.

---

## 💻 ASCII Studio CLI (`npx asciipro`)

Developers can run image conversion, banner generation, terminal playback, and visualizers directly from their command line:

```bash
# Render a Figlet typography banner with a cyber border
npx asciipro banner "ASCII PRO" --border cyber --color cyan

# Convert an image into Unicode Braille ASCII art with 100 columns
npx asciipro convert logo.png --mode braille --cols 100

# Run real-time Mandelbrot or 3D Torus visualizer in the terminal
npx asciipro visual mandelbrot --animate
npx asciipro visual torus --animate

# Play 60 FPS animated ASCII art directly in your terminal
npx asciipro play donut-3d
npx asciipro play rickroll-dance

# List 750+ animations and 105+ styles
npx asciipro list animations
npx asciipro list styles

# Start the Model Context Protocol (MCP) server on stdio
npx asciipro mcp
```

---

## Quickstart

Clone the repository and run the studio locally in under a minute:

```bash
# Clone the repository
git clone https://github.com/enabled404/ascii-studio.git
cd ascii-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` to explore the workspace.

### Building for Production

```bash
# Type check and build static assets into dist/
npm run build

# Preview production build locally
npm run preview
```

### Self-Test & Quality Verification

Run the automated headless test suite:

```bash
# Verify rendering, style pipelines, and export integrity
npm run selftest

# Re-record 20-second cinematic demo assets (requires ffmpeg)
npm run record:demo
```

---

## Animated ASCII Art Library & Player

ASCII Studio features the web's largest interactive collection of **750+ animated ASCII art pieces**, completely open-source and free:

- **Curated Categories**:
  - **3D Math & Geometry**: Donut raymarcher, Rotating Cube 3D, Trefoil Torus Knot, Tesseract Hypercube, Klein Bottle, Rotating Sphere.
  - **Retro Gaming & Memes**: Nyan Cat in Space, Pac-Man & Ghost Chase, Space Invaders 1978, Cult of the Party Parrot, Rickroll Dance.
  - **Sci-Fi & Cyberpunk**: Cyber Skull Hologram, Matrix Digital Rain, Tactical Radar HUD, Geodesic Hologram Core.
  - **VFX & Dynamics**: Algorithmic Doom Fire, Ocean Waves & Surf, Waterfall Cascade, Fireworks Finale, Spectrum Equalizer.
  - **Loaders & UI**: Quantum Braille Spinner, Terminal System Diagnostics, Vintage Chronometer, Solari Split-Flap Board.
  - **Nature & World**: Muybridge Galloping Horse, Ornamental Swimming Koi, Thunderstorm Tempest, Landscapes, and Cities.
- **Interactive Player Controls**:
  - Step forward/backward frame-by-frame (⏮ / ⏭) or scrub smoothly with the interactive timeline slider.
  - Reverse playback direction (◀ Reverse) and toggle playback speeds (0.25x, 0.5x, 1x, 1.5x, 2x).
  - Target FPS slider (1 to 60 FPS) and zoom scaling (50% to 200%).
  - 8 real-time color themes (Original Art, Matrix Core, Cyberpunk Neon, Amber CRT, Game Boy DMG, Monochrome, Synthwave, Ocean).
- **Export Suite**:
  - **Animated GIF**: Palette-quantized GIF loop export with custom delay and resolution via `gifenc`.
  - **Animated WebP**: Pure client-side RIFF container multiplexing delivering high-efficiency animated WebP files.
  - **MP4 & WebM Video**: Native stream capture supporting both MP4 and WebM containers across Chrome, Edge, and Safari.
  - **Frame Files Archive (.zip)**: Complete frame-by-frame export bundling all frames as `.txt` files, 24-bit `.ans` truecolor ANSI sequences, `play.sh`, and `metadata.json`.
  - **Shell Script (.sh)**: Standalone executable bash script that animates in any local terminal with zero external dependencies (`bash <piece>.sh`).
  - **Terminal `curl` Snippet**: Stream and play any animation live directly in your terminal (`curl -sL https://asciipro.vercel.app/ascii-art/scripts/donut-3d.sh | bash`).
  - **Copy Frame & ANSI**: Instant one-click clipboard copy of raw monospace text or 24-bit truecolor ANSI sequences.
- **Open in Studio**:
  - Inject any animation directly into ASCII Studio as a live source to stack with 3D normal-mapped lighting, CRT bloom, film grain, cinema LUTs, and audio reactivity.


---

## Architecture & Technology

- **Frontend Core**: React 18 with TypeScript in strict mode.
- **Bundler & Build Tool**: Vite 5 for instant HMR and optimized static chunking.
- **Graphic Pipeline**: Multi-pass HTML5 Canvas 2D engine with procedural convolution, spatial dithering (Bayer 8x8, Bayer 16x16, Floyd-Steinberg), chromatic dispersion, and CRT barrel distortion.
- **Sound Engine**: Web Audio API `AudioContext` with `AnalyserNode` fast Fourier transform (FFT) analysis.
- **Video Capture & Encoding**: `MediaStreamRecording` API and `gifenc` for palette-quantized animated GIF generation.

---

## Disclaimers & Privacy

- **Privacy First**: All images, videos, and webcam inputs are processed locally in memory. No server uploads occur.
- **Ownership**: You own 100% of all generated artworks, ANSI files, code, and video exports for personal or commercial use without restriction.

---

## Author & Acknowledgements

Handcrafted with passion for creative coding and retro computing by:

**Saad Khalid**  
GitHub: [@enabled404](https://github.com/enabled404) · X / Twitter: [@saadkhalidhere](https://x.com/saadkhalidhere)

If you find ASCII Studio useful, consider supporting future development:  
[☕ Buy Saad a Coffee via Gumroad Tip Jar](https://saadkhalidhere.gumroad.com/l/tipjar)

---

## License

This project is open-source software licensed under the [MIT License](LICENSE).
