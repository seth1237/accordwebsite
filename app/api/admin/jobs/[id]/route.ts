import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { slugifyName } from '@/lib/catalog'
import { deleteCloudinaryImage, isCloudinaryConfigured, uploadSiteImage } from '@/lib/cloudinary'
import { deleteJob, getJobById, updateJob } from '@/lib/mongodb'
import { isMysqlConfigured, isStoreConfigured, mysqlDeleteFile, mysqlSaveFile } from '@/lib/mysql'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function text(form: FormData, key: string) {
  return String(form.get(key) || '').trim()
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })

  const { id } = await params
  const existing = await getJobById(id)
  if (!existing) return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 })

  const form = await request.formData()
  const title = text(form, 'title') || existing.title
  let image = existing.image
  const file = form.get('image')
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/') || file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'Upload a valid image under 8MB' }, { status: 400 })
    }
    if (isMysqlConfigured()) {
      image = await mysqlSaveFile({
        kind: 'image',
        ownerKey: `job/${slugifyName(title) || 'job'}`,
        filename: file.name || 'job.jpg',
        mime: file.type,
        buffer: Buffer.from(await file.arrayBuffer()),
      })
      if (existing.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
    } else {
      if (!isCloudinaryConfigured()) {
        return NextResponse.json({ success: false, message: 'Cloudinary is not configured' }, { status: 503 })
      }
      const uploaded = await uploadSiteImage(Buffer.from(await file.arrayBuffer()), 'tarumed/jobs', slugifyName(title) || 'job')
      if (existing.image?.publicId) await deleteCloudinaryImage(existing.image.publicId).catch(() => undefined)
      image = { publicId: uploaded.public_id, secureUrl: uploaded.secure_url }
    }
  }
  if (text(form, 'removeImage') === 'true') {
    if (existing.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(existing.image.publicId).catch(() => undefined)
    else if (existing.image?.publicId) await deleteCloudinaryImage(existing.image.publicId).catch(() => undefined)
    image = null
  }

  try {
    const job = await updateJob(id, {
      title,
      slug: slugifyName(title) || existing.slug,
      location: text(form, 'location') || existing.location,
      employmentType: text(form, 'employmentType') || existing.employmentType,
      department: text(form, 'department'),
      summary: text(form, 'summary') || existing.summary,
      description: text(form, 'description') || existing.description,
      requirements: text(form, 'requirements'),
      applyEmail: text(form, 'applyEmail') || COMPANY.careersEmail,
      image,
      published: text(form, 'published') !== 'false',
    })
    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Could not update job',
    }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })
  const { id } = await params
  const removed = await deleteJob(id)
  if (!removed) return NextResponse.json({ success: false, message: 'Job not found' }, { status: 404 })
  if (removed.image?.publicId?.startsWith('mysql:')) await mysqlDeleteFile(removed.image.publicId).catch(() => undefined)
  else if (removed.image?.publicId) await deleteCloudinaryImage(removed.image.publicId).catch(() => undefined)
  return NextResponse.json({ success: true })
}
