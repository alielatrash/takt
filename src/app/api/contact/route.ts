import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { contactFormSchema } from '@/lib/validations/contact'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validatedData = contactFormSchema.parse(body)

    // Save to database
    const submission = await prisma.contactSubmission.create({
      data: validatedData,
    })

    // Send notification email to admin
    await sendEmail({
      to: 'support@teamtakt.app',
      subject: `New Contact Form Submission from ${validatedData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
              </div>

              <!-- Content -->
              <div style="padding: 30px;">
                <p style="margin: 0 0 20px 0; color: #374151;">You have received a new contact form submission from the Takt website.</p>

                <div style="background: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600; width: 140px;">Name:</td>
                      <td style="padding: 8px 0; color: #111827;">${validatedData.name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Position:</td>
                      <td style="padding: 8px 0; color: #111827;">${validatedData.position}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Email:</td>
                      <td style="padding: 8px 0; color: #111827;">
                        <a href="mailto:${validatedData.email}" style="color: #2563eb; text-decoration: none;">${validatedData.email}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Phone:</td>
                      <td style="padding: 8px 0; color: #111827;">
                        <a href="tel:${validatedData.number}" style="color: #2563eb; text-decoration: none;">${validatedData.number}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Company:</td>
                      <td style="padding: 8px 0; color: #111827;">${validatedData.company}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Country:</td>
                      <td style="padding: 8px 0; color: #111827;">${validatedData.country}</td>
                    </tr>
                  </table>
                </div>

                <p style="margin: 0; color: #6b7280; font-size: 14px;">Please respond to this inquiry at your earliest convenience.</p>
              </div>

              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  Takt Planning &copy; ${new Date().getFullYear()}
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    })

    return NextResponse.json(
      { message: 'Contact form submitted successfully', id: submission.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contact form submission error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid form data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit contact form' },
      { status: 500 }
    )
  }
}
