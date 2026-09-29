import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createContactMessage } from '@/lib/mongodb'
import { isStoreConfigured } from '@/lib/mysql'

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7).max(40),
  location: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10).max(2000),
})

export async function POST(request: Request) {
  if (!isStoreConfigured()) {
    return NextResponse.json({ success: false, message: 'Contact inbox is not configured' }, { status: 503 })
  }
  try {
    const body = schema.parse(await request.json())
    await createContactMessage({
      name: body.name,
      email: body.email,
      phone: body.phone,
      location: body.location || '',
      message: body.message,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, message: 'Please check the form and try again' }, { status: 400 })
  }
}
