'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JobApplication } from '@/lib/jobs'

function formatWhen(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminJobApplications({ applications }: { applications: JobApplication[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'new' | 'reviewed'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const visible = useMemo(() => {
    return applications.filter((item) => (filter === 'all' ? true : item.status === filter))
  }, [applications, filter])
  const newCount = applications.filter((item) => item.status === 'new').length

  async function setStatus(id: string, status: 'new' | 'reviewed') {
    setBusyId(id)
    setMessage('')
    const response = await fetch(`/api/admin/job-applications/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not update application')
      return
    }
    setMessage(status === 'reviewed' ? 'Marked as reviewed.' : 'Moved back to new.')
    router.refresh()
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}’s application and CV?`)) return
    setBusyId(id)
    setMessage('')
    const response = await fetch(`/api/admin/job-applications/${encodeURIComponent(id)}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not delete application')
      return
    }
    setOpenId(null)
    setMessage('Application deleted.')
    router.refresh()
  }

  return (
    <div className="admin-card">
      <div className="card-title">
        <div>
          <h3>Open applications</h3>
          <span>CVs sent from the careers page. Review, download, or delete.</span>
        </div>
        <small className="page-status">{newCount} new</small>
      </div>
      <div className="admin-header-tools" style={{ marginBottom: 14 }}>
        <select
          className="filter-input category-select"
          value={filter}
          onChange={(event) => setFilter(event.target.value as 'all' | 'new' | 'reviewed')}
          aria-label="Filter applications"
        >
          <option value="all">All applications</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}
      <div className="admin-product-list">
        {visible.map((item) => {
          const open = openId === item._id
          return (
            <article key={item._id} className={`admin-product-block${item.status === 'new' ? '' : ' is-hidden'}`}>
              <button type="button" className="admin-product" onClick={() => setOpenId(open ? null : item._id)}>
                <span className="admin-job-placeholder" />
                <div>
                  <b>
                    {item.fullName}
                    {item.status === 'new' ? <em className="admin-status-badge">New</em> : <em className="admin-status-badge">Reviewed</em>}
                  </b>
                  <small>{item.department} · {item.workingTerms} · {formatWhen(item.createdAt)}</small>
                </div>
              </button>
              {open ? (
                <div className="admin-editor">
                  <p className="admin-application-meta">
                    <a href={`mailto:${item.email}`}>{item.email}</a>
                    {item.phone ? ` · ${item.phone}` : ''}
                  </p>
                  {item.notes ? <p className="admin-application-notes">{item.notes}</p> : <p className="text-muted-foreground">No note included.</p>}
                  <div className="admin-job-actions">
                    {item.cvFileId ? (
                      <a className="button button-outline button-compact" href={`/api/admin/job-applications/${item._id}/cv`}>
                        Download CV{item.cvFilename ? ` · ${item.cvFilename}` : ''}
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="button button-outline button-compact"
                      disabled={busyId === item._id}
                      onClick={() => void setStatus(item._id, item.status === 'reviewed' ? 'new' : 'reviewed')}
                    >
                      {item.status === 'reviewed' ? 'Mark as new' : 'Mark reviewed'}
                    </button>
                    <button
                      type="button"
                      className="button button-danger button-compact"
                      disabled={busyId === item._id}
                      onClick={() => void remove(item._id, item.fullName)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
        {visible.length === 0 && <p className="empty-state">No applications in this list yet.</p>}
      </div>
    </div>
  )
}
