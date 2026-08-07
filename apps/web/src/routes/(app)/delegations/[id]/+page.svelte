<script lang="ts">
	import { resolve } from '$app/paths';
	import DateTime from '$lib/components/date-time.svelte';
	import DelegationAssignmentSummary from '$lib/components/delegation-assignment-summary.svelte';
	import DelegationParticipants from '$lib/components/delegation-participants.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { delegationReasonSchema, optionalReasonSchema } from '$lib/schemas/delegation';
	import {
		IconArrowLeft,
		IconCheck,
		IconDoorExit,
		IconShieldOff,
		IconX
	} from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	const currentAccountId = $derived(data.account.account.id);

	const isRoot = $derived(data.account.effectivePermissionKeys.includes('access.root'));
	const isDelegator = $derived(data.delegation.delegator.accountId === currentAccountId);
	const isDelegate = $derived(data.delegation.delegate.accountId === currentAccountId);

	const openStatuses = ['PENDING', 'UPCOMING', 'ACTIVE'];
	const isOpen = $derived(openStatuses.includes(data.delegation.status));

	const canRespond = $derived(isDelegate && data.delegation.status === 'PENDING');
	const canRevoke = $derived(isDelegator && isOpen);
	const canRelinquish = $derived(
		isDelegate && ['UPCOMING', 'ACTIVE'].includes(data.delegation.status)
	);
	const canAdministrativelyTerminate = $derived(isRoot && isOpen);

	let acceptDialogOpen = $state(false);
	let rejectDialogOpen = $state(false);
	let revokeDialogOpen = $state(false);
	let relinquishDialogOpen = $state(false);
	let terminateDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const acceptForm = superForm(data.acceptForm, {
		id: 'delegation-accept',
		validators: valibotClient(optionalReasonSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				acceptDialogOpen = false;
			}
		}
	});

	const { form: acceptData, enhance: acceptEnhance, submitting: acceptSubmitting } = acceptForm;

	// svelte-ignore state_referenced_locally
	const rejectForm = superForm(data.rejectForm, {
		id: 'delegation-reject',
		validators: valibotClient(delegationReasonSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				rejectDialogOpen = false;
			}
		}
	});

	const { form: rejectData, enhance: rejectEnhance, submitting: rejectSubmitting } = rejectForm;

	// svelte-ignore state_referenced_locally
	const revokeForm = superForm(data.revokeForm, {
		id: 'delegation-revoke',
		validators: valibotClient(delegationReasonSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				revokeDialogOpen = false;
			}
		}
	});

	const { form: revokeData, enhance: revokeEnhance, submitting: revokeSubmitting } = revokeForm;

	// svelte-ignore state_referenced_locally
	const relinquishForm = superForm(data.relinquishForm, {
		id: 'delegation-relinquish',
		validators: valibotClient(delegationReasonSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				relinquishDialogOpen = false;
			}
		}
	});

	const {
		form: relinquishData,
		enhance: relinquishEnhance,
		submitting: relinquishSubmitting
	} = relinquishForm;

	// svelte-ignore state_referenced_locally
	const terminateForm = superForm(data.terminateForm, {
		id: 'delegation-terminate',
		validators: valibotClient(delegationReasonSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				terminateDialogOpen = false;
			}
		}
	});

	const {
		form: terminateData,
		enhance: terminateEnhance,
		submitting: terminateSubmitting
	} = terminateForm;
</script>

