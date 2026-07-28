import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'
import { loginLimiter, passwordResetLimiter, passwordResetRequestLimiter } from '#start/limiter'

router.get('/health/live', [controllers.HealthChecks, 'live'])
router.get('/health/ready', [controllers.HealthChecks, 'ready']).use(middleware.monitoringAuth())

router
  .group(() => {
    router.post('/login', [controllers.Sessions, 'login']).use(loginLimiter)
    router
      .post('/password/forgot', [controllers.PasswordResets, 'request'])
      .use(passwordResetRequestLimiter)
    router.post('/password/reset', [controllers.PasswordResets, 'reset']).use(passwordResetLimiter)

    router
      .group(() => {
        router.post('/logout', [controllers.Sessions, 'logout'])
        router.get('/me', [controllers.Sessions, 'me'])
        router.put('/password', [controllers.Sessions, 'changePassword'])
      })
      .use(middleware.auth({ guards: ['web'] }))
  })
  .prefix('/auth')
