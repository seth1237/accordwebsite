import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const standalone = resolve(root, '.next/standalone/server.js')
const staticDir = resolve(root, '.next/standalone/.next/static')

if (!existsSync(standalone)) {
  console.error('No production build found. Run `npm run build` first.')
  process.exit(1)
}

if (!existsSync(staticDir)) {
  await import('./copy-standalone-assets.mjs')
}

if (!existsSync(staticDir)) {
  console.error('Standalone build is missing /_next/static. Re-run `npm run build`.')
  process.exit(1)
}

const child = spawn(process.execPath, ['server.js'], {
  stdio: 'inherit',
  env: process.env,
  cwd: resolve(root, '.next/standalone'),
})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
