'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ManufacturerSubmission } from '@/lib/content'

function formatWhen(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function Detail({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'is-wide' : undefined}>
      <dt>{label}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

function matchesSearch(item: ManufacturerSubmission, query: string) {
  if (!query) return true
  return [
    item.companyName,
    item.contactName,
    item.email,
    item.phone,
    item.website,
    item.productsOfInterest,
    item.notes,
    item.status,
    item.token,
  ].join(' ').toLowerCase().includes(query)
}

export function AdminManufacturersPanel({ items }: { items: ManufacturerSubmission[] }) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [note, setNote] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter((item) => matchesSearch(item, query))
  }, [items, search])

  const selected = filtered.find((item) => item._id === selectedId) || items.find((item) => item._id === selectedId) || null

  async function setStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    const data = new FormData()
    data.set('id', id)
    data.set('status', status)
    data.set('adminNote', note[id] || '')
    const response = await fetch('/api/admin/manufacturers', { method: 'PATCH', body: data })
    const payload = await response.json()
    if (!response.ok) {
      setMessage(payload.message || 'Could not update')
      return
    }
    setMessage(`Marked ${status}.`)
    router.refresh()
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Tarumed content manager</span>
          <h1>Manufacturers</h1>
        </div>
        <input
          className="filter-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search manufacturers or products"
          aria-label="Search manufacturers or products"
        />
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Submissions</h3>
            <span>Click a manufacturer to open the full application.</span>
          </div>
        </div>
        {items.length === 0 && <p className="text-muted-foreground">No submissions yet.</p>}
        {items.length > 0 && filtered.length === 0 && <p className="text-muted-foreground">No manufacturers match that search.</p>}
        {filtered.length > 0 && (
          <div className="admin-mfr-table">
            <div className="admin-mfr-head">
              <span>Manufacturer</span>
              <span>Products supplied</span>
              <span>Status</span>
            </div>
            {filtered.map((item) => (
              <button
                key={item._id}
                type="button"
                className={`admin-mfr-row${selectedId === item._id ? ' is-open' : ''}`}
                onClick={() => setSelectedId((current) => current === item._id ? null : item._id)}
              >
                <b>{item.companyName}</b>
                <span className="admin-mfr-products">{item.productsOfInterest || 'No products listed'}</span>
                <span className="admin-mfr-status">{item.status}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <article className="admin-card admin-editor">
          <div className="card-title">
            <div>
              <h3>{selected.companyName}</h3>
              <span>{selected.contactName} · {selected.status}</span>
            </div>
            <button type="button" className="button button-outline button-compact" onClick={() => setSelectedId(null)}>Close</button>
          </div>
          <dl className="admin-submission-grid">
            <Detail label="Company">{selected.companyName}</Detail>
            <Detail label="Contact">{selected.contactName}</Detail>
            <Detail label="Email">
              {selected.email ? <a className="text-link" href={`mailto:${selected.email}`}>{selected.email}</a> : '—'}
            </Detail>
            <Detail label="Phone">
              {selected.phone ? <a className="text-link" href={`tel:${selected.phone}`}>{selected.phone}</a> : '—'}
            </Detail>
            <Detail label="Website">
              {selected.website ? <a className="text-link" href={selected.website} target="_blank" rel="noopener noreferrer">{selected.website}</a> : '—'}
            </Detail>
            <Detail label="Status">{selected.status}</Detail>
            <Detail label="Submitted">{formatWhen(selected.createdAt)}</Detail>
            <Detail label="Reference token"><code>{selected.token || '—'}</code></Detail>
            <Detail label="Products supplied" wide>{selected.productsOfInterest || '—'}</Detail>
            <Detail label="Notes" wide>{selected.notes || '—'}</Detail>
            <Detail label="Brochure" wide>
              {selected.brochure?.secureUrl ? (
                <a className="text-link" href={selected.brochure.secureUrl} target="_blank" rel="noopener noreferrer">Download brochure PDF</a>
              ) : '—'}
            </Detail>
          </dl>
          <label>Admin note
            <textarea rows={2} value={note[selected._id] ?? selected.adminNote} onChange={(event) => setNote((current) => ({ ...current, [selected._id]: event.target.value }))} />
          </label>
          <div className="admin-job-actions">
            <button type="button" className="button button-primary button-compact" onClick={() => setStatus(selected._id, 'approved')}>Approve</button>
            <button type="button" className="button button-outline button-compact" onClick={() => setStatus(selected._id, 'rejected')}>Reject</button>
          </div>
        </article>
      )}
    </>
  )
}
