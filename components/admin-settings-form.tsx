'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminSettingsForm({ showPrices }: { showPrices: boolean }) {
  const router = useRouter()
  const [pricesOn, setPricesOn] = useState(showPrices)
  const [message, setMessage] = useState('')

  async function togglePrices() {
    const next = !pricesOn
    setPricesOn(next)
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showPrices: next }),
    })
    const payload = await response.json()
    if (!response.ok) {
      setPricesOn(!next)
      setMessage(payload.message || 'Could not update price visibility')
      return
    }
    setMessage(next ? 'Prices are now visible on the website.' : 'Prices are hidden. Visitors will see “Request a quote”.')
    router.refresh()
  }

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Tarumed content manager</span>
          <h1>Settings</h1>
        </div>
      </header>
      {message && <p className="admin-message">{message}</p>}
      <div className="admin-card price-setting">
        <div className="setting-row">
          <div>
            <h3>Show prices on the website</h3>
            <span>Visitors cannot change this. When off, product cards show “Request a quote”.</span>
          </div>
          <button type="button" className={pricesOn ? 'fake-switch on' : 'fake-switch'} onClick={togglePrices} aria-pressed={pricesOn}>
            <span />
          </button>
        </div>
      </div>
    </>
  )
}
