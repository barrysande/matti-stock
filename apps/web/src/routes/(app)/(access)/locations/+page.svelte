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
	// This value initializes again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');
</script>

<svelte:head><title>Physical locations · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Access administration"
		title="Physical locations"
		description="Browse the campuses, buildings, rooms, storage areas, shelves, and other places used to locate stock."
	>
		{#snippet actions()}
			<Button href={resolve('/locations/new')}><IconPlus />Create physical location</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="min-w-0">
		<Card.Content>
			<form method="GET" class="grid min-w-0 gap-3 md:grid-cols-[minmax(12rem,1fr)_13rem_auto]">
				<div class="relative min-w-0">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Location name"
						class="ps-9"
						aria-label="Search physical locations"
					/>
				</div>
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
			{#each data.directory.data as location (location.id)}
				<a
					href={resolve(`/locations/${location.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{location.name}</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">{location.path}</p>
						</div>
						<StatusBadge status={location.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
					</div>
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Location</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as location (location.id)}
						<Table.Row>
							<Table.Cell>
								<a href={resolve(`/locations/${location.id}`)} class="font-medium hover:underline">
									{location.name}
								</a>
								<p class="mt-1 text-xs text-muted-foreground">{location.path}</p>
							</Table.Cell>
							<Table.Cell>
								<StatusBadge status={location.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			title="No physical locations found"
			description="No physical location matches the current directory filters."
		/>
	{/if}
</div>
