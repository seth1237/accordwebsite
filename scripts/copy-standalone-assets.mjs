import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const standalone = resolve(root, '.next/standalone')
if (!existsSync(resolve(standalone, 'server.js'))) process.exit(0)

const staticSrc = resolve(root, '.next/static')
const publicSrc = resolve(root, 'public')
mkdirSync(resolve(standalone, '.next'), { recursive: true })
if (existsSync(staticSrc)) {
  cpSync(staticSrc, resolve(standalone, '.next/static'), { recursive: true })
}
if (existsSync(publicSrc)) {
  cpSync(publicSrc, resolve(standalone, 'public'), { recursive: true })
}
console.log('Copied CSS, JS, and public files into .next/standalone')
