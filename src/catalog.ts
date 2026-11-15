// Catalog: render modes, character ramps, dither palettes, recipes.
// Comprehensive visual style taxonomy and mathematical character ramps for ASCII Studio.

import type { DitherPalette, ModeDef, Recipe } from './types'

export const MODES: ModeDef[] = [
  { id: 'characters', label: 'Characters', category: 'ascii', featured: true, blurb: 'Classic ASCII ramp' },
  { id: 'keycap', label: 'Keycap ASCII', category: 'ascii', isNew: true, blurb: 'Chars on keyboard keys' },
  { id: 'mixed', label: 'Mixed', category: 'ascii', blurb: 'Chars and blocks mixed' },
  { id: 'block-chars', label: 'Block', category: 'ascii', blurb: 'Shade blocks only' },
  { id: 'dots', label: 'Dots', category: 'ascii', blurb: 'Halftone dot field' },
  { id: 'braille', label: 'Braille', category: 'ascii', blurb: '2x4 dot braille cells' },
  { id: 'dither', label: 'Dither', category: 'print', featured: true, blurb: 'Bayer, Floyd, halftone' },
  { id: 'pixel', label: 'Pixel Art', category: 'pixel', isNew: true, blurb: 'Chunky colour blocks' },
  { id: 'mosaic', label: 'Mosaic', category: 'pixel', blurb: 'Tiled photo mosaic' },
  { id: 'lego', label: 'LEGO Bricks', category: 'pixel', blurb: 'Studded brick tiles' },
  { id: 'voxel', label: 'Voxel', category: 'pixel', isNew: true, blurb: 'Isometric 3D cubes' },
  { id: 'hexmosaic', label: 'Hex Mosaic', category: 'pixel', blurb: 'Honeycomb hex tiles' },
  { id: 'cross', label: 'Cross', category: 'geometric', blurb: 'Plus-sign glyph field' },
  { id: 'diamond', label: 'Diamond', category: 'geometric', blurb: 'Diamond glyph field' },
  { id: 'lines', label: 'Lines', category: 'geometric', blurb: 'Line weight by tone' },
  { id: 'diagonal', label: 'Diagonal', category: 'geometric', blurb: 'Diagonal strokes' },
  { id: 'specimen', label: 'Specimen', category: 'geometric', blurb: 'Type specimen poster' },
  { id: 'lowpoly', label: 'Low Poly', category: 'geometric', blurb: 'Flat shaded triangles' },
  { id: 'frostedglass', label: 'Frosted Glass', category: 'glass', isNew: true, blurb: 'Soft blurred panes' },
  { id: 'stainedglass', label: 'Tinted Glass', category: 'glass', blurb: 'Leaded glass panes' },
  { id: 'risograph', label: 'Risograph', category: 'print', isNew: true, blurb: 'Two-ink riso print' },
  { id: 'stippling', label: 'Stippling', category: 'print', isNew: true, blurb: 'Ink dot stipple' },
  { id: 'comic', label: 'Comic', category: 'print', blurb: 'Posterised ink comic' },
  { id: 'sketch', label: 'Sketch', category: 'print', blurb: 'Pencil edge sketch' },
  { id: 'crt', label: 'CRT Screen', category: 'glitch', isNew: true, blurb: 'Phosphor terminal look' },
  { id: 'pixelsort', label: 'Pixel Sort', category: 'glitch', blurb: 'Sorted scanline streaks' },
  { id: 'disco', label: 'Disco', category: 'light', isNew: true, blurb: 'Mirror ball colour pop' },
  { id: 'anaglyph', label: 'Anaglyph 3D', category: 'light', blurb: 'Red cyan 3D glasses' },
  { id: 'waves', label: 'Waves', category: 'material', isNew: true, blurb: 'Sine wave distortion' },
  { id: 'oilpaint', label: 'Oil Paint', category: 'material', blurb: 'Thick brush strokes' },
  { id: 'watercolor', label: 'Watercolor', category: 'material', blurb: 'Soft wash painting' },
  { id: 'chrome', label: 'Chrome', category: 'material', blurb: 'Liquid metal sheen' },
  { id: 'motionblur', label: 'Motion Blur', category: 'blur', isNew: true, blurb: 'Directional speed blur' },
  { id: 'smudge', label: 'Smudge', category: 'distort', blurb: 'Finger smear blur' },
  { id: 'pinch', label: 'Pinch', category: 'distort', blurb: 'Lens pinch warp' },
  { id: 'spherize', label: 'Spherize', category: 'distort', blurb: 'Fisheye sphere warp' },
  { id: 'twirl', label: 'Twirl', category: 'distort', blurb: 'Swirl vortex warp' },
  { id: 'ripple', label: 'Ripple', category: 'distort', blurb: 'Concentric ripple warp' },
  { id: 'zigzag', label: 'ZigZag', category: 'distort', blurb: 'Zigzag ripple warp' },
  { id: 'polar', label: 'Polar', category: 'distort', blurb: 'Polar coordinate swirl' },
  { id: 'shear', label: 'Shear', category: 'distort', blurb: 'Slanted shear warp' },
  { id: 'emoji', label: 'Emoji', category: 'ascii', isNew: true, blurb: 'Moon-phase emoji tones' },
  { id: 'numbers', label: 'Numbers', category: 'ascii', isNew: true, blurb: 'Digit density ramp' },
  { id: 'arrows', label: 'Arrows', category: 'ascii', isNew: true, blurb: 'Directional arrow field' },
  { id: 'math', label: 'Math', category: 'ascii', isNew: true, blurb: 'Maths symbol ramp' },
  { id: 'katakana', label: 'Katakana', category: 'ascii', isNew: true, blurb: 'Half-width kana glyphs' },
  { id: 'circles', label: 'Circles', category: 'ascii', isNew: true, blurb: 'Hollow to solid discs' },
  { id: 'halfblock', label: 'Half Block', category: 'ascii', isNew: true, blurb: 'Two-tone half blocks' },
  { id: 'typewriter', label: 'Typewriter', category: 'ascii', isNew: true, blurb: 'Vintage typed characters' },
  { id: 'neon', label: 'Neon', category: 'ascii', isNew: true, blurb: 'Glowing neon letters' },
  { id: 'crossstitch', label: 'Cross Stitch', category: 'pixel', isNew: true, blurb: 'Embroidered X stitches' },
  { id: 'beads', label: 'Beads', category: 'pixel', isNew: true, blurb: 'Perler bead mosaic' },
  { id: 'halftone-cmyk', label: 'Halftone CMYK', category: 'print', isNew: true, blurb: 'Four-colour print dots' },
  { id: 'blueprint', label: 'Blueprint', category: 'print', isNew: true, blurb: 'White lines on blue' },
  { id: 'linocut', label: 'Linocut', category: 'print', isNew: true, blurb: 'Bold carved ink shapes' },
  { id: 'triangles', label: 'Triangles', category: 'geometric', isNew: true, blurb: 'Outlined triangle field' },
  { id: 'hexagons', label: 'Hexagons', category: 'geometric', isNew: true, blurb: 'Outlined hex field' },
  { id: 'prism', label: 'Prism', category: 'glass', isNew: true, blurb: 'Rainbow refraction panes' },
  { id: 'aurora', label: 'Aurora', category: 'light', isNew: true, blurb: 'Northern lights wash' },
  { id: 'laser', label: 'Laser', category: 'light', isNew: true, blurb: 'Thin bright scan lines' },
  { id: 'vhs', label: 'VHS', category: 'glitch', isNew: true, blurb: 'Tracking-error tape' },
  { id: 'marble', label: 'Marble', category: 'material', isNew: true, blurb: 'Veined stone swirl' },
  { id: 'kaleidoscope', label: 'Kaleidoscope', category: 'distort', isNew: true, blurb: 'Mirrored quadrant tiles' },
  { id: 'bokeh', label: 'Bokeh', category: 'blur', isNew: true, blurb: 'Soft out-of-focus discs' },
  { id: 'ledmatrix', label: 'LED Matrix', category: 'pixel', isNew: true, featured: true, blurb: 'Times Square LED billboard' },
  { id: 'gameboy-camera', label: 'GB Camera', category: 'print', isNew: true, featured: true, blurb: '1998 2-bit handheld dither' },
  { id: 'thermal', label: 'Thermal FLIR', category: 'light', isNew: true, featured: true, blurb: 'Predator heat-map vision' },
  { id: 'cyberterminal', label: 'Cyber Terminal', category: 'ascii', isNew: true, featured: true, blurb: 'Hacker HUD with scan telemetry' },
  { id: 'ascii-colored-bg', label: 'Color Dual ASCII', category: 'ascii', isNew: true, featured: true, blurb: 'Dual foreground & background cells' },
  { id: 'circuit', label: 'PCB Circuit', category: 'geometric', isNew: true, blurb: 'Copper traces and solder pads' },
  { id: 'crosshatch', label: 'Crosshatch', category: 'print', isNew: true, blurb: 'Architectural pen-and-ink engraving' },
  { id: 'wireframe', label: '3D Wireframe', category: 'geometric', isNew: true, blurb: 'Perspective relief vector terrain' },
  { id: 'voronoi', label: 'Voronoi', category: 'pixel', isNew: true, blurb: 'Polygonal cellular mosaic' },
  { id: 'glitch-cyber', label: 'Cyber Glitch', category: 'glitch', isNew: true, featured: true, blurb: 'Datamosh chromatic slice shift' },
  { id: 'matrix-rain', label: 'Matrix Digital Rain', category: 'ascii', isNew: true, featured: true, blurb: 'Streaming green code cascade' },
  { id: 'ascii-flow', label: 'ASCII Flow', category: 'ascii', isNew: true, featured: true, blurb: 'Curved contour vector flow' },
  { id: 'ascii-box', label: 'Box Drawing', category: 'geometric', isNew: true, featured: true, blurb: 'Unicode box & wire schematic' },
  { id: 'dot-matrix', label: 'Dot Matrix Printer', category: 'print', isNew: true, featured: true, blurb: '9-pin receipt impact pattern' },
  { id: 'glitch-vcr', label: 'VCR Tracking', category: 'glitch', isNew: true, featured: true, blurb: 'Analog tape sync tearing' },
  { id: 'braille-dense', label: 'Dense Braille 8-Dot', category: 'ascii', isNew: true, featured: true, blurb: 'Sub-pixel 8-dot Unicode braille matrix' },
  { id: 'ascii-cinematic', label: 'Cinematic Anamorphic', category: 'light', isNew: true, featured: true, blurb: '35mm anamorphic character halation & grain' },
  { id: 'ironbow-flir', label: 'Ironbow Thermal', category: 'light', isNew: true, featured: true, blurb: 'Military FLIR thermography false color' },
  { id: 'ascii-terrain-3d', label: '3D Terrain Relief', category: 'geometric', isNew: true, featured: true, blurb: 'Heightmap elevation relief with cast shadows' },
  { id: 'ascii-blueprint-cad', label: 'CAD Architectural', category: 'print', isNew: true, featured: true, blurb: 'Technical CAD blueprint with precision marks' },
  { id: 'ascii-halftone-news', label: 'Vintage Benday', category: 'print', isNew: true, blurb: '1960s newspaper Benday dot pattern' },
  { id: 'ascii-synthwave-mesh', label: 'Outrun Synthwave', category: 'light', isNew: true, featured: true, blurb: 'Retro 80s neon horizon wireframe' },
  { id: 'ascii-glitch-datamosh', label: 'Datamosh Slice', category: 'glitch', isNew: true, featured: true, blurb: 'Macroblock motion vector shear artifact' },
  { id: 'ascii-terminal-crt', label: 'Amber P39 CRT', category: 'glitch', isNew: true, featured: true, blurb: 'Curved phosphor CRT with persistence trail' },
  { id: 'ascii-quantum-dot', label: 'Quantum Dots', category: 'geometric', isNew: true, blurb: 'Orbital electron probability density' },
  { id: 'ascii-chladni', label: 'Chladni Nodal', category: 'material', isNew: true, blurb: 'Acoustic plate resonance vibration lines' },
  { id: 'matrix-cascade', label: 'Phosphor Cascade', category: 'ascii', isNew: true, featured: true, blurb: 'Dual-layer green digital rain waterfall' },
  { id: 'ascii-hex-dense', label: 'Hex Honeycomb', category: 'geometric', isNew: true, blurb: 'Tight hexagonal cellular ASCII grid' },
  { id: 'ascii-woodcut', label: 'Renaissance Woodcut', category: 'print', isNew: true, blurb: 'Historical Albrecht Dürer xylograph print' },
  { id: 'ascii-radar-hud', label: 'Tactical Radar HUD', category: 'light', isNew: true, blurb: 'Sweeping 360-degree sonar HUD rings' },
  { id: 'ascii-emboss', label: 'Stone Bas-Relief', category: 'material', isNew: true, blurb: 'Sculpted marble relief with directional light' },
  { id: 'ascii-gameboy-pocket', label: 'Game Boy Pocket', category: 'print', isNew: true, blurb: 'Passive matrix 4-shade grayscale LCD' },
  { id: 'ascii-c64-petscii', label: 'PETSCII Retro', category: 'ascii', isNew: true, blurb: 'Commodore 64 1982 hardware character ROM' },
  { id: 'ascii-cyber-hex', label: 'Cyber Hex Grid', category: 'glitch', isNew: true, blurb: 'High-tech hexagonal battle telemetry overlay' },
  { id: 'ascii-moire', label: 'Optical Moiré', category: 'material', isNew: true, blurb: 'Interference fringe wave patterns' },
  { id: 'ascii-stained-amber', label: 'Amber Glass', category: 'glass', isNew: true, blurb: 'Cathedral stained glass with luminous sunlight' },
  { id: 'ascii-chalkboard', label: 'Slate Chalkboard', category: 'print', isNew: true, blurb: 'Hand-drawn chalkboard sketch with chalk dust' },
  { id: 'ascii-synth-equalizer', label: 'Graphic EQ', category: 'light', isNew: true, blurb: 'Multi-band audio visualizer spectrum bars' },
  { id: 'ascii-solari-board', label: 'Solari Departure', category: 'ascii', isNew: true, blurb: 'Mechanical airport split-flap letter board' },
  { id: 'ascii-led-ticker', label: 'Stock Ticker LED', category: 'pixel', isNew: true, blurb: 'Wall Street scrolling financial ticker' },
  { id: 'ascii-thermal-ice', label: 'Cryogenic Thermal', category: 'light', isNew: true, blurb: 'Deep sub-zero liquid nitrogen heat signature' },
  { id: 'ascii-particles', label: 'Physics Particles', category: 'ascii', isNew: true, featured: true, blurb: 'Interactive ASCII physics particles reacting to cursor gravity & forces' },
]