<svelte:head><title>Temporary coverage · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Delegation record"
		title={`${data.delegation.delegator.displayName} to ${data.delegation.delegate.displayName}`}
		description="Review the people, assignments, dates, response, and current effectiveness."
	>
		{#snippet titleContent()}
			<DelegationParticipants
				delegator={data.delegation.delegator}
				delegate={data.delegation.delegate}
				showEmails={false}
				heading
			/>
		{/snippet}
		{#snippet actions()}
			<Button variant="outline" href={resolve('/delegations')}>
				<IconArrowLeft />Back to delegations
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
		<Card.Root>
			<Card.Header>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<Card.Title>Temporary coverage</Card.Title>
						<Card.Description>The participants and exact institutional interval.</Card.Description>
					</div>
					<StatusBadge status={data.delegation.status} />
				</div>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-muted-foreground">Proposed by</dt>
						<dd class="font-medium">{data.delegation.delegator.displayName}</dd>
						<dd class="text-muted-foreground">{data.delegation.delegator.email}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Recipient</dt>
						<dd class="font-medium">{data.delegation.delegate.displayName}</dd>
						<dd class="text-muted-foreground">{data.delegation.delegate.email}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Starts (EAT)</dt>
						<dd><DateTime value={data.delegation.startsAt} /></dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Expires (EAT)</dt>
						<dd><DateTime value={data.delegation.expiresAt} /></dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>Proposal record</Card.Title></Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="text-muted-foreground">Recorded</dt>
						<dd><DateTime value={data.delegation.createdAt} /></dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Reason</dt>
						<dd class="whitespace-pre-wrap">{data.delegation.reason}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>
	</div>

	{#if data.delegation.status === 'ACTIVE' && data.delegation.effectiveItemCount < data.delegation.totalItemCount}
		<Card.Root class="border-amber-500/40 bg-amber-500/5">
			<Card.Content>
				<p class="font-heading font-semibold">Some included assignments are no longer effective</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{data.delegation.effectiveItemCount} of {data.delegation.totalItemCount} assignments currently
					contribute access. Review each item below.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Assignments included</Card.Title>
			<Card.Description>
				Each complete assignment keeps its original Role, Applies within, Coverage, and permissions.
			</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-4">
			{#each data.delegation.assignments as assignment (assignment.id)}
				<div class="rounded-xl border p-4">
					<DelegationAssignmentSummary {assignment} showPermissions showEffectiveness />
				</div>
			{/each}
		</Card.Content>
	</Card.Root>

	{#if data.delegation.response}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-3">
					<Card.Title>Recipient response</Card.Title>
					<StatusBadge status={data.delegation.response.kind} />
				</div>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-muted-foreground">Responded by</dt>
						<dd>{data.delegation.response.respondedBy.displayName}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Recorded</dt>
						<dd><DateTime value={data.delegation.response.createdAt} /></dd>
					</div>
					{#if data.delegation.response.reason}
						<div class="sm:col-span-2">
							<dt class="text-muted-foreground">Reason or note</dt>
							<dd class="whitespace-pre-wrap">{data.delegation.response.reason}</dd>
						</div>
					{/if}
				</dl>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.delegation.termination}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-3">
					<Card.Title>How this temporary coverage ended</Card.Title>
					<StatusBadge status={data.delegation.termination.kind} />
				</div>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-muted-foreground">Effective (EAT)</dt>
						<dd><DateTime value={data.delegation.termination.effectiveAt} /></dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Recorded by</dt>
						<dd>{data.delegation.termination.terminatedBy.displayName}</dd>
					</div>
					<div class="sm:col-span-2">
						<dt class="text-muted-foreground">Reason</dt>
						<dd class="whitespace-pre-wrap">{data.delegation.termination.reason}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if canRespond || canRevoke || canRelinquish}
		<Card.Root>
			<Card.Header>
				<Card.Title>Your participant actions</Card.Title>
				<Card.Description>
					These actions record what you do as the proposer or recipient.
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-3">
				{#if canRespond}
					<Button onclick={() => (acceptDialogOpen = true)}><IconCheck />Accept coverage</Button>
					<Button variant="destructive" onclick={() => (rejectDialogOpen = true)}>
						<IconX />Decline proposal
					</Button>
				{/if}
				{#if canRevoke}
					<Button variant="destructive" onclick={() => (revokeDialogOpen = true)}>
						<IconShieldOff />{data.delegation.status === 'PENDING'
							? 'Withdraw proposal'
							: 'End coverage'}
					</Button>
				{/if}
				{#if canRelinquish}
					<Button variant="destructive" onclick={() => (relinquishDialogOpen = true)}>
						<IconDoorExit />Relinquish coverage
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if canAdministrativelyTerminate}
		<Card.Root class="border-destructive/30">
			<Card.Header>
				<Card.Title>Administrative action</Card.Title>
				<Card.Description>
					This is recorded separately from any action you may take as a participant.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button variant="destructive" onclick={() => (terminateDialogOpen = true)}>
					<IconShieldOff />End administratively
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<Dialog.Root bind:open={acceptDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Accept temporary coverage</Dialog.Title>
			<Dialog.Description>
				You accept every included assignment. Access starts only within the displayed interval.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/accept" use:acceptEnhance class="space-y-4">
			<Form.Field form={acceptForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Note (optional)</Form.Label>
						<Textarea {...props} bind:value={$acceptData.reason} />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (acceptDialogOpen = false)}>
					Not now
				</Button>
				<Button type="submit" disabled={$acceptSubmitting}>Accept coverage</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={rejectDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Decline proposal</Dialog.Title>
			<Dialog.Description>The proposer will need to make another arrangement.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/reject" use:rejectEnhance class="space-y-4">
			<Form.Field form={rejectForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$rejectData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (rejectDialogOpen = false)}>
					Keep proposal
				</Button>
				<Button type="submit" variant="destructive" disabled={$rejectSubmitting}>
					Decline proposal
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={revokeDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>
				{data.delegation.status === 'PENDING' ? 'Withdraw proposal' : 'End temporary coverage'}
			</Dialog.Title>
			<Dialog.Description>
				{data.delegation.status === 'PENDING'
					? 'The recipient will no longer be able to respond.'
					: 'All access through this temporary arrangement stops immediately.'}
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/revoke" use:revokeEnhance class="space-y-4">
			<Form.Field form={revokeForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$revokeData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (revokeDialogOpen = false)}>
					Keep coverage
				</Button>
				<Button type="submit" variant="destructive" disabled={$revokeSubmitting}>Confirm</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={relinquishDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Relinquish temporary coverage</Dialog.Title>
			<Dialog.Description>
				Your access through every included assignment stops immediately.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/relinquish" use:relinquishEnhance class="space-y-4">
			<Form.Field form={relinquishForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$relinquishData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (relinquishDialogOpen = false)}>
					Keep coverage
				</Button>
				<Button type="submit" variant="destructive" disabled={$relinquishSubmitting}>
					Relinquish coverage
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={terminateDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>End temporary coverage administratively</Dialog.Title>
			<Dialog.Description>
				This records an administrative intervention, distinct from the participants' choices.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/terminate" use:terminateEnhance class="space-y-4">
			<Form.Field form={terminateForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$terminateData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (terminateDialogOpen = false)}>
					Keep coverage
				</Button>
				<Button type="submit" variant="destructive" disabled={$terminateSubmitting}>
					End administratively
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
