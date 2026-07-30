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
}
