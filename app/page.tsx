import Link from 'next/link'

const windowsDownloadUrl =
  'https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe'

export default function Page() {
  return (
    <main className="bob-login-page download-landing">
      <div className="bob-login-bg" aria-hidden="true" />
      <div className="bob-login-scrim" aria-hidden="true" />

      <header className="download-nav-float">
        <Link className="download-brand-float" href="/">
          <span className="bob-login-mark">B</span>
          <span>Bob</span>
        </Link>
        <Link className="download-signin-float" href="/sign-in">
          Sign in
        </Link>
      </header>

      <section className="bob-login-card download-hero-card" aria-labelledby="download-title">
        <p className="bob-login-lede" style={{ marginBottom: 8 }}>Your research, together</p>
        <h1 id="download-title">Think clearly.<br /><em>Remember everything.</em></h1>
        <p className="bob-login-lede">
          Bob brings your browser, notes, and AI conversations into one calm research workspace.
        </p>
        <a className="bob-login-primary" href={windowsDownloadUrl} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', marginTop: 8 }}>
          Download for Windows
        </a>
        <p className="bob-login-desktop-hint" style={{ marginTop: 12 }}>
          Latest release · Windows 10 or later · Free to use
        </p>
        <p className="bob-login-switch">
          Already installed? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
