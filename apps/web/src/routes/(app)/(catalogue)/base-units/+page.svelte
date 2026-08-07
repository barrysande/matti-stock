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

	// These values initialize again after ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');
	// svelte-ignore state_referenced_locally
	let kind = $state<string>(data.filters.kind ?? 'ALL');

	function kindLabel(value: string) {
		return value === 'COUNTABLE' ? 'Countable' : 'Measured';
	}

	function precisionLabel(value: number) {
		return value === 0
			? 'Whole quantities only'
			: `${value} decimal ${value === 1 ? 'place' : 'places'}`;
	}
</script>

<svelte:head><title>Base units · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue"
		title="Base units"
		description="Browse the shared units used to record catalogue quantities, including whether fractions are permitted and to how many decimal places."
	>
		{#snippet actions()}
			{#if data.account?.canManageCatalogue}
				<Button href={resolve('/base-units/new')}><IconPlus />Create base unit</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<Card.Root class="min-w-0">
		<Card.Content>
			<form
				method="GET"
				class="grid min-w-0 gap-3 md:grid-cols-[minmax(12rem,1fr)_12rem_13rem_auto]"
			>
				<div class="relative min-w-0">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Name or symbol"
						class="ps-9"
						aria-label="Search base units"
					/>
				</div>
				<input type="hidden" name="kind" value={kind === 'ALL' ? '' : kind} />
				<Select.Root type="single" bind:value={kind}>
					<Select.Trigger class="w-full" aria-label="Unit kind"
						>{kind === 'ALL' ? 'All unit kinds' : kindLabel(kind)}</Select.Trigger
					>
					<Select.Content>
						<Select.Item value="ALL">All unit kinds</Select.Item>
						<Select.Item value="COUNTABLE">Countable</Select.Item>
						<Select.Item value="MEASURED">Measured</Select.Item>
					</Select.Content>
				</Select.Root>
				<input
					type="hidden"
					name="includeArchived"
					value={archiveVisibility === 'ALL' ? 'true' : ''}
				/>
				<Select.Root type="single" bind:value={archiveVisibility}>
					<Select.Trigger class="w-full" aria-label="Archive visibility"
						>{archiveVisibility === 'ALL' ? 'Active and archived' : 'Active only'}</Select.Trigger
					>
					<Select.Content>
						<Select.Item value="ACTIVE">Active only</Select.Item>
						<Select.Item value="ALL">Active and archived</Select.Item>
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
					href={resolve(`/base-units/${unit.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">
								{unit.name} <span class="text-muted-foreground">({unit.symbol})</span>
							</p>
							<p class="mt-1 text-sm text-muted-foreground">
								{kindLabel(unit.kind)} · {precisionLabel(unit.precision)}
							</p>
						</div>
						<StatusBadge status={unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
					</div>
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header
					><Table.Row
						><Table.Head>Unit</Table.Head><Table.Head>Kind</Table.Head><Table.Head
							>Quantity precision</Table.Head
						><Table.Head>Status</Table.Head></Table.Row
					></Table.Header
				>
				<Table.Body>
					{#each data.directory.data as unit (unit.id)}
						<Table.Row>
							<Table.Cell
								><a href={resolve(`/base-units/${unit.id}`)} class="font-medium hover:underline"
									>{unit.name}</a
								>
								<p class="mt-1 text-xs text-muted-foreground">{unit.symbol}</p></Table.Cell
							>
							<Table.Cell>{kindLabel(unit.kind)}</Table.Cell>
							<Table.Cell>{precisionLabel(unit.precision)}</Table.Cell>
							<Table.Cell
								><StatusBadge status={unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} /></Table.Cell
							>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			title="No base units found"
			description="No base unit matches the current directory filters."
		/>
	{/if}
</div>
