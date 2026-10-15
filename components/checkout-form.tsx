'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { canCheckout, formatKes, productHref, type CatalogProduct } from '@/lib/catalog'
import { ROUTES } from '@/lib/routes'
import { useQuoteCart } from '@/components/quote-cart'
import { checkoutStatusLabel, displayKenyaPhone, type CheckoutOrder } from '@/lib/checkout'
import type { CustomerAccount } from '@/lib/customers'

export function CheckoutForm({
  products,
  account = null,
}: {
  products: CatalogProduct[]
  account?: CustomerAccount | null
}) {
  const { items, setQuantity, remove } = useQuoteCart()
  const byId = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const buyable = items.filter((item) => {
    const product = byId.get(item.id)
    return product ? canCheckout(product) : false
  })
  const quoteOnly = items.filter((item) => !buyable.some((row) => row.id === item.id))
  const lines = buyable.map((item) => {
    const product = byId.get(item.id)
    const unitPrice = product ? Math.round(product.price) : Math.round(item.price)
    return { ...item, unitPrice, total: unitPrice * item.quantity, name: product?.name || item.name }
  })
  const amount = lines.reduce((sum, item) => sum + item.total, 0)

  const [status, setStatus] = useState<'form' | 'waiting' | 'paid' | 'failed'>('form')
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState<Omit<CheckoutOrder, 'mpesaCheckoutId'> | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status !== 'waiting' || !order?.id) return
    let cancelled = false
    const timer = window.setInterval(() => {
      void fetch(`/api/checkout/${encodeURIComponent(order.id)}`)
        .then((response) => response.json())
        .then((payload) => {
          if (cancelled || !payload?.data) return
          const next = payload.data as CheckoutOrder
          setOrder(next)
          if (next.status === 'paid') {
            setStatus('paid')
            setMessage('Payment received. Thank you.')
            for (const item of next.items) remove(item.productId)
          } else if (next.status === 'failed' || next.status === 'cancelled') {
            setStatus('failed')
            setMessage(next.mpesaResult || 'Payment was not completed.')
          }
        })
        .catch(() => null)
    }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [status, order?.id, remove])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length) return
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          phone: data.get('phone'),
          email: data.get('email'),
          location: data.get('location'),
          items: lines.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not start checkout')
      setOrder(payload.data.order)
      setStatus('waiting')
      setMessage(payload.data.message || 'Enter your M-Pesa PIN on your phone.')
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Could not start checkout')
    } finally {
      setBusy(false)
    }
  }

  if (buyable.length === 0) {
    return (
      <div className="quote-empty">
        <p>No products in your cart are available for checkout yet.</p>
        <Link href={ROUTES.products} className="button button-primary">Browse products</Link>
        <Link href={account ? ROUTES.account : ROUTES.accountRegister} className="text-link">
          {account ? 'Track orders in your account' : 'Create an account to track orders'}
        </Link>
        {quoteOnly.length > 0 && (
          <Link href={ROUTES.quote} className="text-link">Request a quote for the other items</Link>
        )}
      </div>
    )
  }

  if (status === 'paid' && order) {
    return (
      <div className="checkout-result">
        <h2>Payment received</h2>
        <p>Thank you. Reference <b>{order.reference}</b>{order.mpesaReceipt ? ` · M-Pesa ${order.mpesaReceipt}` : ''}.</p>
        <p>We will follow up on delivery for {formatKes(order.amount)}.</p>
        <Link href={ROUTES.products} className="button button-primary">Continue shopping</Link>
        <Link href={account ? ROUTES.account : ROUTES.accountRegister} className="text-link">
          {account ? 'Track this order' : 'Create an account to track this order'}
        </Link>
      </div>
    )
  }

  return (
    <div className="quote-layout">
      <div className="quote-items">
        {lines.map((item) => (
          <article key={item.id} className="quote-item">
            <div>
              <Link href={productHref(item)} className="quote-item-name">{item.name}</Link>
              <small>{item.categoryName}</small>
            </div>
            <div className="quote-item-qty">
              <input
                type="number"
                min={1}
                max={1000}
                value={item.quantity}
                onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                aria-label={`${item.name} quantity`}
                disabled={status === 'waiting'}
              />
            </div>
            <span className="quote-item-price">{formatKes(item.total)}</span>
            {status === 'form' && (
              <button type="button" className="quote-item-remove" onClick={() => remove(item.id)}>Remove</button>
            )}
          </article>
        ))}
        {quoteOnly.length > 0 && (
          <p className="checkout-note">
            {quoteOnly.length} quote-only item{quoteOnly.length === 1 ? '' : 's'} stay on the{' '}
            <Link href={ROUTES.quote}>quote cart</Link>.
          </p>
        )}
      </div>
      <div className="quote-side">
        <p className="checkout-total"><b>{formatKes(amount)}</b><small>Pay with M-Pesa</small></p>
        {status === 'waiting' ? (
          <div className="checkout-wait">
            <p>{message || 'Enter your M-Pesa PIN on your phone.'}</p>
            <small>{order ? checkoutStatusLabel(order.status) : 'Waiting for M-Pesa'}</small>
          </div>
        ) : (
          <form className="quote-form checkout-pay-form" onSubmit={onSubmit}>
            {account ? (
              <p className="checkout-note">
                Paying as <b>{account.name}</b>, {account.facilityName}.{' '}
                <Link href={ROUTES.account}>View orders</Link>
              </p>
            ) : (
              <p className="checkout-note">
                <Link href={ROUTES.accountRegister}>Create an account</Link> to track this order.
              </p>
            )}
            <label>Name<input name="name" required defaultValue={account?.name || ''} placeholder="Your name" /></label>
            <label>M-Pesa number<input name="phone" required defaultValue={account ? displayKenyaPhone(account.phone) : ''} placeholder="07.." /></label>
            <label>Delivery location<input name="location" defaultValue={account?.location || ''} placeholder="Hospital or town" /></label>
            <label>Email<input name="email" type="email" placeholder="you@hospital.co.ke" /></label>
            <button className="button button-primary" disabled={busy}>
              {busy ? 'Sending prompt…' : `Pay ${formatKes(amount)}`}
            </button>
            {message && <p className={status === 'failed' ? 'form-error' : 'form-success'}>{message}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
