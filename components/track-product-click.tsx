'use client'

import { useEffect } from 'react'

const LAST_KEY = 'tarumed-last-product'

export function TrackProductClick({
  productId,
  productName,
  categoryId,
  categoryName,
}: {
  productId: string
  productName: string
  categoryId: string
  categoryName: string
}) {
  useEffect(() => {
    const key = `tarumed-click-${productId}`
    let fromProductId = ''
    try {
      const last = Number(sessionStorage.getItem(key) || 0)
      if (Date.now() - last < 2000) return
      sessionStorage.setItem(key, String(Date.now()))
      fromProductId = sessionStorage.getItem(LAST_KEY) || ''
      sessionStorage.setItem(LAST_KEY, productId)
    } catch {}

    void fetch('/api/products/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        productName,
        categoryId,
        categoryName,
        fromProductId: fromProductId && fromProductId !== productId ? fromProductId : undefined,
      }),
      keepalive: true,
    })
  }, [productId, productName, categoryId, categoryName])

  return null
}
