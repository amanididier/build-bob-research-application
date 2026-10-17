import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Bob — your AI research friend',
  description:
    'Download Bob, the AI research companion that remembers your goals and thinks deeply with you. Free for early users.',
}

const WINDOWS_DOWNLOAD =
  'https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe'
const EXTENSION_ZIP = '/bob-chrome-extension.zip'
const LOGO = '/bob-logo.png'
const GARDEN = '/sunflower-login.png'

const features = [
  {
    title: 'Remembers you',
    text: 'Bob keeps your goals, tone and past research, so every session picks up where you left off.',
    color: '#f5c842',
    colorText: '#5c3d0a',
    glyph: '✦',
  },
  {
    title: 'Deep research',
    text: 'Connects your sources and reasons over them for clear, cited answers.',
    color: '#3b7ddd',
    colorText: '#fff',
    glyph: '⌕',
  },
  {
    title: 'Lives in your browser',
    text: 'The Chrome extension sends tabs and highlights straight to Bob.',
    color: '#58cc02',
    colorText: '#fff',
    glyph: '⬚',
  },
]

const perks = [
  'Windows desktop app with auto-updates',
  'Chrome extension for tabs & highlights',
  'Sign in once — sync notes, projects, roadmap',
  'Gemini-powered research when you add your key',
]

export default function Page() {
  return (
    <div className="garden-site">
      <header className="garden-header">
        <div className="garden-header-inner">
          <Link href="/" className="garden-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Bob" />
            <span>Bob</span>
          </Link>
          <nav className="garden-nav">
            <a href="#download" className="hide-sm">
              Download
            </a>
            <Link href="/sign-in">Log in</Link>
            <Link href="/sign-up" className="primary">
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <section className="garden-hero">
        <div className="garden-hero-bob">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Bob" className="garden-bob-float" />
          <div className="garden-speech">
            Hi there!
            <br />
            <span style={{ fontWeight: 500, opacity: 0.9 }}>I&apos;m Bob.</span>
          </div>
        </div>
        <h1>
          Your friendly <span className="bow">AI research</span>{' '}
          <span className="underline">
            <span className="z">companion.</span>
            <span className="hl" aria-hidden />
          </span>
        </h1>
        <p className="lede">
          Save sources, keep your goals in memory and get deep, thoughtful answers — all in one cheerful place.
        </p>
        <div className="garden-cta">
          <a className="garden-btn garden-btn-green" href={WINDOWS_DOWNLOAD}>
            ↓ Download for free
          </a>
          <Link className="garden-btn garden-btn-white" href="/sign-up">
            Try on the web →
          </Link>
        </div>
        <p className="garden-note">Windows · Chrome extension · Web · v1.1.0+</p>
      </section>

      <section className="garden-section">
        <div className="garden-features">
          {features.map((f) => (
            <div key={f.title} className="garden-feature">
              <div
                className="garden-feature-icon"
                style={{ background: f.color, color: f.colorText }}
              >
                {f.glyph}
              </div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="garden-section">
        <div className="garden-band">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={GARDEN} alt="Sunflower garden under a blue sky" />
          <div className="garden-band-scrim" />
          <div className="garden-band-copy">
            <h2>A home that feels like sunshine.</h2>
            <p>Bob greets you in a calm sunflower garden, ready to dig in.</p>
          </div>
        </div>
      </section>

      <section id="download" className="garden-section">
        <div className="garden-download">
          <div>
            <p className="eyebrow">Early access</p>
            <h2>Get Bob on your machine</h2>
            <p className="body">
              The full desktop app with research, notes, tasks, roadmap, and the Chrome overlay — same features we
              shipped in v1.1.0.
            </p>
            <ul className="garden-perks">
              {perks.map((t) => (
                <li key={t}>
                  <span className="check">✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="garden-download-actions">
              <a className="garden-btn garden-btn-sun" href={WINDOWS_DOWNLOAD}>
                ↓ Download for Windows
              </a>
              <a className="garden-btn garden-btn-bow" href={EXTENSION_ZIP} download="bob-chrome-extension.zip">
                ◎ Chrome extension
              </a>
            </div>
            <p className="garden-note">Installer: Bob-Research-Companion-Setup.exe · Latest GitHub release</p>
          </div>
          <div className="garden-download-side">
            <div className="glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" className="garden-bob-float" />
          </div>
        </div>
      </section>

      <footer className="garden-footer">
        <div className="garden-footer-inner">
          <div className="garden-brand" style={{ fontWeight: 500, fontSize: 14, color: '#888' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />
            © 2026 Bob Research Companion
          </div>
          <div className="garden-footer-links">
            <Link href="/sign-in">Log in</Link>
            <Link href="/sign-up">Sign up</Link>
            <a href="https://github.com/amanididier/build-bob-research-application" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
