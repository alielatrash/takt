// Test script to check if environment variables are loaded
console.log('Environment Variables Check:')
console.log('============================')
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
console.log('RESEND_API_KEY value:', process.env.RESEND_API_KEY?.substring(0, 15) + '...')
console.log('EMAIL_FROM:', process.env.EMAIL_FROM)
console.log('NODE_ENV:', process.env.NODE_ENV)
