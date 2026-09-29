'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function DashboardInner() {
  const searchParams = useSearchParams()
  const [token, setToken] = useState(searchParams.get('token') || '')
  const [status, setStatus] = useState('')
  const [company, setCompany] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  async function load(value: string) {
    if (!value.trim()) return
    setMessage('')
    const response = await fetch(`/api/manufacturers/status?token=${encodeURIComponent(value.trim())}`)
    const payload = await response.json()
    if (!response.ok) {
      setStatus('')
      setCompany('')
      setNote('')
      setMessage(payload.message || 'Application not found')
      return
    }
    setCompany(payload.data.companyName)
    setStatus(payload.data.status)
    setNote(payload.data.adminNote || '')
  }

  useEffect(() => {
    if (token) void load(token)
  }, [])

  return (
    <>
      <form
        className="quote-form manufacturer-form"
        onSubmit={(event) => {
          event.preventDefault()
          void load(token)
        }}
      >
        <label>Reference token
          <input value={token} onChange={(event) => setToken(event.target.value)} required />
        </label>
        <button className="button button-primary">Check status</button>
      </form>
      {message && <p className="form-error">{message}</p>}
      {status && (
        <article className="post-card">
          <div className="post-meta">
            <span>{status}</span>
            <span>{company}</span>
          </div>
          <h3>{status === 'approved' ? 'Approved' : status === 'rejected' ? 'Not approved' : 'Under review'}</h3>
          <p>{note || 'Our team will follow up when a decision is ready.'}</p>
        </article>
      )}
    </>
  )
}

export function ManufacturerDashboard() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  )
}
