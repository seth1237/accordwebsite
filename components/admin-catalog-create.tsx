'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogCategory } from '@/lib/catalog'

export function AdminCatalogCreate({ categories }: { categories: CatalogCategory[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<'product' | 'category' | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [useNewCategory, setUseNewCategory] = useState(false)

  function open(next: 'product' | 'category') {
    setMode(next)
    setMessage('')
    setUseNewCategory(next === 'product' && categories.length === 0)
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/categories', { method: 'POST', body: new FormData(form) })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save category')
      return
    }
    setMessage('Category saved.')
    setMode(null)
    router.refresh()
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/products', { method: 'POST', body: new FormData(form) })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save product')
      return
    }
    setMessage('Product saved. You can add more photos from the product list.')
    setMode(null)
    router.refresh()
  }

  return (
    <>
      <div className="admin-create-bar">
        <button type="button" className="button button-primary" onClick={() => open('product')}>New product</button>
        <button type="button" className="button button-outline" onClick={() => open('category')}>New category</button>
      </div>
      {message ? <p className="admin-message">{message}</p> : null}

      {mode === 'category' && (
        <form className="admin-card admin-job-form" onSubmit={(event) => void saveCategory(event)}>
          <div className="card-title">
            <div>
              <h3>New category</h3>
              <span>This appears in the shop once it has products, and in this admin list immediately.</span>
            </div>
          </div>
          <label>
            Name
            <input name="name" required placeholder="Laboratory Equipment" />
          </label>
          <label>
            Description
            <textarea name="description" rows={3} placeholder="Optional notes for the team" />
          </label>
          <div className="admin-job-actions">
            <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save category'}</button>
            <button type="button" className="button button-outline" onClick={() => setMode(null)}>Close</button>
          </div>
        </form>
      )}

      {mode === 'product' && (
        <form className="admin-card admin-job-form" onSubmit={(event) => void saveProduct(event)}>
          <div className="card-title">
            <div>
              <h3>New product</h3>
              <span>Add a machine to the catalogue. Photos are converted and stored with the product.</span>
            </div>
          </div>
          <label>
            Name
            <input name="name" required placeholder="Product name" />
          </label>
          <div className="admin-job-row">
            <label>
              Category
              {useNewCategory ? (
                <input name="categoryName" required placeholder="New category name" />
              ) : (
                <select name="categoryId" required defaultValue="">
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.slug || category._id}>{category.name}</option>
                  ))}
                </select>
              )}
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={useNewCategory} onChange={(event) => setUseNewCategory(event.target.checked)} />
              New category
            </label>
          </div>
          <label>
            Description
            <textarea name="description" rows={4} placeholder="What the product is and who it is for" />
          </label>
          <label>
            Details
            <textarea name="details" rows={5} placeholder="Specifications, pack size, usage notes" />
          </label>
          <div className="admin-job-row">
            <label>
              Manufacturer
              <input name="manufacturer" placeholder="Brand or maker" />
            </label>
            <label>
              Price (KES)
              <input name="price" type="number" min="0" step="1" placeholder="0 for request a quote" />
            </label>
          </div>
          <label>
            Photos
            <input name="file" type="file" accept="image/*" multiple />
          </label>
          <label className="admin-check">
            <input type="checkbox" name="inStock" value="true" defaultChecked />
            In stock
          </label>
          <label className="admin-check">
            <input type="checkbox" name="featured" value="true" />
            Featured on the homepage
          </label>
          <div className="admin-job-actions">
            <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
            <button type="button" className="button button-outline" onClick={() => setMode(null)}>Close</button>
          </div>
        </form>
      )}
    </>
  )
}
