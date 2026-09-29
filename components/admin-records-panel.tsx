'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export type AdminField = {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'checkbox' | 'date' | 'datetime-local' | 'url' | 'email' | 'file'
  required?: boolean
  rows?: number
  placeholder?: string
}

function fieldValue(item: Record<string, unknown> | null, field: AdminField) {
  if (!item) return field.type === 'checkbox' ? false : ''
  const value = item[field.name]
  if (field.type === 'checkbox') return Boolean(value)
  if ((field.type === 'date' || field.type === 'datetime-local') && typeof value === 'string' && value) {
    return field.type === 'date' ? value.slice(0, 10) : value.slice(0, 16)
  }
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

export function AdminRecordsPanel({
  title,
  itemLabel,
  endpoint,
  items,
  fields,
  subtitle,
  imageField,
}: {
  title: string
  itemLabel: string
  endpoint: string
  items: Array<Record<string, unknown> & { _id: string }>
  fields: AdminField[]
  subtitle: string
  imageField?: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const selected = useMemo(() => items.find((item) => item._id === selectedId) || null, [items, selectedId])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set('published', data.get('published') ? 'true' : 'false')
    setSaving(true)
    setMessage('')
    const url = selectedId && selectedId !== 'new' ? `${endpoint}/${selectedId}` : endpoint
    const response = await fetch(url, { method: selectedId && selectedId !== 'new' ? 'PATCH' : 'POST', body: data })
    const payload = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(payload.message || `Could not save ${itemLabel}`)
      return
    }
    setMessage(`${itemLabel} saved.`)
    setSelectedId(payload.data?._id || null)
    router.refresh()
  }

  async function remove() {
    if (!selectedId || selectedId === 'new') return
    if (!window.confirm(`Delete this ${itemLabel}?`)) return
    const response = await fetch(`${endpoint}/${selectedId}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json()
      setMessage(payload.message || `Could not delete ${itemLabel}`)
      return
    }
    setSelectedId(null)
    setMessage(`${itemLabel} deleted.`)
    router.refresh()
  }

  const formKey = selectedId || 'closed'
  const preview = imageField && selected ? (selected[imageField] as { secureUrl?: string } | null) : null

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>{title}</h1>
        </div>
        <button type="button" className="button button-primary" onClick={() => { setSelectedId('new'); setMessage('') }}>
          New {itemLabel}
        </button>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>{title}</h3>
            <span>{subtitle}</span>
          </div>
        </div>
        {items.length === 0 && <p className="text-muted-foreground">Nothing here yet.</p>}
        <div className="admin-product-list">
          {items.map((item) => (
            <article key={item._id} className="admin-product-block">
              <button type="button" className="admin-product" onClick={() => setSelectedId(item._id)}>
                    {imageField ? (
                      (item[imageField] as { secureUrl?: string } | null)?.secureUrl
                        ? <img src={(item[imageField] as { secureUrl: string }).secureUrl} alt="" />
                        : <span className="admin-job-placeholder" />
                    ) : null}
                <div>
                  <b>{String(item.title || item.companyName || item.from || 'Untitled')}</b>
                  <small>
                    {item.order != null && item.order !== '' ? `Page ${item.order}` : ''}
                    {item.order != null && item.order !== '' && (item.location || item.facility || item.discountText || item.status) ? ' · ' : ''}
                    {String(item.location || item.facility || item.discountText || item.status || '')}
                    {item.published === false ? ' · Draft' : ''}
                  </small>
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
              <h3>{selected ? `Edit ${itemLabel}` : `New ${itemLabel}`}</h3>
            </div>
          </div>
          {fields.map((field) => {
            if (field.type === 'checkbox') {
              return (
                <label key={field.name} className="admin-check">
                  <input type="checkbox" name={field.name} defaultChecked={Boolean(fieldValue(selected, field))} /> {field.label}
                </label>
              )
            }
            if (field.type === 'textarea') {
              return (
                <label key={field.name}>{field.label}
                  <textarea name={field.name} rows={field.rows || 5} required={field.required} defaultValue={String(fieldValue(selected, field))} placeholder={field.placeholder} />
                </label>
              )
            }
            if (field.type === 'file') {
              return (
                <label key={field.name}>{field.label}
                  <input name={field.name} type="file" accept={field.name === 'file' ? 'application/pdf,.pdf' : 'image/*'} />
                </label>
              )
            }
            return (
              <label key={field.name}>{field.label}
                <input
                  name={field.name}
                  type={field.type || 'text'}
                  required={field.required}
                  defaultValue={String(fieldValue(selected, field))}
                  placeholder={field.placeholder}
                />
              </label>
            )
          })}
          {preview?.secureUrl && (
            <div className="admin-job-preview">
              <img src={preview.secureUrl} alt="" />
              <label className="admin-check"><input type="checkbox" name="removeImage" value="true" /> Remove current image</label>
            </div>
          )}
          <div className="admin-job-actions">
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : `Save ${itemLabel}`}</button>
            {selected && <button type="button" className="button button-outline" onClick={remove}>Delete</button>}
            <button type="button" className="button button-outline" onClick={() => setSelectedId(null)}>Close</button>
          </div>
        </form>
      )}
    </>
  )
}
