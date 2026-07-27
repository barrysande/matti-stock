import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'root.show': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'root.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'root.show': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}