import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

const smtpUsername = env.get('SMTP_USERNAME')
const smtpPassword = env.get('SMTP_PASSWORD')?.release()

if (Boolean(smtpUsername) !== Boolean(smtpPassword)) {
  throw new Error('SMTP_USERNAME and SMTP_PASSWORD must be configured together')
}

const mailConfig = defineConfig({
  default: env.get('MAIL_MAILER'),

  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  globals: {
    brandName: 'MaTTI Stock',
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
      secure: env.get('SMTP_PORT') === 465,
      ...(smtpUsername && smtpPassword
        ? {
            auth: {
              type: 'login' as const,
              user: smtpUsername,
              pass: smtpPassword,
            },
          }
        : {}),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
