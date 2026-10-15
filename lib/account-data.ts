import { normalizeKenyaPhone, type CheckoutOrder } from '@/lib/checkout'
import type { CustomerAccount, CustomerInterestProduct, CustomerPurchaseProduct } from '@/lib/customers'
import {
  isMysqlConfigured,
  mysqlCreateCustomer,
  mysqlGetCustomerById,
  mysqlGetCustomerByPhone,
  mysqlLinkOrdersToCustomer,
  mysqlListClientInterestBoard,
  mysqlListCustomerInterest,
  mysqlListCustomerOrders,
  mysqlListCustomerPurchases,
  mysqlRecordCustomerInterest,
  mysqlTouchCustomer,
} from '@/lib/mysql'

function cleanName(value: unknown, label: string, min = 2) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length < min) throw new Error(`Enter ${label}`)
  return text.slice(0, 120)
}

export async function registerCustomer(input: {
  name: string
  facilityName: string
  phone: string
  location: string
}): Promise<CustomerAccount> {
  if (!isMysqlConfigured()) throw new Error('Accounts are not available right now')
  const phone = normalizeKenyaPhone(input.phone)
  if (!phone) throw new Error('Enter a valid Kenyan phone number')
  return mysqlCreateCustomer({
    name: cleanName(input.name, 'your name'),
    facilityName: cleanName(input.facilityName, 'the facility name'),
    phone,
    location: cleanName(input.location, 'location'),
  })
}

export async function loginCustomer(phoneValue: unknown): Promise<CustomerAccount> {
  if (!isMysqlConfigured()) throw new Error('Accounts are not available right now')
  const phone = normalizeKenyaPhone(phoneValue)
  if (!phone) throw new Error('Enter the phone number for this account')
  const customer = await mysqlGetCustomerByPhone(phone)
  if (!customer) throw new Error('No account uses that phone number. Create an account first.')
  await mysqlTouchCustomer(customer.id)
  await mysqlLinkOrdersToCustomer(customer.id, customer.phone)
  return customer
}

export async function getCustomerAccount(id: string) {
  if (!isMysqlConfigured()) return null
  const customer = await mysqlGetCustomerById(id)
  if (customer) await mysqlTouchCustomer(customer.id)
  return customer
}

export async function listAccountOrders(input: { customerId: string; phone: string }): Promise<CheckoutOrder[]> {
  if (!isMysqlConfigured()) return []
  return mysqlListCustomerOrders({ customerId: input.customerId, phone: input.phone })
}

export async function recordCustomerInterest(input: {
  customerId: string
  productId: string
  productName: string
  categoryId?: string
  categoryName?: string
  kind: 'click' | 'cart'
}) {
  if (!isMysqlConfigured()) return
  await mysqlRecordCustomerInterest(input)
}

export async function listAccountInterest(customerId: string): Promise<CustomerInterestProduct[]> {
  if (!isMysqlConfigured()) return []
  return mysqlListCustomerInterest(customerId)
}

export async function listAccountPurchases(input: { customerId: string; phone: string }): Promise<CustomerPurchaseProduct[]> {
  if (!isMysqlConfigured()) return []
  return mysqlListCustomerPurchases(input)
}

export async function listClientInterestBoard() {
  if (!isMysqlConfigured()) return []
  return mysqlListClientInterestBoard()
}
