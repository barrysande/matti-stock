# System Flows

This document explains the API's current application patterns and authorization
flows. It names classes and methods as `ClassName.method()` so readers can move
from each flow directly to its implementation.

## 1. Application patterns

### Request and response boundaries

- **Middleware** handles concerns shared across a request, such as authentication
  and session validity, before a protected controller action runs.
- **Controllers** coordinate one HTTP action. They authorize, validate, obtain
  the authenticated actor, call one application workflow, and return a message
  or serialized resource data.
- **Policies** use the authenticated actor's effective permissions and scopes to
  decide whether an HTTP action may proceed.
- **Validators** define request payload shapes and normalization.
- **Transformers** define serialized resource data. Successful reads return
  transformer-controlled data; successful mutations return only
  `{ message: string }`. An explicitly designed exception may return both.

### Application and domain boundaries

- **Provisioning services** create a resource and its initial history.
- **Administration services** perform ordinary updates and lifecycle changes.
- **Directory services** load lists, lookup results, and detailed views.
- **History and access-event services** append records of the reason, actor,
  effective time, and authorization evidence for durable changes.
- **Focused domain services** own reusable rules such as hierarchy checks,
  effective access, organizational scope, similarity review, and delegation
  compatibility.

### Persistence and consistency boundaries

- **Models** represent each resource's current state and relationships.
- **Version or event records** preserve prior meaning through append-only
  history.
- **Transactions** group authorization revalidation, locks, domain mutations,
  history writes, and audit evidence into one atomic operation.
- **Row locks** protect records during transactional validation and mutation.
  **Named application locks** coordinate broader workflows, while
  **fingerprints** detect state changes after review.
- **Database constraints and triggers** enforce invariants even when a change
  originates outside the HTTP application.

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
→ persist the current projection
→ append version or access event
→ commit
→ message response
```

The policy check rejects an unauthorized request before payload validation or
resource lookup. Because authority could change after that check, the service
revalidates it inside the transaction before committing the write.

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

List projections remain lightweight, while detailed reads may include
relationships, effective history, lifecycle context, or authorization evidence.

### Participant-owned workflow

Some actions derive authority from participation in the requested record. The
service verifies that ownership inside the transaction.

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

Administrative termination uses root authority:

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

administrator confirms the reviewed changes

→ CatalogueCategoriesController.merge()
→ CatalogueCategoryPolicy.merge()
→ mergeCatalogueCategoryValidator
→ CatalogueCategoryMergeService.merge()
→ named application lock and database transaction
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
→ set its end time (`effectiveTo`)
→ update the projection with model.merge().save()
→ append the next version with reason, actor, and authorization evidence
→ commit as one transaction
```

## 3. Authorization patterns

### Authority combines permission and scope

The application derives effective authority from these facts:

```text
active account
+ effective role assignment
+ immutable role version
+ permission key
+ active organizational scope
+ scope mode
+ assignment timing and lifecycle state
→ effective grant
```

The current authorization boundaries are:

- **Authenticated access:** some shared catalogue reads allow any authenticated
  application user, for example `CatalogueCategoryPolicy.list()`.
- **Scoped business access:** an operational permission applies at one
  organizational unit or, when granted, its descendants.
- **Institution-wide business access:** `catalogue.manage` must resolve at the
  active institute for catalogue mutations.
- **Technical access administration:** `access.root` manages accounts, roles,
  assignments, delegations, and organizational authority. Stock and catalogue
  operations require their corresponding business permissions.

### Permissions and roles

Permission keys are software-defined actions such as `catalogue.manage`,
`movement.request`, `stocktake.count`, and `valuation.record`. The application
defines the available keys, and administrators combine the assignable ones into
reusable roles.

Each role assignment grants a role to an account at an organizational scope.
The starter roles are `MASTER_ADMIN`, `STORE_SUPERVISOR`, `STOCK_SUPERVISOR`,
`FINANCE_SUPERVISOR`, and `STOCK_TAKER`; configurable roles may evolve as the
institute's duties evolve.

```text
RolesController.replacePermissions()
→ RolePolicy.replacePermissions()
→ RoleAdministrationService.replacePermissions()
→ RoleVersionService.append()
→ append a new immutable role version
```

Existing assignments retain the role version originally granted. A new version
applies through later grants or explicit assignment replacement.

The protected `MASTER_ADMIN` role grants `access.root`. A Master Admin receives
`catalogue.manage` or another operational permission through a separate
business-role assignment.

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
→ ICT requires its own matching assignment
```

Assignments may start immediately or later and may expire. Ending, cancelling,
or replacing one appends a termination record and preserves the approved grant.

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

`EffectiveAccessService` is the shared definition of current authority. An
effective grant requires an active account, active role and scope, a started and
unexpired assignment, and an open lifecycle.

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

An account receives the combined permissions of all matching assignments. The
returned evidence identifies the role, role version, assignment, declared and
resolved scope, permission, and optional delegation.

### Policy check and transactional revalidation

Policies perform the first authorization check at the HTTP boundary. For a
sensitive mutation, the service then locks the relevant records and revalidates
authority inside the transaction.

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
→ resolve the exact grant again
→ compare the two grant results
→ continue when the authorization evidence matches
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

Root-affecting assignment changes call
`AccessRootAuthorityService.assertContinuousCoverage()` and require continuous
effective `access.root` coverage across immediate and scheduled intervals.

### Delegation

Delegation temporarily grants a delegate every permission and the organizational
reach of a complete direct role assignment. The source assignment and work
ownership remain with the delegator. The temporary grant applies during the
accepted interval.

```text
effective direct source assignment
→ DelegationsController.store()
→ DelegationProvisioningService.create()
→ validate delegator ownership, recipient compatibility, interval, and overlap
→ append proposal and linked source assignments
→ proposed delegate accepts through DelegationResponseService.accept()
→ accepted + within effective interval + no early termination
→ DelegatedAccessQueryService.effectiveLinksForDelegate()
→ EffectiveAccessService revalidates each source assignment
→ delegated effective grant
```

Important controls:

- the source must be a currently effective direct assignment;
- `MASTER_ADMIN`, `access.root`, self-delegation, and re-delegation are blocked;
- the delegate must have compatible direct organizational standing through the
  delegation's expiry;
- one source assignment has at most one overlapping open delegation in V1;
- acceptance applies to the whole proposal;
- the delegator may revoke, the delegate may relinquish, and an effective root
  administrator may terminate;
- `EffectiveAccessService` checks expiry synchronously on every resolution.

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
govern future work. Historical records retain their original authorization.
