import { Resend } from 'resend'
import * as fs from 'fs'
import * as path from 'path'

// Load .env file manually
const envPath = path.join(process.cwd(), '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1')
    process.env[key] = value
  }
})

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM || 'Takt <noreply@teamtakt.app>'

  console.log('Testing Resend configuration...')
  console.log('API Key available:', !!apiKey)
  console.log('API Key (first 10 chars):', apiKey?.substring(0, 10) + '...')
  console.log('Email FROM:', emailFrom)
  console.log('')

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY not found in environment variables')
    process.exit(1)
  }

  const resend = new Resend(apiKey)

  try {
    console.log('Sending test email to ali@trella.app...')
    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: 'ali@trella.app',
      subject: 'Test Email - Takt OTP',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify Resend configuration.</p>
        <p>If you receive this, the email sending is working correctly.</p>
        <p><strong>Test OTP Code: 123456</strong></p>
      `,
    })

    if (error) {
      console.error('❌ Failed to send email:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      process.exit(1)
    }

    console.log('✅ Email sent successfully!')
    console.log('Email ID:', data?.id)
    console.log('')
    console.log('Check your Resend dashboard and ali@trella.app inbox')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

testResend()
