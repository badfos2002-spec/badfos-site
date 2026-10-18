/**
 * אימות אדמין לבקשת API — אותו מנגנון בדיוק כמו ב-/api/admin/system-status,
 * retry-upscale ו-download-design: Bearer <Firebase ID token>, אימות עם
 * Admin SDK, ואז זהות האדמין (אימייל + email_verified).
 *
 * מחזיר null כשהבקשה מאושרת, או תשובת שגיאה מוכנה להחזרה.
 */
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminSdkUnavailable } from '@/lib/firebase-admin'

export async function rejectUnlessAdmin(request: NextRequest, routeName: string): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const idToken = authHeader.slice('Bearer '.length).trim()
  if (!idToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(idToken)
  } catch {
    // SDK מת זה לא טוקן רע — fail closed, אבל לומר איזו תקלה זו.
    const unavailable = adminSdkUnavailable()
    if (unavailable) {
      console.error(
        `[ADMIN_SDK_UNAVAILABLE] ${routeName}: the admin token could not be verified because the Firebase ` +
        'Admin SDK is not initialised — this is an outage, not a rejected login. Reason:',
        unavailable
      )
      return NextResponse.json({ error: 'admin_sdk_unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (decoded.email !== 'badfos2002@gmail.com' || decoded.email_verified !== true) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}
