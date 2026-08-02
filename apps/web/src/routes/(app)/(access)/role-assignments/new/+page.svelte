<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import RoleAssignmentGrantForm from '$lib/components/role-assignment-grant-form.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { grantRoleAssignmentSchema } from '$lib/schemas/role-assignment';
	import { IconArrowLeft, IconSearch } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'role-assignment-create',
		validators: valibotClient(grantRoleAssignmentSchema),
		resetForm: false
	});
	const selectedAccount = $derived(
		data.selectedAccount
			? {
					id: data.selectedAccount.id,
					displayName: data.selectedAccount.person.displayName,
					email: data.selectedAccount.email,
					status: data.selectedAccount.status
				}
			: null
	);

	function selectAccountHref(accountId: string) {
		return `${resolve('/role-assignments/new')}?accountId=${encodeURIComponent(accountId)}`;
	}
</script>

<svelte:head><title>Create role assignment · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Role assignments"
		title="Create role assignment"
		description="Choose an account, role, and area of responsibility."
	>
		{#snippet actions()}
			<Button variant="outline" href={resolve('/role-assignments')}>
				<IconArrowLeft />Back to assignments
			</Button>
		{/snippet}
	</PageHeader>

	{#if selectedAccount}
		<div class="flex justify-end">
			<Button variant="outline" href={resolve('/role-assignments/new')}>Change account</Button>
		</div>
		<RoleAssignmentGrantForm
			{form}
			account={selectedAccount}
			roles={data.roles}
			organizationalUnits={data.organizationalUnits}
			action="?/create"
			submitLabel="Create assignment"
		/>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Choose an account</Card.Title>
				<Card.Description>
					Invited and active accounts may receive assignments. Search before continuing.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row">
					<div class="relative flex-1">
						<IconSearch
							class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							name="search"
							value={data.accountFilters.search ?? ''}
							placeholder="Name, email, or staff number"
							class="ps-9"
						/>
					</div>
					<Button type="submit" variant="outline">Search accounts</Button>
				</form>
			</Card.Content>
		</Card.Root>

		{#if data.accounts.data.length}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.accounts.data as account (account.id)}
					<Card.Root>
						<Card.Header>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<Card.Title class="truncate text-base">{account.person.displayName}</Card.Title>
									<Card.Description class="truncate">{account.email}</Card.Description>
								</div>
								<StatusBadge status={account.status} />
							</div>
						</Card.Header>
						<Card.Content>
							{#if account.status === 'ACTIVE' || account.status === 'INVITED'}
								<Button class="w-full" href={selectAccountHref(account.id)}>Select account</Button>
							{:else}
								<p class="text-sm text-muted-foreground">
									Restore or reactivate this account before assigning a role.
								</p>
							{/if}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
			<PaginationControls
				currentPage={data.accounts.metadata.currentPage}
				lastPage={data.accounts.metadata.lastPage}
				url={page.url}
			/>
		{:else}
			<EmptyState title="No accounts found" description="Try another account search." />
		{/if}
	{/if}
</div>
