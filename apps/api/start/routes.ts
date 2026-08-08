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
router.where('choiceId', router.matchers.uuid())

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
    router.get('/:id/access-events', [controllers.AccountAccessEvents, 'index'])
    router.post('/', [controllers.Accounts, 'store'])
    router.post('/:id/password-reset', [controllers.Accounts, 'resetPassword'])
    router.post('/:id/suspend', [controllers.Accounts, 'suspend'])
    router.post('/:id/restore', [controllers.Accounts, 'restore'])
    router.post('/:id/deactivate', [controllers.Accounts, 'deactivate'])
    router.post('/:id/reactivate', [controllers.Accounts, 'reactivate'])
  })
  .prefix('/accounts')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.OrganizationalUnits, 'index'])
    router.get('/:id/history', [controllers.OrganizationalUnits, 'history'])
    router.get('/:id', [controllers.OrganizationalUnits, 'show'])
    router.post('/', [controllers.OrganizationalUnits, 'store'])
    router.post('/:id/access-impact', [controllers.OrganizationalUnits, 'accessImpact'])
    router.post('/:id/rename', [controllers.OrganizationalUnits, 'rename'])
    router.post('/:id/reparent', [controllers.OrganizationalUnits, 'reparent'])
    router.post('/:id/archive', [controllers.OrganizationalUnits, 'archive'])
    router.post('/:id/restore', [controllers.OrganizationalUnits, 'restore'])
  })
  .prefix('/organizational-units')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.PhysicalLocations, 'index'])
    router.get('/:id/history', [controllers.PhysicalLocations, 'history'])
    router.get('/:id', [controllers.PhysicalLocations, 'show'])
    router.post('/', [controllers.PhysicalLocations, 'store'])
    router.post('/:id/rename', [controllers.PhysicalLocations, 'rename'])
    router.post('/:id/reparent', [controllers.PhysicalLocations, 'reparent'])
    router.post('/:id/archive', [controllers.PhysicalLocations, 'archive'])
    router.post('/:id/restore', [controllers.PhysicalLocations, 'restore'])
  })
  .prefix('/physical-locations')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.Permissions, 'index'])
  })
  .prefix('/permissions')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.Roles, 'index'])
    router.get('/options', [controllers.Roles, 'options'])
    router.get('/:id/history', [controllers.Roles, 'history'])
    router.get('/:id', [controllers.Roles, 'show'])
    router.post('/', [controllers.Roles, 'store'])
    router.post('/:id/rename', [controllers.Roles, 'rename'])
    router.post('/:id/permissions', [controllers.Roles, 'replacePermissions'])
    router.post('/:id/archive', [controllers.Roles, 'archive'])
    router.post('/:id/restore', [controllers.Roles, 'restore'])
  })
  .prefix('/roles')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.RoleAssignments, 'index'])
    router.get('/:id', [controllers.RoleAssignments, 'show'])
    router.post('/', [controllers.RoleAssignments, 'store'])
    router.post('/:id/end', [controllers.RoleAssignments, 'end'])
    router.post('/:id/cancel', [controllers.RoleAssignments, 'cancel'])
    router.post('/:id/replace', [controllers.RoleAssignments, 'replace'])
  })
  .prefix('/role-assignments')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.Delegations, 'index'])
    router.get('/proposal-options', [controllers.Delegations, 'proposalOptions'])
    router.get('/:id', [controllers.Delegations, 'show'])
    router.post('/', [controllers.Delegations, 'store'])
    router.post('/:id/accept', [controllers.Delegations, 'accept'])
    router.post('/:id/reject', [controllers.Delegations, 'reject'])
    router.post('/:id/revoke', [controllers.Delegations, 'revoke'])
    router.post('/:id/relinquish', [controllers.Delegations, 'relinquish'])
    router.post('/:id/terminate', [controllers.Delegations, 'terminate'])
  })
  .prefix('/delegations')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.CatalogueCategories, 'index'])
    router.post('/creation-review', [controllers.CatalogueCategories, 'creationReview'])
    router.get('/:id/history', [controllers.CatalogueCategories, 'history'])
    router.get('/:id', [controllers.CatalogueCategories, 'show'])
    router.post('/', [controllers.CatalogueCategories, 'store'])
    router.post('/:id/details', [controllers.CatalogueCategories, 'updateDetails'])
    router.post('/:id/reparent', [controllers.CatalogueCategories, 'reparent'])
    router.post('/:id/merge-preview', [controllers.CatalogueCategories, 'previewMerge'])
    router.post('/:id/merge', [controllers.CatalogueCategories, 'merge'])
    router.post('/:id/archive', [controllers.CatalogueCategories, 'archive'])
    router.post('/:id/restore', [controllers.CatalogueCategories, 'restore'])
  })
  .prefix('/catalogue-categories')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.BaseUnits, 'index'])
    router.get('/options', [controllers.BaseUnits, 'options'])
    router.get('/:id/history', [controllers.BaseUnits, 'history'])
    router.get('/:id', [controllers.BaseUnits, 'show'])
    router.post('/', [controllers.BaseUnits, 'store'])
    router.post('/:id/details', [controllers.BaseUnits, 'updateDetails'])
    router.post('/:id/archive', [controllers.BaseUnits, 'archive'])
    router.post('/:id/restore', [controllers.BaseUnits, 'restore'])
  })
  .prefix('/base-units')
  .use(middleware.auth({ guards: ['web'] }))

router
  .group(() => {
    router.get('/', [controllers.CatalogueItems, 'index'])
    router.get('/lookup', [controllers.CatalogueItems, 'lookup'])
    router.post('/creation-review', [controllers.CatalogueItems, 'creationReview'])
    router.post('/', [controllers.CatalogueItems, 'store'])
    router.get('/:catalogueCode/history', [controllers.CatalogueItems, 'history'])
    router.post('/:catalogueCode/change-review', [controllers.CatalogueItems, 'changeReview'])
    router.post('/:catalogueCode/details', [controllers.CatalogueItems, 'updateDetails'])
    router.post('/:catalogueCode/classification', [
      controllers.CatalogueItems,
      'updateClassification',
    ])
    router.get('/:catalogueCode', [controllers.CatalogueItems, 'show'])
    router.post('/:catalogueCode/archive', [controllers.CatalogueItems, 'archive'])
    router.post('/:catalogueCode/restore', [controllers.CatalogueItems, 'restore'])
  })
  .prefix('/catalogue-items')
  .use(middleware.auth({ guards: ['web'] }))
