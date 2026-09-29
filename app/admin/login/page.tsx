'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    })
    const payload = await response.json()
    setSending(false)
    if (!response.ok) {
      setError(payload.message || 'Could not sign in')
      return
    }
    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <Logo />
        <h1>Admin sign in</h1>
        <label>Username or email<input name="email" type="text" required autoComplete="username" defaultValue="" placeholder="accordm_makori" /></label>
        <label>Password<input name="password" type="password" required autoComplete="current-password" /></label>
        {error && <p className="form-error">{error}</p>}
        <button className="button button-primary" disabled={sending}>{sending ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}
