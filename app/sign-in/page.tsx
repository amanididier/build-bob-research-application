import Link from 'next/link'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return (
    <main className="bob-login-page">
      <div className="bob-login-bg" aria-hidden="true">
        {/* sunflower garden */}
      </div>
      <div className="bob-login-scrim" aria-hidden="true" />

      <section className="bob-login-card" aria-labelledby="login-title">
        <div className="bob-login-brand">
          <span className="bob-login-mark">B</span>
          <span className="bob-login-product">Bob</span>
        </div>
        <h1 id="login-title">Welcome back</h1>
        <p className="bob-login-lede">Sign in to continue your research workspace.</p>
        <Suspense fallback={<p className="bob-login-lede">Loading…</p>}>
          <AuthForm mode="sign-in" />
        </Suspense>
        <p className="bob-login-switch">
          New to Bob? <Link href="/sign-up">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
