/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes. Feel free to define as many
| throttle middleware as needed.
|
*/

import { createHash } from 'node:crypto'
import limiter from '@adonisjs/limiter/services/main'

function normalizedIdentifier(value: unknown) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
  return createHash('sha256')
    .update(normalized || 'missing')
    .digest('hex')
}

function tokenFingerprint(value: unknown) {
  return createHash('sha256')
    .update(String(value ?? '').slice(0, 4096) || 'missing')
    .digest('hex')
}

/**
 * The API sees the SvelteKit server as the network peer, so an IP-only bucket
 * would allow one user to lock out the whole institute. These limits protect
 * each named identity until a trusted end-user IP propagation boundary exists.
 */
export const loginLimiter = limiter.define('auth_login', (ctx) => {
  const emailFingerprint = normalizedIdentifier(ctx.request.input('email'))
  return limiter
    .allowRequests(5)
    .every('15 minutes')
    .blockFor('30 minutes')
    .usingKey(`auth_login_${emailFingerprint}`)
})

export const passwordResetRequestLimiter = limiter.define('password_reset_request', (ctx) => {
  const emailFingerprint = normalizedIdentifier(ctx.request.input('email'))
  return limiter
    .allowRequests(3)
    .every('30 minutes')
    .blockFor('30 minutes')
    .usingKey(`password_reset_request_${emailFingerprint}`)
})

export const passwordResetLimiter = limiter.define('password_reset', (ctx) => {
  const fingerprint = tokenFingerprint(ctx.request.input('token'))
  return limiter
    .allowRequests(5)
    .every('15 minutes')
    .blockFor('30 minutes')
    .usingKey(`password_reset_${fingerprint}`)
})
