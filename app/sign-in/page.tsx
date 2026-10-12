import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignInPage() {
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">Bob Research System</p><h1>Welcome back</h1><p className="auth-copy">Open your research memory and continue where you left off.</p><AuthForm mode="sign-in" /><p className="auth-switch">New to Bob? <Link href="/sign-up">Create an account</Link></p></section></main>
}