/** Fixed glyph ramps for the new text modes (ordered dark to dense). */
export const MODE_RAMPS: Partial<Record<string, string>> = {
  emoji: ' 🌑🌒🌓🌔🌕',
  numbers: ' 123456789',
  arrows: ' ·↑↗→↘↓↙←↖',
  math: ' ·+×÷=≠±√∞',
  katakana: ' ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ',
  circles: ' ·○◐●⬤',
  halfblock: ' ▀▄█',
  typewriter: " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  neon: ' .:-=+*#%@',
  cyberterminal: ' 01_[]/\\<>=+-*#',
  'ascii-colored-bg': ' .:-=+*#%@',
  'matrix-rain': ' ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ12345789:・."=*+-<>¦｜',
  'ascii-flow': ' ·~-=/|\\)(',
  'ascii-box': ' ─│┌┐└┘├┤┬┴┼',
  'dot-matrix': ' .:,;oO0@#',
  'glitch-vcr': ' _░▒▓█',
  'braille-dense': ' ⠁⠃⠇⠧⠷⠿',
  'ascii-cinematic': ' .·:;+=xX$#@',
  'ascii-terrain-3d': ' _.-~+=^"\'#',
  'ascii-blueprint-cad': ' +─│┌┐└┘├┤┬┴┼',
  'ascii-halftone-news': ' .•●⬤',
  'ascii-synthwave-mesh': ' _/\\|#*',
  'ascii-glitch-datamosh': ' _░▒▓█',
  'ascii-terminal-crt': ' .:;+=#%@',
  'ascii-quantum-dot': ' ·:•●',
  'ascii-chladni': ' ~-=/|\\',
  'matrix-cascade': ' ｦｱｳｴｵｶｷｹｺｻｼｽｾｿ123456789:・."=*+-<>',
  'ascii-woodcut': " .'`^,:;!|/tfvzCLQ0#MW&8%B@",
  'ascii-radar-hud': ' .:+*#@',
  'ascii-emboss': ' .:-=+*#%@',
  'ascii-gameboy-pocket': ' ░▒▓█',
  'ascii-c64-petscii': '  ▂▃▄▅▆▇█▌▎▏',
  'ascii-cyber-hex': ' 01_[]/\\<>=+-*#',
  'ascii-chalkboard': " .'`^,:;!|/tf#",
  'ascii-solari-board': ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  'ascii-led-ticker': ' .oO@#',
  'ascii-particles': ' ·:;+=*#%@█',
}

