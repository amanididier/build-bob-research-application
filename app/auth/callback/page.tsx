import { Suspense } from 'react'
import { AuthCallbackClient } from './ui'

export default function AuthCallbackPage() {
  return (
    <main className="bob-login-page">
      <div className="bob-login-bg" aria-hidden="true" />
      <div className="bob-login-scrim" aria-hidden="true" />
      <section className="bob-login-card">
        <div className="bob-login-brand">
          <span className="bob-login-mark">B</span>
          <span className="bob-login-product">Bob</span>
        </div>
        <h1>Signing you in</h1>
        <Suspense fallback={<p className="bob-login-lede">Finishing sign-in…</p>}>
          <AuthCallbackClient />
        </Suspense>
      </section>
    </main>
  )
}
