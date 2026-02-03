import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    resendAvailable: !!process.env.RESEND_API_KEY,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10),
    emailFrom: process.env.EMAIL_FROM,
    nodeEnv: process.env.NODE_ENV,
  })
}