export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'ascii', label: 'ASCII' },
  { id: 'pixel', label: 'Pixel' },
  { id: 'print', label: 'Print' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'glass', label: 'Glass' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'light', label: 'Light' },
  { id: 'material', label: 'Material' },
  { id: 'blur', label: 'Blur' },
  { id: 'distort', label: 'Distort' },
]

export const CHAR_RAMPS: Record<string, { label: string; chars: string }> = {
  standard: { label: 'Standard', chars: ' .:-=+*#%@' },
  detailed: { label: 'Detailed', chars: " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$", },
  minimal: { label: 'Minimal', chars: ' .:#@' },
  blocks: { label: 'Blocks', chars: ' ░▒▓█' },
  binary: { label: 'Binary', chars: ' 01' },
  letters: { label: 'Letters', chars: ' .oO#@' },
  symbols: { label: 'Symbols', chars: ' .+*x#%&@$' },
  custom: { label: 'Custom', chars: ' .:-=+*#%@' },
}

export const DITHER_PALETTES: Record<DitherPalette, { label: string; colors: [number, number, number][] }> = {
  original: {
    label: 'Original (grayscale)',
    colors: [[0, 0, 0], [255, 255, 255]],
  },
  cyberpunk: {
    label: 'Cyberpunk',
    colors: [
      [13, 2, 33], [255, 42, 109], [5, 217, 232], [249, 200, 14],
      [209, 247, 255], [255, 107, 53], [128, 0, 255],
    ],
  },
  riso: {
    label: 'Risograph',
    colors: [
      [255, 255, 255], [255, 72, 176], [0, 120, 191], [0, 169, 92],
      [255, 232, 0], [0, 0, 0],
    ],
  },
  gameboy: {
    label: 'Game Boy',
    colors: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]],
  },
  c64: {
    label: 'Commodore 64',
    colors: [
      [0, 0, 0], [255, 255, 255], [136, 0, 0], [170, 255, 238],
      [204, 68, 204], [0, 204, 85], [0, 0, 170], [238, 238, 119],
      [221, 136, 85], [102, 68, 0], [255, 119, 119], [51, 51, 51],
      [119, 119, 119], [170, 255, 102], [0, 136, 255], [187, 187, 187],
    ],
  },
  pico8: {
    label: 'PICO-8',
    colors: [
      [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81],
      [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
      [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54],
      [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170],
    ],
  },
  bonsai: {
    label: 'Bonsai',
    colors: [
      [16, 32, 16], [34, 80, 42], [74, 124, 62], [124, 168, 92],
      [168, 200, 120], [214, 232, 170], [245, 245, 220],
    ],
  },
  vaporwave: {
    label: 'Vaporwave',
    colors: [
      [26, 6, 51], [255, 113, 206], [1, 205, 254], [5, 255, 161],
      [185, 103, 255], [255, 251, 150], [255, 255, 255],
    ],
  },
  sunset: {
    label: 'Sunset',
    colors: [
      [26, 16, 51], [123, 45, 139], [232, 93, 61], [247, 183, 51],
      [255, 233, 168], [255, 247, 204],
    ],
  },
}

