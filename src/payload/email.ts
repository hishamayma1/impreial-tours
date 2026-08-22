import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

/**
 * Payload sends admin password resets and account verification through this adapter.
 *
 * With SMTP_PASS set it talks to real SMTP. Without it, nodemailerAdapter falls back
 * to Ethereal in development and prints a preview URL — so a developer without
 * credentials still gets a working password-reset flow instead of a hard failure.
 *
 * Gmail note: SMTP_PASS must be a Google App Password (16 characters, generated at
 * myaccount.google.com/apppasswords with 2-Step Verification enabled). A normal
 * account password will be rejected.
 */
const fromAddress = process.env.SMTP_FROM_ADDRESS || 'hishamayman2003@gmail.com'
const fromName = process.env.SMTP_FROM_NAME || 'Imperial Tours'

export const emailAdapter = process.env.SMTP_PASS
  ? nodemailerAdapter({
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
      transportOptions: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        // Port 465 is implicit TLS; 587 upgrades via STARTTLS.
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: {
          user: process.env.SMTP_USER || fromAddress,
          pass: process.env.SMTP_PASS,
        },
      },
    })
  : nodemailerAdapter({
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
    })
