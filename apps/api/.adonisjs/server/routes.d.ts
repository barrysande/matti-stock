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
  }
  GET: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.index': { paramsTuple?: []; params?: {} }
    'organizational_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.index': { paramsTuple?: []; params?: {} }
    'physical_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'organizational_units.index': { paramsTuple?: []; params?: {} }
    'organizational_units.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'physical_locations.index': { paramsTuple?: []; params?: {} }
    'physical_locations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
  }
  PUT: {
    'sessions.change_password': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}