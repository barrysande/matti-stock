<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyState from '$lib/components/empty-state.svelte';
	import HierarchyDirectory from '$lib/components/hierarchy-directory.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { IconPlus, IconSearch } from '@tabler/icons-svelte';

	let { data } = $props();

	// This value initializes again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');

	function categoryStatus(category: (typeof data.directory.data)[number]) {
		if (category.mergedIntoCategoryId) {
			return 'MERGED';
		}

		return category.archivedAt ? 'ARCHIVED' : 'ACTIVE';
	}

	const directoryItems = $derived(
		data.directory.data.map((category) => ({
			id: category.id,
			parentId: category.parentId,
			name: category.name,
			path: category.path,
			description: category.description,
			href: resolve(`/catalogue-categories/${category.id}`),
			status: categoryStatus(category)
		}))
	);
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

	<Card.Root class="min-w-0 concentric-filter">
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
		<HierarchyDirectory items={directoryItems} hierarchical={!data.filters.search} />
	{:else}
		<EmptyState
			title="No catalogue categories found"
			description="No category matches the current directory filters."
		/>
	{/if}
</div>
