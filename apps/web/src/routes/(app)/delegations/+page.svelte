<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import DelegationParticipants from '$lib/components/delegation-participants.svelte';
	import DelegationSummary from '$lib/components/delegation-summary.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import {
		delegationRelationshipLabel,
		delegationStatusLabel,
		delegatedItemCountLabel
	} from '$lib/helpers/delegation-presentation';
	import { IconPlus } from '@tabler/icons-svelte';

	let { data } = $props();

	let selectedRelationship = $derived<string>(data.filters.relationship ?? 'ALL');
	let selectedStatus = $derived<string>(data.filters.status ?? 'ALL');
	const statuses = [
		'PENDING',
		'UPCOMING',
		'ACTIVE',
		'REJECTED',
		'EXPIRED',
		'REVOKED',
		'RELINQUISHED',
		'ADMINISTRATIVELY_TERMINATED'
	];
</script>

<svelte:head><title>Delegations · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Workspace"
		title="Delegations"
		description="Review temporary access you have proposed, received, or may oversee."
	>
		{#snippet actions()}
			<Button href={resolve('/delegations/new')}><IconPlus />Propose temporary coverage</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="concentric-filter">
		<Card.Content>
			<form method="GET" class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
				<input
					type="hidden"
					name="relationship"
					value={selectedRelationship === 'ALL' ? '' : selectedRelationship}
				/>
				<Select.Root type="single" bind:value={selectedRelationship}>
					<Select.Trigger class="w-full" aria-label="Relationship">
						{delegationRelationshipLabel(
							selectedRelationship === 'ALL' ? undefined : selectedRelationship
						)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL">All visible</Select.Item>
						<Select.Item value="PROPOSED_BY_ME">Proposed by me</Select.Item>
						<Select.Item value="RECEIVED_BY_ME">Received by me</Select.Item>
					</Select.Content>
				</Select.Root>

				<input type="hidden" name="status" value={selectedStatus === 'ALL' ? '' : selectedStatus} />
				<Select.Root type="single" bind:value={selectedStatus}>
					<Select.Trigger class="w-full" aria-label="Status">
						{selectedStatus === 'ALL' ? 'All states' : delegationStatusLabel(selectedStatus)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ALL">All states</Select.Item>
						{#each statuses as status (status)}
							<Select.Item value={status}>{delegationStatusLabel(status)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				<Button type="submit" variant="outline">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as delegation (delegation.id)}
				<a
					href={resolve(`/delegations/${delegation.id}`)}
					class="group/participants rounded-xl border bg-card p-4"
				>
					<DelegationSummary {delegation} currentAccountId={data.currentAccountId} />
				</a>
			{/each}
		</div>

		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root class="table-fixed">
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[38%]">People</Table.Head>
						<Table.Head class="w-[24%]">Assignments</Table.Head>
						<Table.Head class="w-[26%]">When it applies (EAT)</Table.Head>
						<Table.Head class="w-[12%]">Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as delegation (delegation.id)}
						{@const roleNames = delegation.assignments.map(({ role }) => role.name).join(', ')}
						<Table.Row>
							<Table.Cell class="whitespace-normal">
								<a
									href={resolve(`/delegations/${delegation.id}`)}
									class="group/participants block min-w-0"
								>
									<DelegationParticipants
										delegator={delegation.delegator}
										delegate={delegation.delegate}
									/>
								</a>
							</Table.Cell>
							<Table.Cell class="whitespace-normal">
								<p class="truncate" title={roleNames}>{roleNames}</p>
								<p class="text-xs text-muted-foreground">
									{delegatedItemCountLabel(
										delegation.effectiveItemCount,
										delegation.totalItemCount
									)}
								</p>
							</Table.Cell>
							<Table.Cell class="text-sm">
								<DateTime value={delegation.startsAt} />
								<p class="text-xs text-muted-foreground">
									Until <DateTime value={delegation.expiresAt} />
								</p>
							</Table.Cell>
							<Table.Cell><StatusBadge status={delegation.status} /></Table.Cell>
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
			title="No temporary coverage found"
			description="No record matches the selected relationship and state."
		/>
	{/if}
</div>