export const FX_DEFS: { id: string; label: string; blurb: string }[] = [
  { id: 'vignette', label: 'Vignette', blurb: 'Darkened corners' },
  { id: 'scanLines', label: 'Scan Lines', blurb: 'CRT line overlay' },
  { id: 'crtCurve', label: 'CRT Curve', blurb: 'Barrel curved screen' },
  { id: 'chromatic', label: 'Chromatic Aberration', blurb: 'Colour fringe edges' },
  { id: 'rgbSplit', label: 'RGB Split', blurb: 'Split colour channels' },
  { id: 'glitch', label: 'Glitch', blurb: 'Slice and shift chaos' },
  { id: 'filmGrain', label: 'Film Grain', blurb: 'Analog grain' },
  { id: 'filmDust', label: 'Film Dust', blurb: 'Dust and scratches' },
  { id: 'noise', label: 'Noise', blurb: 'Static noise' },
  { id: 'bloom', label: 'Bloom', blurb: 'Soft glow' },
  { id: 'charBloom', label: 'Character Bloom', blurb: 'Glowing characters' },
  { id: 'charChroma', label: 'Character Chroma', blurb: 'Chroma on characters' },
  { id: 'pixelate', label: 'Pixelate', blurb: 'Chunky pixels' },
  { id: 'halftone', label: 'Halftone', blurb: 'Print dot screen' },
  { id: 'sharpen', label: 'Sharpen', blurb: 'Crisp edges' },
  { id: 'advBlur', label: 'Advanced Blur', blurb: 'Soft dreamy blur' },
  { id: 'colorOverlay', label: 'Colour Overlay', blurb: 'Warm tint wash' },
  { id: 'blur', label: 'Blur', blurb: 'Soft Gaussian-style blur' },
  { id: 'duotone', label: 'Duotone', blurb: 'Two-ink tone map' },
  { id: 'posterize', label: 'Posterize', blurb: 'Flat colour bands' },
  { id: 'solarize', label: 'Solarize', blurb: 'Inverted highlights' },
  { id: 'edgeGlow', label: 'Edge Glow', blurb: 'Glowing outlines' },
  { id: 'lensDistortion', label: 'Lens Distortion', blurb: 'Optical barrel & pincushion warp' },
  { id: 'lightLeak', label: 'Light Leak', blurb: 'Warm 35mm film leak flares' },
  { id: 'scanlinesPro', label: 'Phosphor Triad', blurb: 'RGB Trinitron subpixel grill' },
  { id: 'heatwave', label: 'Heat Wave', blurb: 'Atmospheric shimmering thermal waves' },
  { id: 'glowDiffusion', label: 'Glow Diffusion', blurb: 'Cinematic Pro-Mist soft dream' },
  { id: 'vhsTracking', label: 'VHS Tape Tracking', blurb: 'Horizontal sync distortion & tape tear lines' },
]

