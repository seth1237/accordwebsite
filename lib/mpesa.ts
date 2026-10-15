import { DEPLOYED_ACCORD_API_URL } from '@/lib/backend-url'

type TokenCache = { token: string; expiresAt: number }

const globalForMpesa = globalThis as typeof globalThis & { __accordMpesaToken?: TokenCache }

function mpesaEnv() {
  return (process.env.MPESA_ENV || 'sandbox').trim().toLowerCase() === 'production' ? 'production' : 'sandbox'
}

function mpesaBaseUrl() {
  return mpesaEnv() === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke'
}

function required(name: string) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error('M-Pesa is not configured')
  return value
}

export function isMpesaConfigured() {
  return Boolean(
    process.env.MPESA_CONSUMER_KEY
    && process.env.MPESA_CONSUMER_SECRET
    && process.env.MPESA_PASSKEY
    && process.env.MPESA_SHORTCODE,
  )
}

function mpesaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || ''
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`
}

function mpesaPassword(timestamp: string) {
  const shortcode = required('MPESA_SHORTCODE')
  const passkey = required('MPESA_PASSKEY')
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
}

export function mpesaCallbackUrl() {
  const fromEnv = String(process.env.MPESA_CALLBACK_URL || '').trim()
  if (fromEnv) return fromEnv
  const api = String(process.env.ACCORD_API_URL || DEPLOYED_ACCORD_API_URL).replace(/\/$/, '')
  try {
    const host = new URL(api).hostname
    if (host === '127.0.0.1' || host === 'localhost') {
      return `${DEPLOYED_ACCORD_API_URL}/api/checkout/mpesa/callback`
    }
  } catch {}
  return `${api}/api/checkout/mpesa/callback`
}

async function mpesaToken() {
  const cached = globalForMpesa.__accordMpesaToken
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token
  const key = required('MPESA_CONSUMER_KEY')
  const secret = required('MPESA_CONSUMER_SECRET')
  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const response = await fetch(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  const payload = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: string }
  if (!response.ok || !payload.access_token) throw new Error('Could not connect to M-Pesa')
  const expires = Math.max(60, Number(payload.expires_in) || 3599)
  globalForMpesa.__accordMpesaToken = { token: payload.access_token, expiresAt: Date.now() + expires * 1000 }
  return payload.access_token
}

async function mpesaPost(path: string, body: Record<string, string | number>) {
  const token = await mpesaToken()
  const response = await fetch(`${mpesaBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, payload: payload as Record<string, unknown> }
}

export async function mpesaStkPush(input: { phone: string; amount: number; reference: string; description?: string }) {
  if (!isMpesaConfigured()) throw new Error('M-Pesa is not configured')
  const timestamp = mpesaTimestamp()
  const shortcode = required('MPESA_SHORTCODE')
  const { ok, payload } = await mpesaPost('/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: shortcode,
    Password: mpesaPassword(timestamp),
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.max(1, Math.round(input.amount)),
    PartyA: input.phone,
    PartyB: shortcode,
    PhoneNumber: input.phone,
    CallBackURL: mpesaCallbackUrl(),
    AccountReference: input.reference.slice(0, 12),
    TransactionDesc: (input.description || 'Accord Medical Supplies').slice(0, 13),
  })
  const checkoutRequestId = String(payload.CheckoutRequestID || '')
  const merchantRequestId = String(payload.MerchantRequestID || '')
  const responseCode = String(payload.ResponseCode ?? '')
  const error = String(payload.errorMessage || payload.CustomerMessage || payload.ResponseDescription || '')
  if (!ok || responseCode !== '0' || !checkoutRequestId) {
    throw new Error(error || 'Could not start M-Pesa payment')
  }
  return {
    checkoutRequestId,
    merchantRequestId,
    customerMessage: String(payload.CustomerMessage || 'Enter your M-Pesa PIN on your phone.'),
  }
}

export async function mpesaStkQuery(checkoutRequestId: string) {
  if (!isMpesaConfigured()) throw new Error('M-Pesa is not configured')
  const timestamp = mpesaTimestamp()
  const { payload } = await mpesaPost('/mpesa/stkpushquery/v1/query', {
    BusinessShortCode: required('MPESA_SHORTCODE'),
    Password: mpesaPassword(timestamp),
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  })
  const resultCode = String(payload.ResultCode ?? '')
  const resultDesc = String(payload.ResultDesc || payload.errorMessage || '')
  if (resultCode === '0') return { status: 'paid' as const, resultDesc }
  if (resultCode === '1032') return { status: 'cancelled' as const, resultDesc }
  if (resultCode === '4999' || resultCode === '1037' || resultCode === '') {
    return { status: 'pending' as const, resultDesc }
  }
  return { status: 'failed' as const, resultDesc: resultDesc || 'Payment was not completed' }
}

export function parseMpesaCallback(body: unknown) {
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const wrapped = root.Body && typeof root.Body === 'object' ? root.Body as Record<string, unknown> : root
  const callback = wrapped.stkCallback && typeof wrapped.stkCallback === 'object'
    ? wrapped.stkCallback as Record<string, unknown>
    : wrapped
  const metadata = callback.CallbackMetadata && typeof callback.CallbackMetadata === 'object'
    ? callback.CallbackMetadata as { Item?: Array<{ Name?: string; Value?: unknown }> }
    : { Item: [] }
  const items = Array.isArray(metadata.Item) ? metadata.Item : []
  const valueOf = (name: string) => {
    const hit = items.find((item) => String(item.Name || '').toLowerCase() === name.toLowerCase())
    return hit ? String(hit.Value ?? '') : ''
  }
  const resultCode = Number(callback.ResultCode)
  return {
    merchantRequestId: String(callback.MerchantRequestID || ''),
    checkoutRequestId: String(callback.CheckoutRequestID || ''),
    resultCode: Number.isFinite(resultCode) ? resultCode : -1,
    resultDesc: String(callback.ResultDesc || ''),
    receipt: valueOf('MpesaReceiptNumber'),
    amount: Number(valueOf('Amount')) || 0,
    phone: valueOf('PhoneNumber'),
  }
}
