// Legal, Security, and Privacy Disclaimers Modal for ASCII Studio.
// Details 100% client-side privacy, user commercial ownership, fair use warranty,
// ephemeral hardware permissions, and complete limitation of liability.

import { useEffect, useRef } from 'react'

export interface DisclaimersModalProps {
  open: boolean
  onClose: () => void
  targetSection?: string | null
}

export default function DisclaimersModal({ open, onClose, targetSection }: DisclaimersModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || !targetSection) return
    const timer = setTimeout(() => {
      const el = document.getElementById(targetSection)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('target-highlight')
        const unhighlight = setTimeout(() => {
          el.classList.remove('target-highlight')
        }, 2200)
        return () => clearTimeout(unhighlight)
      }
    }, 120)
    return () => clearTimeout(timer)
  }, [open, targetSection])

  const handleClose = () => {
    if (['#disclaimers', '#legal', '#privacy', '#ownership', '#permissions', '#liability'].includes(window.location.hash)) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="disclaimers-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimers-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="modal-inner">
        <header className="disclaimers-header">
          <div className="disclaimers-header-text">
            <span className="disclaimer-badge security">Certified Safe &amp; Private</span>
            <h3 id="disclaimers-title">Legal, Security &amp; Privacy Disclaimers</h3>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn icon-btn disclaimers-close-btn"
            onClick={handleClose}
            aria-label="Close legal and privacy disclaimers modal"
          >
            ✕
          </button>
        </header>

        <div className="disclaimers-body">
          {/* Section 1: Client-Side Architecture */}
          <section id="disclaimer-zero-storage" className="disclaimer-card" aria-labelledby="heading-zero-storage">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge privacy">100% Client-Side</span>
              <h4 id="heading-zero-storage">Zero Remote Storage &amp; Complete Privacy</h4>
            </div>
            <p>
              ASCII Studio operates <strong>100% locally in your web browser</strong> using HTML5 Canvas 2D, WebGL shaders,
              the Web Audio API, and client-side WebAssembly.
            </p>
            <ul>
              <li><strong>Zero Uploads:</strong> No images, video clips, webcam frames, audio tracks, or exported art are ever uploaded to any remote server, database, or CDN.</li>
              <li><strong>Zero Remote Logging:</strong> All bitmap sampling, character mapping, color conversions, and filter computations occur strictly within your device&rsquo;s volatile memory (RAM).</li>
              <li><strong>Offline Capable:</strong> The application functions completely offline without an active internet connection once loaded.</li>
            </ul>
          </section>

          {/* Section 2: User Ownership & Copyright */}
          <section id="disclaimer-ownership" className="disclaimer-card" aria-labelledby="heading-ownership">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge rights">100% User Ownership</span>
              <h4 id="heading-ownership">User Ownership &amp; Commercial Copyright</h4>
            </div>
            <p>
              <strong>You retain 100% intellectual property ownership</strong> over all ASCII art, ANSI terminal graphics, animations,
              video files, and source code generated using this platform.
            </p>
            <ul>
              <li><strong>No Royalties or Claims:</strong> ASCII Studio, its creator Saad Khalid, and all contributors claim zero ownership, zero licensing rights, and zero royalties over your creations.</li>
              <li><strong>Commercial Exploitation:</strong> You are completely free to sell, publish, print, distribute, mint, or embed the generated outputs in commercial applications, video games, books, apparel, or promotional media.</li>
              <li><strong>No Mandatory Attribution:</strong> While attribution is appreciated, you are not legally required to credit ASCII Studio in your final artwork.</li>
            </ul>
          </section>

          {/* Section 3: Fair Use & Third-Party Content */}
          <section id="disclaimer-fairuse" className="disclaimer-card" aria-labelledby="heading-fairuse">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge legal">User Warranty</span>
              <h4 id="heading-fairuse">Fair Use &amp; Third-Party Content Representation</h4>
            </div>
            <p>
              Users are solely responsible for ensuring they possess all necessary copyrights, intellectual property rights, licenses,
              or lawful fair use justifications for any third-party images, video files, or audio recordings imported into ASCII Studio.
            </p>
            <p>
              Because ASCII Studio does not store or monitor imported files, the application and its developer assume zero liability
              for copyright infringement, trademark violation, or unauthorized media processing conducted by end users on their local devices.
            </p>
          </section>

          {/* Section 4: Limitation of Liability */}
          <section id="disclaimer-liability" className="disclaimer-card" aria-labelledby="heading-liability">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge legal">Warranty Shield</span>
              <h4 id="heading-liability">Limitation of Liability &amp; &ldquo;As-Is&rdquo; Warranty</h4>
            </div>
            <p className="legal-block">
              THE SOFTWARE AND ALL ASSOCIATED SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTY
              OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p>
              IN NO EVENT SHALL THE CREATOR (SAAD KHALID), MAINTAINERS, OR HOSTING PROVIDERS BE LIABLE FOR ANY CLAIM, DAMAGES, LOSS OF DATA,
              HARDWARE STRAIN, LOSS OF REVENUE, OR OTHER DIRECT, INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM, OUT OF,
              OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </section>

          {/* Section 5: Ephemeral Device Permissions */}
          <section id="disclaimer-permissions" className="disclaimer-card" aria-labelledby="heading-permissions">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge privacy">Device Safety</span>
              <h4 id="heading-permissions">Ephemeral Hardware Permissions (Camera &amp; Microphone)</h4>
            </div>
            <p>
              When you grant browser access to your webcam or microphone:
            </p>
            <ul>
              <li><strong>Live Stream Only:</strong> Hardware streams are consumed exclusively for real-time visual frame sampling and Web Audio FFT frequency band analysis within your active browser tab.</li>
              <li><strong>Zero Recording or Transmission:</strong> Audio waveforms and camera frames are never saved to persistent storage, never written to disk, and never transmitted over WebSockets or HTTP requests.</li>
              <li><strong>Instant Teardown:</strong> Media tracks are immediately released and destroyed when the camera mirror or audio modulation toggle is deactivated or the browser tab is closed.</li>
            </ul>
          </section>

          {/* Section 6: Author Attribution & Security Contact */}
          <section id="disclaimer-author" className="disclaimer-card" aria-labelledby="heading-author-contact">
            <div className="disclaimer-card-header">
              <span className="disclaimer-badge security">Verified Author</span>
              <h4 id="heading-author-contact">Engineering &amp; Security Disclosure</h4>
            </div>
            <p>
              ASCII Studio is engineered and architected by <strong>Saad Khalid</strong> (known online as <strong>@saadkhalidhere</strong> / <strong>enabled404</strong>),
              a Software Engineer &amp; Creative Technologist.
            </p>
            <div className="disclaimers-author-links">
              <a
                href="https://github.com/enabled404"
                target="_blank"
                rel="noopener noreferrer"
                className="author-pill-link"
              >
                <span>GitHub:</span> @enabled404
              </a>
              <a
                href="https://x.com/saadkhalidhere"
                target="_blank"
                rel="noopener noreferrer"
                className="author-pill-link"
              >
                <span>X / Twitter:</span> @saadkhalidhere
              </a>
              <a
                href="https://saadkhalidhere.gumroad.com/l/tipjar"
                target="_blank"
                rel="noopener noreferrer"
                className="author-pill-link"
                aria-label="Support Saad Khalid on Gumroad"
              >
                <span>Tip Jar:</span> ☕ Support My Work
              </a>
              <a
                href="https://github.com/enabled404/ascii-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="author-pill-link"
              >
                <span>Open Source Repo:</span> ascii-studio
              </a>
            </div>
          </section>
        </div>

        <footer className="disclaimers-footer">
          <span className="disclaimers-footer-note">
            Standard fool-proof safety · 100% local processing · Zero data collection
          </span>
          <button type="button" className="btn primary" onClick={handleClose}>
            Understood &amp; Accept
          </button>
        </footer>
      </div>
    </div>
  )
}