export const COLOR_LUTS: { id: import('./types').LutId; label: string; blurb: string }[] = [
  { id: 'none', label: 'None', blurb: 'Natural source colours' },
  { id: 'cyberpunk', label: 'Cyberpunk Neon', blurb: 'Deep magenta & electric cyan' },
  { id: 'synthwave', label: 'Synthwave 80s', blurb: 'Hot purple, orange & dark blue' },
  { id: 'sepia', label: 'Vintage Sepia', blurb: 'Warm antique silver-gelatin tones' },
  { id: 'matrix', label: 'Matrix Terminal', blurb: 'Phosphor green matrix glow' },
  { id: 'thermal', label: 'Thermal Vision', blurb: 'Ultramarine to fiery red-yellow' },
  { id: 'anime', label: 'Anime Cel', blurb: 'High-key vibrant anime grade' },
  { id: 'acid', label: 'Acid Wash', blurb: 'Psychedelic chromatic pop' },
  { id: 'golden', label: 'Golden Hour', blurb: 'Warm 35mm golden sunset wash' },
  { id: 'monolith', label: 'Monolith B&W', blurb: 'Brutalist high-contrast monochrome' },
]

export const LIGHT_PRESETS: { id: string; name: string; desc: string; lights: import('./types').LightSource[] }[] = [
  {
    id: 'cyber-dual',
    name: 'Cyberpunk Dual',
    desc: 'Electric Cyan key with Neon Magenta fill',
    lights: [
      { id: 'light-1', name: 'Cyan Key', enabled: true, x: 0.22, y: 0.25, color: '#00f0ff', intensity: 120, radius: 0.75, type: 'point' },
      { id: 'light-2', name: 'Magenta Fill', enabled: true, x: 0.78, y: 0.35, color: '#ff007f', intensity: 110, radius: 0.75, type: 'point' },
      { id: 'light-3', name: 'Gold Rim', enabled: false, x: 0.5, y: 0.9, color: '#ffb300', intensity: 100, radius: 0.6, type: 'rim' },
      { id: 'light-4', name: 'White Spot', enabled: false, x: 0.5, y: 0.15, color: '#ffffff', intensity: 120, radius: 0.5, type: 'spot' },
    ],
  },
  {
    id: 'sunset-rim',
    name: 'Sunset Rim',
    desc: 'Warm fiery rim light from below with violet overhead fill',
    lights: [
      { id: 'light-1', name: 'Violet Sky', enabled: true, x: 0.5, y: 0.15, color: '#7a22ff', intensity: 90, radius: 0.8, type: 'point' },
      { id: 'light-2', name: 'Amber Glow', enabled: true, x: 0.3, y: 0.85, color: '#ff7700', intensity: 140, radius: 0.7, type: 'point' },
      { id: 'light-3', name: 'Hot Gold Rim', enabled: true, x: 0.8, y: 0.85, color: '#ffdd00', intensity: 120, radius: 0.6, type: 'rim' },
      { id: 'light-4', name: 'Spot', enabled: false, x: 0.5, y: 0.5, color: '#ffffff', intensity: 100, radius: 0.5, type: 'spot' },
    ],
  },
  {
    id: 'matrix-spot',
    name: 'Matrix Overhead',
    desc: 'Toxic green high spotlight with subtle mint bounce',
    lights: [
      { id: 'light-1', name: 'Matrix Top Spot', enabled: true, x: 0.5, y: 0.1, color: '#00ff41', intensity: 150, radius: 0.6, type: 'spot' },
      { id: 'light-2', name: 'Mint Ambient', enabled: true, x: 0.5, y: 0.8, color: '#003b14', intensity: 80, radius: 0.9, type: 'point' },
      { id: 'light-3', name: 'Phosphor Rim', enabled: true, x: 0.15, y: 0.5, color: '#33ff88', intensity: 100, radius: 0.5, type: 'rim' },
      { id: 'light-4', name: 'Dark Fill', enabled: false, x: 0.85, y: 0.5, color: '#002200', intensity: 60, radius: 0.5, type: 'point' },
    ],
  },
  {
    id: 'stage-quad',
    name: 'Stage Quad',
    desc: 'Four-point full spectrum concert stage lighting',
    lights: [
      { id: 'light-1', name: 'Key Blue', enabled: true, x: 0.2, y: 0.2, color: '#0088ff', intensity: 110, radius: 0.6, type: 'point' },
      { id: 'light-2', name: 'Key Red', enabled: true, x: 0.8, y: 0.2, color: '#ff1144', intensity: 110, radius: 0.6, type: 'point' },
      { id: 'light-3', name: 'Rim Green', enabled: true, x: 0.2, y: 0.8, color: '#00ffaa', intensity: 100, radius: 0.6, type: 'rim' },
      { id: 'light-4', name: 'Rim Amber', enabled: true, x: 0.8, y: 0.8, color: '#ffaa00', intensity: 100, radius: 0.6, type: 'rim' },
    ],
  },
]

