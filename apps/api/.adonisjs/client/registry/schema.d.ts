/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'health_checks.live': {
    methods: ["GET","HEAD"]
    pattern: '/health/live'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/health_checks_controller').default['live']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/health_checks_controller').default['live']>>>
    }
  }
  'health_checks.ready': {
    methods: ["GET","HEAD"]
    pattern: '/health/ready'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/health_checks_controller').default['ready']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/health_checks_controller').default['ready']>>>
    }
  }
  'sessions.login': {
    methods: ["POST"]
    pattern: '/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['login']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['login']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_resets.request': {
    methods: ["POST"]
    pattern: '/auth/password/forgot'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['request']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['request']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_resets.reset': {
    methods: ["POST"]
    pattern: '/auth/password/reset'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').resetPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['reset']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_resets_controller').default['reset']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_setups.store': {
    methods: ["POST"]
    pattern: '/auth/password/set'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').setPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').setPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/password_setups_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/password_setups_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'sessions.logout': {
    methods: ["POST"]
    pattern: '/auth/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['logout']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['logout']>>>
    }
  }
  'sessions.me': {
    methods: ["GET","HEAD"]
    pattern: '/auth/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['me']>>>
    }
  }
  'sessions.change_password': {
    methods: ["PUT"]
    pattern: '/auth/password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['changePassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sessions_controller').default['changePassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.index': {
    methods: ["GET","HEAD"]
    pattern: '/accounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/account').indexAccountsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.show': {
    methods: ["GET","HEAD"]
    pattern: '/accounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['show']>>>
    }
  }
  'account_access_events.index': {
    methods: ["GET","HEAD"]
    pattern: '/accounts/:id/access-events'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/access_event').indexAccountAccessEventsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_access_events_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_access_events_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.store': {
    methods: ["POST"]
    pattern: '/accounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').createAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account').createAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.reset_password': {
    methods: ["POST"]
    pattern: '/accounts/:id/password-reset'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['resetPassword']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.suspend': {
    methods: ["POST"]
    pattern: '/accounts/:id/suspend'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['suspend']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['suspend']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.restore': {
    methods: ["POST"]
    pattern: '/accounts/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.deactivate': {
    methods: ["POST"]
    pattern: '/accounts/:id/deactivate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['deactivate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['deactivate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'accounts.reactivate': {
    methods: ["POST"]
    pattern: '/accounts/:id/reactivate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account').administerAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['reactivate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/accounts_controller').default['reactivate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.index': {
    methods: ["GET","HEAD"]
    pattern: '/organizational-units'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/organizational_unit').indexOrganizationalUnitsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.show': {
    methods: ["GET","HEAD"]
    pattern: '/organizational-units/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['show']>>>
    }
  }
  'organizational_units.store': {
    methods: ["POST"]
    pattern: '/organizational-units'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').createOrganizationalUnitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').createOrganizationalUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.access_impact': {
    methods: ["POST"]
    pattern: '/organizational-units/:id/access-impact'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').previewOrganizationalAccessImpactValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').previewOrganizationalAccessImpactValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['accessImpact']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['accessImpact']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.rename': {
    methods: ["POST"]
    pattern: '/organizational-units/:id/rename'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').renameOrganizationalUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').renameOrganizationalUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['rename']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['rename']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.reparent': {
    methods: ["POST"]
    pattern: '/organizational-units/:id/reparent'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').reparentOrganizationalUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').reparentOrganizationalUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['reparent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['reparent']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.archive': {
    methods: ["POST"]
    pattern: '/organizational-units/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').administerOrganizationalUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').administerOrganizationalUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'organizational_units.restore': {
    methods: ["POST"]
    pattern: '/organizational-units/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/organizational_unit').administerOrganizationalUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/organizational_unit').administerOrganizationalUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/organizational_units_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.index': {
    methods: ["GET","HEAD"]
    pattern: '/physical-locations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/physical_location').indexPhysicalLocationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.show': {
    methods: ["GET","HEAD"]
    pattern: '/physical-locations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['show']>>>
    }
  }
  'physical_locations.store': {
    methods: ["POST"]
    pattern: '/physical-locations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/physical_location').createPhysicalLocationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/physical_location').createPhysicalLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.rename': {
    methods: ["POST"]
    pattern: '/physical-locations/:id/rename'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/physical_location').renamePhysicalLocationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/physical_location').renamePhysicalLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['rename']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['rename']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.reparent': {
    methods: ["POST"]
    pattern: '/physical-locations/:id/reparent'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/physical_location').reparentPhysicalLocationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/physical_location').reparentPhysicalLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['reparent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['reparent']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.archive': {
    methods: ["POST"]
    pattern: '/physical-locations/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/physical_location').administerPhysicalLocationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/physical_location').administerPhysicalLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'physical_locations.restore': {
    methods: ["POST"]
    pattern: '/physical-locations/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/physical_location').administerPhysicalLocationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/physical_location').administerPhysicalLocationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/physical_locations_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'permissions.index': {
    methods: ["GET","HEAD"]
    pattern: '/permissions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/permissions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/permissions_controller').default['index']>>>
    }
  }
  'roles.index': {
    methods: ["GET","HEAD"]
    pattern: '/roles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/role').indexRolesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.show': {
    methods: ["GET","HEAD"]
    pattern: '/roles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['show']>>>
    }
  }
  'roles.store': {
    methods: ["POST"]
    pattern: '/roles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').createRoleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/role').createRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.rename': {
    methods: ["POST"]
    pattern: '/roles/:id/rename'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').renameRoleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').renameRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['rename']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['rename']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.replace_permissions': {
    methods: ["POST"]
    pattern: '/roles/:id/permissions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').replaceRolePermissionsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').replaceRolePermissionsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['replacePermissions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['replacePermissions']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.archive': {
    methods: ["POST"]
    pattern: '/roles/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').administerRoleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').administerRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'roles.restore': {
    methods: ["POST"]
    pattern: '/roles/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').administerRoleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').administerRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/roles_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'role_assignments.index': {
    methods: ["GET","HEAD"]
    pattern: '/role-assignments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/role_assignment').indexRoleAssignmentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'role_assignments.show': {
    methods: ["GET","HEAD"]
    pattern: '/role-assignments/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['show']>>>
    }
  }
  'role_assignments.store': {
    methods: ["POST"]
    pattern: '/role-assignments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role_assignment').createRoleAssignmentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/role_assignment').createRoleAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'role_assignments.end': {
    methods: ["POST"]
    pattern: '/role-assignments/:id/end'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role_assignment').administerRoleAssignmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role_assignment').administerRoleAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['end']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['end']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'role_assignments.cancel': {
    methods: ["POST"]
    pattern: '/role-assignments/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role_assignment').administerRoleAssignmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role_assignment').administerRoleAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'role_assignments.replace': {
    methods: ["POST"]
    pattern: '/role-assignments/:id/replace'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role_assignment').replaceRoleAssignmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role_assignment').replaceRoleAssignmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['replace']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/role_assignments_controller').default['replace']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.index': {
    methods: ["GET","HEAD"]
    pattern: '/delegations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/delegation').indexDelegationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.proposal_options': {
    methods: ["GET","HEAD"]
    pattern: '/delegations/proposal-options'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/delegation').delegationProposalOptionsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['proposalOptions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['proposalOptions']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.show': {
    methods: ["GET","HEAD"]
    pattern: '/delegations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['show']>>>
    }
  }
  'delegations.store': {
    methods: ["POST"]
    pattern: '/delegations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').createDelegationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').createDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.accept': {
    methods: ["POST"]
    pattern: '/delegations/:id/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').acceptDelegationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').acceptDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.reject': {
    methods: ["POST"]
    pattern: '/delegations/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').rejectDelegationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').rejectDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.revoke': {
    methods: ["POST"]
    pattern: '/delegations/:id/revoke'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['revoke']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['revoke']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.relinquish': {
    methods: ["POST"]
    pattern: '/delegations/:id/relinquish'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['relinquish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['relinquish']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'delegations.terminate': {
    methods: ["POST"]
    pattern: '/delegations/:id/terminate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/delegation').terminateDelegationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['terminate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/delegations_controller').default['terminate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.index': {
    methods: ["GET","HEAD"]
    pattern: '/catalogue-categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/catalogue_category').indexCatalogueCategoriesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.show': {
    methods: ["GET","HEAD"]
    pattern: '/catalogue-categories/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['show']>>>
    }
  }
  'catalogue_categories.store': {
    methods: ["POST"]
    pattern: '/catalogue-categories'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalogue_category').createCatalogueCategoryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/catalogue_category').createCatalogueCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.update_details': {
    methods: ["POST"]
    pattern: '/catalogue-categories/:id/details'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalogue_category').updateCatalogueCategoryDetailsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalogue_category').updateCatalogueCategoryDetailsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['updateDetails']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['updateDetails']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.reparent': {
    methods: ["POST"]
    pattern: '/catalogue-categories/:id/reparent'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalogue_category').reparentCatalogueCategoryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalogue_category').reparentCatalogueCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['reparent']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['reparent']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.archive': {
    methods: ["POST"]
    pattern: '/catalogue-categories/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalogue_category').administerCatalogueCategoryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalogue_category').administerCatalogueCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'catalogue_categories.restore': {
    methods: ["POST"]
    pattern: '/catalogue-categories/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalogue_category').administerCatalogueCategoryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalogue_category').administerCatalogueCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/catalogue_categories_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'base_units.index': {
    methods: ["GET","HEAD"]
    pattern: '/base-units'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/base_unit').indexBaseUnitsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'base_units.show': {
    methods: ["GET","HEAD"]
    pattern: '/base-units/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['show']>>>
    }
  }
  'base_units.store': {
    methods: ["POST"]
    pattern: '/base-units'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/base_unit').createBaseUnitValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/base_unit').createBaseUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'base_units.update_details': {
    methods: ["POST"]
    pattern: '/base-units/:id/details'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/base_unit').updateBaseUnitDetailsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/base_unit').updateBaseUnitDetailsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['updateDetails']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['updateDetails']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'base_units.archive': {
    methods: ["POST"]
    pattern: '/base-units/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/base_unit').administerBaseUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/base_unit').administerBaseUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'base_units.restore': {
    methods: ["POST"]
    pattern: '/base-units/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/base_unit').administerBaseUnitValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/base_unit').administerBaseUnitValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/base_units_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.index': {
    methods: ["GET","HEAD"]
    pattern: '/category-attributes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/category_attribute').indexCategoryAttributesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.show': {
    methods: ["GET","HEAD"]
    pattern: '/category-attributes/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['show']>>>
    }
  }
  'category_attributes.store': {
    methods: ["POST"]
    pattern: '/category-attributes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').createCategoryAttributeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').createCategoryAttributeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.update_details': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/details'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeDetailsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeDetailsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['updateDetails']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['updateDetails']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.update_semantics': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/semantics'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeSemanticsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeSemanticsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['updateSemantics']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['updateSemantics']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attribute_choices.store': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/choices'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').addCategoryAttributeChoiceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').addCategoryAttributeChoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attribute_choices.reorder': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/choices/reorder'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').reorderCategoryAttributeChoicesValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').reorderCategoryAttributeChoicesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['reorder']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['reorder']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attribute_choices.update_details': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/choices/:choiceId/details'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeChoiceDetailsValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; choiceId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').updateCategoryAttributeChoiceDetailsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['updateDetails']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['updateDetails']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attribute_choices.archive': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/choices/:choiceId/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeChoiceValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; choiceId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeChoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attribute_choices.restore': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/choices/:choiceId/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeChoiceValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; choiceId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeChoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attribute_choices_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.archive': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/archive'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['archive']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['archive']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'category_attributes.restore': {
    methods: ["POST"]
    pattern: '/category-attributes/:id/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category_attribute').administerCategoryAttributeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/category_attributes_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
