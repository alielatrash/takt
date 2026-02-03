import { Resend } from 'resend'

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.error('RESEND_API_KEY not found in environment')
    process.exit(1)
  }

  console.log('Testing Resend API...')
  console.log('API Key:', apiKey.substring(0, 15) + '...')
  console.log('From:', process.env.EMAIL_FROM || 'Takt <noreply@teamtakt.app>')
  
  const resend = new Resend(apiKey)
  
  try {
    console.log('\nSending test email to atrash93@gmail.com...')
    const { data, error } = await resend.emails.send({
      from: 'Takt <noreply@teamtakt.app>',
      to: 'atrash93@gmail.com',
      subject: 'Test Email from Takt',
      html: '<h1>Test Email</h1><p>This is a test email from your Takt application.</p>',
    })

    if (error) {
      console.error('\nResend API Error:', error)
      process.exit(1)
    }

    console.log('\nSuccess! Email sent:')
    console.log('Email ID:', data?.id)
    console.log('\nCheck your inbox at atrash93@gmail.com')
  } catch (error) {
    console.error('\nFailed to send test email:', error)
    process.exit(1)
  }
}

testResend()
