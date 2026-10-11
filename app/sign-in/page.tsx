import { Suspense } from 'react'
import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Bob Research System</p>
        <h1>Welcome back</h1>
        <p className="auth-copy">Sign in with Google, or with a 6-digit email code. No password.</p>
        <Suspense fallback={<p className="auth-copy">Loading…</p>}>
          <AuthForm mode="sign-in" />
        </Suspense>
        <p className="auth-switch">New to Bob? <Link href="/sign-up">Create an account</Link></p>
        <p className="auth-switch"><Link href="/">Download for Windows</Link></p>
      </section>
    </main>
  )
}
