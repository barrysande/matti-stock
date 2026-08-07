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

	function categoryStatus(category: (typeof data.directory.data)[number]) {
		if (category.mergedIntoCategoryId) return 'MERGED';
		return category.archivedAt ? 'ARCHIVED' : 'ACTIVE';
	}
</script>

<svelte:head><title>Catalogue categories · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue"
		title="Catalogue categories"
		description="Browse the controlled three-level classification of what stock items are. Full paths distinguish categories that share a name under different parents."
	>
		{#snippet actions()}
			{#if data.account?.canManageCatalogue}
				<Button href={resolve('/catalogue-categories/new')}>
					<IconPlus />Create category
				</Button>
			{/if}
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
						placeholder="Name or description"
						class="ps-9"
						aria-label="Search catalogue categories"
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
			{#each data.directory.data as category (category.id)}
				<a
					href={resolve(`/catalogue-categories/${category.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{category.name}</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">{category.path}</p>
							<p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
						</div>
						<StatusBadge status={categoryStatus(category)} />
					</div>
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Category</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as category (category.id)}
						<Table.Row>
							<Table.Cell>
								<a
									href={resolve(`/catalogue-categories/${category.id}`)}
									class="font-medium hover:underline">{category.name}</a
								>
								<p class="mt-1 text-xs text-muted-foreground">{category.path}</p>
							</Table.Cell>
							<Table.Cell class="max-w-xl text-sm text-muted-foreground"
								>{category.description}</Table.Cell
							>
							<Table.Cell><StatusBadge status={categoryStatus(category)} /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			title="No catalogue categories found"
			description="No category matches the current directory filters."
		/>
	{/if}
</div>
