import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const DOCUMENT_KINDS = new Set(['catalogue', 'document', 'job-cv'])

export function isDocumentKind(kind: string) {
  return DOCUMENT_KINDS.has(kind)
}

export function uploadsRoot() {
  if (process.env.ACCORD_UPLOADS_DIR) return resolve(process.env.ACCORD_UPLOADS_DIR)
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', 'uploads')
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'file'
}

function extensionFor(filename: string) {
  const name = filename.toLowerCase()
  if (name.endsWith('.docx')) return '.docx'
  if (name.endsWith('.doc')) return '.doc'
  return '.pdf'
}

export function resolveStoredPath(relativePath: string) {
  const root = uploadsRoot()
  const abs = resolve(root, relativePath)
  const rel = relative(root, abs)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Invalid file path')
  return abs
}

export async function writeStoredDocument(input: {
  kind: string
  filename: string
  buffer: Buffer
}) {
  const ext = extensionFor(input.filename)
  const stem = safeSegment(input.filename.replace(/\.[^.]+$/, ''))
  const relativePath = `${safeSegment(input.kind)}/${Date.now()}-${randomUUID().slice(0, 8)}-${stem}${ext}`
  const abs = resolveStoredPath(relativePath)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, input.buffer)
  return relativePath
}

export async function readStoredDocument(relativePath: string) {
  return readFile(resolveStoredPath(relativePath))
}

export async function deleteStoredDocument(relativePath: string) {
  if (!relativePath) return
  try {
    await unlink(resolveStoredPath(relativePath))
  } catch {
    // already removed
  }
}
