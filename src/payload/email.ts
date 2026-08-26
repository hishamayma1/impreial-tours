import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter, SendEmailOptions } from 'payload'

/**
 * Payload sends admin password resets and account verification through this adapter.
 *
 * Three tiers, in order of preference:
 *   1. SMTP_PASS set                -> real SMTP transport.
 *   2. EMAIL_PREVIEW=1, no SMTP_PASS -> nodemailer's Ethereal test account, which
 *                                      prints a preview URL so password resets stay
 *                                      clickable. Opt-in: see resolveFallbackAdapter.
 *   3. Otherwise                    -> the console adapter below.
 *
 * Tier 3 is the default rather than a last resort. `nodemailerAdapter()` with no
 * transport reaches the network at startup and THROWS InvalidConfiguration if that
 * request fails; in a sandboxed or offline environment that aborts Payload's entire
 * init — the admin panel and every /api route return 500 — purely because email could
 * not be configured. Email is not critical-path for booting a CMS, so we log instead
 * of taking the whole app down with us.
 *
 * Gmail note: SMTP_PASS must be a Google App Password (16 characters, generated at
 * myaccount.google.com/apppasswords with 2-Step Verification enabled). A normal
 * account password will be rejected.
 */
const fromAddress = process.env.SMTP_FROM_ADDRESS || 'hishamayman2003@gmail.com'
const fromName = process.env.SMTP_FROM_NAME || 'Imperial Tours'

/** Writes the message to stdout so developers can still read reset links locally. */
const consoleAdapter: EmailAdapter<void> = ({ payload }) => ({
  name: 'console',
  defaultFromAddress: fromAddress,
  defaultFromName: fromName,
  sendEmail: async (message: SendEmailOptions) => {
    payload.logger.info(
      {
        to: message.to,
        subject: message.subject,
        // Reset/verify links live in the body; log text so they stay copy-pasteable.
        text: message.text,
      },
      'Email not sent — no transport configured. Set SMTP_PASS to deliver for real.',
    )
  },
})

const realSmtpAdapter = async (): Promise<EmailAdapter<unknown>> =>
  (await nodemailerAdapter({
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
  })) as unknown as EmailAdapter<unknown>

/**
 * Ethereal, only when explicitly asked for.
 *
 * `nodemailerAdapter()` with no transport creates a throwaway Ethereal inbox by
 * calling https://api.nodemailer.com/user — a blocking network round trip on every
 * evaluation of this module. Next re-evaluates it per compiled server bundle, so a
 * cold `next dev` was opening eight or more test accounts and printing eight banners
 * before the first page could render, adding that latency to the first request.
 *
 * It is now opt-in behind EMAIL_PREVIEW=1. Without it the console adapter is used,
 * which costs nothing and still prints reset links locally.
 */
const resolveFallbackAdapter = async (): Promise<EmailAdapter<unknown>> => {
  if (process.env.EMAIL_PREVIEW !== '1') return consoleAdapter as EmailAdapter<unknown>

  try {
    return (await nodemailerAdapter({
      defaultFromAddress: fromAddress,
      defaultFromName: fromName,
    })) as unknown as EmailAdapter<unknown>
  } catch (error) {
    console.warn(
      `[email] Ethereal test account unavailable (${
        error instanceof Error ? error.message : String(error)
      }). Falling back to console transport — emails will be logged, not delivered.`,
    )
    return consoleAdapter as EmailAdapter<unknown>
  }
}

export const emailAdapter: EmailAdapter<unknown> = process.env.SMTP_PASS
  ? await realSmtpAdapter()
  : await resolveFallbackAdapter()
