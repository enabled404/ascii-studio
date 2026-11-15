// Built-in sample images, drawn procedurally on canvas so the studio works
// instantly with no network assets. Original artwork code for ASCII Studio.

export interface Sample {
  id: string
  name: string
  make: () => HTMLCanvasElement
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  return [c, ctx]
}

function sunset(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(640, 420)
  const sky = ctx.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, '#1a1033')
  sky.addColorStop(0.45, '#7b2d8b')
  sky.addColorStop(0.7, '#e85d3d')
  sky.addColorStop(1, '#f7b733')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 640, 420)
  // sun
  const sun = ctx.createRadialGradient(320, 250, 10, 320, 250, 90)
  sun.addColorStop(0, '#fff7cc')
  sun.addColorStop(0.4, '#ffd76a')
  sun.addColorStop(1, 'rgba(255,150,60,0)')
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(320, 250, 90, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe9a8'
  ctx.beginPath()
  ctx.arc(320, 250, 42, 0, Math.PI * 2)
  ctx.fill()
  // mountains
  ctx.fillStyle = '#2a1745'
  ctx.beginPath()
  ctx.moveTo(0, 300)
  ctx.lineTo(120, 180)
  ctx.lineTo(240, 300)
  ctx.lineTo(360, 210)
  ctx.lineTo(480, 300)
  ctx.lineTo(560, 230)
  ctx.lineTo(640, 300)
  ctx.lineTo(640, 420)
  ctx.lineTo(0, 420)
  ctx.closePath()
  ctx.fill()
  // water
  ctx.fillStyle = '#3a1c5e'
  ctx.fillRect(0, 300, 640, 120)
  ctx.fillStyle = 'rgba(255,200,100,0.55)'
  for (let i = 0; i < 26; i++) {
    const y = 312 + i * 4
    const w = 60 + Math.sin(i * 1.7) * 40 + i * 2
    ctx.fillRect(320 - w / 2, y, w, 2)
  }
  // birds
  ctx.strokeStyle = '#1a1033'
  ctx.lineWidth = 2
  for (const [bx, by] of [[140, 110], [180, 90], [470, 130], [510, 100]] as const) {
    ctx.beginPath()
    ctx.moveTo(bx - 8, by)
    ctx.quadraticCurveTo(bx - 3, by - 6, bx, by)
    ctx.quadraticCurveTo(bx + 3, by - 6, bx + 8, by)
    ctx.stroke()
  }
  return c
}

