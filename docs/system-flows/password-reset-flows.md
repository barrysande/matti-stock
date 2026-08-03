# Password Reset and Initial Setup Flows

This document traces the implemented credential-recovery workflow from the web
interface through the API, email queue, and credential-redemption boundary. It
is written for developers and preserves security-relevant branches that may be
condensed in onboarding or demonstration material.

## Scope and governing rules

- Anonymous recovery that passes the request limiter always returns the same
  neutral response, whether the submitted email is unknown, active, invited,
  suspended, or deactivated.
- A rate-limited request stops before the controller, creates no challenge, and
  receives explicit wait-and-retry guidance.
- Only `ACTIVE` and `INVITED` accounts may receive or redeem credential
  challenges.
- A verified person receives a `RESET` challenge. An unverified person receives
  an `INITIAL_SETUP` challenge.
- Challenges are purpose-bound, one-hour, single-use, and supersedable.
- Suspension and deactivation increment the account's password-reset version,
  invalidating previously issued challenges.
- Redemption locks and rechecks the challenge and account before changing a
  password.
- Public responses do not expose whether a blocked account is suspended or
  deactivated. Audit events retain the exact status.

## 1. Forgot-password request

```mermaid
flowchart TD
    user[User submits /forgot-password] --> web[Web forgot-password page action]
    web -->|POST /auth/password/forgot| limiter{Password-reset request limiter allows request?}
    limiter -->|No| limited[Return 429<br/>Show wait-and-retry guidance]
    limiter -->|Yes| controller[controller.PasswordResetsController.request]
    controller --> service[service.PasswordChallengeService.request]

    service --> account{Account found?}
    account -->|No| unknown[Record PASSWORD_RESET_REQUESTED_UNKNOWN_ACCOUNT]
    unknown --> neutral[Return neutral success response]

    account -->|Yes| status{Status is ACTIVE or INVITED?}
    status -->|No| blocked[Record PASSWORD_RESET_REJECTED_ACCOUNT_STATUS<br/>with exact internal status]
    blocked --> neutral

    status -->|Yes| purpose[service.PasswordChallengeService.challengePurpose]
    purpose --> verified{Official email verified?}
    verified -->|Yes| reset[Purpose: RESET]
    verified -->|No| setup[Purpose: INITIAL_SETUP]
    reset --> issue[service.PasswordChallengeService.issueChallenge]
    setup --> issue

    issue --> version[Increment passwordResetVersion]
    version --> persist[Create one-hour challenge and audit request]
    persist --> queue[Queue job.SendPasswordCredentialEmail.execute]
    queue --> neutral
```

The response shown for every controller branch is:

> If an account uses that email, a password reset link will be sent.

The rate-limited branch never reaches the controller and therefore does not
show the neutral response. The controller queues email work only when the
service returns a challenge. Queue-dispatch failure is logged but does not
change the neutral public response or roll back the committed challenge.

## 2. Queued credential email

```mermaid
flowchart TD
    queue[Queue worker receives challengeId] --> job[job.SendPasswordCredentialEmail.execute]
    job --> available{Challenge exists and is unexpired?}
    available -->|No| stop1[Skip delivery]
    available -->|Yes| redeemed{Already redeemed?}
    redeemed -->|Yes| stop2[Skip delivery]
    redeemed -->|No| version{Challenge version matches account?}
    version -->|No| stop3[Skip superseded challenge]
    version -->|Yes| token[service.PasswordChallengeService.createToken]

    token --> purpose{Challenge purpose}
    purpose -->|INITIAL_SETUP| unverified{Official email remains unverified?}
    unverified -->|No| stop4[Skip setup delivery]
    unverified -->|Yes| setupMail[mail.AccountPasswordSetupMail.prepare]
    setupMail --> setupUrl[Send /set-password?token=...]

    purpose -->|RESET| verified{Official email remains verified?}
    verified -->|No| stop5[Skip reset delivery]
    verified -->|Yes| resetMail[mail.PasswordResetMail.prepare]
    resetMail --> resetUrl[Send /reset-password?token=...]
```

The durable queue payload contains only the challenge ID. The encrypted token
is created by the worker immediately before email delivery and is never stored
as readable application data.

## 3. Password-reset redemption

```mermaid
flowchart TD
    user[User submits /reset-password] --> web[Web reset-password page action]
    web -->|POST /auth/password/reset| controller[controller.PasswordResetsController.reset]
    controller --> reset[service.PasswordCredentialService.reset]
    reset --> redeem[service.PasswordCredentialService.redeem]

    redeem --> token{Token decrypts to a supported payload?}
    token -->|No| invalid[Record PASSWORD_RESET_REJECTED]
    token -->|Yes| challenge{Challenge exists, is unexpired,<br/>and has RESET purpose?}
    challenge -->|No| invalid
    challenge -->|Yes| used{Already redeemed?}
    used -->|Yes| invalid
    used -->|No| version{Token, challenge, and account<br/>versions still match?}
    version -->|No| invalid
    version -->|Yes| status{Status is ACTIVE or INVITED?}
    status -->|No| blocked[Record rejection with exact internal status]
    status -->|Yes| replace[Create redemption and replace password]

    replace --> increment[Increment credentialVersion and passwordResetVersion]
    increment --> audit[Record PASSWORD_RESET_COMPLETED]
    audit --> success[Return success and direct user to sign in]

    invalid --> invalidResponse[Return generic invalid-or-expired response]
    blocked --> blockedResponse[Return shared account-unavailable response]
```

