'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Catalogue } from '@/lib/content'
import type { CatalogProduct } from '@/lib/catalog'

export function AdminCataloguesPanel({
  catalogues,
  total,
  products,
}: {
  catalogues: Catalogue[]
  total: number
  products: CatalogProduct[]
}) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [title, setTitle] = useState('')
  const [productId, setProductId] = useState('')
  const max = Math.max(1, ...catalogues.map((item) => item.downloadCount))

  const visibleProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    return products.filter((product) =>
      q ? `${product.name} ${product.categoryName}`.toLowerCase().includes(q) : true,
    )
  }, [products, productQuery])

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    const form = event.currentTarget
    const previous = catalogues.filter((item) => item.erpProductId === productId)
    const response = await fetch('/api/admin/catalogues', { method: 'POST', body: new FormData(form) })
    const payload = await response.json()
    if (!response.ok) {
      setSaving(false)
      setMessage(payload.message || 'Could not save catalogue')
      return
    }
    for (const item of previous) {
      await fetch(`/api/admin/catalogues/${item._id}`, { method: 'DELETE' }).catch(() => null)
    }
    setSaving(false)
    setMessage('Catalogue saved. View Catalogue on that product page will download this PDF.')
    form.reset()
    setTitle('')
    setProductId('')
    setProductQuery('')
    router.refresh()
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this catalogue?')) return
    const response = await fetch(`/api/admin/catalogues/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json()
      setMessage(payload.message || 'Could not delete')
      return
    }
    setMessage('Catalogue deleted.')
    router.refresh()
  }

  function exportCsv() {
    const rows = [['Title', 'Product', 'Product ID', 'Downloads', 'URL'], ...catalogues.map((item) => [
      item.title,
      item.productName,
      item.erpProductId,
      String(item.downloadCount),
      item.file.secureUrl,
    ])]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'catalogue-downloads.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function selectProduct(id: string) {
    setProductId(id)
    const product = products.find((item) => item.id === id)
    if (product && !title.trim()) setTitle(`${product.name} catalogue`)
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord content manager</span>
          <h1>Machine catalogues</h1>
        </div>
        <button type="button" className="button button-outline" onClick={exportCsv}>Export CSV</button>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-stats">
        <div><span><b>{total}</b><small>Total downloads</small></span></div>
        <div><span><b>{catalogues.length}</b><small>PDFs</small></span></div>
      </div>
      <form className="admin-card admin-job-form" onSubmit={save}>
        <div className="card-title">
          <div>
            <h3>Upload a machine PDF</h3>
            <span>Attach one brochure per product. View Catalogue on that product page downloads this file directly.</span>
          </div>
        </div>
        <label>Search products
          <input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="Type a machine name"
          />
        </label>
        <label>Product
          <select name="erpProductId" required value={productId} onChange={(event) => selectProduct(event.target.value)}>
            <option value="">Select a product</option>
            {visibleProducts.map((product) => (
              <option key={product.id} value={product.id}>{product.name} — {product.categoryName}</option>
            ))}
          </select>
        </label>
        <label>Title<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>PDF file<input name="file" type="file" accept="application/pdf,.pdf" required /></label>
        <button className="button button-primary" disabled={saving}>{saving ? 'Uploading…' : 'Save catalogue'}</button>
      </form>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Uploaded catalogues</h3>
            <span>Counts update when a visitor clicks View Catalogue.</span>
          </div>
        </div>
        <div className="category-perf-list">
          {catalogues.map((item) => (
            <div key={item._id} className="category-perf">
              <div className="category-perf-head">
                <b>{item.productName || item.title}</b>
                <strong>{item.downloadCount}</strong>
              </div>
              <div className="category-perf-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((item.downloadCount / max) * 100)}%` }} />
              </div>
              <small>
                {item.title}
                {' · '}
                <a className="text-link" href={`/api/catalogues/${item._id}/download?productId=${encodeURIComponent(item.erpProductId)}`}>Download</a>
                {' · '}
                <button type="button" className="text-link" onClick={() => remove(item._id)}>Delete</button>
              </small>
            </div>
          ))}
          {catalogues.length === 0 && <p className="text-muted-foreground">No catalogues yet. Upload a PDF for a machine above.</p>}
        </div>
      </div>
    </>
  )
}
