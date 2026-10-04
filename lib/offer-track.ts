const VISITOR_KEY = 'accord_vid'

function visitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return ''
  }
}

export function trackOfferEvent(input: {
  type: 'click' | 'whatsapp'
  productId: string
  productName?: string
  offerId?: string
  path?: string
}) {
  if (!input.productId) return
  void fetch('/api/offers/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: input.type,
      productId: input.productId,
      productName: input.productName || '',
      offerId: input.offerId || '',
      path: input.path || (typeof window !== 'undefined' ? window.location.pathname : ''),
      visitorId: visitorId(),
    }),
    keepalive: true,
  }).catch(() => null)
}
