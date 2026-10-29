import type { MediaAsset } from '../../lib/content'
import { isCloudinaryConfigured, uploadSiteImage } from '../../lib/cloudinary'
import { isMysqlConfigured, mysqlSaveFile } from '../../lib/mysql'
import { prepareStoredImage } from '../../lib/image-convert'

export function formText(form: FormData, key: string) {
  return String(form.get(key) || '').trim()
}

export function formChecked(form: FormData, key: string) {
  return formText(form, key) !== 'false'
}

export async function uploadFormImage(file: FormDataEntryValue | null, folder: string, id: string): Promise<MediaAsset | null> {
  if (!(file instanceof File) || file.size <= 0) return null
  if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) throw new Error('Upload a valid image under 8MB')
  const raw = Buffer.from(await file.arrayBuffer())
  const prepared = await prepareStoredImage(raw, file.name || `${id}.jpg`, file.type)
  if (isMysqlConfigured()) {
    return mysqlSaveFile({
      kind: 'image',
      ownerKey: `${folder}/${id}`,
      filename: prepared.filename,
      mime: prepared.mime,
      buffer: prepared.buffer,
    })
  }
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured')
  const uploaded = await uploadSiteImage(prepared.buffer, folder, id)
  return { publicId: uploaded.public_id, secureUrl: uploaded.secure_url }
}

const CV_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function isCvFile(file: File) {
  const name = file.name.toLowerCase()
  return CV_TYPES.has(file.type) || name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')
}

export async function uploadFormCv(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size <= 0) return null
  if (file.size > 8 * 1024 * 1024) throw new Error('Upload a CV under 8MB')
  if (!isCvFile(file)) throw new Error('Upload a PDF or Word CV')
  const filename = (file.name || 'cv.pdf').replace(/[/\\]/g, '').slice(0, 180) || 'cv.pdf'
  return {
    buffer: Buffer.from(await file.arrayBuffer()),
    filename,
    mime: file.type || (filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
  }
}

export async function uploadFormDocument(file: FormDataEntryValue | null, folder: string, id: string): Promise<MediaAsset | null> {
  if (!(file instanceof File) || file.size <= 0) return null
  if (file.size > 20 * 1024 * 1024) throw new Error('Upload a PDF under 20MB')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!isPdf) throw new Error('Upload a PDF catalogue')
  if (!isMysqlConfigured()) throw new Error('Document storage is not configured')
  const buffer = Buffer.from(await file.arrayBuffer())
  return mysqlSaveFile({
    kind: 'document',
    ownerKey: `${folder}/${id}`,
    filename: file.name || `${id}.pdf`,
    mime: file.type || 'application/pdf',
    buffer,
  })
}
