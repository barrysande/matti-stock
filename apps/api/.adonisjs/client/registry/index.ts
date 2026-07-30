/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'health_checks.live': {
    methods: ["GET","HEAD"],
    pattern: '/health/live',
    tokens: [{"old":"/health/live","type":0,"val":"health","end":""},{"old":"/health/live","type":0,"val":"live","end":""}],
    types: placeholder as Registry['health_checks.live']['types'],
  },
  'health_checks.ready': {
    methods: ["GET","HEAD"],
    pattern: '/health/ready',
    tokens: [{"old":"/health/ready","type":0,"val":"health","end":""},{"old":"/health/ready","type":0,"val":"ready","end":""}],
    types: placeholder as Registry['health_checks.ready']['types'],
  },
  'sessions.login': {
    methods: ["POST"],
    pattern: '/auth/login',
    tokens: [{"old":"/auth/login","type":0,"val":"auth","end":""},{"old":"/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['sessions.login']['types'],
  },
  'password_resets.request': {
    methods: ["POST"],
    pattern: '/auth/password/forgot',
    tokens: [{"old":"/auth/password/forgot","type":0,"val":"auth","end":""},{"old":"/auth/password/forgot","type":0,"val":"password","end":""},{"old":"/auth/password/forgot","type":0,"val":"forgot","end":""}],
    types: placeholder as Registry['password_resets.request']['types'],
  },
  'password_resets.reset': {
    methods: ["POST"],
    pattern: '/auth/password/reset',
    tokens: [{"old":"/auth/password/reset","type":0,"val":"auth","end":""},{"old":"/auth/password/reset","type":0,"val":"password","end":""},{"old":"/auth/password/reset","type":0,"val":"reset","end":""}],
    types: placeholder as Registry['password_resets.reset']['types'],
  },
  'password_setups.store': {
    methods: ["POST"],
    pattern: '/auth/password/set',
    tokens: [{"old":"/auth/password/set","type":0,"val":"auth","end":""},{"old":"/auth/password/set","type":0,"val":"password","end":""},{"old":"/auth/password/set","type":0,"val":"set","end":""}],
    types: placeholder as Registry['password_setups.store']['types'],
  },
  'sessions.logout': {
    methods: ["POST"],
    pattern: '/auth/logout',
    tokens: [{"old":"/auth/logout","type":0,"val":"auth","end":""},{"old":"/auth/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['sessions.logout']['types'],
  },
  'sessions.me': {
    methods: ["GET","HEAD"],
    pattern: '/auth/me',
    tokens: [{"old":"/auth/me","type":0,"val":"auth","end":""},{"old":"/auth/me","type":0,"val":"me","end":""}],
    types: placeholder as Registry['sessions.me']['types'],
  },
  'sessions.change_password': {
    methods: ["PUT"],
    pattern: '/auth/password',
    tokens: [{"old":"/auth/password","type":0,"val":"auth","end":""},{"old":"/auth/password","type":0,"val":"password","end":""}],
    types: placeholder as Registry['sessions.change_password']['types'],
  },
  'accounts.index': {
    methods: ["GET","HEAD"],
    pattern: '/accounts',
    tokens: [{"old":"/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['accounts.index']['types'],
  },
  'accounts.show': {
    methods: ["GET","HEAD"],
    pattern: '/accounts/:id',
    tokens: [{"old":"/accounts/:id","type":0,"val":"accounts","end":""},{"old":"/accounts/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['accounts.show']['types'],
  },
  'accounts.store': {
    methods: ["POST"],
    pattern: '/accounts',
    tokens: [{"old":"/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['accounts.store']['types'],
  },
  'accounts.reset_password': {
    methods: ["POST"],
    pattern: '/accounts/:id/password-reset',
    tokens: [{"old":"/accounts/:id/password-reset","type":0,"val":"accounts","end":""},{"old":"/accounts/:id/password-reset","type":1,"val":"id","end":""},{"old":"/accounts/:id/password-reset","type":0,"val":"password-reset","end":""}],
    types: placeholder as Registry['accounts.reset_password']['types'],
  },
  'accounts.suspend': {
    methods: ["POST"],
    pattern: '/accounts/:id/suspend',
    tokens: [{"old":"/accounts/:id/suspend","type":0,"val":"accounts","end":""},{"old":"/accounts/:id/suspend","type":1,"val":"id","end":""},{"old":"/accounts/:id/suspend","type":0,"val":"suspend","end":""}],
    types: placeholder as Registry['accounts.suspend']['types'],
  },
  'accounts.restore': {
    methods: ["POST"],
    pattern: '/accounts/:id/restore',
    tokens: [{"old":"/accounts/:id/restore","type":0,"val":"accounts","end":""},{"old":"/accounts/:id/restore","type":1,"val":"id","end":""},{"old":"/accounts/:id/restore","type":0,"val":"restore","end":""}],
    types: placeholder as Registry['accounts.restore']['types'],
  },
  'accounts.deactivate': {
    methods: ["POST"],
    pattern: '/accounts/:id/deactivate',
    tokens: [{"old":"/accounts/:id/deactivate","type":0,"val":"accounts","end":""},{"old":"/accounts/:id/deactivate","type":1,"val":"id","end":""},{"old":"/accounts/:id/deactivate","type":0,"val":"deactivate","end":""}],
    types: placeholder as Registry['accounts.deactivate']['types'],
  },
  'accounts.reactivate': {
    methods: ["POST"],
    pattern: '/accounts/:id/reactivate',
    tokens: [{"old":"/accounts/:id/reactivate","type":0,"val":"accounts","end":""},{"old":"/accounts/:id/reactivate","type":1,"val":"id","end":""},{"old":"/accounts/:id/reactivate","type":0,"val":"reactivate","end":""}],
    types: placeholder as Registry['accounts.reactivate']['types'],
  },
  'organizational_units.index': {
    methods: ["GET","HEAD"],
    pattern: '/organizational-units',
    tokens: [{"old":"/organizational-units","type":0,"val":"organizational-units","end":""}],
    types: placeholder as Registry['organizational_units.index']['types'],
  },
  'organizational_units.show': {
    methods: ["GET","HEAD"],
    pattern: '/organizational-units/:id',
    tokens: [{"old":"/organizational-units/:id","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['organizational_units.show']['types'],
  },
  'organizational_units.store': {
    methods: ["POST"],
    pattern: '/organizational-units',
    tokens: [{"old":"/organizational-units","type":0,"val":"organizational-units","end":""}],
    types: placeholder as Registry['organizational_units.store']['types'],
  },
  'organizational_units.access_impact': {
    methods: ["POST"],
    pattern: '/organizational-units/:id/access-impact',
    tokens: [{"old":"/organizational-units/:id/access-impact","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id/access-impact","type":1,"val":"id","end":""},{"old":"/organizational-units/:id/access-impact","type":0,"val":"access-impact","end":""}],
    types: placeholder as Registry['organizational_units.access_impact']['types'],
  },
  'organizational_units.rename': {
    methods: ["POST"],
    pattern: '/organizational-units/:id/rename',
    tokens: [{"old":"/organizational-units/:id/rename","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id/rename","type":1,"val":"id","end":""},{"old":"/organizational-units/:id/rename","type":0,"val":"rename","end":""}],
    types: placeholder as Registry['organizational_units.rename']['types'],
  },
  'organizational_units.reparent': {
    methods: ["POST"],
    pattern: '/organizational-units/:id/reparent',
    tokens: [{"old":"/organizational-units/:id/reparent","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id/reparent","type":1,"val":"id","end":""},{"old":"/organizational-units/:id/reparent","type":0,"val":"reparent","end":""}],
    types: placeholder as Registry['organizational_units.reparent']['types'],
  },
  'organizational_units.archive': {
    methods: ["POST"],
    pattern: '/organizational-units/:id/archive',
    tokens: [{"old":"/organizational-units/:id/archive","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id/archive","type":1,"val":"id","end":""},{"old":"/organizational-units/:id/archive","type":0,"val":"archive","end":""}],
    types: placeholder as Registry['organizational_units.archive']['types'],
  },
  'organizational_units.restore': {
    methods: ["POST"],
    pattern: '/organizational-units/:id/restore',
    tokens: [{"old":"/organizational-units/:id/restore","type":0,"val":"organizational-units","end":""},{"old":"/organizational-units/:id/restore","type":1,"val":"id","end":""},{"old":"/organizational-units/:id/restore","type":0,"val":"restore","end":""}],
    types: placeholder as Registry['organizational_units.restore']['types'],
  },
  'physical_locations.index': {
    methods: ["GET","HEAD"],
    pattern: '/physical-locations',
    tokens: [{"old":"/physical-locations","type":0,"val":"physical-locations","end":""}],
    types: placeholder as Registry['physical_locations.index']['types'],
  },
  'physical_locations.show': {
    methods: ["GET","HEAD"],
    pattern: '/physical-locations/:id',
    tokens: [{"old":"/physical-locations/:id","type":0,"val":"physical-locations","end":""},{"old":"/physical-locations/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['physical_locations.show']['types'],
  },
  'physical_locations.store': {
    methods: ["POST"],
    pattern: '/physical-locations',
    tokens: [{"old":"/physical-locations","type":0,"val":"physical-locations","end":""}],
    types: placeholder as Registry['physical_locations.store']['types'],
  },
  'physical_locations.rename': {
    methods: ["POST"],
    pattern: '/physical-locations/:id/rename',
    tokens: [{"old":"/physical-locations/:id/rename","type":0,"val":"physical-locations","end":""},{"old":"/physical-locations/:id/rename","type":1,"val":"id","end":""},{"old":"/physical-locations/:id/rename","type":0,"val":"rename","end":""}],
    types: placeholder as Registry['physical_locations.rename']['types'],
  },
  'physical_locations.reparent': {
    methods: ["POST"],
    pattern: '/physical-locations/:id/reparent',
    tokens: [{"old":"/physical-locations/:id/reparent","type":0,"val":"physical-locations","end":""},{"old":"/physical-locations/:id/reparent","type":1,"val":"id","end":""},{"old":"/physical-locations/:id/reparent","type":0,"val":"reparent","end":""}],
    types: placeholder as Registry['physical_locations.reparent']['types'],
  },
  'physical_locations.archive': {
    methods: ["POST"],
    pattern: '/physical-locations/:id/archive',
    tokens: [{"old":"/physical-locations/:id/archive","type":0,"val":"physical-locations","end":""},{"old":"/physical-locations/:id/archive","type":1,"val":"id","end":""},{"old":"/physical-locations/:id/archive","type":0,"val":"archive","end":""}],
    types: placeholder as Registry['physical_locations.archive']['types'],
  },
  'physical_locations.restore': {
    methods: ["POST"],
    pattern: '/physical-locations/:id/restore',
    tokens: [{"old":"/physical-locations/:id/restore","type":0,"val":"physical-locations","end":""},{"old":"/physical-locations/:id/restore","type":1,"val":"id","end":""},{"old":"/physical-locations/:id/restore","type":0,"val":"restore","end":""}],
    types: placeholder as Registry['physical_locations.restore']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
