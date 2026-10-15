import { canCheckout } from '@/lib/catalog'
import { checkoutAmount, maskPhone, normalizeKenyaPhone, parseCheckoutStatus, type CheckoutItem, type CheckoutOrder } from '@/lib/checkout'
import { getCatalog } from '@/lib/catalog-data'
import {
  isMysqlConfigured,
  mysqlCreateCheckoutOrder,
  mysqlGetCheckoutOrder,
  mysqlGetCheckoutOrderByCheckoutId,
  mysqlGetCustomerById,
  mysqlGetCustomerByPhone,
  mysqlListCheckoutOrders,
  mysqlReplaceProductCheckout,
  mysqlSetProductCheckout,
  mysqlUpdateCheckoutOrder,
} from '@/lib/mysql'
import { isMpesaConfigured, mpesaStkPush, mpesaStkQuery, parseMpesaCallback } from '@/lib/mpesa'

export function publicCheckoutOrder(order: CheckoutOrder): Omit<CheckoutOrder, 'mpesaCheckoutId'> {
  const { mpesaCheckoutId: _hidden, ...visible } = order
  return { ...visible, phone: maskPhone(order.phone) }
}

export async function setProductCheckout(id: string, checkout: boolean) {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured')
  return mysqlSetProductCheckout(id, checkout)
}

export async function replaceProductCheckout(productIds: string[]) {
  if (!isMysqlConfigured()) throw new Error('MySQL is not configured')
  return mysqlReplaceProductCheckout(productIds)
}

export async function listCheckoutOrders() {
  if (!isMysqlConfigured()) return []
  return mysqlListCheckoutOrders()
}

export async function getCheckoutOrder(id: string) {
  if (!isMysqlConfigured()) return null
  return mysqlGetCheckoutOrder(id)
}

async function pricedCheckoutItems(rawItems: Array<{ productId?: string; quantity?: number }>) {
  const catalog = await getCatalog()
  const byId = new Map(catalog.products.map((product) => [product.id, product]))
  const items: CheckoutItem[] = []
  for (const row of rawItems) {
    const product = byId.get(String(row.productId || ''))
    const quantity = Math.max(1, Math.min(1000, Math.floor(Number(row.quantity) || 1)))
    if (!product || !canCheckout(product)) {
      throw new Error('One or more products are not available for checkout')
    }
    items.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: Math.round(product.price),
    })
  }
  if (!items.length) throw new Error('Add a product that is available for checkout')
  const amount = checkoutAmount(items)
  if (amount < 1) throw new Error('Checkout total must be at least KES 1')
  return { items, amount }
}

export async function startCheckout(input: {
  name: string
  phone: string
  email?: string
  location?: string
  items: Array<{ productId?: string; quantity?: number }>
  customerId?: string
}) {
  if (!isMysqlConfigured()) throw new Error('Checkout is not available right now')
  if (!isMpesaConfigured()) throw new Error('M-Pesa is not configured')
  const signedIn = input.customerId ? await mysqlGetCustomerById(input.customerId) : null
  const customerName = String(input.name || signedIn?.name || '').trim()
  if (customerName.length < 2) throw new Error('Enter your name')
  const phone = normalizeKenyaPhone(input.phone || signedIn?.phone)
  if (!phone) throw new Error('Enter a valid Kenyan M-Pesa number')
  const location = String(input.location || signedIn?.location || '').trim()
  const matched = signedIn || await mysqlGetCustomerByPhone(phone)
  const { items, amount } = await pricedCheckoutItems(input.items)
  const order = await mysqlCreateCheckoutOrder({
    customerName,
    phone,
    email: String(input.email || '').trim(),
    location,
    amount,
    items,
    customerId: matched?.id,
  })
  try {
    const push = await mpesaStkPush({
      phone,
      amount,
      reference: order.reference,
      description: 'Accord order',
    })
    const updated = await mysqlUpdateCheckoutOrder(order.id, {
      mpesaCheckoutId: push.checkoutRequestId,
      mpesaMerchantId: push.merchantRequestId,
      mpesaResult: push.customerMessage,
    })
    return {
      order: publicCheckoutOrder(updated || order),
      message: push.customerMessage,
    }
  } catch (error) {
    await mysqlUpdateCheckoutOrder(order.id, {
      status: 'failed',
      mpesaResult: error instanceof Error ? error.message : 'Could not start M-Pesa payment',
    })
    throw error
  }
}

export async function refreshCheckoutOrder(id: string) {
  if (!isMysqlConfigured()) return null
  const order = await mysqlGetCheckoutOrder(id)
  if (!order) return null
  if (order.status !== 'pending' || !order.mpesaCheckoutId) return publicCheckoutOrder(order)
  let query: Awaited<ReturnType<typeof mpesaStkQuery>>
  try {
    query = await mpesaStkQuery(order.mpesaCheckoutId)
  } catch {
    return publicCheckoutOrder(order)
  }
  if (query.status === 'pending') return publicCheckoutOrder(order)
  const updated = await mysqlUpdateCheckoutOrder(id, {
    status: parseCheckoutStatus(query.status),
    mpesaResult: query.resultDesc,
  })
  return publicCheckoutOrder(updated || order)
}

export async function applyMpesaCallback(body: unknown) {
  const parsed = parseMpesaCallback(body)
  if (!parsed.checkoutRequestId) return { ok: true }
  const order = await mysqlGetCheckoutOrderByCheckoutId(parsed.checkoutRequestId)
  if (!order || order.status === 'paid') return { ok: true }
  if (parsed.resultCode === 0) {
    await mysqlUpdateCheckoutOrder(order.id, {
      status: 'paid',
      mpesaReceipt: parsed.receipt,
      mpesaResult: parsed.resultDesc || 'Paid',
    })
  } else if (parsed.resultCode === 1032) {
    await mysqlUpdateCheckoutOrder(order.id, {
      status: 'cancelled',
      mpesaResult: parsed.resultDesc || 'Payment cancelled',
    })
  } else {
    await mysqlUpdateCheckoutOrder(order.id, {
      status: 'failed',
      mpesaResult: parsed.resultDesc || 'Payment was not completed',
    })
  }
  return { ok: true }
}
