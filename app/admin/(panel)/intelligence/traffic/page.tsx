'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Source = { source: string; sessions: number }

export default function KenyaTrafficPage() {
  const [rows, setRows] = useState<Source[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/admin/analytics/traffic-sources?range=30d')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.message || 'Could not load traffic sources')
        setRows((body.data || []) as Source[])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load traffic sources'))
  }, [])

  return (
    <div className="kenya-intel">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Customer Intelligence</span>
          <h1>Traffic sources</h1>
          <p className="admin-header-note">How visitors arrived, from referrer and campaign path. Last 30 days.</p>
        </div>
        <Link className="button button-outline button-compact" href="/admin/intelligence">Kenya map</Link>
      </header>
      {error ? <p className="admin-message">{error}</p> : null}
      <div className="admin-card">
        <ul className="kenya-list">
          {rows.map((row) => (
            <li key={row.source}>
              <span>{row.source}</span>
              <b>{row.sessions.toLocaleString('en-KE')}</b>
            </li>
          ))}
          {!rows.length ? <li><span>No traffic sources recorded yet.</span></li> : null}
        </ul>
      </div>
    </div>
  )
}
