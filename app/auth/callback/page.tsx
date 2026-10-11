import { Suspense } from 'react'
import { AuthCallbackClient } from './ui'

export default function AuthCallbackPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Bob Research System</p>
        <h1>Signing you in</h1>
        <Suspense fallback={<p className="auth-copy">Finishing sign-in…</p>}>
          <AuthCallbackClient />
        </Suspense>
      </section>
    </main>
  )
}