function bloom(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(640, 420)
  const bg = ctx.createLinearGradient(0, 0, 640, 420)
  bg.addColorStop(0, '#0d2818')
  bg.addColorStop(1, '#05130c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 640, 420)
  const cx = 320
  const cy = 200
  const petals = 12
  for (let i = 0; i < petals; i++) {
    const ang = (i / petals) * Math.PI * 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(ang)
    const grad = ctx.createLinearGradient(0, 0, 0, -150)
    grad.addColorStop(0, i % 2 === 0 ? '#ff5e8a' : '#ff8fb0')
    grad.addColorStop(1, '#c2185b')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(0, -95, 42, 95, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const center = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, 55)
  center.addColorStop(0, '#fff3b0')
  center.addColorStop(0.6, '#ffb703')
  center.addColorStop(1, '#fb8500')
  ctx.fillStyle = center
  ctx.beginPath()
  ctx.arc(cx, cy, 52, 0, Math.PI * 2)
  ctx.fill()
  // stem + leaves
  ctx.strokeStyle = '#2d9d4e'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(cx, cy + 52)
  ctx.quadraticCurveTo(cx - 20, 320, cx + 10, 420)
  ctx.stroke()
  ctx.fillStyle = '#2d9d4e'
  ctx.beginPath()
  ctx.ellipse(250, 340, 60, 22, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(400, 360, 60, 22, 0.5, 0, Math.PI * 2)
  ctx.fill()
  // fireflies
  ctx.fillStyle = 'rgba(255,255,180,0.9)'
  const spots: [number, number][] = [[90, 90], [540, 80], [580, 200], [70, 220], [500, 330], [130, 340]]
  for (const [x, y] of spots) {
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

function city(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(640, 420)
  const sky = ctx.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, '#050914')
  sky.addColorStop(0.6, '#0e1a3a')
  sky.addColorStop(1, '#274b7a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 640, 420)
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  const stars: [number, number][] = [[40, 40], [120, 70], [220, 30], [300, 80], [420, 45], [520, 90], [590, 40], [180, 120], [350, 130], [470, 150]]
  for (const [x, y] of stars) ctx.fillRect(x, y, 2, 2)
  // moon
  ctx.fillStyle = '#f4f1de'
  ctx.beginPath()
  ctx.arc(520, 80, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d9d4b8'
  ctx.beginPath()
  ctx.arc(510, 72, 8, 0, Math.PI * 2)
  ctx.arc(530, 90, 6, 0, Math.PI * 2)
  ctx.fill()
  // buildings
  const buildings: [number, number, number][] = [
    [0, 220, 90], [70, 150, 110], [150, 250, 80], [210, 120, 130],
    [310, 260, 70], [360, 170, 120], [450, 230, 90], [520, 140, 120],
  ]
  for (const [x, w, h] of buildings) {
    const g = ctx.createLinearGradient(x, 420 - h, x, 420)
    g.addColorStop(0, '#131c33')
    g.addColorStop(1, '#05070f')
    ctx.fillStyle = g
    ctx.fillRect(x, 420 - h, w, h)
    // windows
    for (let wy = 420 - h + 14; wy < 400; wy += 22) {
      for (let wx = x + 10; wx < x + w - 12; wx += 18) {
        if ((wx * 7 + wy * 13) % 5 < 2) {
          ctx.fillStyle = (wx + wy) % 3 === 0 ? '#ffd166' : '#8ecae6'
          ctx.fillRect(wx, wy, 8, 10)
        }
      }
    }
  }
  // street
  ctx.fillStyle = '#0a0d16'
  ctx.fillRect(0, 400, 640, 20)
  ctx.fillStyle = '#ffd166'
  for (let x = 10; x < 640; x += 46) ctx.fillRect(x, 408, 24, 3)
  return c
}

function tropical(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(960, 640)
  // lush dark teal-to-indigo backdrop
  const bg = ctx.createLinearGradient(0, 0, 960, 640)
  bg.addColorStop(0, '#07333d')
  bg.addColorStop(0.5, '#0a2547')
  bg.addColorStop(1, '#1c1040')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 960, 640)
  // warm out-of-focus bokeh lights
  const bokeh: [number, number, number, string][] = [
    [90, 80, 46, '255,190,80'], [860, 70, 60, '255,120,160'], [820, 560, 52, '255,210,100'],
    [60, 540, 40, '120,220,180'], [470, 40, 34, '255,150,90'], [700, 330, 26, '255,255,255'],
    [180, 300, 22, '255,110,140'], [930, 300, 30, '90,200,255'], [330, 600, 36, '255,170,60'],
    [560, 590, 24, '255,120,180'],
  ]
  for (const [x, y, r, col] of bokeh) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(${col},0.55)`)
    g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  // leaves
  const leaf = (x: number, y: number, rot: number, len: number, wid: number, col: string) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.ellipse(0, 0, wid / 2, len / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  leaf(120, 500, 0.7, 260, 110, '#0b6e4f')
  leaf(830, 480, -0.6, 240, 100, '#0a5c40')
  leaf(480, 620, 0.1, 220, 90, '#2d9d4e')
  leaf(60, 180, 1.1, 200, 90, '#0b6e4f')
  leaf(920, 160, -1.0, 210, 95, '#12805a')
  // one big flower: gradient petals, bright centre, red-tipped stamens
  const flower = (
    cx: number, cy: number, R: number,
    petalCols: [string, string], centerCols: [string, string], petals = 6,
  ) => {
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + 0.3
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(ang)
      const g = ctx.createLinearGradient(0, -R * 0.25, 0, -R)
      g.addColorStop(0, petalCols[0])
      g.addColorStop(1, petalCols[1])
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(0, -R * 0.62, R * 0.42, R * 0.62, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -R * 0.2)
      ctx.lineTo(0, -R * 0.95)
      ctx.stroke()
      ctx.restore()
    }
    const cg = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.1, 2, cx, cy, R * 0.34)
    cg.addColorStop(0, centerCols[0])
    cg.addColorStop(1, centerCols[1])
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff3b0'
    ctx.lineWidth = 3
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const x1 = cx + Math.cos(a) * R * 0.3
      const y1 = cy + Math.sin(a) * R * 0.3
      const x2 = cx + Math.cos(a) * R * 0.52
      const y2 = cy + Math.sin(a) * R * 0.52
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      ctx.fillStyle = '#ff5e3a'
      ctx.beginPath()
      ctx.arc(x2, y2, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  flower(700, 250, 185, ['#ff7ab8', '#d81b74'], ['#ffe66d', '#fb8500'])
  flower(230, 220, 150, ['#ffb26b', '#ff5e3a'], ['#fff3b0', '#ff9e00'])
  flower(430, 480, 130, ['#ffe66d', '#f77f00'], ['#fff8d6', '#e85d04'])
  return c
}

function auroraPeaks(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(640, 420)
  const sky = ctx.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, '#020617')
  sky.addColorStop(0.5, '#0a2e3f')
  sky.addColorStop(1, '#134e5e')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 640, 420)
  // aurora ribbons
  const ribbons: [string, number, number][] = [
    ['rgba(0,255,170,0.55)', 60, 0.9], ['rgba(120,220,255,0.45)', 110, 1.2], ['rgba(180,120,255,0.4)', 160, 0.7],
  ]
  for (const [col, y0, amp] of ribbons) {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(0, y0)
    for (let x = 0; x <= 640; x += 16) {
      ctx.lineTo(x, y0 + Math.sin(x * 0.012 + amp) * 26 * amp)
    }
    for (let x = 640; x >= 0; x -= 16) {
      ctx.lineTo(x, y0 + 46 + Math.sin(x * 0.012 + amp) * 26 * amp)
    }
    ctx.closePath()
    ctx.fill()
  }
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % 640
    const y = (i * 53) % 180
    ctx.fillRect(x, y, 1.6, 1.6)
  }
  // mountains
  ctx.fillStyle = '#0b1e2e'
  ctx.beginPath()
  ctx.moveTo(0, 320)
  ctx.lineTo(110, 190)
  ctx.lineTo(210, 320)
  ctx.lineTo(330, 170)
  ctx.lineTo(450, 320)
  ctx.lineTo(540, 230)
  ctx.lineTo(640, 320)
  ctx.lineTo(640, 420)
  ctx.lineTo(0, 420)
  ctx.closePath()
  ctx.fill()
  // snow caps
  ctx.fillStyle = 'rgba(240,248,255,0.9)'
  for (const [px, py] of [[110, 190], [330, 170]] as const) {
    ctx.beginPath()
    ctx.moveTo(px - 26, py + 34)
    ctx.lineTo(px, py)
    ctx.lineTo(px + 26, py + 34)
    ctx.lineTo(px + 12, py + 26)
    ctx.lineTo(px, py + 36)
    ctx.lineTo(px - 12, py + 26)
    ctx.closePath()
    ctx.fill()
  }
  // lake reflection
  const lake = ctx.createLinearGradient(0, 320, 0, 420)
  lake.addColorStop(0, '#0e3a4d')
  lake.addColorStop(1, '#04121f')
  ctx.fillStyle = lake
  ctx.fillRect(0, 320, 640, 100)
  ctx.fillStyle = 'rgba(0,255,170,0.25)'
  for (let i = 0; i < 18; i++) {
    const y = 330 + i * 5
    ctx.fillRect(280 - i * 3, y, 90 + i * 6, 2)
  }
  return c
}

function neonGrid(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(640, 420)
  const sky = ctx.createLinearGradient(0, 0, 0, 420)
  sky.addColorStop(0, '#12002b')
  sky.addColorStop(0.55, '#3b0a6e')
  sky.addColorStop(0.8, '#ff2a6d')
  sky.addColorStop(1, '#ff9e00')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 640, 420)
  // sun with slats
  const sun = ctx.createLinearGradient(0, 120, 0, 260)
  sun.addColorStop(0, '#ffe66d')
  sun.addColorStop(1, '#ff2a6d')
  ctx.fillStyle = sun
  ctx.beginPath()
  ctx.arc(320, 210, 78, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#12002b'
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(232, 200 + i * 13, 176, 3 + i * 1.5)
  }
  // stars
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  for (let i = 0; i < 40; i++) {
    ctx.fillRect((i * 151) % 640, (i * 71) % 110, 2, 2)
  }
  // grid floor
  ctx.strokeStyle = 'rgba(0,255,200,0.75)'
  ctx.lineWidth = 1.5
  const horizon = 260
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(320 + i * 14, horizon)
    ctx.lineTo(320 + i * 130, 420)
    ctx.stroke()
  }
  for (let i = 0; i < 7; i++) {
    const y = horizon + Math.pow(i / 6, 2) * 160
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(640, y)
    ctx.stroke()
  }
  // mountains silhouette
  ctx.fillStyle = '#0d0121'
  ctx.beginPath()
  ctx.moveTo(0, 260)
  ctx.lineTo(90, 190)
  ctx.lineTo(180, 260)
  ctx.lineTo(470, 260)
  ctx.lineTo(560, 180)
  ctx.lineTo(640, 260)
  ctx.closePath()
  ctx.fill()
  return c
}

export const SAMPLES: Sample[] = [
  { id: 'tropical', name: 'Tropical Bloom', make: tropical },
  { id: 'sunset', name: 'Sunset Peaks', make: sunset },
  { id: 'bloom', name: 'Night Bloom', make: bloom },
  { id: 'city', name: 'City Lights', make: city },
  { id: 'aurora', name: 'Aurora Peaks', make: auroraPeaks },
  { id: 'neongrid', name: 'Neon Grid', make: neonGrid },
]
