import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.login': { paramsTuple?: []; params?: {} }
    'password_resets.request': { paramsTuple?: []; params?: {} }
    'password_resets.reset': { paramsTuple?: []; params?: {} }
    'sessions.logout': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
    'sessions.change_password': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'health_checks.live': { paramsTuple?: []; params?: {} }
    'health_checks.ready': { paramsTuple?: []; params?: {} }
    'sessions.me': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'sessions.login': { paramsTuple?: []; params?: {} }
    'password_resets.request': { paramsTuple?: []; params?: {} }
    'password_resets.reset': { paramsTuple?: []; params?: {} }
    'sessions.logout': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'sessions.change_password': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}