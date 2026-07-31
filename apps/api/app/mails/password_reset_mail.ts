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

export default class PasswordResetMail extends BaseMail {
  subject = 'Reset your MaTTI Stock password'

  constructor(
    private recipient: { name: string; email: string },
    private resetUrl: string
  ) {
    super()
  }

  private html() {
    const rows = [
      paragraphRow(
        `Hello ${escapeHtml(this.recipient.name)}, a password reset was requested for your MaTTI Stock account. This link expires in one hour.`
      ),
      buttonRow(this.resetUrl, 'Reset password'),
      linkFallbackRow(this.resetUrl),
      noteRow('If you did not request this reset, you can safely ignore this message.'),
    ].join('\n')

    return renderShell({
      title: 'Reset your password',
      heading: 'Reset your password',
      preheader: 'Reset your MaTTI Stock password. This link expires in one hour.',
      rows,
    })
  }

  private text() {
    return [
      `Hello ${this.recipient.name},`,
      '',
      'A password reset was requested for your MaTTI Stock account.',
      'This link expires in one hour.',
      '',
      'Reset your password:',
      this.resetUrl,
      '',
      'If you did not request this reset, you can safely ignore this message.',
      '',
      textFooter(),
    ].join('\n')
  }

  prepare() {
    this.message.to(this.recipient.email).html(this.html()).text(this.text())
  }
}
