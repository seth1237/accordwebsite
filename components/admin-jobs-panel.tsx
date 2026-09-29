'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JobPost } from '@/lib/jobs'
import { COMPANY } from '@/lib/utils'

const TYPES = ['Full time', 'Part time', 'Contract', 'Internship']

const empty = {
  title: '',
  location: 'Nairobi',
  employmentType: 'Full time',
  department: '',
  summary: '',
  description: '',
  requirements: '',
  applyEmail: COMPANY.careersEmail,
  published: true,
}

export function AdminJobsPanel({ jobs }: { jobs: JobPost[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const selected = useMemo(() => jobs.find((job) => job._id === selectedId) || null, [jobs, selectedId])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set('published', data.get('published') ? 'true' : 'false')
    setSaving(true)
    setMessage('')
    const url = selectedId && selectedId !== 'new' ? `/api/admin/jobs/${selectedId}` : '/api/admin/jobs'
    const response = await fetch(url, { method: selectedId && selectedId !== 'new' ? 'PATCH' : 'POST', body: data })
    const payload = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save job')
      return
    }
    setMessage('Job saved.')
    setSelectedId(payload.data?._id || null)
    router.refresh()
  }

  async function remove() {
    if (!selectedId || selectedId === 'new') return
    if (!window.confirm('Delete this job?')) return
    const response = await fetch(`/api/admin/jobs/${selectedId}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json()
      setMessage(payload.message || 'Could not delete job')
      return
    }
    setSelectedId(null)
    setMessage('Job deleted.')
    router.refresh()
  }

  const formKey = selectedId || 'closed'
  const values = selected || empty

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Tarumed content manager</span>
          <h1>Jobs</h1>
        </div>
        <button type="button" className="button button-primary" onClick={() => { setSelectedId('new'); setMessage('') }}>
          New job
        </button>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Open roles</h3>
            <span>Published jobs appear on /jobs, with each role at /vacancy/{"{slug}"}.</span>
          </div>
        </div>
        {jobs.length === 0 && <p className="text-muted-foreground">No jobs yet.</p>}
        <div className="admin-product-list">
          {jobs.map((job) => (
            <article key={job._id} className="admin-product-block">
              <button type="button" className="admin-product" onClick={() => setSelectedId(job._id)}>
                {job.image ? <img src={job.image.secureUrl} alt="" /> : <span className="admin-job-placeholder" />}
                <div>
                  <b>{job.title}</b>
                  <small>{job.location} · {job.employmentType}{job.published ? '' : ' · Draft'}</small>
                </div>
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedId && (
        <form key={formKey} className="admin-card admin-job-form" onSubmit={save}>
          <div className="card-title">
            <div>
              <h3>{selected ? 'Edit job' : 'New job'}</h3>
              <span>Include a holding image, role details, and how to apply.</span>
            </div>
          </div>
          <label>Title<input name="title" required defaultValue={values.title} /></label>
          <div className="admin-job-row">
            <label>Location<input name="location" required defaultValue={values.location} /></label>
            <label>Type
              <select name="employmentType" defaultValue={values.employmentType}>
                {TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
          </div>
          <label>Department<input name="department" defaultValue={values.department} placeholder="Sales, Service, Lab" /></label>
          <label>Short summary<textarea name="summary" rows={2} defaultValue={values.summary} /></label>
          <label>Details<textarea name="description" rows={8} required defaultValue={values.description} /></label>
          <label>Requirements<textarea name="requirements" rows={5} defaultValue={values.requirements} /></label>
          <label>Apply email<input name="applyEmail" type="email" defaultValue={values.applyEmail} /></label>
          <label>Holding image
            <input name="image" type="file" accept="image/*" />
          </label>
          {selected?.image && (
            <div className="admin-job-preview">
              <img src={selected.image.secureUrl} alt="" />
              <label className="admin-check"><input type="checkbox" name="removeImage" value="true" /> Remove current image</label>
            </div>
          )}
          <label className="admin-check">
            <input type="checkbox" name="published" defaultChecked={values.published} /> Published
          </label>
          <div className="admin-job-actions">
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save job'}</button>
            {selected && (
              <button type="button" className="button button-outline" onClick={remove}>Delete</button>
            )}
            <button type="button" className="button button-outline" onClick={() => setSelectedId(null)}>Close</button>
          </div>
        </form>
      )}
    </>
  )
}
