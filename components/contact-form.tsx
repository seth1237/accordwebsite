'use client'

import { useState } from 'react'
import { COMPANY } from '@/lib/utils'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    setMessage('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          location: data.get('location'),
          message: data.get('message'),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not send message')
      setStatus('sent')
      setMessage('Message received. We will get back to you shortly.')
      form.reset()
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Could not send message')
    }
  }

  return (
    <form className="quote-form" onSubmit={onSubmit}>
      <div className="quote-form-head">
        <h2>Send a message</h2>
        <p>Tell us what your facility needs and we will follow up.</p>
      </div>
      <label>Name<input name="name" required placeholder="Your name" /></label>
      <label>Facility / location<input name="location" placeholder="Hospital or town" /></label>
      <label>Phone<input name="phone" required placeholder="+254 7.." /></label>
      <label>Email<input name="email" type="email" required placeholder="you@hospital.co.ke" /></label>
      <label>Message<textarea name="message" required rows={5} placeholder={`How can ${COMPANY.shortName} help?`} /></label>
      <button className="button button-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {message && <p className={status === 'error' ? 'form-error' : 'form-success'}>{message}</p>}
    </form>
  )
}
