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
    show: typeof routes['catalogue_categories.show']
    store: typeof routes['catalogue_categories.store']
    updateDetails: typeof routes['catalogue_categories.update_details']
    reparent: typeof routes['catalogue_categories.reparent']
    archive: typeof routes['catalogue_categories.archive']
    restore: typeof routes['catalogue_categories.restore']
  }
  baseUnits: {
    index: typeof routes['base_units.index']
    show: typeof routes['base_units.show']
    store: typeof routes['base_units.store']
    updateDetails: typeof routes['base_units.update_details']
    archive: typeof routes['base_units.archive']
    restore: typeof routes['base_units.restore']
  }
  categoryAttributes: {
    index: typeof routes['category_attributes.index']
    show: typeof routes['category_attributes.show']
    store: typeof routes['category_attributes.store']
    updateDetails: typeof routes['category_attributes.update_details']
    updateSemantics: typeof routes['category_attributes.update_semantics']
    archive: typeof routes['category_attributes.archive']
    restore: typeof routes['category_attributes.restore']
  }
  categoryAttributeChoices: {
    store: typeof routes['category_attribute_choices.store']
    reorder: typeof routes['category_attribute_choices.reorder']
    updateDetails: typeof routes['category_attribute_choices.update_details']
    archive: typeof routes['category_attribute_choices.archive']
    restore: typeof routes['category_attribute_choices.restore']
  }
  catalogueItems: {
    index: typeof routes['catalogue_items.index']
    lookup: typeof routes['catalogue_items.lookup']
    creationReview: typeof routes['catalogue_items.creation_review']
    store: typeof routes['catalogue_items.store']
    changeReview: typeof routes['catalogue_items.change_review']
    updateDetails: typeof routes['catalogue_items.update_details']
    updateClassification: typeof routes['catalogue_items.update_classification']
    updateAttributeValues: typeof routes['catalogue_items.update_attribute_values']
    show: typeof routes['catalogue_items.show']
    archive: typeof routes['catalogue_items.archive']
    restore: typeof routes['catalogue_items.restore']
  }
}
