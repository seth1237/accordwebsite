import { setDefaultResultOrder } from 'node:dns'
import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'

setDefaultResultOrder('ipv4first')

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const envOpts = { quiet: true }
config({ path: resolve(root, '.env'), ...envOpts })
if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(root, '.env.development'), ...envOpts })
} else {
  config({ path: resolve(root, '.env.production'), ...envOpts })
}
config({ path: resolve(root, '.env.local'), override: true, ...envOpts })

const { default: app } = await import('./app.ts')

function listenPort() {
  const fromUrl = process.env.ACCORD_API_URL || process.env.NEXT_PUBLIC_ACCORD_API_URL || ''
  try {
    const parsed = new URL(fromUrl)
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const port = Number(parsed.port)
      if (port) return port
    }
  } catch {}
  return Number(process.env.ACCORD_API_PORT || process.env.PORT || 4000)
}

const port = listenPort()
const hostname = process.env.ACCORD_API_HOST || '0.0.0.0'

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`Accord API listening on http://${info.address}:${info.port}`)
})
