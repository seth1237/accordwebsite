export type CheckoutStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export type CheckoutItem = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

export type CheckoutOrder = {
  id: string
  reference: string
  status: CheckoutStatus
  customerName: string
  phone: string
  email: string
  location: string
  customerId?: string
  amount: number
  items: CheckoutItem[]
  mpesaReceipt: string
  mpesaResult: string
  mpesaCheckoutId?: string
  createdAt: string
  updatedAt: string
}

export function normalizeKenyaPhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '')
  let phone = digits
  if (phone.startsWith('254') && phone.length === 12) {
    // already international
  } else if (phone.startsWith('0') && phone.length === 10) {
    phone = `254${phone.slice(1)}`
  } else if ((phone.startsWith('7') || phone.startsWith('1')) && phone.length === 9) {
    phone = `254${phone}`
  }
  return /^254(7|1)\d{8}$/.test(phone) ? phone : ''
}

export function checkoutAmount(items: Array<{ quantity: number; unitPrice: number }>) {
  const total = items.reduce((sum, item) => sum + Math.max(1, Math.floor(item.quantity) || 1) * Math.max(0, Number(item.unitPrice) || 0), 0)
  return Math.max(0, Math.round(total))
}

export function parseCheckoutStatus(value: unknown): CheckoutStatus {
  return value === 'paid' || value === 'failed' || value === 'cancelled' ? value : 'pending'
}

export function checkoutStatusLabel(status: CheckoutStatus) {
  if (status === 'paid') return 'Paid'
  if (status === 'failed') return 'Failed'
  if (status === 'cancelled') return 'Cancelled'
  return 'Waiting for M-Pesa'
}

export function maskPhone(phone: string) {
  const digits = String(phone || '')
  if (digits.length < 6) return digits
  return `${digits.slice(0, 6)}***${digits.slice(-3)}`
}

export function displayKenyaPhone(phone: string) {
  const normalized = normalizeKenyaPhone(phone)
  if (!normalized) return String(phone || '')
  return `0${normalized.slice(3)}`
}
