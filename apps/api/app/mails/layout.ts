/**
 * Shared, responsive shell for application email. Table-based markup and inline
 * styles keep the layout usable in conservative email clients; the media query
 * is only a progressive enhancement for narrow screens.
 */

const BRAND = 'MaTTI Stock'
const PRODUCT = 'Stock Management System'

interface ShellOptions {
  title: string
  heading: string
  preheader: string
  rows: string
}

export function renderShell({ title, heading, preheader, rows }: ShellOptions) {
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f4f5; }
    table { border-collapse: collapse; }
    a { text-decoration: none; }
    @media only screen and (max-width: 480px) {
      .card { width: 100% !important; border-radius: 0 !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .btn-a { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f4f5;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" class="card" width="480" cellpadding="0" cellspacing="0"
               style="width:480px;max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td class="px" style="padding:32px 40px 8px 40px;">
              <p style="margin:0;font-size:18px;line-height:24px;color:#18181b;font-weight:700;letter-spacing:0.04em;">
                ${BRAND}
              </p>
              <p style="margin:4px 0 0 0;font-size:12px;line-height:18px;color:#71717a;text-transform:uppercase;letter-spacing:0.08em;">
                ${PRODUCT}
              </p>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:24px 40px 8px 40px;">
              <h1 style="margin:0;font-size:22px;line-height:28px;color:#18181b;font-weight:600;">
                ${escapeHtml(heading)}
              </h1>
            </td>
          </tr>
          ${rows}
        </table>

        <p style="margin:24px 0 0 0;font-size:12px;line-height:18px;color:#a1a1aa;
                  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          &copy; ${year} ${BRAND}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Row helpers accept trusted structure only. Callers must escape dynamic values
 * before including them in a row.
 */
export function paragraphRow(html: string) {
  return `<tr>
            <td class="px" style="padding:8px 40px 24px 40px;">
              <p style="margin:0;font-size:15px;line-height:24px;color:#3f3f46;">${html}</p>
            </td>
          </tr>`
}

export function buttonRow(href: string, label: string) {
  return `<tr>
            <td class="px" style="padding:0 40px 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#18181b" style="border-radius:6px;">
                    <a class="btn-a" href="${escapeHtml(href)}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;
                              color:#ffffff;background-color:#18181b;border-radius:6px;">
                      ${escapeHtml(label)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
}

export function linkFallbackRow(href: string) {
  const escapedHref = escapeHtml(href)

  return `<tr>
            <td class="px" style="padding:0 40px 24px 40px;">
              <p style="margin:0;font-size:13px;line-height:20px;color:#71717a;word-break:break-all;">
                If the button does not work, paste this link into your browser:<br>
                <a href="${escapedHref}" style="color:#3f3f46;text-decoration:underline;">${escapedHref}</a>
              </p>
            </td>
          </tr>`
}

export function noteRow(html: string) {
  return `<tr>
            <td class="px" style="padding:0 40px 40px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:20px 0 0 0;font-size:13px;line-height:20px;color:#71717a;">${html}</p>
            </td>
          </tr>`
}

export function textFooter() {
  return `© ${new Date().getFullYear()} ${BRAND}`
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
