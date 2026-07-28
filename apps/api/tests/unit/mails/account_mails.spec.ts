import { test } from '@japa/runner'
import AccountPasswordSetupMail from '#mails/account_password_setup_mail'
import PasswordResetMail from '#mails/password_reset_mail'

test.group('Account mails', () => {
  test('builds the account password setup message with the shared shell', async () => {
    const mail = new AccountPasswordSetupMail(
      { name: 'Master <Admin>', email: 'master@example.com' },
      'http://localhost:5173/set-password?token=secret&source=email'
    )

    await mail.buildWithContents()

    mail.message.assertTo('master@example.com')
    mail.message.assertSubject('Set your Matti Stock password')
    mail.message.assertHtmlIncludes('Stock Management System')
    mail.message.assertHtmlIncludes('Master &lt;Admin&gt;')
    mail.message.assertHtmlIncludes('Set password')
    mail.message.assertHtmlIncludes(
      'http://localhost:5173/set-password?token=secret&amp;source=email'
    )
    mail.message.assertHtmlIncludes('This link expires in one hour.')
  })

  test('builds the password reset message with the shared shell', async () => {
    const mail = new PasswordResetMail(
      { name: 'Account <Holder>', email: 'holder@example.com' },
      'http://localhost:5173/reset-password?token=secret&source=email'
    )

    await mail.buildWithContents()

    mail.message.assertTo('holder@example.com')
    mail.message.assertSubject('Reset your Matti Stock password')
    mail.message.assertHtmlIncludes('Stock Management System')
    mail.message.assertHtmlIncludes('Account &lt;Holder&gt;')
    mail.message.assertHtmlIncludes('Reset password')
    mail.message.assertHtmlIncludes(
      'http://localhost:5173/reset-password?token=secret&amp;source=email'
    )
    mail.message.assertHtmlIncludes('This link expires in one hour.')
  })
})
