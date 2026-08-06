# System Flows

This document summarizes the implemented API patterns and authorization flows.
It names application classes and methods as `ClassName.method()` so a reader can
move from a flow directly to its implementation. It describes current behavior,
not future stock workflows that have not yet been built.

## 1. Application patterns

### Request and response boundaries

- **Middleware** establishes request-wide concerns such as authentication and
  session validity before a protected controller action runs.
- **Controllers** coordinate one HTTP action. They authorize, validate, obtain
  the authenticated actor, call one application workflow, and return or
  serialize the response.
- **Policies** answer whether the authenticated actor may attempt an HTTP
  action. Controllers do not inspect role names or permissions directly.
- **Validators** own request payload shapes and normalization.
- **Transformers** own response shapes. Mutation actions normally return only a
  stable message; read actions return transformer-controlled data.

### Application and domain boundaries

- **Provisioning services** create a resource and its initial history.
- **Administration services** perform ordinary updates and lifecycle changes.
- **Directory services** own list, lookup, and detailed read queries.
- **History and access-event services** append the reason, actor, effective
  time, and authorization evidence for durable changes.
- **Focused domain services** own reusable rules such as hierarchy checks,
  effective access, organizational scope, similarity review, and delegation
  compatibility.

### Persistence and consistency boundaries

- **Models** represent current projections and relationships.
- **Version or event records** preserve prior meaning instead of rewriting
  history.
- **Transactions** group authorization revalidation, locks, domain mutations,
  history, and audit evidence into one atomic operation.
- **Stable locks and fingerprints** protect workflows whose reviewed effect may
  become stale before application.
- **Database constraints and triggers** remain the final guard for invariants
  that must hold outside the HTTP application as well.

## 2. Common system flows

### Authenticated mutation

```text
HTTP request
→ authentication middleware
→ Controller.action()
→ Policy.action()
→ request validator
→ auth.getUserOrFail()
→ ProvisioningService.create() or AdministrationService.operation()
→ database transaction
→ lock and revalidate current authority
→ lock and validate domain state
→ persist current projection
→ append version or access event
→ commit
→ message response
```

The policy check rejects unauthorized requests before payload validation or
resource lookup. Transactional revalidation then closes the race between that
initial check and the committed write.

### Authorized directory or detail read

```text
HTTP request
→ authentication middleware
→ Controller.index() or Controller.show()
→ Policy.list() or Policy.view()
→ optional filter validator
→ DirectoryService.list() or DirectoryService.findDetails()
→ Transformer.transform()
→ serialized response
```

Directory projections remain lightweight. Detailed reads may add relationships,
effective history, lifecycle context, or authorization evidence.

### Participant-owned workflow

Some actions are authorized by participation in the requested record rather
than by a general permission. The service performs that ownership check inside
the transaction.

```text
DelegationsController.accept()
→ acceptDelegationValidator
→ auth.getUserOrFail()
→ DelegationResponseService.accept()
→ lock actor and delegation
→ require actor = proposed delegate
→ revalidate source effectiveness and scope compatibility
→ append acceptance and access event
→ message response
```

Administrative termination is different:

```text
DelegationsController.terminate()
→ DelegationPolicy.terminate()
→ AccessRootAuthorityService.isEffective()
→ terminateDelegationValidator
→ DelegationTerminationService.administrativelyTerminate()
→ transactional root-authority revalidation
→ append termination and access event
→ message response
```

### Preview and apply workflow

```text
CatalogueCategoriesController.previewMerge()
→ CatalogueCategoryPolicy.previewMerge()
→ previewCatalogueCategoryMergeValidator
→ CatalogueCategoryMergePreviewService.preview()
→ validate source, target, children, and affected items
→ return impact plus fingerprint

administrator confirms the reviewed effect

→ CatalogueCategoriesController.merge()
→ CatalogueCategoryPolicy.merge()
→ mergeCatalogueCategoryValidator
→ CatalogueCategoryMergeService.merge()
→ stable mutation lock and database transaction
→ CatalogueAuthorityService.authorizeMutation()
→ rebuild preview under locks
→ compare fingerprint
→ mutate items and source category
→ append item and category histories
→ commit
→ message response
```

