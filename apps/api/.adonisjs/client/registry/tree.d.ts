/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  healthChecks: {
    live: typeof routes['health_checks.live']
    ready: typeof routes['health_checks.ready']
  }
  sessions: {
    login: typeof routes['sessions.login']
    logout: typeof routes['sessions.logout']
    me: typeof routes['sessions.me']
    changePassword: typeof routes['sessions.change_password']
  }
  passwordResets: {
    request: typeof routes['password_resets.request']
    reset: typeof routes['password_resets.reset']
  }
  passwordSetups: {
    store: typeof routes['password_setups.store']
  }
  accounts: {
    index: typeof routes['accounts.index']
    show: typeof routes['accounts.show']
    store: typeof routes['accounts.store']
    resetPassword: typeof routes['accounts.reset_password']
    suspend: typeof routes['accounts.suspend']
    restore: typeof routes['accounts.restore']
    deactivate: typeof routes['accounts.deactivate']
    reactivate: typeof routes['accounts.reactivate']
  }
  accountAccessEvents: {
    index: typeof routes['account_access_events.index']
  }
  organizationalUnits: {
    index: typeof routes['organizational_units.index']
    history: typeof routes['organizational_units.history']
    show: typeof routes['organizational_units.show']
    store: typeof routes['organizational_units.store']
    accessImpact: typeof routes['organizational_units.access_impact']
    rename: typeof routes['organizational_units.rename']
    reparent: typeof routes['organizational_units.reparent']
    archive: typeof routes['organizational_units.archive']
    restore: typeof routes['organizational_units.restore']
  }
  physicalLocations: {
    index: typeof routes['physical_locations.index']
    history: typeof routes['physical_locations.history']
    show: typeof routes['physical_locations.show']
    store: typeof routes['physical_locations.store']
    rename: typeof routes['physical_locations.rename']
    reparent: typeof routes['physical_locations.reparent']
    archive: typeof routes['physical_locations.archive']
    restore: typeof routes['physical_locations.restore']
  }
  permissions: {
    index: typeof routes['permissions.index']
  }
  roles: {
    index: typeof routes['roles.index']
    options: typeof routes['roles.options']
    history: typeof routes['roles.history']
    show: typeof routes['roles.show']
    store: typeof routes['roles.store']
    rename: typeof routes['roles.rename']
    replacePermissions: typeof routes['roles.replace_permissions']
    archive: typeof routes['roles.archive']
    restore: typeof routes['roles.restore']
  }
  roleAssignments: {
    index: typeof routes['role_assignments.index']
    show: typeof routes['role_assignments.show']
    store: typeof routes['role_assignments.store']
    end: typeof routes['role_assignments.end']
    cancel: typeof routes['role_assignments.cancel']
    replace: typeof routes['role_assignments.replace']
  }
  delegations: {
    index: typeof routes['delegations.index']
    proposalOptions: typeof routes['delegations.proposal_options']
    show: typeof routes['delegations.show']
    store: typeof routes['delegations.store']
    accept: typeof routes['delegations.accept']
    reject: typeof routes['delegations.reject']
    revoke: typeof routes['delegations.revoke']
    relinquish: typeof routes['delegations.relinquish']
    terminate: typeof routes['delegations.terminate']
  }
  catalogueCategories: {
    index: typeof routes['catalogue_categories.index']
    creationReview: typeof routes['catalogue_categories.creation_review']
    history: typeof routes['catalogue_categories.history']
    show: typeof routes['catalogue_categories.show']
    store: typeof routes['catalogue_categories.store']
    updateDetails: typeof routes['catalogue_categories.update_details']
    reparent: typeof routes['catalogue_categories.reparent']
    previewMerge: typeof routes['catalogue_categories.preview_merge']
    merge: typeof routes['catalogue_categories.merge']
    archive: typeof routes['catalogue_categories.archive']
    restore: typeof routes['catalogue_categories.restore']
  }
  baseUnits: {
    index: typeof routes['base_units.index']
    options: typeof routes['base_units.options']
    history: typeof routes['base_units.history']
    show: typeof routes['base_units.show']
    store: typeof routes['base_units.store']
    updateDetails: typeof routes['base_units.update_details']
    archive: typeof routes['base_units.archive']
    restore: typeof routes['base_units.restore']
  }
  catalogueItems: {
    index: typeof routes['catalogue_items.index']
    lookup: typeof routes['catalogue_items.lookup']
    creationReview: typeof routes['catalogue_items.creation_review']
    store: typeof routes['catalogue_items.store']
    history: typeof routes['catalogue_items.history']
    changeReview: typeof routes['catalogue_items.change_review']
    updateDetails: typeof routes['catalogue_items.update_details']
    updateClassification: typeof routes['catalogue_items.update_classification']
    show: typeof routes['catalogue_items.show']
    archive: typeof routes['catalogue_items.archive']
    restore: typeof routes['catalogue_items.restore']
  }
  centralStoreContexts: {
    history: typeof routes['central_store_contexts.history']
    show: typeof routes['central_store_contexts.show']
    store: typeof routes['central_store_contexts.store']
  }
}
