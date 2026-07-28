/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'
import { middleware } from '#start/kernel'

router.get('/health/live', [controllers.HealthChecks, 'live'])
router.get('/health/ready', [controllers.HealthChecks, 'ready']).use(middleware.monitoringAuth())