Malformed, missing, expired, wrong-purpose, redeemed, and superseded challenges
share the invalid-or-expired response. A current challenge whose account is
blocked receives:

> This account cannot currently sign in. Contact administrator.

## 4. Initial password setup redemption

The initial-setup endpoint uses the same locked redemption service with a
different required purpose and completion event.

```mermaid
flowchart TD
    user[Invited user submits /set-password] --> web[Web set-password page action]
    web -->|POST /auth/password/set| controller[controller.PasswordSetupsController.store]
    controller --> setup[service.PasswordCredentialService.setup]
    setup --> redeem[service.PasswordCredentialService.redeem]

    redeem --> valid{Current INITIAL_SETUP challenge<br/>for ACTIVE or INVITED account?}
    valid -->|No: invalid link| invalid[Return generic invalid-or-expired response]
    valid -->|No: blocked account| blocked[Return shared account-unavailable response]
    valid -->|Yes| replace[Create redemption and replace password]
    replace --> verify[Verify official email if not already verified]
    verify --> versions[Increment credential and password-reset versions]
    versions --> audit[Record ACCOUNT_PASSWORD_SET]
    audit --> login[Direct user to sign in]
```

Setting the password does not create a session. The first successful login
performs the accepted `INVITED` to `ACTIVE` transition.

## 5. Administrative credential recovery

```mermaid
flowchart TD
    admin[Master Admin submits account recovery reason] --> web[Web account-detail resetPassword action]
    web -->|POST /accounts/:id/password-reset| controller[controller.AccountsController.resetPassword]
    controller --> authorization[Authorize access.root and validate reason]
    authorization --> service[service.AccountCredentialAdministrationService.requestPasswordReset]
    service --> lock[Lock and revalidate actor and target accounts]
    lock --> status{Target status is ACTIVE or INVITED?}

    status -->|No| reject[Reject with E_ACCOUNT_CREDENTIAL_RECOVERY_UNAVAILABLE]
    status -->|Yes| issue[service.PasswordChallengeService.issueForAdministration]
    issue --> purpose[service.PasswordChallengeService.challengePurpose]
    purpose --> challenge[service.PasswordChallengeService.issueChallenge]
    challenge --> queue[Queue job.SendPasswordCredentialEmail.execute]
    queue --> success[Return credential-recovery message]
```

The web account-detail page does not offer credential recovery for suspended or
deactivated accounts. The API check remains authoritative for direct requests
and pages made stale by a concurrent lifecycle change. The administrator never
supplies, receives, or learns the account holder's password or recovery token.

## Status and outcome matrix

| Account state | Sign in with correct password | Anonymous recovery request | Administrative recovery | Redeem current challenge |
| --- | --- | --- | --- | --- |
| `INVITED` | Allowed; activates account | Issues setup or reset challenge according to email verification | Allowed | Allowed |
| `ACTIVE` | Allowed | Issues reset challenge | Allowed | Allowed |
| `SUSPENDED` | Shared account-unavailable message | Neutral response; no challenge | Rejected | Shared account-unavailable message |
| `DEACTIVATED` | Shared account-unavailable message | Neutral response; no challenge | Rejected | Shared account-unavailable message |
| Unknown email | Invalid credentials | Neutral response; no challenge | Not applicable | Not applicable |

## Deriving simplified user flows

Onboarding and demonstration flows may collapse implementation participants but
must preserve the following user-visible behavior:

| Developer flow | Simplified user-flow step | Details that may remain internal |
| --- | --- | --- |
| Forgot-password request | Enter official email and submit | Account lookup, neutral branching, audit event type, and challenge version |
| Queued delivery | Check official email and open the link within one hour | Queue payload, token creation timing, and delivery skip checks |
| Reset redemption | Choose a new password, then sign in | Transaction locks, redemption record, credential versions, and audit metadata |
| Initial setup | Set the first password, then sign in | Shared redemption service and `INVITED` to `ACTIVE` activation timing |
| Blocked account | Contact administrator | Exact suspended/deactivated status remains internal in public authentication flows |
| Administrative recovery | Administrator requests a holder-controlled link | Root-authority locking, challenge purpose selection, and queue dispatch |

Do not simplify the neutral forgot-password response into confirmation that an
account exists or that an email was sent. Do not portray an administrator as
setting or receiving another person's password. Keep rate-limit guidance
distinct from the neutral accepted-request response because a rate-limited
request creates no challenge.
