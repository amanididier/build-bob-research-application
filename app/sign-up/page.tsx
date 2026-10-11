import { Suspense } from 'react'
import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Bob Research System</p>
        <h1>Create your account</h1>
        <p className="auth-copy">Google is instant. Email sends a 6-digit code, then you are signed in.</p>
        <Suspense fallback={<p className="auth-copy">Loading…</p>}>
          <AuthForm mode="sign-up" />
        </Suspense>
        <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
        <p className="auth-switch"><Link href="/">Download for Windows</Link></p>
      </section>
    </main>
  )
}
