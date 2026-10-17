import Link from 'next/link'

export default function ProjectPage() {
  return (
    <main className="bob-login-page">
      <div className="bob-login-bg" aria-hidden />
      <div className="bob-login-scrim" aria-hidden />
      <section className="bob-login-card">
        <h1>Research workspace</h1>
        <p className="bob-login-lede">
          Full project views live in the Bob desktop app. Sign in on the web, or download Bob for the complete workspace.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <Link href="/sign-in" className="bob-login-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Sign in
          </Link>
          <a
            href="https://github.com/amanididier/build-bob-research-application/releases/latest/download/Bob-Research-Companion-Setup.exe"
            className="bob-login-google"
            style={{ textAlign: 'center', textDecoration: 'none' }}
          >
            Download for Windows
          </a>
          <Link href="/" className="bob-login-switch" style={{ textAlign: 'center' }}>
            ← Back home
          </Link>
        </div>
      </section>
    </main>
  )
}
