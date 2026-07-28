import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import MasterAdminCredentialsNotification from '#mails/master_admin_credentials_notification'
import MasterAdminBootstrapService from '#services/master_admin_bootstrap_service'
import { masterAdminBootstrapValidator } from '#validators/master_admin'

export default class MasterAdminSeeder extends BaseSeeder {
  async run() {
    const data = await masterAdminBootstrapValidator.validate({
      instituteName: env.get('BOOTSTRAP_INSTITUTE_NAME'),
      masterName: env.get('BOOTSTRAP_MASTER_NAME'),
      masterEmail: env.get('BOOTSTRAP_MASTER_EMAIL'),
    })
    const bootstrap = await app.container.make(MasterAdminBootstrapService)
    const result = await bootstrap.run(data)
    const loginUrl = new URL('/login', env.get('WEB_URL')).toString()

    await mail.send(
      new MasterAdminCredentialsNotification(
        { name: data.masterName, email: data.masterEmail },
        result.password,
        loginUrl
      )
    )

    process.stdout.write(`Master Admin created. Credentials were sent to ${data.masterEmail}.\n`)
  }
}
