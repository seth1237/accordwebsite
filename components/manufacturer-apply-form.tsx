'use client'

import { useState } from 'react'
import Link from 'next/link'

export function ManufacturerApplyForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus('sending')
    setMessage('')
    try {
      const response = await fetch('/api/manufacturers/apply', { method: 'POST', body: new FormData(form) })
      const payload = await response.json()
      if (!response.ok || payload.success === false) throw new Error(payload.message || 'Could not submit')
      setStatus('sent')
      setToken(payload.data?.token || '')
      setMessage('Application received. Save your reference token to check status later.')
      form.reset()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Could not submit')
    }
  }

  return (
    <form className="quote-form manufacturer-form" onSubmit={onSubmit}>
      <label>Company name<input name="companyName" required /></label>
      <label>Contact name<input name="contactName" required /></label>
      <label>Email<input name="email" type="email" required /></label>
      <label>Phone<input name="phone" /></label>
      <label>Website<input name="website" type="url" placeholder="https://" /></label>
      <label>Products of interest<textarea name="productsOfInterest" rows={4} placeholder="Lines, brands, or SKUs you want listed" /></label>
      <label>Notes<textarea name="notes" rows={4} /></label>
      <label>Brochure (PDF)<input name="brochure" type="file" accept="application/pdf,.pdf" /></label>
      <button className="button button-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Submitting…' : 'Submit application'}
      </button>
      {message && <p className={status === 'error' ? 'form-error' : 'form-success'}>{message}</p>}
      {token && (
        <p className="hero-lede">
          Reference token: <strong>{token}</strong>
          {' · '}
          <Link href={`/manufacturer/dashboard?token=${encodeURIComponent(token)}`} className="text-link">Open dashboard</Link>
        </p>
      )}
    </form>
  )
}