### Effective-history mutation

```text
current projection
→ lock current open version
→ close its effectiveTo
→ update the projection with model.merge().save()
→ append the next version with reason, actor, and authorization evidence
→ commit as one transaction
```

## 3. Authorization patterns

### Authority is permission plus scope, not a rank

The application has no universal ascending access levels. Effective authority
is composed from independent facts:

```text
active account
+ effective role assignment
+ immutable role version
+ permission key
+ active organizational scope
+ scope mode
+ current time and lifecycle state
→ effective grant
```

Useful authorization boundaries currently include:

- **Authenticated access:** some shared catalogue reads allow any authenticated
  application user, for example `CatalogueCategoryPolicy.list()`.
- **Scoped business access:** an operational permission applies at one
  organizational unit or, when granted, its descendants.
- **Institution-wide business access:** `catalogue.manage` must resolve at the
  active institute for catalogue mutations.
- **Technical access administration:** `access.root` manages accounts, roles,
  assignments, delegations, and organizational authority. It does not imply
  stock or catalogue permissions.

### Permissions and roles

Permission keys are software-defined actions such as `catalogue.manage`,
`movement.request`, `stocktake.count`, and `valuation.record`. Administrators
may combine assignable permissions into reusable roles, but cannot invent a new
permission key through the API.

Roles are permission bundles, not organizational positions or scopes. The
starter roles are `MASTER_ADMIN`, `STORE_SUPERVISOR`, `STOCK_SUPERVISOR`,
`FINANCE_SUPERVISOR`, and `STOCK_TAKER`; configurable roles may evolve as the
institute's duties evolve.

```text
RolesController.replacePermissions()
→ RolePolicy.replacePermissions()
→ RoleAdministrationService.replacePermissions()
→ RoleVersionService.append()
→ append a new immutable role version
```

Existing assignments remain linked to the role version originally granted. A
new version therefore does not silently expand or remove existing authority.

`MASTER_ADMIN` is deliberately narrow: its protected role grants
`access.root`. A Master Admin needs a separate business-role assignment to
receive `catalogue.manage` or another operational permission.

### Role assignments and organizational reach

A direct appointment is represented as:

```text
one account
+ one immutable role version
+ one organizational unit
+ one scope mode
+ start and optional expiry
→ role assignment
```

The two scope modes are:

- `THIS_NODE_ONLY`: matches only the declared organizational unit.
- `INCLUDE_DESCENDANTS`: matches the declared unit and its current descendants.

`OrganizationalScopeService.ancestorIds()` resolves the target unit's ancestry,
and `OrganizationalScopeService.matches()` applies the scope mode.

Example:

```text
Stock Supervisor assignment at Engineering + INCLUDE_DESCENDANTS
→ permission applies at Engineering
→ permission applies at Engineering / Workshop
→ permission does not apply at ICT
```

Assignments may start immediately or later and may expire. Ending, cancelling,
or replacing an assignment appends a termination record rather than rewriting
the approved grant.

```text
RoleAssignmentsController.store()
→ RoleAssignmentPolicy.create()
→ AccessRootAuthorityService.isEffective()
→ createRoleAssignmentValidator
→ RoleAssignmentProvisioningService.create()
→ lock access mutations and acting account
→ AccessRootAuthorityService.assertEffectiveActor()
→ select latest role version and validate scope
→ create assignment
→ AccessEventService.record()
```

### Effective-access resolution

`EffectiveAccessService` is the shared definition of current authority. It
rejects grants when the account is inactive, the role or scope is archived, the
assignment has not started, it has expired, or an effective termination exists.

