import Link from 'next/link'
import { Suspense } from 'react'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return (
    <main className="bob-login-page">
      <div className="bob-login-bg" aria-hidden="true" />
      <div className="bob-login-scrim" aria-hidden="true" />

      <section className="bob-login-card" aria-labelledby="signup-title">
        <div className="bob-login-brand">
          <span className="bob-login-mark">B</span>
          <span className="bob-login-product">Bob</span>
        </div>
        <h1 id="signup-title">Create your account</h1>
        <p className="bob-login-lede">A calm place for questions, sources, and notes.</p>
        <Suspense fallback={<p className="bob-login-lede">Loading…</p>}>
          <AuthForm mode="sign-up" />
        </Suspense>
        <p className="bob-login-switch">
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
