import { NextResponse } from 'next/server'
import { accordApiPath } from '@/lib/backend-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params
  const suffix = path?.length ? `/api/${path.join('/')}` : '/api'
  const incoming = new URL(request.url)
  const target = new URL(accordApiPath(suffix))
  target.search = incoming.search

  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')

  const method = request.method.toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()
  const response = await fetch(target, {
    method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  })

  const outbound = new Headers(response.headers)
  outbound.delete('content-encoding')
  outbound.delete('transfer-encoding')
  const payload = await response.arrayBuffer()
  return new NextResponse(payload, { status: response.status, headers: outbound })
}

export const GET = proxy
export const POST = proxy
export const PATCH = proxy
export const PUT = proxy
export const DELETE = proxy
export const OPTIONS = proxy
