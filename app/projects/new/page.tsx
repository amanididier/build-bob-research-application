'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/app/actions/research'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); await createProject(name); router.push('/'); router.refresh() }
  return <main className="auth-shell"><section className="auth-card"><p className="eyebrow">New research project</p><h1>Name the question.</h1><p className="auth-copy">A clear name gives Bob a useful frame for your sources and conversations.</p><form className="auth-form" onSubmit={submit}><label>Project name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. The future of local AI" required /></label><div className="form-actions"><button className="quiet-button" type="button" onClick={() => router.back()}>Cancel</button><button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create project'}</button></div></form></section></main>
}
