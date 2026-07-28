import { BaseMail } from '@adonisjs/mail'
import {
  buttonRow,
  escapeHtml,
  linkFallbackRow,
  noteRow,
  paragraphRow,
  renderShell,
  textFooter,
} from './layout.ts'

export default class MasterAdminCredentialsNotification extends BaseMail {
  subject = 'Your Matti Stock Master Admin account'

  constructor(
    private recipient: { name: string; email: string },
    private password: string,
    private loginUrl: string
  ) {
    super()
  }

  private passwordRow() {
    return `<tr>
            <td class="px" style="padding:0 40px 24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:20px;background-color:#f4f4f5;border-radius:8px;">
                    <p style="margin:0 0 8px 0;font-size:12px;line-height:18px;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;">
                      Temporary password
                    </p>
                    <p style="margin:0;font-size:18px;line-height:26px;color:#18181b;font-weight:600;font-family:'Courier New',Courier,monospace;word-break:break-all;">
                      ${escapeHtml(this.password)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
  }

  private html() {
    const rows = [
      paragraphRow(
        `Hello ${escapeHtml(this.recipient.name)}, your Matti Stock Master Admin account is ready.`
      ),
      this.passwordRow(),
      buttonRow(this.loginUrl, 'Sign in to Matti Stock'),
      linkFallbackRow(this.loginUrl),
      noteRow('Keep this password private. After signing in, change it from your account page.'),
    ].join('\n')

    return renderShell({
      title: 'Your Master Admin account',
      heading: 'Your Master Admin account is ready',
      preheader: 'Your Matti Stock Master Admin account has been created.',
      rows,
    })
  }

  private text() {
    return [
      `Hello ${this.recipient.name},`,
      '',
      'Your Matti Stock Master Admin account has been created.',
      `Temporary password: ${this.password}`,
      '',
      'Sign in to Matti Stock:',
      this.loginUrl,
      '',
      'Keep this password private. After signing in, change it from your account page.',
      '',
      textFooter(),
    ].join('\n')
  }

  prepare() {
    this.message.to(this.recipient.email).html(this.html()).text(this.text())
  }
}
