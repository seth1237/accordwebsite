'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatKes, productImageSrc, type CatalogProduct } from '@/lib/catalog'
import { checkoutStatusLabel, type CheckoutOrder } from '@/lib/checkout'

export function AdminCheckoutPanel({
  products,
  orders,
}: {
  products: CatalogProduct[]
  orders: CheckoutOrder[]
}) {
  const router = useRouter()
  const priced = useMemo(
    () => products.filter((product) => product.price > 0 && !product.hidden).sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  )
  const [selected, setSelected] = useState(() => new Set(priced.filter((product) => product.checkout).map((product) => product.id)))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all')

  const visibleOrders = orders.filter((order) => {
    if (filter === 'all') return true
    if (filter === 'failed') return order.status === 'failed' || order.status === 'cancelled'
    return order.status === filter
  })

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/checkout/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: [...selected] }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) {
      setMessage(payload.message || 'Could not save checkout products')
      return
    }
    setMessage(`${selected.size} priced product${selected.size === 1 ? '' : 's'} can be bought on the website.`)
    router.refresh()
  }

  return (
    <div className="admin-checkout">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Checkout</h1>
          <p className="admin-header-note">Choose priced products visitors can pay for with M-Pesa. Everything else stays quote-only.</p>
        </div>
        <button type="button" className="button button-primary button-compact" disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save checkout products'}
        </button>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <section className="admin-card">
        <div className="card-title">
          <div>
            <h3>Products with prices</h3>
            <span>Select the items that should show Buy now and M-Pesa checkout.</span>
          </div>
          <small className="page-status">{selected.size} selected</small>
        </div>
        <div className="checkout-pick-list">
          {priced.map((product) => (
            <label key={product.id} className={selected.has(product.id) ? 'checkout-pick is-on' : 'checkout-pick'}>
              <input
                type="checkbox"
                checked={selected.has(product.id)}
                onChange={() => toggle(product.id)}
              />
              <img src={productImageSrc(product)} alt="" />
              <span>
                <b>{product.name}</b>
                <small>{product.categoryName} · {formatKes(product.price)}</small>
              </span>
            </label>
          ))}
          {priced.length === 0 && <p className="empty-state">No priced products yet. Add a price, then enable checkout.</p>}
        </div>
      </section>
      <section className="admin-card">
        <div className="card-title">
          <div>
            <h3>Orders</h3>
            <span>M-Pesa payments from the website checkout.</span>
          </div>
          <select
            className="filter-input category-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            aria-label="Filter orders"
          >
            <option value="all">All orders</option>
            <option value="pending">Waiting</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed / cancelled</option>
          </select>
        </div>
        <div className="visitor-table-wrap search-history-wrap">
          <table className="visitor-table search-history">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <b>{order.reference}</b>
                    {order.mpesaReceipt ? <small className="order-receipt"> {order.mpesaReceipt}</small> : null}
                  </td>
                  <td>
                    {order.customerName}
                    <small className="order-meta">{order.phone}{order.location ? ` · ${order.location}` : ''}</small>
                  </td>
                  <td>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</td>
                  <td>{formatKes(order.amount)}</td>
                  <td>{checkoutStatusLabel(order.status)}</td>
                  <td>{new Date(order.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleOrders.length === 0 && <p className="empty-state">No checkout orders yet.</p>}
        </div>
      </section>
    </div>
  )
}
