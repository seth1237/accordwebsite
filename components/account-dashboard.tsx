'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatKes } from '@/lib/catalog'
import { checkoutStatusLabel, displayKenyaPhone, type CheckoutOrder } from '@/lib/checkout'
import type { CustomerAccount } from '@/lib/customers'
import { ROUTES } from '@/lib/routes'

export function AccountDashboard({
  account,
  orders,
}: {
  account: CustomerAccount
  orders: CheckoutOrder[]
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
                  <small>{new Date(order.createdAt).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}</small>
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
    </div>
  )
}
