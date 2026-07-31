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

export default class AccountPasswordSetupMail extends BaseMail {
  subject = 'Set your MaTTI Stock password'

  constructor(
    private recipient: { name: string; email: string },
    private setupUrl: string
  ) {
    super()
  }

  private html() {
    const rows = [
      paragraphRow(
        `Hello ${escapeHtml(this.recipient.name)}, your MaTTI Stock account is ready. Set your password using this single-use link within one hour.`
      ),
      buttonRow(this.setupUrl, 'Set password'),
      linkFallbackRow(this.setupUrl),
      noteRow('If you were not expecting this account, contact your system administrator.'),
    ].join('\n')

    return renderShell({
      title: 'Set your password',
      heading: 'Set your password',
      preheader: 'Set your MaTTI Stock password. This link expires in one hour.',
      rows,
    })
  }

  private text() {
    return [
      `Hello ${this.recipient.name},`,
      '',
      'Your MaTTI Stock account is ready.',
      'Set your password using this single-use link within one hour.',
      '',
      'Set your password:',
      this.setupUrl,
      '',
      'If you were not expecting this account, contact your system administrator.',
      '',
      textFooter(),
    ].join('\n')
  }

  prepare() {
    this.message.to(this.recipient.email).html(this.html()).text(this.text())
  }
}
