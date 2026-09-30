'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportPayload = {
  source?: string
  total?: number
  processed?: number
  productsSaved?: number
  imagesSaved?: number
  imagesSkipped?: number
  remaining?: number
  done?: boolean
  errors?: string[]
  usingLocalCatalog?: boolean
  stats?: { products: number; importedImages: number; storedImages: number }
}

export function AdminCatalogImport() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<ImportPayload | null>(null)

  async function loadStatus() {
    const response = await fetch('/api/admin/catalog-import')
    const payload = await response.json()
    if (response.ok) setStatus(payload.data)
  }

  useEffect(() => {
    loadStatus().catch(() => null)
  }, [])

  async function copyCatalog() {
    setBusy(true)
    setMessage('Copying products, details, and images into the new database…')
    let rounds = 0
    try {
      while (rounds < 50) {
        rounds += 1
        const response = await fetch('/api/admin/catalog-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 8 }),
        })
        const payload = await response.json()
        if (!response.ok) {
          setMessage(payload.message || 'Import failed')
          break
        }
        const data = payload.data as ImportPayload
        setStatus(data)
        setMessage(
          `Saved ${data.stats?.products || 0} products and ${data.stats?.importedImages || 0} images` +
            (data.remaining ? ` · ${data.remaining} still copying` : ''),
        )
        if (data.done || ((data.processed || 0) === 0 && (data.remaining || 0) === 0)) break
      }
      router.refresh()
    } catch {
      setMessage('Could not reach the old shop. Try again.')
    }
    setBusy(false)
  }

  const stats = status?.stats

  return (
    <div className="admin-card catalog-import-card">
      <div className="card-title">
        <div>
          <h3>Catalog database</h3>
          <span>
            The site reads products and photos from MySQL only. Use this only if you need to copy extra rows from the old shop into that database.
          </span>
        </div>
        <button type="button" className="button button-primary button-compact" disabled={busy} onClick={copyCatalog}>
          {busy ? 'Copying…' : 'Copy missing items'}
        </button>
      </div>
      {message && <p className="admin-message">{message}</p>}
      <p className="catalog-import-meta">
        MySQL catalog: <b>{stats?.products || 0}</b> products · <b>{stats?.importedImages || 0}</b> photos
        {status?.usingLocalCatalog ? ' · live site is using this database' : ''}
      </p>
    </div>
  )
}
