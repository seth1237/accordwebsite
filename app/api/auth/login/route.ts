import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateAdmin, setAdminSession } from '@/lib/auth'

const schema = z.object({
  email: z.string().trim().min(1).max(191),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json())
    const admin = await authenticateAdmin(body.email, body.password)
    if (!admin) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 401 })
    }
    await setAdminSession(admin.email)
    return NextResponse.json({ success: true, email: admin.email, name: admin.name })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: 'Invalid username or password' }, { status: 400 })
    }
    console.error('Admin login failed', error)
    return NextResponse.json({ success: false, message: 'Could not sign in' }, { status: 500 })
  }
}
