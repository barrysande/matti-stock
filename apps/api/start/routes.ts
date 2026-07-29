import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import {
  loginLimiter,
  passwordResetLimiter,
  passwordResetRequestLimiter,
  passwordSetupLimiter,
} from '#start/limiter'

router.where('id', router.matchers.uuid())

router.get('/health/live', [controllers.HealthChecks, 'live'])
router.get('/health/ready', [controllers.HealthChecks, 'ready']).use(middleware.monitoringAuth())

router
  .group(() => {
    router.post('/login', [controllers.Sessions, 'login']).use(loginLimiter)
    router
      .post('/password/forgot', [controllers.PasswordResets, 'request'])
      .use(passwordResetRequestLimiter)
    router.post('/password/reset', [controllers.PasswordResets, 'reset']).use(passwordResetLimiter)
    router.post('/password/set', [controllers.PasswordSetups, 'store']).use(passwordSetupLimiter)

    router
      .group(() => {
        router.post('/logout', [controllers.Sessions, 'logout'])
        router.get('/me', [controllers.Sessions, 'me'])
        router.put('/password', [controllers.Sessions, 'changePassword'])
      })
      .use(middleware.auth({ guards: ['web'] }))
  })
  .prefix('/auth')

router
  .group(() => {
    router.get('/', [controllers.Accounts, 'index'])
    router.get('/:id', [controllers.Accounts, 'show'])
    router.post('/', [controllers.Accounts, 'store'])
    router.post('/:id/password-reset', [controllers.Accounts, 'resetPassword'])
    router.post('/:id/suspend', [controllers.Accounts, 'suspend'])
    router.post('/:id/restore', [controllers.Accounts, 'restore'])
    router.post('/:id/deactivate', [controllers.Accounts, 'deactivate'])
    router.post('/:id/reactivate', [controllers.Accounts, 'reactivate'])
  })
  .prefix('/accounts')
  .use(middleware.auth({ guards: ['web'] }))
