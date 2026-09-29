import { setDefaultResultOrder } from 'node:dns'
import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'

setDefaultResultOrder('ipv4first')

const here = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(here, '..')
const repoRoot = resolve(backendRoot, '..')
const envOpts = { quiet: true }

config({ path: resolve(repoRoot, '.env'), ...envOpts })
if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(repoRoot, '.env.development'), ...envOpts })
}
config({ path: resolve(backendRoot, '.env'), ...envOpts })
config({ path: resolve(repoRoot, '.env.local'), override: true, ...envOpts })

const DEPLOYED_API_URL = 'https://accord.codewithseth.co.ke'

if (process.env.NODE_ENV === 'production' && !process.env.ACCORD_API_URL) {
  process.env.ACCORD_API_URL = DEPLOYED_API_URL
}

const { default: app } = await import('./app.ts')

function listenPort() {
  const fromUrl = process.env.ACCORD_API_URL || ''
  try {
    const parsed = new URL(fromUrl)
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const port = Number(parsed.port)
      if (port) return port
    }
  } catch {}
  return Number(process.env.PORT || process.env.ACCORD_API_PORT || 4000)
}

const port = listenPort()
const hostname = process.env.ACCORD_API_HOST || '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, (info) => {
  const publicUrl = process.env.ACCORD_API_URL || DEPLOYED_API_URL
  console.log(`Accord API listening on http://${info.address}:${info.port} (${publicUrl})`)
})
