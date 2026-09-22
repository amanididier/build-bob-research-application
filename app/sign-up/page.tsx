import Link from 'next/link'
import { AuthForm } from '@/components/auth-form'

export default function SignUpPage() {
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">Bob Research System</p><h1>Build your research memory</h1><p className="auth-copy">Create a private workspace for every question, source, and insight.</p><AuthForm mode="sign-up" /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>
}
