// Interactive MCP (Model Context Protocol) Server Setup Guide & Developer Modal.
// One-click configurations for Claude Desktop, Cursor, Antigravity, and Zed,
// complete with tool schemas, resources, and live prompt examples.
// Written by Saad Khalid (@saadkhalidhere) for ASCII Studio.

import { useState } from 'react'
import { copyTextToClipboard } from '../engine/exporters'

interface McpModalProps {
  open: boolean
  onClose: () => void
  onToast: (msg: string) => void
}

type ClientTab = 'remote' | 'claude' | 'cursor' | 'antigravity' | 'zed' | 'tools'

const REMOTE_URL_CONFIG = `{
  "mcpServers": {
    "asciipro": {
      "url": "https://asciipro.vercel.app/api/mcp"
    }
  }
}`

const CLAUDE_CONFIG = `{
  "mcpServers": {
    "asciipro": {
      "command": "npx",
      "args": ["-y", "asciipro", "mcp"]
    }
  }
}`

const CURSOR_CONFIG = `{
  "mcpServers": {
    "asciipro": {
      "url": "https://asciipro.vercel.app/api/mcp"
    }
  }
}`

const ANTIGRAVITY_CONFIG = `{
  "mcpServers": {
    "asciipro": {
      "command": "npx",
      "args": ["-y", "asciipro", "mcp"]
    }
  }
}`

const ZED_CONFIG = `{
  "context_servers": {
    "asciipro": {
      "command": {
        "path": "npx",
        "args": ["-y", "asciipro", "mcp"]
      }
    }
  }
}`

