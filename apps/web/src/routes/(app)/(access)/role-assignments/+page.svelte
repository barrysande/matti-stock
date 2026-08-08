<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import RoleAssignmentSummary from '$lib/components/role-assignment-summary.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import DateTime from '$lib/components/date-time.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { accessLabel } from '$lib/helpers/access-labels';
	import { IconPlus } from '@tabler/icons-svelte';

	let { data } = $props();

	let selectedStatus = $derived<string>(data.filters.status ?? 'ALL');
	let selectedRole = $derived<string>(data.filters.roleId ?? 'ALL');
	let selectedScope = $derived<string>(data.filters.scopeOrganizationalUnitId ?? 'ALL');

	const statusOptions = ['UPCOMING', 'ACTIVE', 'EXPIRED', 'ENDED', 'CANCELLED', 'REPLACED'];

	function label(value: string) {
		return value
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

<svelte:head><title>Role assignments · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Access administration"
		title="Role assignments"
		description="Review current, scheduled, and previous access assignments."
	>
		{#snippet actions()}
			<Button href={resolve('/role-assignments/new')}><IconPlus />Create assignment</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="concentric-filter">
		<Card.Content>
			<form method="GET" class="grid gap-3 md:grid-cols-[1fr_1fr_12rem_auto]">
				<input type="hidden" name="roleId" value={selectedRole === 'ALL' ? '' : selectedRole} />
				<Select.Root type="single" bind:value={selectedRole}>
					<Select.Trigger class="w-full" aria-label="Role">
						{selectedRole === 'ALL'
							? 'All roles'
							: (data.roles.find(({ id }) => id === selectedRole)?.name ?? 'Selected role')}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL">All roles</Select.Item>
						{#each data.roles as role (role.id)}
							<Select.Item value={role.id}>{role.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<input
					type="hidden"
					name="scopeOrganizationalUnitId"
					value={selectedScope === 'ALL' ? '' : selectedScope}
				/>
				<Select.Root type="single" bind:value={selectedScope}>
					<Select.Trigger class="w-full" aria-label="Applies within">
						{selectedScope === 'ALL'
							? 'All areas'
							: (data.organizationalUnits.find(({ id }) => id === selectedScope)?.path ??
								'Selected area')}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL">All areas</Select.Item>
						{#each data.organizationalUnits as unit (unit.id)}
							<Select.Item value={unit.id}>{unit.path}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<input type="hidden" name="status" value={selectedStatus === 'ALL' ? '' : selectedStatus} />
				<Select.Root type="single" bind:value={selectedStatus}>
					<Select.Trigger class="w-full" aria-label="Status">
						{selectedStatus === 'ALL' ? 'All states' : label(selectedStatus)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL">All states</Select.Item>
						{#each statusOptions as status (status)}
							<Select.Item value={status}>{label(status)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Button type="submit" variant="outline">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as assignment (assignment.id)}
				<a
					href={resolve(`/role-assignments/${assignment.id}`)}
					class="rounded-xl border bg-card p-4"
				>
					<RoleAssignmentSummary {assignment} />
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Account and role</Table.Head>
						<Table.Head>Applies within</Table.Head>
						<Table.Head>Interval (EAT)</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as assignment (assignment.id)}
						<Table.Row>
							<Table.Cell>
								<a
									href={resolve(`/role-assignments/${assignment.id}`)}
									class="font-medium hover:underline"
								>
									{assignment.account.displayName}
								</a>
								<p class="text-xs text-muted-foreground">{assignment.role.name}</p>
							</Table.Cell>
							<Table.Cell>
								{assignment.scope.path}
								<p class="text-xs text-muted-foreground">
									{accessLabel(assignment.scope.mode, assignment.scope.name)}
								</p>
							</Table.Cell>
							<Table.Cell class="text-sm">
								<DateTime value={assignment.startsAt} />
								<p class="text-xs text-muted-foreground">
									Until <DateTime value={assignment.expiresAt} fallback="no expiry" />
								</p>
							</Table.Cell>
							<Table.Cell><StatusBadge status={assignment.status} /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<PaginationControls
			currentPage={data.directory.metadata.currentPage}
			lastPage={data.directory.metadata.lastPage}
			url={page.url}
		/>
	{:else}
		<EmptyState
			title="No role assignments found"
			description="No assignment matches these filters."
		/>
	{/if}
</div>
