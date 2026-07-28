import { test } from '@japa/runner'
import MasterAdminCredentialsNotification from '#mails/master_admin_credentials_notification'
import PasswordResetMail from '#mails/password_reset_mail'

test.group('Account mails', () => {
  test('builds the Master Admin credentials message with the shared shell', async () => {
    const mail = new MasterAdminCredentialsNotification(
      { name: 'Master <Admin>', email: 'master@example.com' },
      'generated-password',
      'http://localhost:5173/login?from=email&role=master'
    )

    await mail.buildWithContents()

    mail.message.assertTo('master@example.com')
    mail.message.assertSubject('Your Matti Stock Master Admin account')
    mail.message.assertHtmlIncludes('Stock Management System')
    mail.message.assertHtmlIncludes('Master &lt;Admin&gt;')
    mail.message.assertHtmlIncludes('generated-password')
    mail.message.assertHtmlIncludes('Sign in to Matti Stock')
    mail.message.assertHtmlIncludes('http://localhost:5173/login?from=email&amp;role=master')
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