export default function McpModal({ open, onClose, onToast }: McpModalProps) {
  const [activeTab, setActiveTab] = useState<ClientTab>('remote')

  if (!open) return null

  const handleCopy = async (text: string, label: string) => {
    await copyTextToClipboard(text)
    onToast(`Copied ${label} configuration to clipboard!`)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="mcp-title">
      <div className="modal-content mcp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="mcp-title" className="mcp-title">🤖 Model Context Protocol (MCP) Server</h2>
            <p className="mcp-sub">
              Empower your AI assistants (Claude, Cursor, Antigravity, Zed) to autonomously generate ASCII art, Figlet typography banners, search 750+ animations, render scientific visualizers, and composite real-world mockups.
            </p>
          </div>
          <button type="button" className="btn icon-btn" onClick={onClose} aria-label="Close MCP modal">
            ✕
          </button>
        </div>

        {/* Client Selector Tabs */}
        <div className="mcp-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'remote'}
            className={`mcp-tab ${activeTab === 'remote' ? 'active' : ''}`}
            onClick={() => setActiveTab('remote')}
          >
            🌐 Remote URL (Zero Install)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'claude'}
            className={`mcp-tab ${activeTab === 'claude' ? 'active' : ''}`}
            onClick={() => setActiveTab('claude')}
          >
            Claude Desktop
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cursor'}
            className={`mcp-tab ${activeTab === 'cursor' ? 'active' : ''}`}
            onClick={() => setActiveTab('cursor')}
          >
            Cursor Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'antigravity'}
            className={`mcp-tab ${activeTab === 'antigravity' ? 'active' : ''}`}
            onClick={() => setActiveTab('antigravity')}
          >
            Antigravity / Gemini
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zed'}
            className={`mcp-tab ${activeTab === 'zed' ? 'active' : ''}`}
            onClick={() => setActiveTab('zed')}
          >
            Zed Editor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tools'}
            className={`mcp-tab ${activeTab === 'tools' ? 'active' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            Tools Reference (7)
          </button>
        </div>

        {/* Tab Body */}
        <div className="mcp-body">
          {activeTab === 'remote' && (
            <div className="mcp-pane">
              <h3>🌐 Remote MCP Server (Zero Installation Required)</h3>
              <p>
                Connect instantly without installing Node.js or local CLI processes. Connect Cursor, Claude Code, or Claude Desktop directly to ASCII Studio’s live hosted endpoint:
              </p>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy('https://asciipro.vercel.app/api/mcp', 'Remote MCP URL')}
                >
                  📋 Copy URL
                </button>
                <pre>https://asciipro.vercel.app/api/mcp</pre>
              </div>

              <h4 style={{ marginTop: 16 }}>Claude Code CLI 1-Line Setup:</h4>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy('claude mcp add asciipro https://asciipro.vercel.app/api/mcp', 'Claude Code command')}
                >
                  📋 Copy Command
                </button>
                <pre>$ claude mcp add asciipro https://asciipro.vercel.app/api/mcp</pre>
              </div>

              <h4 style={{ marginTop: 16 }}>Cursor AI Settings JSON:</h4>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy(REMOTE_URL_CONFIG, 'Remote JSON config')}
                >
                  📋 Copy JSON
                </button>
                <pre>{REMOTE_URL_CONFIG}</pre>
              </div>
            </div>
          )}

          {activeTab === 'claude' && (
            <div className="mcp-pane">
              <h3>Claude Desktop Configuration</h3>
              <p>
                Add the following JSON snippet to your <code>claude_desktop_config.json</code>:
              </p>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy(CLAUDE_CONFIG, 'Claude Desktop')}
                >
                  📋 Copy JSON
                </button>
                <pre>{CLAUDE_CONFIG}</pre>
              </div>
              <div className="mcp-path-hint">
                <b>Config Path:</b><br />
                • macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code><br />
                • Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code>
              </div>
            </div>
          )}

          {activeTab === 'cursor' && (
            <div className="mcp-pane">
              <h3>Cursor AI Editor Configuration</h3>
              <p>
                Paste this into your workspace <code>.cursor/mcp.json</code> or global MCP settings:
              </p>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy(CURSOR_CONFIG, 'Cursor')}
                >
                  📋 Copy JSON
                </button>
                <pre>{CURSOR_CONFIG}</pre>
              </div>
              <div className="mcp-path-hint">
                <b>Config Path:</b> <code>.cursor/mcp.json</code> in your project root or Cursor Settings &gt; Features &gt; MCP.
              </div>
            </div>
          )}

          {activeTab === 'antigravity' && (
            <div className="mcp-pane">
              <h3>Antigravity / Gemini CLI Configuration</h3>
              <p>
                Add to your agent or assistant <code>mcp_config.json</code>:
              </p>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy(ANTIGRAVITY_CONFIG, 'Antigravity')}
                >
                  📋 Copy JSON
                </button>
                <pre>{ANTIGRAVITY_CONFIG}</pre>
              </div>
              <div className="mcp-path-hint">
                <b>Verification command:</b> <code>npx asciipro mcp</code> (spawns stdio JSON-RPC loop).
              </div>
            </div>
          )}

          {activeTab === 'zed' && (
            <div className="mcp-pane">
              <h3>Zed Editor Configuration</h3>
              <p>
                Add this to your <code>~/.config/zed/settings.json</code>:
              </p>
              <div className="mcp-code-block">
                <button
                  type="button"
                  className="btn small mcp-copy-btn"
                  onClick={() => handleCopy(ZED_CONFIG, 'Zed')}
                >
                  📋 Copy JSON
                </button>
                <pre>{ZED_CONFIG}</pre>
              </div>
              <div className="mcp-path-hint">
                <b>Zed Documentation:</b> Settings &gt; Open Settings JSON &gt; <code>context_servers</code>.
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="mcp-pane">
              <h3>Integrated MCP Tools &amp; Resources (7 Tools)</h3>
              <div className="mcp-tools-list">
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>convert_image_to_ascii</code>
                  <p>Convert image URLs, paths, or base64 to ASCII/Braille/ANSI/HTML/SVG with 105+ styles.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>generate_ascii_banner</code>
                  <p>Render Figlet typography banners with custom fonts, borders, and shadows.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>search_animated_library</code>
                  <p>Search and filter the 750+ animated ASCII art collection by keywords and tags.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>get_animation_frames</code>
                  <p>Retrieve frame sequences, ANSI color scripts, or bash curl playback scripts.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>export_developer_code</code>
                  <p>Generate standalone React (<code>&lt;AsciiArt /&gt;</code>), Web Component, Python 3, or C++ code.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>render_math_visualizer</code>
                  <p>Generate Mandelbrot, Julia, Lorenz chaos attractor, or 3D surface ASCII art.</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-tool-badge">TOOL</span>
                  <code>render_mockup_visualizer</code>
                  <p>Composite ASCII art into 12 real-world mockups (Phone lockscreen, Museum frame, 12" Vinyl, CRT, etc.).</p>
                </div>
                <div className="mcp-tool-item">
                  <span className="mcp-resource-badge">RESOURCE</span>
                  <code>ascii://styles</code> · <code>ascii://recipes</code> · <code>ascii://library/{'{slug}'}</code>
                  <p>Dynamic JSON resources exposing catalog metadata, curated recipes, and animation piece inspection.</p>
                </div>
              </div>
            </div>
          )}

          {/* Prompt Examples Bar */}
          <div className="mcp-prompts-section">
            <h4>💡 Natural Language Prompts to try in Claude or Cursor:</h4>
            <div className="mcp-prompt-cards">
              <div
                className="mcp-prompt-card"
                onClick={() => handleCopy('Convert this logo image into Braille ASCII art with 70 columns', 'Prompt')}
                title="Click to copy prompt"
              >
                &ldquo;Convert this logo image into Braille ASCII art with 70 columns&rdquo;
              </div>
              <div
                className="mcp-prompt-card"
                onClick={() => handleCopy('Generate a Figlet banner for "ASCII STUDIO" with a cyber border', 'Prompt')}
                title="Click to copy prompt"
              >
                &ldquo;Generate a Figlet banner for &quot;ASCII STUDIO&quot; with a cyber border&rdquo;
              </div>
              <div
                className="mcp-prompt-card"
                onClick={() => handleCopy('Render a Mandelbrot fractal in ASCII with 80 columns and ANSI color', 'Prompt')}
                title="Click to copy prompt"
              >
                &ldquo;Render a Mandelbrot fractal in ASCII with 80 columns and ANSI color&rdquo;
              </div>
              <div
                className="mcp-prompt-card"
                onClick={() => handleCopy('Composite this ASCII banner inside the Phone Wallpaper mockup', 'Prompt')}
                title="Click to copy prompt"
              >
                &ldquo;Composite this ASCII banner inside the Phone Wallpaper mockup&rdquo;
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href="https://github.com/enabled404/ascii-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="author-pill"
            style={{ textDecoration: 'none' }}
            title="Star and inspect MCP server code on GitHub"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            View MCP Server on GitHub
          </a>
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
