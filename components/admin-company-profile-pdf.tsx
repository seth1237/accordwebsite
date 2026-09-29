'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminCompanyProfilePdf({ pageCount }: { pageCount: number }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const file = form.querySelector<HTMLInputElement>('input[name="file"]')?.files?.[0]
    if (!file) {
      setMessage('Choose a PDF company profile')
      return
    }
    if (pageCount > 0 && !window.confirm('This replaces the current flip-book with each page of the PDF. Continue?')) {
      return
    }
    const data = new FormData()
    data.set('file', file)
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/admin/company-profile/pdf', { method: 'POST', body: data })
    const payload = await response.json().catch(() => ({ message: 'Could not convert that PDF' }))
    setSaving(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not convert that PDF')
      return
    }
    form.reset()
    setMessage(`Converted ${payload.count || 0} PDF pages into the flip-book.`)
    router.refresh()
  }

  return (
    <form className="admin-card" onSubmit={onSubmit}>
      <div className="card-title">
        <div>
          <h3>Upload profile PDF</h3>
          <span>Each page of the PDF becomes a page in the About flip-book. Files up to 45MB are accepted.</span>
        </div>
      </div>
      <label>Company profile PDF
        <input name="file" type="file" accept="application/pdf,.pdf" required />
      </label>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-job-actions">
        <button className="button button-primary" disabled={saving}>
          {saving ? 'Converting PDF…' : 'Convert to flip-book'}
        </button>
      </div>
    </form>
  )
}
