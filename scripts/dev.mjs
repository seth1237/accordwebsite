import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const API_HEALTH = 'http://127.0.0.1:4000/health'

function run(name, command, args, extra = {}) {
  const child = spawn(command, args, {
    cwd: extra.cwd || root,
    stdio: extra.stdio || 'inherit',
    shell: false,
    env: process.env,
  })
  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    if (signal) process.exit(1)
    if (code && code !== 0) process.exit(code)
  })
  child.on('error', (error) => {
    console.error(`[${name}] ${error.message}`)
    process.exit(1)
  })
  return child
}

let shuttingDown = false
const children = []

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

function sleep(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms))
}

async function pingHealth() {
  try {
    const response = await fetch(API_HEALTH, { signal: AbortSignal.timeout(800) })
    return response.ok
  } catch {
    return false
  }
}

async function waitForApi({ tries = 80, streakNeeded = 3 } = {}) {
  let streak = 0
  for (let i = 0; i < tries; i += 1) {
    if (await pingHealth()) {
      streak += 1
      if (streak >= streakNeeded) return true
    } else {
      streak = 0
    }
    await sleep(250)
  }
  return false
}

console.log('Starting Accord API on http://127.0.0.1:4000')
const alreadyUp = await waitForApi({ tries: 3, streakNeeded: 2 })
if (!alreadyUp) {
  children.push(run('api', 'npm', ['run', 'dev'], { cwd: resolve(root, 'backend') }))
  const ready = await waitForApi()
  if (!ready) {
    console.error('Accord API did not start on port 4000.')
    shutdown()
    process.exit(1)
  }
  // tsx watch often restarts once after the first compile; wait through that.
  await sleep(800)
  if (!(await waitForApi({ tries: 40, streakNeeded: 2 }))) {
    console.error('Accord API restarted and did not come back on port 4000.')
    shutdown()
    process.exit(1)
  }
} else {
  console.log('Using Accord API already running on port 4000')
}

console.log('Accord API is ready. Starting Next.js on http://localhost:3000')
children.push(run('web', 'npx', ['next', 'dev', '-H', '0.0.0.0']))