export const RECIPES: Recipe[] = [
  {
    id: 'terminal-glow', name: 'Terminal Glow', desc: 'Classic green terminal with bloom and scanlines',
    patch: { mode: 'characters', cellSize: 'medium', contrast: 125, colorMode: 'mono', fg: '#33ff66', bg: '#020604', fx: { charBloom: { enabled: true, intensity: 60 }, scanLines: { enabled: true, intensity: 34 }, vignette: { enabled: true, intensity: 42 } } },
  },
  {
    id: 'noir-film', name: 'Noir Film', desc: 'Grainy black and white cinema still',
    patch: { mode: 'characters', cellSize: 'medium', contrast: 135, colorMode: 'mono', fg: '#e8e8e8', bg: '#040406', fx: { vignette: { enabled: true, intensity: 60 }, filmGrain: { enabled: true, intensity: 38 }, filmDust: { enabled: true, intensity: 22 }, bloom: { enabled: true, intensity: 25 } } },
  },
  {
    id: 'soft-bloom', name: 'Soft Bloom', desc: 'Dreamy glow with gentle background blur',
    patch: { mode: 'characters', cellSize: 'medium', bgBlur: 2, contrast: 118, fx: { charBloom: { enabled: true, intensity: 50 }, bloom: { enabled: true, intensity: 34 }, vignette: { enabled: true, intensity: 38 } } },
  },
  {
    id: 'inverted-paper', name: 'Inverted Paper', desc: 'Dark on light, like printed ASCII',
    patch: { mode: 'characters', cellSize: 'medium', contrast: 118, invert: true, colorMode: 'mono', fg: '#111111', bg: '#f4f1ea', fx: { vignette: { enabled: true, intensity: 42 }, filmGrain: { enabled: true, intensity: 24 } } },
  },
  {
    id: 'neon-dither', name: 'Neon Dither', desc: 'Cyberpunk Bayer dither with chromatic fringe',
    patch: { mode: 'dither', ditherAlgo: 'bayer8', ditherPalette: 'cyberpunk', ditherScale: 2, contrast: 118, fx: { chromatic: { enabled: true, intensity: 30 }, bloom: { enabled: true, intensity: 32 } } },
  },
  {
    id: 'riso-poster', name: 'Riso Poster', desc: 'Two-ink risograph halftone poster',
    patch: { mode: 'dither', ditherAlgo: 'halftone', ditherPalette: 'riso', ditherScale: 1, fx: { vignette: { enabled: true, intensity: 36 }, filmGrain: { enabled: true, intensity: 18 } } },
  },
  {
    id: 'gameboy', name: 'Game Boy', desc: 'Four-shade handheld nostalgia',
    patch: { mode: 'dither', ditherAlgo: 'bayer16', ditherPalette: 'gameboy', ditherScale: 2, fx: { scanLines: { enabled: true, intensity: 22 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'newsprint', name: 'Newsprint', desc: 'Floyd-Steinberg ink on paper',
    patch: { mode: 'dither', ditherAlgo: 'floyd', ditherPalette: 'original', ditherScale: 2, fx: { vignette: { enabled: true, intensity: 40 } } },
  },
  {
    id: 'retro-arcade', name: 'Retro Arcade', desc: 'CRT screen with curve and scanlines',
    patch: { mode: 'crt', cellSize: 'medium', contrast: 120, colorMode: 'mono', fg: '#ffb000', bg: '#0a0500', fx: { crtCurve: { enabled: true, intensity: 60 }, scanLines: { enabled: true, intensity: 45 }, vignette: { enabled: true, intensity: 50 } } },
  },
  {
    id: 'voxel-toy', name: 'Voxel Toy', desc: 'Chunky isometric cubes, saturated',
    patch: { mode: 'voxel', saturation: 140, contrast: 112, fx: { vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'lego-bricks', name: 'LEGO Bricks', desc: 'Studded brick mosaic, bright and playful',
    patch: { mode: 'lego', saturation: 130, contrast: 108, fx: { bloom: { enabled: true, intensity: 18 } } },
  },
  {
    id: 'matrix-rain', name: 'Matrix Rain', desc: 'Falling-code green with heavy bloom',
    patch: { mode: 'characters', charSet: 'detailed', cellSize: 'small', contrast: 130, colorMode: 'mono', fg: '#00ff41', bg: '#000800', fx: { charBloom: { enabled: true, intensity: 70 }, scanLines: { enabled: true, intensity: 28 }, vignette: { enabled: true, intensity: 55 } } },
  },
  {
    id: 'pop-art', name: 'Pop Art', desc: 'Disco colour pop with RGB split',
    patch: { mode: 'disco', saturation: 170, contrast: 115, fx: { rgbSplit: { enabled: true, intensity: 35 }, bloom: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'ink-sketch', name: 'Ink Sketch', desc: 'Pencil sketch with paper grain',
    patch: { mode: 'sketch', contrast: 125, fx: { filmGrain: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'vaporwave', name: 'Vaporwave', desc: 'Pink and cyan dither with chrome fringe',
    patch: { mode: 'dither', ditherAlgo: 'bayer8', ditherPalette: 'vaporwave', ditherScale: 2, contrast: 118, fx: { chromatic: { enabled: true, intensity: 30 }, bloom: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'bonsai-dither', name: 'Bonsai Dither', desc: 'Leaf-green Floyd dither, calm and grainy',
    patch: { mode: 'dither', ditherAlgo: 'floyd', ditherPalette: 'bonsai', ditherScale: 2, contrast: 112, fx: { vignette: { enabled: true, intensity: 40 }, filmGrain: { enabled: true, intensity: 20 } } },
  },
  {
    id: 'c64-palette', name: 'C64 Palette', desc: 'Commodore 64 colours with scanlines',
    patch: { mode: 'dither', ditherAlgo: 'bayer16', ditherPalette: 'c64', ditherScale: 2, contrast: 115, fx: { scanLines: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'cloud-filter', name: 'Cloud Filter', desc: 'Soft frosted glass with a dreamy bloom',
    patch: { mode: 'frostedglass', saturation: 120, contrast: 105, fx: { bloom: { enabled: true, intensity: 40 }, advBlur: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 25 } } },
  },
  {
    id: 'cyberpunk-city', name: 'Cyberpunk City', desc: 'Hot pink neon letters on a dark street',
    patch: { mode: 'neon', cellSize: 'medium', contrast: 120, colorMode: 'mono', fg: '#ff2a6d', bg: '#0d0221', fx: { charBloom: { enabled: true, intensity: 55 }, chromatic: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 45 } } },
  },
  {
    id: 'sunset-glow', name: 'Sunset', desc: 'Warm dusk tones with a soft glow',
    patch: { mode: 'characters', colorMode: 'color', saturation: 150, contrast: 115, fx: { bloom: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 40 }, colorOverlay: { enabled: true, intensity: 25 } } },
  },
  {
    id: 'matrix-code', name: 'Matrix Code Generator', desc: 'Katakana rain in terminal green',
    patch: { mode: 'katakana', cellSize: 'small', contrast: 130, colorMode: 'mono', fg: '#00ff41', bg: '#000800', fx: { charBloom: { enabled: true, intensity: 65 }, scanLines: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 50 } } },
  },
  {
    id: 'film-noir', name: 'Film Noir Photo Filter', desc: 'Hard contrast, heavy grain, deep shadows',
    patch: { mode: 'characters', colorMode: 'mono', fg: '#e8e8e8', bg: '#040406', contrast: 140, fx: { vignette: { enabled: true, intensity: 65 }, filmGrain: { enabled: true, intensity: 45 }, filmDust: { enabled: true, intensity: 30 }, bloom: { enabled: true, intensity: 20 } } },
  },
  {
    id: 'aurora-night', name: 'Aurora Night', desc: 'Northern lights wash with bloom',
    patch: { mode: 'aurora', saturation: 150, contrast: 110, fx: { bloom: { enabled: true, intensity: 45 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'candy-pop', name: 'Candy Pop', desc: 'Bright bead mosaic with a soft glow',
    patch: { mode: 'beads', saturation: 170, contrast: 112, fx: { bloom: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 20 } } },
  },
  {
    id: 'pico-quest', name: 'PICO-8 Quest', desc: 'Sixteen-colour fantasy console dither',
    patch: { mode: 'dither', ditherAlgo: 'bayer8', ditherPalette: 'pico8', ditherScale: 2, contrast: 115, fx: { scanLines: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'prism-rain', name: 'Prism Rain', desc: 'Rainbow refraction panes with fringe',
    patch: { mode: 'prism', saturation: 150, contrast: 110, fx: { bloom: { enabled: true, intensity: 30 }, chromatic: { enabled: true, intensity: 20 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'times-square', name: 'Times Square LED', desc: 'Stadium LED billboard with circular subpixel diode glow',
    patch: { mode: 'ledmatrix', cellSize: 'medium', saturation: 160, contrast: 120, fx: { bloom: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 40 } } },
  },
  {
    id: 'gb-camera-98', name: 'Game Boy Camera 98', desc: 'Authentic 1998 2-bit pocket camera dither',
    patch: { mode: 'gameboy-camera', cellSize: 'small', contrast: 125, ditherPalette: 'gameboy', fx: { vignette: { enabled: true, intensity: 30 }, filmGrain: { enabled: true, intensity: 20 } } },
  },
  {
    id: 'predator-thermal', name: 'Predator Thermal', desc: 'FLIR infrared heat-map vision from cold indigo to fiery white',
    patch: { mode: 'thermal', cellSize: 'medium', contrast: 130, saturation: 180, fx: { bloom: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 45 } } },
  },
  {
    id: 'cyber-terminal-hud', name: 'Cyber Terminal HUD', desc: 'Matrix green terminal with telemetry line numbers & phosphor bloom',
    patch: { mode: 'cyberterminal', cellSize: 'medium', colorMode: 'mono', fg: '#00ff66', bg: '#020d04', contrast: 128, fx: { charBloom: { enabled: true, intensity: 65 }, scanlinesPro: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 45 } } },
  },
  {
    id: 'dual-ascii-pro', name: 'Color Dual ASCII', desc: 'Dual-tone shaded character cells with deep luminous contrast',
    patch: { mode: 'ascii-colored-bg', cellSize: 'medium', saturation: 150, contrast: 120, fx: { charBloom: { enabled: true, intensity: 35 }, bloom: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'pcb-schematic', name: 'PCB Circuit Board', desc: 'Soldermask green PCB board with copper traces and solder pads',
    patch: { mode: 'circuit', cellSize: 'medium', colorMode: 'color', contrast: 135, edgeEmphasis: 40, fx: { vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'ink-etching', name: 'Ink Crosshatch', desc: 'Intaglio copperplate etching crosshatch engraving',
    patch: { mode: 'crosshatch', cellSize: 'medium', colorMode: 'mono', fg: '#1a1815', bg: '#f6f3eb', contrast: 135, fx: { filmGrain: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'wireframe-vector', name: '3D Wireframe', desc: 'Glowing neon isometric terrain wireframe relief',
    patch: { mode: 'wireframe', cellSize: 'medium', saturation: 150, contrast: 125, fx: { bloom: { enabled: true, intensity: 45 }, chromatic: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'voronoi-mosaic', name: 'Voronoi Glass', desc: 'Stained cellular mosaic tiles with leaded borders',
    patch: { mode: 'voronoi', cellSize: 'medium', saturation: 140, contrast: 115, fx: { bloom: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'cyber-datamosh', name: 'Cyber Datamosh', desc: 'Corrupt video glitch slice displacement with neon chromatic fringing',
    patch: { mode: 'glitch-cyber', cellSize: 'medium', contrast: 120, fx: { glitch: { enabled: true, intensity: 65 }, rgbSplit: { enabled: true, intensity: 50 }, scanLines: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'matrix-digital-cascade', name: 'The Matrix Rain', desc: 'Falling digital code streams with glowing green phosphor heads',
    patch: { mode: 'matrix-rain', cellSize: 'small', colorMode: 'color', contrast: 125, saturation: 160, fx: { charBloom: { enabled: true, intensity: 75 }, scanlinesPro: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 50 } } },
  },
  {
    id: 'ascii-flow-contour', name: 'Contour Flow Stream', desc: 'Curving vector ASCII lines following image lighting contours',
    patch: { mode: 'ascii-flow', cellSize: 'medium', saturation: 140, contrast: 120, fx: { bloom: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 25 } } },
  },
  {
    id: 'blueprint-schematic', name: 'Technical Box Schematic', desc: 'Crisp architectural blueprint with Unicode box drawing joints',
    patch: { mode: 'ascii-box', cellSize: 'medium', colorMode: 'mono', fg: '#00f0ff', bg: '#031424', contrast: 130, edgeEmphasis: 45, fx: { charBloom: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'thermal-receipt-retro', name: 'Thermal Receipt Print', desc: 'Vintage 9-pin dot impact paper printout with ink ribbon texture',
    patch: { mode: 'dot-matrix', cellSize: 'small', colorMode: 'mono', fg: '#2b262d', bg: '#fbf8ee', contrast: 140, fx: { filmGrain: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'blade-runner-2049', name: 'Blade Runner 2049', desc: 'Anamorphic amber haze with 35mm optical character bleed',
    patch: { mode: 'ascii-cinematic', cellSize: 'medium', colorMode: 'color', saturation: 165, contrast: 125, fx: { bloom: { enabled: true, intensity: 45 }, charBloom: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 50 }, filmGrain: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'ironbow-tactical', name: 'Ironbow Tactical FLIR', desc: 'True military infrared thermal signature from cold indigo to incandescent yellow',
    patch: { mode: 'ironbow-flir', cellSize: 'medium', contrast: 135, saturation: 180, edgeEmphasis: 35, fx: { bloom: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 40 } } },
  },
  {
    id: 'cad-blueprint-master', name: 'CAD Architecture Draft', desc: 'High-precision engineering blueprint with cyan CAD drafting lines',
    patch: { mode: 'ascii-blueprint-cad', cellSize: 'medium', colorMode: 'mono', fg: '#38dbff', bg: '#061527', contrast: 130, edgeEmphasis: 50, fx: { charBloom: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 30 } } },
  },
  {
    id: 'dense-braille-retina', name: 'Retina Braille Matrix', desc: 'High-density 8-dot Unicode braille canvas with crisp sub-pixel detail',
    patch: { mode: 'braille-dense', cellSize: 'small', colorMode: 'color', contrast: 130, saturation: 140, fx: { bloom: { enabled: true, intensity: 20 }, vignette: { enabled: true, intensity: 25 } } },
  },
  {
    id: 'vintage-p39-amber', name: 'Amber Terminal P39', desc: 'Curved glass 1978 amber phosphor terminal with scanlines and cathode glow',
    patch: { mode: 'ascii-terminal-crt', cellSize: 'medium', colorMode: 'mono', fg: '#ffaa00', bg: '#100a02', contrast: 135, fx: { charBloom: { enabled: true, intensity: 70 }, scanLines: { enabled: true, intensity: 45 }, crtCurve: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 55 } } },
  },
  {
    id: 'outrun-80s-horizon', name: 'Synthwave Outrun', desc: 'Neon pink and cyan wireframe horizon with chromatic aberration',
    patch: { mode: 'ascii-synthwave-mesh', cellSize: 'medium', contrast: 125, saturation: 175, fx: { bloom: { enabled: true, intensity: 50 }, chromatic: { enabled: true, intensity: 40 }, vignette: { enabled: true, intensity: 45 } } },
  },
  {
    id: 'datamosh-glitch-rip', name: 'Datamosh Slice Tear', desc: 'MPEG macroblock slice shearing with digital sync tear',
    patch: { mode: 'ascii-glitch-datamosh', cellSize: 'medium', contrast: 125, fx: { glitch: { enabled: true, intensity: 75 }, rgbSplit: { enabled: true, intensity: 60 }, scanlinesPro: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'c64-petscii-1982', name: 'Commodore 64 PETSCII', desc: 'Authentic 1982 home computer character graphics on 16-color palette',
    patch: { mode: 'ascii-c64-petscii', cellSize: 'medium', contrast: 120, ditherPalette: 'c64', fx: { scanLines: { enabled: true, intensity: 30 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'terrain-elevation-3d', name: '3D Topo Elevation', desc: 'Isometric topological height relief ASCII with sunlit shadows',
    patch: { mode: 'ascii-terrain-3d', cellSize: 'medium', colorMode: 'color', contrast: 130, edgeEmphasis: 45, fx: { bloom: { enabled: true, intensity: 25 }, vignette: { enabled: true, intensity: 35 } } },
  },
  {
    id: 'renaissance-engraving', name: 'Dürer Woodcut Engraving', desc: 'Hand-carved ink woodcut with high tonal contrast and parchment background',
    patch: { mode: 'ascii-woodcut', cellSize: 'medium', colorMode: 'mono', fg: '#12100e', bg: '#f3ece0', contrast: 145, edgeEmphasis: 55, fx: { filmGrain: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 40 } } },
  },
  {
    id: 'deep-space-cryo', name: 'Cryogenic Hubble', desc: 'Deep cosmic cryo infrared false color with starfield dispersion',
    patch: { mode: 'ascii-thermal-ice', cellSize: 'medium', contrast: 130, saturation: 160, fx: { bloom: { enabled: true, intensity: 45 }, charBloom: { enabled: true, intensity: 35 }, vignette: { enabled: true, intensity: 50 } } },
  },
  {
    id: 'wall-street-ticker', name: 'Wall Street Ticker', desc: 'Bright amber LED financial stock ticker with amber diode glow',
    patch: { mode: 'ascii-led-ticker', cellSize: 'small', colorMode: 'mono', fg: '#ffc107', bg: '#080808', contrast: 135, fx: { charBloom: { enabled: true, intensity: 60 }, vignette: { enabled: true, intensity: 40 } } },
  },
]
