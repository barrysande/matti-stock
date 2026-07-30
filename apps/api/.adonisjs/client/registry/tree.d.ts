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
}
