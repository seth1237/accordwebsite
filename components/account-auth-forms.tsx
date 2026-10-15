'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/routes'

export function AccountRegisterForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/account/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        facilityName: form.get('facilityName'),
        phone: form.get('phone'),
        location: form.get('location'),
      }),
    })
    const payload = await response.json().catch(() => ({}))
    setSending(false)
    if (!response.ok) {
      setError(payload.message || 'Could not create account')
      return
    }
    router.push(ROUTES.account)
    router.refresh()
  }

  return (
    <form className="quote-form compact" onSubmit={onSubmit}>
      <div className="quote-form-head">
        <h2>Create an account</h2>
        <p>Use your facility phone number to sign in later and track orders.</p>
      </div>
      <label>Name<input name="name" required autoComplete="name" placeholder="Your name" /></label>
      <label>Facility name<input name="facilityName" required placeholder="Hospital or clinic" /></label>
      <label>Phone number<input name="phone" required autoComplete="tel" inputMode="tel" placeholder="07.." /></label>
      <label>Location<input name="location" required placeholder="Town or county" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-primary" disabled={sending}>{sending ? 'Creating account…' : 'Create account'}</button>
      <p className="form-switch">Already have an account? <Link href={ROUTES.accountLogin}>Sign in</Link></p>
    </form>
  )
}

export function AccountLoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/account/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.get('phone') }),
    })
    const payload = await response.json().catch(() => ({}))
    setSending(false)
    if (!response.ok) {
      setError(payload.message || 'Could not sign in')
      return
    }
    router.push(ROUTES.account)
    router.refresh()
  }

  return (
    <form className="quote-form compact" onSubmit={onSubmit}>
      <div className="quote-form-head">
        <h2>Sign in</h2>
        <p>Enter the phone number you used to create the account.</p>
      </div>
      <label>Phone number<input name="phone" required autoComplete="tel" inputMode="tel" placeholder="07.." /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-primary" disabled={sending}>{sending ? 'Signing in…' : 'Sign in'}</button>
      <p className="form-switch">New here? <Link href={ROUTES.accountRegister}>Create an account</Link></p>
    </form>
  )
}
