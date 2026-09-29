import { spawn } from 'node:child_process'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MAX_PAGES = 80

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `${command} failed`))
    })
  })
}

export async function renderPdfPages(pdf: Buffer) {
  if (!pdf.length) throw new Error('Upload a PDF company profile')
  const dir = await mkdtemp(join(tmpdir(), 'accord-profile-'))
  try {
    const source = join(dir, 'profile.pdf')
    await writeFile(source, pdf)
    const prefix = join(dir, 'page')
    await run('pdftoppm', ['-jpeg', '-r', '110', '-jpegopt', 'quality=78', source, prefix])
    const files = (await readdir(dir))
      .filter((name) => name.toLowerCase().endsWith('.jpg') || name.toLowerCase().endsWith('.jpeg'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (!files.length) throw new Error('Could not read pages from that PDF')
    if (files.length > MAX_PAGES) throw new Error(`Upload a PDF with ${MAX_PAGES} pages or fewer`)
    const pages = []
    for (const name of files) {
      pages.push({
        filename: name,
        buffer: await readFile(join(dir, name)),
        mime: 'image/jpeg' as const,
      })
    }
    return pages
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined)
  }
}
