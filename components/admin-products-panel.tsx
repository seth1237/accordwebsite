'use client'

import { Fragment, useMemo, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { CatalogCategory, CatalogProduct } from '@/lib/catalog'
import { formatKes, productImageSrc, slugifyName } from '@/lib/catalog'
import type { Catalogue } from '@/lib/content'
import { CatalogueDownloadLink } from '@/components/catalogue-download'

const PAGE_SIZE = 10

function imageFiles(list: FileList | File[] | null | undefined) {
  if (!list) return []
  return Array.from(list).filter(
    (file) => file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.name),
  )
}

export function AdminProductsPanel({
  products,
  categories = [],
  catalogues = [],
  title,
  subtitle,
}: {
  products: CatalogProduct[]
  categories?: CatalogCategory[]
  catalogues?: Catalogue[]
  title: string
  subtitle: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [visibility, setVisibility] = useState<'all' | 'live' | 'hidden' | 'checkout'>('all')
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [details, setDetails] = useState<Record<string, string>>({})
  const [names, setNames] = useState<Record<string, string>>({})
  const [distributedFor, setDistributedFor] = useState<Record<string, string>>({})
  const [uploadKind, setUploadKind] = useState<Record<string, 'photo' | 'installation'>>({})

  const hiddenCount = products.filter((product) => product.hidden).length
  const checkoutCount = products.filter((product) => product.checkout && product.price > 0).length

  const categoryOptions = useMemo(() => {
    if (categories.length) return [...categories].sort((a, b) => a.name.localeCompare(b.name))
    const map = new Map<string, CatalogCategory>()
    for (const product of products) {
      const current = map.get(product.categoryId)
      if (current) current.count += 1
      else map.set(product.categoryId, { _id: product.categoryId, name: product.categoryName, count: 1, slug: slugifyName(product.categoryName) })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [categories, products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((product) => (categoryId === 'all' ? true : product.categoryId === categoryId))
      .filter((product) => {
        if (visibility === 'hidden') return Boolean(product.hidden)
        if (visibility === 'checkout') return Boolean(product.checkout) && product.price > 0
        if (visibility === 'live') return !product.hidden
        return true
      })
      .filter((product) => (q ? `${product.name} ${product.categoryName}`.toLowerCase().includes(q) : true))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name))
  }, [products, query, categoryId, visibility])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function changeCategory(id: string) {
    setCategoryId(id)
    setPage(1)
    setOpenId(null)
  }

  function detailValue(product: CatalogProduct) {
    return details[product.id] ?? product.details ?? product.description ?? ''
  }

  async function upload(productId: string, files: FileList | File[]) {
    const images = imageFiles(files)
    if (!images.length) {
      setMessage('Drop image files (JPG, PNG, or WebP).')
      return
    }
    setBusyId(productId)
    setMessage('')
    const body = new FormData()
    body.set('erpProductId', productId)
    body.set('installation', uploadKind[productId] === 'installation' ? 'true' : 'false')
    for (const file of images) body.append('file', file)
    const response = await fetch('/api/admin/product-image', { method: 'POST', body })
    const payload = await response.json()
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Upload failed')
      return
    }
    setMessage(uploadKind[productId] === 'installation' ? 'Recent installation photo saved.' : 'Product photo saved.')
    router.refresh()
  }

  function acceptDrop(productId: string, event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
    setDraggingId(null)
    void upload(productId, event.dataTransfer.files)
  }

  async function setInstallation(productId: string, publicId: string, installation: boolean) {
    setBusyId(productId)
    setMessage('')
    const response = await fetch('/api/admin/product-image', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erpProductId: productId, publicId, installation }),
    })
    const payload = await response.json()
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not update image type')
      return
    }
    setMessage(installation ? 'Marked as recent installation.' : 'Marked as product photo.')
    router.refresh()
  }

  async function removeImage(productId: string, publicId: string) {
    setBusyId(productId)
    const response = await fetch('/api/admin/product-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erpProductId: productId, publicId }),
    })
    const payload = await response.json()
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not remove image')
      return
    }
    setMessage('Image removed.')
    router.refresh()
  }

  async function saveDetails(productId: string) {
    const product = products.find((item) => item.id === productId)
    const name = (names[productId] ?? product?.name ?? '').trim()
    if (!name) {
      setMessage('Enter a product name')
      return
    }
    setBusyId(productId)
    const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        details: details[productId] ?? (product?.details || ''),
        distributedFor: distributedFor[productId] ?? (product?.distributedFor || ''),
      }),
    })
    const payload = await response.json()
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save product')
      return
    }
    setMessage('Product saved.')
    router.refresh()
  }

  async function setCheckout(product: CatalogProduct, checkout: boolean) {
    if (checkout && !(product.price > 0)) {
      setMessage('Set a price before enabling checkout.')
      return
    }
    setBusyId(product.id)
    setMessage('')
    const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkout }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not update checkout')
      return
    }
    setMessage(checkout ? 'This product can be bought on the website.' : 'Checkout removed. Visitors can still request a quote.')
    router.refresh()
  }

  async function setHidden(product: CatalogProduct, hidden: boolean) {
    setBusyId(product.id)
    setMessage('')
    const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || (hidden ? 'Could not hide product' : 'Could not restore product'))
      return
    }
    setMessage(hidden ? 'Product hidden from the website.' : 'Product is visible on the website.')
    router.refresh()
  }

  async function removeProduct(product: CatalogProduct) {
    if (!window.confirm(`Permanently delete “${product.name}”? Photos and the catalogue PDF for this product will also be removed.`)) {
      return
    }
    setBusyId(product.id)
    setMessage('')
    const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not delete product')
      return
    }
    setOpenId(null)
    setMessage('Product deleted.')
    router.refresh()
  }

  function catalogueFor(productId: string) {
    return catalogues.find((item) => item.erpProductId === productId)
  }

  async function uploadCatalogue(product: CatalogProduct, file: File) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      setMessage('Upload a PDF catalogue')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage('Upload a PDF under 20MB')
      return
    }
    setBusyId(product.id)
    setMessage('')
    const previous = catalogues.filter((item) => item.erpProductId === product.id)
    const body = new FormData()
    body.set('title', `${product.name} catalogue`)
    body.set('erpProductId', product.id)
    body.set('file', file)
    try {
      const response = await fetch('/api/admin/catalogues', {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(120_000),
      })
      const payload = await response.json().catch(() => ({})) as { message?: string }
      if (!response.ok) {
        setMessage(payload.message || 'Could not upload catalogue')
        return
      }
      for (const item of previous) {
        await fetch(`/api/admin/catalogues/${item._id}`, { method: 'DELETE' }).catch(() => null)
      }
      setMessage('Machine catalogue PDF saved.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload catalogue')
    } finally {
      setBusyId(null)
    }
  }

  async function removeCatalogue(id: string, productId: string) {
    setBusyId(productId)
    const response = await fetch(`/api/admin/catalogues/${id}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    setBusyId(null)
    if (!response.ok) {
      setMessage(payload.message || 'Could not remove catalogue')
      return
    }
    setMessage('Catalogue removed.')
    router.refresh()
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>{title}</h1>
        </div>
        <div className="admin-header-tools">
          <a className="button button-outline button-compact" href="/api/admin/products/export">
            Download Excel
          </a>
          <select
            className="filter-input category-select"
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value as 'all' | 'live' | 'hidden' | 'checkout')
              setPage(1)
            }}
            aria-label="Filter by visibility"
          >
            <option value="all">All products</option>
            <option value="live">On the website</option>
            <option value="hidden">Hidden ({hiddenCount})</option>
            <option value="checkout">Checkout ({checkoutCount})</option>
          </select>
          <select
            className="filter-input category-select"
            value={categoryId}
            onChange={(event) => changeCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="filter-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search products"
          />
        </div>
      </header>
      <div className="category-chips admin-category-chips">
        <button type="button" className={categoryId === 'all' ? 'chip active' : 'chip'} onClick={() => changeCategory('all')}>
          All <small>{products.length}</small>
        </button>
        {categoryOptions.map((category) => (
          <button
            key={category._id}
            type="button"
            className={categoryId === category._id ? 'chip active' : 'chip'}
            onClick={() => changeCategory(category._id)}
          >
            {category.name} <small>{products.filter((product) => product.categoryId === category._id).length}</small>
          </button>
        ))}
      </div>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>{categoryId === 'all' ? title : categoryOptions.find((category) => category._id === categoryId)?.name || title}</h3>
            <span>{subtitle}</span>
          </div>
          <small className="page-status">{filtered.length} products</small>
        </div>
        {message && <p className="admin-message">{message}</p>}
        <div className="admin-product-list">
          {visible.map((product, index) => {
            const open = openId === product.id
            const previous = visible[index - 1]
            const showHeading = categoryId === 'all' && product.categoryName !== previous?.categoryName
            const dragging = draggingId === product.id
            return (
              <Fragment key={product.id}>
                {showHeading && <h4 className="admin-cat-head">{product.categoryName}</h4>}
                <article
                  className={`admin-product-block${product.hidden ? ' is-hidden' : ''}${dragging ? ' is-dragging' : ''}`}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDraggingId(product.id)
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'copy'
                    setDraggingId(product.id)
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node)) return
                    setDraggingId((current) => (current === product.id ? null : current))
                  }}
                  onDrop={(event) => acceptDrop(product.id, event)}
                >
                <button type="button" className="admin-product" onClick={() => setOpenId(open ? null : product.id)}>
                  <img src={productImageSrc(product)} alt="" />
                  <div>
                    <b>
                      {product.name}
                      {product.hidden ? <em className="admin-status-badge">Hidden</em> : null}
                      {product.checkout && product.price > 0 ? <em className="admin-status-badge is-checkout">Checkout</em> : null}
                    </b>
                    <small>{product.categoryName} · {formatKes(product.price)} · {product.imageAssets.length} photos{catalogueFor(product.id) ? ' · PDF catalogue' : ''}</small>
                  </div>
                  <span className="metric-pair">
                    <span className="click-metric">
                      <b>{product.clicks || 0}</b>
                      <small>clicks</small>
                    </span>
                    <span className="click-metric">
                      <b>{product.carts || 0}</b>
                      <small>cart</small>
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="admin-editor">
                    <label>
                      Product name
                      <input
                        value={names[product.id] ?? product.name}
                        onChange={(event) => setNames((current) => ({ ...current, [product.id]: event.target.value }))}
                      />
                    </label>
                    <label>
                      Product details
                      <textarea
                        value={detailValue(product)}
                        onChange={(event) => setDetails((current) => ({ ...current, [product.id]: event.target.value }))}
                        rows={5}
                        placeholder="Specifications, pack size, usage notes…"
                      />
                    </label>
                    <label>
                      Distributed for
                      <input
                        value={distributedFor[product.id] ?? product.distributedFor ?? ''}
                        onChange={(event) => setDistributedFor((current) => ({ ...current, [product.id]: event.target.value }))}
                        placeholder="Manufacturer display name"
                      />
                    </label>
                    <button className="button button-primary button-compact" disabled={busyId === product.id} onClick={() => saveDetails(product.id)}>
                      Save product
                    </button>
                    <div className="admin-image-list">
                      {product.imageAssets.map((asset) => (
                        <div key={asset.publicId} className={asset.installation ? 'admin-image-item is-installation' : 'admin-image-item'}>
                          <div className="admin-thumb">
                            <img src={asset.secureUrl} alt="" />
                            {asset.installation ? <span className="admin-thumb-badge">Recent installation</span> : null}
                            <button type="button" onClick={() => removeImage(product.id, asset.publicId)} aria-label="Remove image"><Trash2 size={14} /></button>
                          </div>
                          <div className="admin-kind-radios">
                            <label>
                              <input
                                type="radio"
                                name={`img-kind-${product.id}-${asset.publicId}`}
                                checked={!asset.installation}
                                disabled={busyId === product.id}
                                onChange={() => void setInstallation(product.id, asset.publicId, false)}
                              />
                              Product photo
                            </label>
                            <label>
                              <input
                                type="radio"
                                name={`img-kind-${product.id}-${asset.publicId}`}
                                checked={Boolean(asset.installation)}
                                disabled={busyId === product.id}
                                onChange={() => void setInstallation(product.id, asset.publicId, true)}
                              />
                              Recent installation
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                    <fieldset className="admin-kind-radios upload-kind">
                      <legend>New image type</legend>
                      <label>
                        <input
                          type="radio"
                          name={`upload-kind-${product.id}`}
                          checked={(uploadKind[product.id] || 'photo') === 'photo'}
                          onChange={() => setUploadKind((current) => ({ ...current, [product.id]: 'photo' }))}
                        />
                        Product photo
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`upload-kind-${product.id}`}
                          checked={uploadKind[product.id] === 'installation'}
                          onChange={() => setUploadKind((current) => ({ ...current, [product.id]: 'installation' }))}
                        />
                        Recent installation
                      </label>
                    </fieldset>
                    <div
                      className={`admin-dropzone${dragging ? ' is-dragging' : ''}`}
                      onDragEnter={(event) => {
                        event.preventDefault()
                        setDraggingId(product.id)
                      }}
                      onDragOver={(event) => {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'copy'
                      }}
                      onDrop={(event) => acceptDrop(product.id, event)}
                    >
                      <input
                        className="admin-dropzone-input"
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={busyId === product.id}
                        onChange={(event) => {
                          const files = event.target.files
                          if (files?.length) void upload(product.id, files)
                          event.target.value = ''
                        }}
                      />
                      <strong>{busyId === product.id ? 'Saving…' : dragging ? 'Drop images now' : 'Drop images here'}</strong>
                      <span>or click to browse · JPG, PNG, WebP</span>
                    </div>
                    <div className="admin-catalogue-row">
                      {catalogueFor(product.id) ? (
                        <small>
                          PDF: {catalogueFor(product.id)?.title}
                          {' · '}
                          <CatalogueDownloadLink
                            className="text-link"
                            href={`/api/catalogues/${catalogueFor(product.id)?._id}/download?productId=${encodeURIComponent(product.id)}`}
                            filename={`${product.name || 'catalogue'}.pdf`}
                          >
                            Download
                          </CatalogueDownloadLink>
                          {' · '}
                          <button
                            type="button"
                            className="text-link"
                            onClick={() => {
                              const item = catalogueFor(product.id)
                              if (item) void removeCatalogue(item._id, product.id)
                            }}
                          >
                            Remove
                          </button>
                        </small>
                      ) : (
                        <small>No catalogue PDF for this machine yet.</small>
                      )}
                      <label className="button button-outline button-compact">
                        {busyId === product.id ? 'Saving…' : catalogueFor(product.id) ? 'Replace catalogue PDF' : 'Upload catalogue PDF'}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          hidden
                          disabled={busyId === product.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) void uploadCatalogue(product, file)
                            event.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                    <div className="admin-job-actions">
                      <button
                        type="button"
                        className="button button-outline button-compact"
                        disabled={busyId === product.id || !(product.price > 0)}
                        title={product.price > 0 ? undefined : 'Set a price before enabling checkout'}
                        onClick={() => void setCheckout(product, !product.checkout)}
                      >
                        <CreditCard size={14} />
                        {product.checkout ? 'Remove checkout' : 'Enable checkout'}
                      </button>
                      <button
                        type="button"
                        className="button button-outline button-compact"
                        disabled={busyId === product.id}
                        onClick={() => void setHidden(product, !product.hidden)}
                      >
                        {product.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        {product.hidden ? 'Show on website' : 'Hide from website'}
                      </button>
                      <button
                        type="button"
                        className="button button-danger button-compact"
                        disabled={busyId === product.id}
                        onClick={() => void removeProduct(product)}
                      >
                        <Trash2 size={14} />
                        Delete product
                      </button>
                    </div>
                  </div>
                )}
                </article>
              </Fragment>
            )
          })}
          {filtered.length === 0 && <p className="empty-state">No products match that search.</p>}
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="catalog-more">
            {currentPage > 1 && (
              <button type="button" className="button button-outline" onClick={() => setPage(currentPage - 1)}>Previous</button>
            )}
            <span className="page-status">{currentPage} of {totalPages}</span>
            {currentPage < totalPages && (
              <button type="button" className="button button-primary" onClick={() => setPage(currentPage + 1)}>View more</button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
