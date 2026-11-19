// Generator for crisp 1200x630 og-image.png for ASCII Studio.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: #040406;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 70px;
  }
  
  /* Background grid and glows */
  .grid-bg {
    position: absolute;
    inset: 0;
    background-image: 
      radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.15), transparent 50%),
      radial-gradient(ellipse at 20% 80%, rgba(56, 189, 248, 0.18), transparent 50%),
      radial-gradient(ellipse at 60% 60%, rgba(168, 85, 247, 0.12), transparent 55%),
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 100% 100%, 100% 100%, 100% 100%, 32px 32px, 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    height: 100%;
    flex-direction: column;
    justify-content: space-between;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-logo {
    font-family: "JetBrains Mono", monospace;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #4ade80;
    text-shadow: 0 0 20px rgba(74, 222, 128, 0.6);
  }

  .brand-name {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
  }

  .badge-tag {
    background: rgba(34, 197, 94, 0.12);
    border: 1px solid rgba(74, 222, 128, 0.35);
    color: #4ade80;
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .main-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 50px;
    margin: 20px 0;
  }

  .title-group {
    flex: 1.2;
  }

  .headline {
    font-size: 54px;
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -1.5px;
    color: #ffffff;
    margin-bottom: 18px;
  }

  .headline-gradient {
    background: linear-gradient(135deg, #4ade80 0%, #38bdf8 50%, #c084fc 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;
  }

  .subhead {
    font-size: 20px;
    line-height: 1.45;
    color: #94a3b8;
    margin-bottom: 24px;
    font-weight: 400;
  }

  .feature-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .chip {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .chip-highlight {
    background: rgba(56, 189, 248, 0.12);
    border-color: rgba(56, 189, 248, 0.3);
    color: #38bdf8;
  }

  .art-preview {
    flex: 0.9;
    background: #090a0f;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.15);
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
    overflow: hidden;
  }

  .art-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: #64748b;
  }

  .art-dots {
    display: flex;
    gap: 5px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .dot-r { background: #ef4444; }
  .dot-y { background: #eab308; }
  .dot-g { background: #22c55e; }

  .art-body {
    font-family: "JetBrains Mono", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.15;
    letter-spacing: 0px;
    white-space: pre;
    color: #4ade80;
    text-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
    height: 220px;
    overflow: hidden;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 18px;
    font-size: 14px;
    color: #64748b;
  }

  .domain {
    font-family: "JetBrains Mono", monospace;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }

  .footer-features {
    display: flex;
    gap: 20px;
  }

  .footer-features span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #cbd5e1;
    font-weight: 500;
  }

  .dot-sep {
    color: #334155;
  }
</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="content">
    <div class="header">
      <div class="brand">
        <span class="brand-logo">▓▒░</span>
        <span class="brand-name">ASCII STUDIO</span>
      </div>
      <span class="badge-tag">v3.0 · WebGL &amp; 3D Lights</span>
    </div>

    <div class="main-section">
      <div class="title-group">
        <h1 class="headline">
          Free Image &amp; Video to<br />
          <span class="headline-gradient">ASCII &amp; Retro Art</span>
        </h1>
        <p class="subhead">
          Convert photos, videos &amp; webcams into ASCII, Braille, ANSI terminal graphics, and 3D normal-mapped text art. 100% free, private &amp; in-browser.
        </p>
        <div class="feature-chips">
          <span class="chip chip-highlight">⚡ 105+ Visual Styles</span>
          <span class="chip chip-highlight">💡 3D Multi-Light Studio</span>
          <span class="chip">⠎ Braille Unicode</span>
          <span class="chip">♫ Audio Reactive</span>
          <span class="chip">🖨 ANSI &amp; 4K Vector</span>
          <span class="chip">🔒 100% Private Local</span>
        </div>
      </div>

      <div class="art-preview">
        <div class="art-header">
          <div class="art-dots">
            <span class="dot dot-r"></span>
            <span class="dot dot-y"></span>
            <span class="dot dot-g"></span>
          </div>
          <span>terminal-preview · 180×72</span>
        </div>
        <div class="art-body">
<span style="color:#38bdf8">    .::--==+*#%@@@@@@@@@@@@@@%#*+==--::.    </span>
<span style="color:#38bdf8">  .-+*#%@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#*+-.  </span>
<span style="color:#4ade80"> :*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*: </span>
<span style="color:#4ade80">-%@@@@@@@@@@%#*+==-::::-==+*#%@@@@@@@@@@@@%-</span>
<span style="color:#4ade80">#@@@@@@@@#=:                    :=#@@@@@@@@#</span>
<span style="color:#a7f3d0">@@@@@@@*:    .+#%@@@@@@@@%#+.    :*@@@@@@@%</span>
<span style="color:#a7f3d0">@@@@@@+    =%@@@@@@@@@@@@@@@@%=    +@@@@@@%</span>
<span style="color:#fde047">@@@@@+   :%@@@@@@@@@@@@@@@@@@@@%:   +@@@@@%</span>
<span style="color:#fde047">@@@@@:   #@@@@@@@@@@@@@@@@@@@@@@#   :@@@@@%</span>
<span style="color:#fb923c">@@@@@+   :%@@@@@@@@@@@@@@@@@@@@%:   +@@@@@%</span>
<span style="color:#fb923c">@@@@@@+    =%@@@@@@@@@@@@@@@@%=    +@@@@@@%</span>
<span style="color:#f43f5e">@@@@@@@*:    .+#%@@@@@@@@%#+.    :*@@@@@@@%</span>
<span style="color:#f43f5e">#@@@@@@@@#=:                    :=#@@@@@@@@#</span>
<span style="color:#ec4899">-%@@@@@@@@@@%#*+==-::::-==+*#%@@@@@@@@@@@@%-</span>
<span style="color:#ec4899"> :*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*: </span>
<span style="color:#c084fc">  .-+*#%@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#*+-.  </span>
<span style="color:#c084fc">    .::--==+*#%@@@@@@@@@@@@@@%#*+==--::.    </span>
        </div>
      </div>
    </div>

    <div class="footer">
      <span class="domain">ascii-studio-jade.vercel.app</span>
      <div class="footer-features">
        <span>✓ No Signup</span>
        <span class="dot-sep">·</span>
        <span>✓ No Watermark</span>
        <span class="dot-sep">·</span>
        <span>✓ No Image Uploads</span>
        <span class="dot-sep">·</span>
        <span>✓ Free Forever</span>
      </div>
    </div>
  </div>
</body>
</html>`

async function run() {
  console.log('Generating crisp 1200x630 og-image.png...')
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const buffer = await page.screenshot({ type: 'png' })
  writeFileSync('public/og-image.png', buffer)
  await browser.close()
  console.log('Successfully written public/og-image.png (size: ' + buffer.length + ' bytes)')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
