'use client'

import { useState } from 'react'
import Link from 'next/link'

type BrochureUploadSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  public_id: string
  overwrite: string
  filename_override: string
  signature: string
}

type ApiResponse<T> = {
  success?: boolean
  message?: string
  data?: T
}

export function ManufacturerApplyForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const brochureInput = form.elements.namedItem('brochure')
    const brochure = brochureInput instanceof HTMLInputElement ? brochureInput.files?.[0] : undefined
    setStatus('sending')
    setMessage('')
    try {
      const application = new FormData(form)
      application.delete('brochure')

      if (brochure) {
        const isPdf = brochure.type === 'application/pdf' || brochure.name.toLowerCase().endsWith('.pdf')
        if (!isPdf) throw new Error('Upload a PDF brochure')
        if (brochure.size > 20 * 1024 * 1024) throw new Error('Upload a brochure under 20MB')

        const signatureResponse = await fetch('/api/manufacturers/brochure-upload-signature', { method: 'POST' })
        const signaturePayload = await signatureResponse.json() as ApiResponse<BrochureUploadSignature>
        if (!signatureResponse.ok || signaturePayload.success !== true || !signaturePayload.data) {
          throw new Error(signaturePayload.message || 'Could not prepare brochure upload')
        }

        const upload = signaturePayload.data
        const uploadForm = new FormData()
        uploadForm.append('file', brochure)
        uploadForm.append('api_key', upload.apiKey)
        uploadForm.append('timestamp', String(upload.timestamp))
        uploadForm.append('folder', upload.folder)
        uploadForm.append('public_id', upload.public_id)
        uploadForm.append('overwrite', upload.overwrite)
        uploadForm.append('filename_override', upload.filename_override)
        uploadForm.append('signature', upload.signature)

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(upload.cloudName)}/raw/upload`, {
          method: 'POST',
          body: uploadForm,
        })
        const uploadPayload = await uploadResponse.json() as {
          public_id?: string
          error?: { message?: string }
        }
        if (!uploadResponse.ok || !uploadPayload.public_id) {
          throw new Error(uploadPayload.error?.message || 'Could not upload brochure')
        }
        application.set('brochurePublicId', uploadPayload.public_id)
      }

      const response = await fetch('/api/manufacturers/apply', { method: 'POST', body: application })
      const payload = await response.json() as ApiResponse<{ token?: string }>
      if (!response.ok || payload.success !== true) throw new Error(payload.message || 'Could not submit')
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
      <label>Products of interest<textarea name="productsOfInterest" rows={4} placeholder="Lines, brands, or product names you want listed" /></label>
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
