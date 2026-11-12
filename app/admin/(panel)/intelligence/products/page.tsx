'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type ProductRow = { productId: string; name: string; views: number; carts: number }

export default function KenyaProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/admin/analytics/products?range=30d')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.message || 'Could not load products')
        setRows((body.data || []) as ProductRow[])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load products'))
  }, [])

  return (
    <div className="kenya-intel">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Customer Intelligence</span>
          <h1>Product engagement</h1>
          <p className="admin-header-note">Product views and cart adds from estimated county sessions. Last 30 days.</p>
        </div>
        <Link className="button button-outline button-compact" href="/admin/intelligence">Kenya map</Link>
      </header>
      {error ? <p className="admin-message">{error}</p> : null}
      <div className="admin-card">
        <ul className="kenya-list">
          {rows.map((row) => (
            <li key={row.productId}>
              <span>{row.name}<small> {row.carts} cart adds</small></span>
              <b>{row.views.toLocaleString('en-KE')}</b>
            </li>
          ))}
          {!rows.length ? <li><span>No product engagement recorded yet.</span></li> : null}
        </ul>
      </div>
    </div>
  )
}