```text
EffectiveAccessService.authorize(accountId, permissionKey, resolvedScopeId)
→ EffectiveAccessService.grantsForAccount()
→ OrganizationalScopeService.ancestorIds()
→ match effective direct assignments
→ DelegatedAccessQueryService.effectiveLinksForDelegate()
→ match still-effective delegated source assignments
→ direct grants first, then delegated grants
→ first matching grant or null
```

Separate assignments form a union. The returned grant is evidence, not only a
boolean: it identifies the role, role version, assignment, declared and resolved
scope, permission, and optional delegation.

### Policy check and transactional revalidation

Policies provide the early HTTP boundary. A sensitive mutation then locks and
revalidates authority inside its transaction.

Catalogue example:

```text
CatalogueCategoriesController.merge()
→ CatalogueCategoryPolicy.merge()
→ CatalogueAuthorityService.isEffective()
→ EffectiveAccessService.authorize(catalogue.manage at institute)
→ validate request
→ CatalogueCategoryMergeService.merge()
→ CatalogueAuthorityService.authorizeMutation()
→ lock actor, institute, source assignment, role, and optional delegation
→ resolve the same exact grant again
→ proceed only when the evidence is unchanged
```

Root-access example:

```text
AccountsController.suspend()
→ AccessPolicy.suspend()
→ AccessRootAuthorityService.isEffective()
→ AccountLifecycleService.suspend()
→ AccessRootAuthorityService.lockAdministrationAccounts()
→ AccessRootAuthorityService.assertEffectiveActor()
→ mutate account, append version, and record access event
```

`access.root` has additional continuity protection: root-affecting assignment
changes call `AccessRootAuthorityService.assertContinuousCoverage()` so the
system cannot commit an immediate or scheduled period without an effective root
administrator.

### Delegation

Delegation temporarily extends complete direct role assignments; it does not
copy selected permissions, rewrite the source assignment, transfer ownership of
work, or create a new permanent role assignment.

```text
effective direct source assignment
→ DelegationsController.store()
→ DelegationProvisioningService.create()
→ validate delegator ownership, recipient compatibility, interval, and overlap
→ append proposal and linked source assignments
→ proposed delegate accepts through DelegationResponseService.accept()
→ accepted + started + not expired + not terminated
→ DelegatedAccessQueryService.effectiveLinksForDelegate()
→ EffectiveAccessService revalidates each source assignment
→ delegated effective grant
```

Important controls:

- only currently effective direct assignments may be delegated;
- `MASTER_ADMIN`, `access.root`, self-delegation, and re-delegation are blocked;
- the delegate must have compatible direct organizational standing through the
  delegation's expiry;
- one source assignment has at most one overlapping open delegation in V1;
- acceptance applies to the whole proposal;
- the delegator may revoke, the delegate may relinquish, and an effective root
  administrator may terminate;
- expiry is checked synchronously, so security does not depend on a scheduled
  job.

Example:

```text
Store Supervisor has a direct institute-scoped role assignment
→ proposes that whole assignment to a compatible active colleague for leave cover
→ colleague accepts
→ during the accepted interval, EffectiveAccessService returns DELEGATED evidence
→ a catalogue mutation may use catalogue.manage through that evidence
→ catalogue history records both source assignment ID and delegation ID
→ expiry or early termination immediately stops future authorization
```

### Authorization evidence and auditability

Successful access-administration changes use `AccessEventService.record()` to
preserve the actor, target, reason, request context, and authorizing root
assignment. Business histories preserve the exact grant returned by effective
access resolution.

```text
authorized business mutation
→ permissionKey
→ role and immutable role version
→ source assignment
→ optional delegation
→ declared and resolved organizational scope
→ actor, reason, and effective time
→ append-only version or access event
```

Later role edits, assignment endings, delegation expiry, or account suspension
can stop new work without changing who validly authorized historical work.
