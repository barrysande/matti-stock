<script lang="ts">
	import { resolve } from '$app/paths';
	import DateTime from '$lib/components/date-time.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import RoleAssignmentGrantForm from '$lib/components/role-assignment-grant-form.svelte';
	import RoleAssignmentSummary from '$lib/components/role-assignment-summary.svelte';
	import RolePermissionList from '$lib/components/role-permission-list.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { ineffectiveReasonLabel } from '$lib/helpers/role-assignment-presentation';
	import {
		administerRoleAssignmentSchema,
		grantRoleAssignmentSchema
	} from '$lib/schemas/role-assignment';
	import { IconArrowLeft, IconRefresh, IconShieldOff, IconX } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	const isActive = $derived(data.assignment.status === 'ACTIVE');
	const isUpcoming = $derived(data.assignment.status === 'UPCOMING');
	const canReplace = $derived(isActive || isUpcoming);
	const account = $derived({
		id: data.assignment.account.id,
		displayName: data.assignment.account.displayName,
		email: data.assignment.account.email,
		status: data.assignment.account.status
	});

	let replaceDialogOpen = $state(false);
	let endDialogOpen = $state(false);
	let cancelDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const replaceForm = superForm(data.replaceForm, {
		id: 'role-assignment-replace',
		validators: valibotClient(grantRoleAssignmentSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				replaceDialogOpen = false;
			}
		}
	});

	// svelte-ignore state_referenced_locally
	const endForm = superForm(data.endForm, {
		id: 'role-assignment-end',
		validators: valibotClient(administerRoleAssignmentSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				endDialogOpen = false;
			}
		}
	});

	const { form: endData, enhance: endEnhance, submitting: endSubmitting } = endForm;

	// svelte-ignore state_referenced_locally
	const cancelForm = superForm(data.cancelForm, {
		id: 'role-assignment-cancel',
		validators: valibotClient(administerRoleAssignmentSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				cancelDialogOpen = false;
			}
		}
	});

	const { form: cancelData, enhance: cancelEnhance, submitting: cancelSubmitting } = cancelForm;
</script>

<svelte:head><title>{data.assignment.role.name} assignment · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Role assignment"
		title={data.assignment.account.displayName}
		description={`${data.assignment.role.name} within ${data.assignment.scope.path}`}
	>
		{#snippet actions()}
			<Button variant="outline" href={resolve('/role-assignments')}>
				<IconArrowLeft />Back to assignments
			</Button>
			{#if canReplace}
				<Button variant="outline" onclick={() => (replaceDialogOpen = true)}>
					<IconRefresh />Replace
				</Button>
			{/if}
			{#if isActive}
				<Button variant="destructive" onclick={() => (endDialogOpen = true)}>
					<IconShieldOff />End assignment
				</Button>
			{:else if isUpcoming}
				<Button variant="destructive" onclick={() => (cancelDialogOpen = true)}>
					<IconX />Cancel assignment
				</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
		<Card.Root>
			<Card.Header>
				<Card.Title>Assignment details</Card.Title>
				<Card.Description>The role, area, dates, and current assignment status.</Card.Description>
			</Card.Header>
			<Card.Content><RoleAssignmentSummary assignment={data.assignment} /></Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>Assignment record</Card.Title></Card.Header>
			<Card.Content>
				<dl class="space-y-3 text-sm">
					<div>
						<dt class="text-muted-foreground">Created by</dt>
						<dd>{data.assignment.grantedBy?.displayName ?? 'System setup'}</dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Recorded</dt>
						<dd><DateTime value={data.assignment.createdAt} /></dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Reason</dt>
						<dd class="whitespace-pre-wrap">{data.assignment.reason}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>
	</div>

	{#if !data.assignment.role.isLatestVersion}
		<Card.Root class="border-amber-500/40 bg-amber-500/5">
			<Card.Content>
				<p class="font-heading font-semibold">This assignment uses an earlier set of permissions</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Replacing it applies the role's current permissions.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.assignment.ineffectiveReasons.length}
		<Card.Root>
			<Card.Header>
				<Card.Title>Why this assignment is not effective now</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
					{#each data.assignment.ineffectiveReasons as reason (reason)}
						<li>{ineffectiveReasonLabel(reason)}</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Permissions included</Card.Title>
			<Card.Description>These are the permissions provided by this assignment.</Card.Description>
		</Card.Header>
		<Card.Content>
			<RolePermissionList
				permissionKeys={data.assignment.role.permissionKeys}
				permissions={data.permissions}
			/>
		</Card.Content>
	</Card.Root>

	{#if data.assignment.termination}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between gap-3">
					<Card.Title>How this assignment ended</Card.Title>
					<StatusBadge status={data.assignment.termination.kind} />
				</div>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 text-sm sm:grid-cols-2">
					<div>
						<dt class="text-muted-foreground">Effective (EAT)</dt>
						<dd><DateTime value={data.assignment.termination.effectiveAt} /></dd>
					</div>
					<div>
						<dt class="text-muted-foreground">Recorded by</dt>
						<dd>{data.assignment.termination.terminatedBy.displayName}</dd>
					</div>
					<div class="sm:col-span-2">
						<dt class="text-muted-foreground">Reason</dt>
						<dd class="whitespace-pre-wrap">{data.assignment.termination.reason}</dd>
					</div>
				</dl>
				{#if data.assignment.termination.replacementAssignmentId}
					<Button
						class="mt-4"
						variant="outline"
						href={resolve(
							`/role-assignments/${data.assignment.termination.replacementAssignmentId}`
						)}
					>
						Open replacement assignment
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<Dialog.Root bind:open={replaceDialogOpen}>
	<Dialog.Content class="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Replace role assignment</Dialog.Title>
			<Dialog.Description>
				The existing assignment remains in history. The replacement keeps the same person and role.
			</Dialog.Description>
		</Dialog.Header>
		<RoleAssignmentGrantForm
			form={replaceForm}
			{account}
			roles={[data.role]}
			lockedRole={data.role}
			organizationalUnits={data.organizationalUnits}
			action="?/replace"
			submitLabel="Create replacement"
		/>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={endDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>End active assignment</Dialog.Title>
			<Dialog.Description
				>Access stops immediately. The assignment remains in history.</Dialog.Description
			>
		</Dialog.Header>
		<form method="POST" action="?/end" use:endEnhance class="space-y-4">
			<Form.Field form={endForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$endData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (endDialogOpen = false)}
					>Keep assignment</Button
				>
				<Button type="submit" variant="destructive" disabled={$endSubmitting}>End assignment</Button
				>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={cancelDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Cancel upcoming assignment</Dialog.Title>
			<Dialog.Description>The scheduled assignment will never take effect.</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/cancel" use:cancelEnhance class="space-y-4">
			<Form.Field form={cancelForm} name="reason">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Reason</Form.Label>
						<Textarea {...props} bind:value={$cancelData.reason} aria-required="true" />
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (cancelDialogOpen = false)}
					>Keep assignment</Button
				>
				<Button type="submit" variant="destructive" disabled={$cancelSubmitting}>
					Cancel assignment
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
