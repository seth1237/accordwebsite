'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { CatalogProduct } from '@/lib/catalog'
import { formatKes } from '@/lib/catalog'
import type { Offer, OfferEvent } from '@/lib/content'
import { DEFAULT_OFFER_HEADER_CTA, DEFAULT_OFFER_HEADER_TAGLINE } from '@/lib/offers'

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function monthAheadInput() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminOffersPanel({
  offers,
  products,
  stats,
}: {
  offers: Offer[]
  products: CatalogProduct[]
  stats: {
    clicks: number
    whatsapp: number
    products: Array<{ productId: string; productName: string; clicks: number; whatsapp: number }>
    events: OfferEvent[]
  }
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)
  const [kind, setKind] = useState<'products' | 'custom'>('products')
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [prices, setPrices] = useState<Record<string, { price: string; compareAt: string }>>({})
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const selected = useMemo(() => offers.find((item) => item._id === selectedId) || null, [offers, selectedId])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((product) => (q ? `${product.name} ${product.categoryName}`.toLowerCase().includes(q) : true))
      .slice(0, 12)
  }, [products, query])

  function open(id: string | 'new') {
    const item = id === 'new' ? null : offers.find((offer) => offer._id === id) || null
    setSelectedId(id)
    setKind(item?.kind === 'custom' ? 'custom' : 'products')
    setPicked(item?.productIds || [])
    setPrices(Object.fromEntries((item?.productPrices || []).map((row) => [
      row.productId,
      { price: row.price ? String(row.price) : '', compareAt: row.compareAt ? String(row.compareAt) : '' },
    ])))
    setQuery('')
    setMessage('')
  }

  function toggleProduct(id: string) {
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
    setPrices((current) => current[id] ? current : { ...current, [id]: { price: '', compareAt: '' } })
  }

  function setProductPrice(id: string, field: 'price' | 'compareAt', value: string) {
    setPrices((current) => ({ ...current, [id]: { price: '', compareAt: '', ...current[id], [field]: value } }))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    data.set('kind', kind)
    data.set('published', data.get('published') ? 'true' : 'false')
    data.set('showHeader', data.get('showHeader') ? 'true' : 'false')
    data.set('productIds', kind === 'custom' ? '' : picked.join(','))
    data.set('productPrices', JSON.stringify(kind === 'custom' ? [] : picked.map((id) => ({
      productId: id,
      price: Number(prices[id]?.price) || 0,
      compareAt: Number(prices[id]?.compareAt) || 0,
    }))))
    setSaving(true)
    setMessage('')
    const url = selectedId && selectedId !== 'new' ? `/api/admin/offers/${selectedId}` : '/api/admin/offers'
    const response = await fetch(url, { method: selectedId && selectedId !== 'new' ? 'PATCH' : 'POST', body: data })
    const payload = await response.json().catch(() => ({}))
    setSaving(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save offer')
      return
    }
    setMessage('Offer saved. Products on this offer now appear at the top of the shop.')
    setSelectedId(payload.data?._id || null)
    router.refresh()
  }

  async function remove() {
    if (!selectedId || selectedId === 'new') return
    if (!window.confirm('Delete this offer?')) return
    const response = await fetch(`/api/admin/offers/${selectedId}`, { method: 'DELETE' })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setMessage(payload.message || 'Could not delete offer')
      return
    }
    setSelectedId(null)
    setMessage('Offer deleted.')
    router.refresh()
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Offers</h1>
        </div>
        <button type="button" className="button button-primary" onClick={() => open('new')}>New offer</button>
      </header>

      <div className="admin-stats">
        <div><span><b>{stats.clicks}</b><small>Offer product clicks</small></span></div>
        <div><span><b>{stats.whatsapp}</b><small>WhatsApp requests</small></span></div>
        <div><span><b>{offers.filter((item) => item.published).length}</b><small>Published offers</small></span></div>
        <div><span><b>{stats.products.length}</b><small>Products with activity</small></span></div>
      </div>

      {message ? <p className="admin-message">{message}</p> : null}

      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Current offers</h3>
            <span>Attach catalogue products, or create a priced offer as its own product.</span>
          </div>
        </div>
        {offers.length === 0 && <p className="text-muted-foreground">No offers yet.</p>}
        <div className="admin-product-list">
          {offers.map((item) => (
            <article key={item._id} className="admin-product-block">
              <button type="button" className="admin-product" onClick={() => open(item._id)}>
                {item.banner?.secureUrl ? <img src={item.banner.secureUrl} alt="" /> : <span className="admin-job-placeholder" />}
                <div>
                  <b>{item.title}</b>
                  <small>
                    {item.kind === 'custom' ? 'New offer product' : `${item.productIds.length} products`}
                    {item.price ? ` · ${formatKes(item.price)}` : ''}
                    {item.showHeader ? ' · Header' : ''}
                    {item.published === false ? ' · Draft' : ''}
                  </small>
                </div>
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedId && (
        <form key={selectedId} className="admin-card admin-job-form" onSubmit={(event) => void save(event)}>
          <div className="card-title">
            <div>
              <h3>{selected ? 'Edit offer' : 'New offer'}</h3>
              <span>Set a cash price on each product. Leave a price at 0 to keep “request a quote”.</span>
            </div>
          </div>
          <div className="admin-job-row">
            <label className="admin-check">
              <input type="radio" name="kindChoice" checked={kind === 'products'} onChange={() => setKind('products')} />
              Existing products
            </label>
            <label className="admin-check">
              <input type="radio" name="kindChoice" checked={kind === 'custom'} onChange={() => setKind('custom')} />
              Create as a new product
            </label>
          </div>
          <label>Title<input name="title" required defaultValue={selected?.title || ''} /></label>
          <label>Short offer line<input name="discountText" defaultValue={selected?.discountText || ''} placeholder="20% off, this week only" /></label>
          <label>Description<textarea name="description" rows={5} defaultValue={selected?.description || ''} placeholder="What is included and who it is for" /></label>
          {kind === 'custom' && (
            <div className="admin-job-row">
              <label>Cash price (KES)<input name="price" type="number" min="0" step="1" defaultValue={selected?.price || ''} /></label>
              <label>Was (KES)<input name="compareAt" type="number" min="0" step="1" defaultValue={selected?.compareAt || ''} /></label>
            </div>
          )}
          <div className="admin-job-row">
            <label>Start date<input name="startDate" type="date" required defaultValue={selected?.startDate?.slice(0, 10) || todayInput()} /></label>
            <label>End date<input name="endDate" type="date" required defaultValue={selected?.endDate?.slice(0, 10) || monthAheadInput()} /></label>
          </div>
          <label className="admin-check">
            <input type="checkbox" name="showHeader" defaultChecked={Boolean(selected?.showHeader)} />
            Show offer header (slim carousel at the top of the site)
          </label>
          <label>
            Header tagline
            <input
              name="headerTagline"
              defaultValue={selected?.headerTagline || (selected ? '' : DEFAULT_OFFER_HEADER_TAGLINE)}
              placeholder={DEFAULT_OFFER_HEADER_TAGLINE}
            />
          </label>
          <label>
            Header button
            <input name="headerCta" defaultValue={selected?.headerCta || DEFAULT_OFFER_HEADER_CTA} placeholder={DEFAULT_OFFER_HEADER_CTA} />
          </label>
          <p className="text-muted-foreground">The header only appears between these dates, with this tagline, a CTA, and the products on offer scrolling across.</p>
          {kind === 'products' && (
            <div className="offer-picker">
              <label>
                Find products
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the catalogue" />
              </label>
              {picked.length > 0 && (
                <div className="offer-price-rows">
                  {picked.map((id) => {
                    const product = products.find((item) => item.id === id)
                    return (
                      <div key={id} className="offer-price-row">
                        <button type="button" className="chip active" onClick={() => toggleProduct(id)}>
                          {product?.name || id} ×
                        </button>
                        <label>
                          Offer price (KES)
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={prices[id]?.price || ''}
                            onChange={(event) => setProductPrice(id, 'price', event.target.value)}
                            placeholder="0"
                          />
                        </label>
                        <label>
                          Was (KES)
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={prices[id]?.compareAt || ''}
                            onChange={(event) => setProductPrice(id, 'compareAt', event.target.value)}
                            placeholder="0"
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="admin-product-list">
                {matches.map((product) => (
                  <label key={product.id} className="admin-check offer-pick-row">
                    <input type="checkbox" checked={picked.includes(product.id)} onChange={() => toggleProduct(product.id)} />
                    {product.name}
                    <small>{product.categoryName}</small>
                  </label>
                ))}
              </div>
            </div>
          )}
          <label>Photo<input name="banner" type="file" accept="image/*" /></label>
          {selected?.banner?.secureUrl && (
            <div className="admin-job-preview">
              <img src={selected.banner.secureUrl} alt="" />
              <label className="admin-check"><input type="checkbox" name="removeImage" value="true" /> Remove current image</label>
            </div>
          )}
          <label className="admin-check">
            <input type="checkbox" name="published" defaultChecked={selected ? selected.published : true} /> Published
          </label>
          <div className="admin-job-actions">
            <button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save offer'}</button>
            {selected && <button type="button" className="button button-outline" onClick={() => void remove()}>Delete</button>}
            <button type="button" className="button button-outline" onClick={() => setSelectedId(null)}>Close</button>
          </div>
        </form>
      )}

      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Offer product activity</h3>
            <span>Every product click and every WhatsApp request on an offer.</span>
          </div>
        </div>
        {stats.products.length === 0 ? (
          <p className="text-muted-foreground">No offer clicks yet.</p>
        ) : (
          <div className="admin-product-list">
            {stats.products.map((row) => (
              <article key={row.productId} className="admin-product-block">
                <div className="admin-product">
                  <div>
                    <b>{row.productName}</b>
                    <small>{row.clicks} clicks · {row.whatsapp} WhatsApp</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>History</h3>
            <span>Latest offer actions, newest first.</span>
          </div>
        </div>
        {stats.events.length === 0 ? (
          <p className="text-muted-foreground">History will appear here as people click and request on WhatsApp.</p>
        ) : (
          <table className="offer-history">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Product</th>
                <th>Page</th>
              </tr>
            </thead>
            <tbody>
              {stats.events.map((item) => (
                <tr key={item._id}>
                  <td>{formatWhen(item.createdAt)}</td>
                  <td>{item.eventType === 'whatsapp' ? 'WhatsApp' : 'Click'}</td>
                  <td>{item.productName || item.productId}</td>
                  <td>{item.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
