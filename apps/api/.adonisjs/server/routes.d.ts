import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.login': { paramsTuple?: []; params?: {} }
    'password_resets.request': { paramsTuple?: []; params?: {} }
    'password_resets.reset': { paramsTuple?: []; params?: {} }
    'password_setups.store': { paramsTuple?: []; params?: {} }
    'sessions.logout': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'sessions.change_password': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_access_events.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.reactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.index': { paramsTuple?: []; params?: {} }
    'organizational_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.store': { paramsTuple?: []; params?: {} }
    'organizational_units.access_impact': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.index': { paramsTuple?: []; params?: {} }
    'physical_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.store': { paramsTuple?: []; params?: {} }
    'physical_locations.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'permissions.index': { paramsTuple?: []; params?: {} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.store': { paramsTuple?: []; params?: {} }
    'roles.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.replace_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.index': { paramsTuple?: []; params?: {} }
    'role_assignments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.store': { paramsTuple?: []; params?: {} }
    'role_assignments.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.replace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.index': { paramsTuple?: []; params?: {} }
    'delegations.proposal_options': { paramsTuple?: []; params?: {} }
    'delegations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.store': { paramsTuple?: []; params?: {} }
    'delegations.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.relinquish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.terminate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.index': { paramsTuple?: []; params?: {} }
    'catalogue_categories.creation_review': { paramsTuple?: []; params?: {} }
    'catalogue_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.store': { paramsTuple?: []; params?: {} }
    'catalogue_categories.update_details': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.preview_merge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.merge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.index': { paramsTuple?: []; params?: {} }
    'base_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.store': { paramsTuple?: []; params?: {} }
    'base_units.update_details': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_items.index': { paramsTuple?: []; params?: {} }
    'catalogue_items.lookup': { paramsTuple?: []; params?: {} }
    'catalogue_items.creation_review': { paramsTuple?: []; params?: {} }
    'catalogue_items.store': { paramsTuple?: []; params?: {} }
    'catalogue_items.change_review': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.update_details': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.update_classification': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.show': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.archive': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.restore': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
  }
  GET: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_access_events.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.index': { paramsTuple?: []; params?: {} }
    'organizational_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.index': { paramsTuple?: []; params?: {} }
    'physical_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'permissions.index': { paramsTuple?: []; params?: {} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.index': { paramsTuple?: []; params?: {} }
    'role_assignments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.index': { paramsTuple?: []; params?: {} }
    'delegations.proposal_options': { paramsTuple?: []; params?: {} }
    'delegations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.index': { paramsTuple?: []; params?: {} }
    'catalogue_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.index': { paramsTuple?: []; params?: {} }
    'base_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_items.index': { paramsTuple?: []; params?: {} }
    'catalogue_items.lookup': { paramsTuple?: []; params?: {} }
    'catalogue_items.show': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
  }
  HEAD: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account_access_events.index': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.index': { paramsTuple?: []; params?: {} }
    'organizational_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.index': { paramsTuple?: []; params?: {} }
    'physical_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'permissions.index': { paramsTuple?: []; params?: {} }
    'roles.index': { paramsTuple?: []; params?: {} }
    'roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.index': { paramsTuple?: []; params?: {} }
    'role_assignments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.index': { paramsTuple?: []; params?: {} }
    'delegations.proposal_options': { paramsTuple?: []; params?: {} }
    'delegations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.index': { paramsTuple?: []; params?: {} }
    'catalogue_categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.index': { paramsTuple?: []; params?: {} }
    'base_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_items.index': { paramsTuple?: []; params?: {} }
    'catalogue_items.lookup': { paramsTuple?: []; params?: {} }
    'catalogue_items.show': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
  }
  POST: {
    'sessions.login': { paramsTuple?: []; params?: {} }
    'password_resets.request': { paramsTuple?: []; params?: {} }
    'password_resets.reset': { paramsTuple?: []; params?: {} }
    'password_setups.store': { paramsTuple?: []; params?: {} }
    'sessions.logout': { paramsTuple?: []; params?: {} }
    'accounts.store': { paramsTuple?: []; params?: {} }
    'accounts.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.suspend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.deactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'accounts.reactivate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.store': { paramsTuple?: []; params?: {} }
    'organizational_units.access_impact': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.store': { paramsTuple?: []; params?: {} }
    'physical_locations.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.store': { paramsTuple?: []; params?: {} }
    'roles.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.replace_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'roles.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.store': { paramsTuple?: []; params?: {} }
    'role_assignments.end': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'role_assignments.replace': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.store': { paramsTuple?: []; params?: {} }
    'delegations.accept': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.revoke': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.relinquish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'delegations.terminate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.creation_review': { paramsTuple?: []; params?: {} }
    'catalogue_categories.store': { paramsTuple?: []; params?: {} }
    'catalogue_categories.update_details': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.reparent': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.preview_merge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.merge': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_categories.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.store': { paramsTuple?: []; params?: {} }
    'base_units.update_details': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.archive': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'base_units.restore': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'catalogue_items.creation_review': { paramsTuple?: []; params?: {} }
    'catalogue_items.store': { paramsTuple?: []; params?: {} }
    'catalogue_items.change_review': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.update_details': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.update_classification': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.archive': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
    'catalogue_items.restore': { paramsTuple: [ParamValue]; params: {'catalogueCode': ParamValue} }
  }
  PUT: {
    'sessions.change_password': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}