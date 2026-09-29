import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { slugifyName } from '@/lib/catalog'
import { deleteCloudinaryImage, isCloudinaryConfigured, uploadSiteImage } from '@/lib/cloudinary'
import { createJob, listJobs } from '@/lib/mongodb'
import { isMysqlConfigured, isStoreConfigured, mysqlSaveFile } from '@/lib/mysql'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function text(form: FormData, key: string) {
  return String(form.get(key) || '').trim()
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })
  try {
    return NextResponse.json({ success: true, data: await listJobs(false) })
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Could not load jobs',
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ success: false, message: 'Sign in required' }, { status: 401 })
  if (!isStoreConfigured()) return NextResponse.json({ success: false, message: 'Database is not configured' }, { status: 503 })

  const form = await request.formData()
  const title = text(form, 'title')
  const description = text(form, 'description')
  if (!title || !description) {
    return NextResponse.json({ success: false, message: 'Title and details are required' }, { status: 400 })
  }

  let image: { publicId: string; secureUrl: string } | null = null
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
    } else {
      if (!isCloudinaryConfigured()) {
        return NextResponse.json({ success: false, message: 'Cloudinary is not configured' }, { status: 503 })
      }
      const uploaded = await uploadSiteImage(Buffer.from(await file.arrayBuffer()), 'tarumed/jobs', slugifyName(title) || 'job')
      image = { publicId: uploaded.public_id, secureUrl: uploaded.secure_url }
    }
  }

  try {
    const job = await createJob({
      title,
      slug: slugifyName(title) || 'role',
      location: text(form, 'location') || 'Nairobi',
      employmentType: text(form, 'employmentType') || 'Full time',
      department: text(form, 'department'),
      summary: text(form, 'summary') || description.slice(0, 160),
      description,
      requirements: text(form, 'requirements'),
      applyEmail: text(form, 'applyEmail') || COMPANY.careersEmail,
      image,
      published: text(form, 'published') !== 'false',
    })
    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    if (image?.publicId && !image.publicId.startsWith('mysql:')) await deleteCloudinaryImage(image.publicId).catch(() => undefined)
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Could not create job',
    }, { status: 500 })
  }
}
