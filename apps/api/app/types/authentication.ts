import type UserAccount from '#models/user_account'

export type LoginVerificationResult =
  | { kind: 'AUTHENTICATED'; account: UserAccount }
  | { kind: 'INVALID_CREDENTIALS' }
  | { kind: 'ACCOUNT_SIGN_IN_UNAVAILABLE' }

export type PasswordCredentialRedemptionResult =
  { kind: 'COMPLETED' } | { kind: 'INVALID' } | { kind: 'ACCOUNT_SIGN_IN_UNAVAILABLE' }
