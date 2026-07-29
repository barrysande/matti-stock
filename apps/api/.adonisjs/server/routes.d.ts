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
  }
  GET: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'accounts.index': { paramsTuple?: []; params?: {} }
    'accounts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
  }
  PUT: {
    'sessions.change_password': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}