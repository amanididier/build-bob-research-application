import Link from 'next/link'

const windowsDownloadUrl = 'https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe'

export default function Page() {
  return (
    <main className="download-page">
      <header className="download-nav">
        <Link className="download-brand" href="/">
          <span className="download-mark">B</span>
          <span>Bob</span>
        </Link>
        <Link className="download-signin" href="/sign-in">Sign in</Link>
      </header>

      <section className="download-hero" aria-labelledby="download-title">
        <div className="download-orb" aria-hidden="true"><span /></div>
        <p className="download-kicker">Your research, together</p>
        <h1 id="download-title">Think clearly.<br /><em>Remember everything.</em></h1>
        <p className="download-lede">Bob brings your browser, notes, and AI conversations into one calm research workspace.</p>
        <a className="download-button" href={windowsDownloadUrl} download>
          <span className="windows-glyph" aria-hidden="true">⊞</span>
          <span><strong>Download for Windows</strong><small>Free to use · Windows 10 or later</small></span>
          <span className="download-arrow" aria-hidden="true">↓</span>
        </a>
        <p className="download-note">No account needed to download. Sign in after installation to sync your workspace.</p>
      </section>

      <section className="download-features" aria-label="Bob features">
        <article><span className="feature-icon">⌁</span><h2>Stay in the flow</h2><p>Capture ideas without leaving the pages you are reading.</p></article>
        <article><span className="feature-icon">✦</span><h2>Make connections</h2><p>See your sources, highlights, and questions in one place.</p></article>
        <article><span className="feature-icon">◌</span><h2>Keep your memory</h2><p>Return to meaningful research whenever you need it.</p></article>
      </section>

      <footer className="download-footer"><span>Bob Research System</span><span>Private by design · Free to start</span></footer>
    </main>
  )
}
