import Link from 'next/link'
import { displayKenyaPhone } from '@/lib/checkout'
import { productHref } from '@/lib/catalog'
import type { ClientInterestRow } from '@/lib/customers'

function nairobiWhen(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminClientInterestPanel({ rows }: { rows: ClientInterestRow[] }) {
  return (
    <div>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Client interest</h1>
          <p className="admin-header-note">Products each signed-in client has viewed, quoted, or bought online.</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="admin-card">
          <p className="empty-state">No client accounts yet. Interest is recorded after a customer signs in and opens products.</p>
        </div>
      ) : (
        <div className="client-interest-list">
          {rows.map((row) => (
            <article key={row.account.id} className="admin-card client-interest-card">
              <div className="card-title">
                <div>
                  <h3>{row.account.name}</h3>
                  <span>
                    {row.account.facilityName} · {displayKenyaPhone(row.account.phone)} · {row.account.location}
                  </span>
                </div>
                <small>
                  {row.viewed.length} viewed · {row.bought.length} bought
                </small>
              </div>
              <div className="client-interest-split">
                <div>
                  <h4>Viewed products</h4>
                  {row.viewed.length === 0 ? (
                    <p className="empty-state">No product views yet.</p>
                  ) : (
                    <ul>
                      {row.viewed.map((item) => (
                        <li key={item.productId}>
                          <Link href={productHref({ id: item.productId, slug: item.slug })}>{item.name}</Link>
                          <small>
                            {item.clicks ? `${item.clicks} view${item.clicks === 1 ? '' : 's'}` : 'Viewed'}
                            {item.carts ? ` · quote ${item.carts}` : ''}
                            {item.lastAt ? ` · ${nairobiWhen(item.lastAt)}` : ''}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4>Bought online</h4>
                  {row.bought.length === 0 ? (
                    <p className="empty-state">No paid checkout yet.</p>
                  ) : (
                    <ul>
                      {row.bought.map((item) => (
                        <li key={item.productId}>
                          <Link href={productHref({ id: item.productId, slug: item.slug })}>{item.quantity} × {item.name}</Link>
                          <small>Last bought {nairobiWhen(item.lastBoughtAt)}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
