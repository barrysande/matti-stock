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
    store: typeof routes['accounts.store']
    suspend: typeof routes['accounts.suspend']
    restore: typeof routes['accounts.restore']
    deactivate: typeof routes['accounts.deactivate']
    reactivate: typeof routes['accounts.reactivate']
  }
}
