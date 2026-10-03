/**
 * Email verification template (transactional email for Task 1.2).
 *
 * Pure string interpolation with inline, table-based CSS — the only
 * layout technique that renders consistently across Gmail, Outlook,
 * Apple Mail, and mobile clients. No JavaScript is included: email
 * clients strip `<script>`, so the verification action is an ordinary
 * anchor and the token is presented as copyable text.
 *
 * Token and URL are interpolated by the caller (EmailService). No
 * secret other than the token itself is ever passed in.
 */

/** Brand accent used for the primary button and headings. */
const ACCENT = '#2563eb'
/** Neutral ink for body copy. */
const BODY = '#1f2937'
/** Muted tone for the notice and footer. */
const MUTED = '#6b7280'

/**
 * Escapes a value interpolated into the token panel. The generated
 * token is hex, but escaping keeps a malformed value from breaking
 * out of the markup.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Builds the verification email HTML for the given token. */
export function buildVerificationEmailHtml(token: string): string {
  const safeToken = escapeHtml(token)

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verify your email address</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!-- Wrapper: max-width for clients that support it, fluid on mobile -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;width:100%;">

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;padding:40px 32px;font-family:Arial,Helvetica,sans-serif;">

              <!-- Brand mark -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <span style="display:inline-block;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:${ACCENT};letter-spacing:-0.3px;">Email&#8209;Chat&#8209;Pro</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:32px;color:${BODY};">
                Verify your email address
              </h1>
              <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:${BODY};">
                You&rsquo;re verifying the email address for your Email-Chat-Pro
                account. Use the code below to complete verification.
              </p>

              <!-- Token panel -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td align="center" style="padding:24px 20px;">
                    <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">
                      Your verification code
                    </p>
                    <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:34px;font-weight:bold;letter-spacing:1.5px;color:${BODY};word-break:break-all;">
                      ${safeToken}
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
                      Select the code and copy it, then enter it on the
                      verification page to complete verification.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Expiration / security notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;border-radius:8px;margin:0 0 28px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;color:${MUTED};">
                      This code expires in 24 hours and can be used once. If you
                      did not request this email, no action is needed &mdash; your
                      account stays unverified and nobody can sign in with it.
                      Never share this code with anyone; Email-Chat-Pro support
                      will never ask for it.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 12px 8px;">
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${MUTED};">
                Email-Chat-Pro &middot; Real-time messaging, done simply.
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${MUTED};">
                This message was sent to you because an account was created with this email address.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
