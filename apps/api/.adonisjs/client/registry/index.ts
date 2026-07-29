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
  'accounts.store': {
    methods: ["POST"],
    pattern: '/accounts',
    tokens: [{"old":"/accounts","type":0,"val":"accounts","end":""}],
    types: placeholder as Registry['accounts.store']['types'],
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
