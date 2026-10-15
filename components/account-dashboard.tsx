'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatKes, productHref } from '@/lib/catalog'
import { checkoutStatusLabel, displayKenyaPhone, type CheckoutOrder } from '@/lib/checkout'
import type { CustomerAccount, CustomerInterestProduct, CustomerPurchaseProduct } from '@/lib/customers'
import { ROUTES } from '@/lib/routes'

function nairobiWhen(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
}

export function AccountDashboard({
  account,
  orders,
  viewed = [],
  bought = [],
}: {
  account: CustomerAccount
  orders: CheckoutOrder[]
  viewed?: CustomerInterestProduct[]
  bought?: CustomerPurchaseProduct[]
}) {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await fetch('/api/account/logout', { method: 'POST', credentials: 'include' }).catch(() => null)
    router.push(ROUTES.accountLogin)
    router.refresh()
  }

  return (
    <div className="account-dash">
      <section className="account-profile">
        <div>
          <h2>{account.name}</h2>
          <p>{account.facilityName}</p>
          <small>{displayKenyaPhone(account.phone)} · {account.location}</small>
        </div>
        <div className="account-profile-actions">
          <Link href={ROUTES.checkout} className="button button-primary button-compact">Checkout</Link>
          <Link href={ROUTES.products} className="button button-outline button-compact">Browse products</Link>
          <button type="button" className="button button-outline button-compact" disabled={signingOut} onClick={() => void signOut()}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>
      <section className="account-orders">
        <div className="quote-form-head">
          <h2>Your orders</h2>
          <p>Track M-Pesa checkout from this phone number.</p>
        </div>
        {orders.length === 0 ? (
          <p className="empty-state">No orders yet. When you pay for checkout products, they will show here.</p>
        ) : (
          <div className="account-order-list">
            {orders.map((order) => (
              <article key={order.id} className={`account-order is-${order.status}`}>
                <div>
                  <b>{order.reference}</b>
                  <small>{nairobiWhen(order.createdAt)}</small>
                </div>
                <ul>
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.productId}`}>{item.quantity} × {item.name}</li>
                  ))}
                </ul>
                <div className="account-order-meta">
                  <strong>{formatKes(order.amount)}</strong>
                  <span>{checkoutStatusLabel(order.status)}</span>
                  {order.mpesaReceipt ? <small>M-Pesa {order.mpesaReceipt}</small> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="account-interest">
        <div className="quote-form-head">
          <h2>Client interest</h2>
          <p>Products you have opened, added to a quote, or bought online while signed in.</p>
        </div>
        <div className="account-interest-grid">
          <div>
            <h3>Viewed products</h3>
            {viewed.length === 0 ? (
              <p className="empty-state">No product views yet. Open any product page while signed in and it will show here.</p>
            ) : (
              <div className="account-interest-list">
                {viewed.map((item) => (
                  <article key={item.productId} className="account-interest-item">
                    <Link href={productHref({ id: item.productId, slug: item.slug })}>{item.name}</Link>
                    <small>
                      {item.categoryName ? `${item.categoryName} · ` : ''}
                      {item.clicks ? `${item.clicks} view${item.clicks === 1 ? '' : 's'}` : 'Viewed'}
                      {item.carts ? ` · added to quote ${item.carts} time${item.carts === 1 ? '' : 's'}` : ''}
                      {item.lastAt ? ` · ${nairobiWhen(item.lastAt)}` : ''}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3>Bought online</h3>
            {bought.length === 0 ? (
              <p className="empty-state">No paid checkout yet. Equipment you pay for with M-Pesa will list here.</p>
            ) : (
              <div className="account-interest-list">
                {bought.map((item) => (
                  <article key={item.productId} className="account-interest-item">
                    <Link href={productHref({ id: item.productId, slug: item.slug })}>{item.quantity} × {item.name}</Link>
                    <small>Last bought {nairobiWhen(item.lastBoughtAt)}</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
