'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportResult = {
  created?: number
  updated?: number
  skipped?: number
  errors?: string[]
}

export function AdminCatalogCsv() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  async function upload(file: File) {
    setBusy(true)
    setMessage('')
    setErrors([])
    const body = new FormData()
    body.set('file', file)
    const response = await fetch('/api/admin/products/csv', { method: 'POST', body })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not import the CSV')
      return
    }
    const data = (payload.data || {}) as ImportResult
    setMessage(
      `Imported ${data.created || 0} new products and updated ${data.updated || 0}.` +
        (data.skipped ? ` ${data.skipped} rows were skipped.` : ''),
    )
    setErrors((data.errors || []).slice(0, 12))
    router.refresh()
  }

  return (
    <div className="admin-card catalog-import-card">
      <div className="card-title">
        <div>
          <h3>Add products from CSV</h3>
          <span>
            Columns: Product name, category, PRODUCT FEATURE, price. Leave price blank unless you want that amount shown
            on the site.
          </span>
        </div>
        <div className="admin-header-tools">
          <a className="button button-outline button-compact" href="/api/admin/products/csv-template">
            Download CSV template
          </a>
          <label className="button button-primary button-compact">
            {busy ? 'Importing…' : 'Upload CSV'}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}
      {errors.length ? (
        <ul className="catalog-import-meta">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
