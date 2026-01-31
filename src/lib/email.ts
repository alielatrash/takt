import { Resend } from 'resend'

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'Silsila <noreply@silsila.app>'

interface SendOTPEmailParams {
  to: string
  firstName: string
  otp: string
  purpose: 'verification' | 'login'
}

interface SendPasswordResetEmailParams {
  to: string
  firstName: string
  resetUrl: string
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl }: SendPasswordResetEmailParams) {
  const subject = 'Reset your password - Silsila'

  // In development without API key, log the reset URL instead
  if (!resend) {
    console.log('='.repeat(50))
    console.log(`PASSWORD RESET EMAIL (dev mode - no Resend API key)`)
    console.log(`To: ${to}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log('='.repeat(50))
    return { id: 'dev-mode' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Silsila</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${firstName},</p>

    <p>We received a request to reset your password for your Silsila account.</p>

    <p>Click the button below to reset your password. This link will expire in 1 hour.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        Reset Password
      </a>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #6b7280; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      Silsila<br>
      This is an automated message, please do not reply.
    </p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Password reset email error:', error)
    throw error
  }
}

export async function sendOTPEmail({ to, firstName, otp, purpose }: SendOTPEmailParams) {
  const subject = purpose === 'verification'
    ? 'Verify your email - Silsila'
    : 'Your login code - Silsila'

  const purposeText = purpose === 'verification'
    ? 'verify your email address'
    : 'log in to your account'

  // In development without API key, log the OTP instead
  if (!resend) {
    console.log('='.repeat(50))
    console.log(`OTP EMAIL (dev mode - no Resend API key)`)
    console.log(`To: ${to}`)
    console.log(`Purpose: ${purpose}`)
    console.log(`OTP Code: ${otp}`)
    console.log('='.repeat(50))
    return { id: 'dev-mode' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Silsila</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin-top: 0;">Hi ${firstName},</p>

    <p>Use this code to ${purposeText}:</p>

    <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otp}</span>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      Silsila<br>
      This is an automated message, please do not reply.
    </p>
  </div>
</body>
</html>
      `,
    })

    if (error) {
      console.error('Failed to send email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('Email sending error:', error)
    throw error
  }
}
