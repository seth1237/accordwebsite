import { cookies } from 'next/headers'
import {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  adminCookieOptions,
  authenticateAdmin,
  createAdminSessionValue,
  parseAdminSessionValue,
  parseCustomerSessionValue,
} from '@/lib/auth-core'

export {
  ADMIN_COOKIE,
  CUSTOMER_COOKIE,
  adminCookieOptions,
  authenticateAdmin,
  createAdminSessionValue,
  createCustomerSessionValue,
  customerCookieOptions,
  ensureSeedAdmin,
  hashPassword,
  parseAdminSessionValue,
  parseCustomerSessionValue,
  verifyPassword,
} from '@/lib/auth-core'

export async function setAdminSession(email: string) {
  const store = await cookies()
  store.set(ADMIN_COOKIE, createAdminSessionValue(email), adminCookieOptions())
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  const store = await cookies()
  return parseAdminSessionValue(store.get(ADMIN_COOKIE)?.value)
}

export async function getCustomerSession(): Promise<{ id: string; phone: string; name: string } | null> {
  const store = await cookies()
  return parseCustomerSessionValue(store.get(CUSTOMER_COOKIE)?.value)
}
