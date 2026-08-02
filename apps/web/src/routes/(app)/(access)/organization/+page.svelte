<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { IconPlus, IconSearch } from '@tabler/icons-svelte';

	let { data } = $props();

	// These values initialize again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let selectedUnitType = $state<string>(data.filters.unitType ?? 'ALL');
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');

	function unitTypeLabel(value: string) {
		if (value === 'SUB_DEPARTMENT') return 'Sub-department';

		return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
	}

	function selectedUnitTypeLabel() {
		return selectedUnitType === 'ALL' ? 'All unit types' : unitTypeLabel(selectedUnitType);
	}
</script>

<svelte:head><title>Organization · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Access administration"
		title="Organization"
		description="Browse the institute, its departments, and optional sub-departments used for custody and access scope."
	>
		{#snippet actions()}
			<Button href={resolve('/organization/new')}><IconPlus />Create organizational unit</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="min-w-0">
		<Card.Content>
			<form
				method="GET"
				class="grid min-w-0 gap-3 md:grid-cols-[minmax(12rem,1fr)_13rem_13rem_auto]"
			>
				<div class="relative min-w-0">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Unit name"
						class="ps-9"
						aria-label="Search organizational units"
					/>
				</div>
				<input
					type="hidden"
					name="unitType"
					value={selectedUnitType === 'ALL' ? '' : selectedUnitType}
				/>
				<Select.Root type="single" bind:value={selectedUnitType}>
					<Select.Trigger class="w-full" aria-label="Unit type">
						{selectedUnitTypeLabel()}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Unit type</Select.Label>
							<Select.Item value="ALL">All unit types</Select.Item>
							<Select.Item value="INSTITUTE">Institute</Select.Item>
							<Select.Item value="DEPARTMENT">Department</Select.Item>
							<Select.Item value="SUB_DEPARTMENT">Sub-department</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<input
					type="hidden"
					name="includeArchived"
					value={archiveVisibility === 'ALL' ? 'true' : ''}
				/>
				<Select.Root type="single" bind:value={archiveVisibility}>
					<Select.Trigger class="w-full" aria-label="Archive visibility">
						{archiveVisibility === 'ALL' ? 'Active and archived' : 'Active only'}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Archive visibility</Select.Label>
							<Select.Item value="ACTIVE">Active only</Select.Item>
							<Select.Item value="ALL">Active and archived</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<Button type="submit" variant="outline" class="w-full md:w-auto">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as unit (unit.id)}
				<a
					href={resolve(`/organization/${unit.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{unit.name}</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">{unit.path}</p>
						</div>
						<StatusBadge status={unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
					</div>
					<p class="mt-3 text-sm text-muted-foreground">{unitTypeLabel(unit.unitType)}</p>
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Unit</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as unit (unit.id)}
						<Table.Row>
							<Table.Cell>
								<a href={resolve(`/organization/${unit.id}`)} class="font-medium hover:underline">
									{unit.name}
								</a>
								<p class="mt-1 text-xs text-muted-foreground">{unit.path}</p>
							</Table.Cell>
							<Table.Cell>{unitTypeLabel(unit.unitType)}</Table.Cell>
							<Table.Cell>
								<StatusBadge status={unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			title="No organizational units found"
			description="No organizational unit matches the current directory filters."
		/>
	{/if}
</div>
