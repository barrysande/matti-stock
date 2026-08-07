<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { IconPlus, IconSearch } from '@tabler/icons-svelte';

	const all = 'ALL';
	let { data } = $props();

	// These values initialize again after ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let categoryId = $state<string>(data.filters.categoryId ?? all);
	// svelte-ignore state_referenced_locally
	let stockType = $state<string>(data.filters.stockType ?? all);
	// svelte-ignore state_referenced_locally
	let trackingMethod = $state<string>(data.filters.trackingMethod ?? all);
	// svelte-ignore state_referenced_locally
	let identificationStatus = $state<string>(data.filters.identificationStatus ?? all);
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? all : 'ACTIVE');

	const selectedCategory = $derived(data.categories.find((category) => category.id === categoryId));

	function categoryPath(id: string, fallback: string) {
		return data.categories.find((category) => category.id === id)?.path ?? fallback;
	}

	function stockTypeLabel(value: string) {
		return value === 'CONSUMABLE' ? 'Consumable' : 'Fixed / non-consumable';
	}

	function trackingLabel(value: string) {
		return value === 'INDIVIDUAL' ? 'Individual units' : 'Quantity balance';
	}
</script>

<svelte:head><title>Catalogue items · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue"
		title="Catalogue items"
		description="Browse the institute's interchangeable stock definitions by permanent code, classification, and tracking behavior."
	>
		{#snippet actions()}
			{#if data.account?.canManageCatalogue}
				<Button href={resolve('/catalogue-items/new')}><IconPlus />Create catalogue item</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<Card.Root class="min-w-0">
		<Card.Content>
			<form method="GET" class="grid min-w-0 gap-3 lg:grid-cols-4 xl:grid-cols-6">
				<div class="relative min-w-0 lg:col-span-2">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Code, name, description, or keyword"
						class="ps-9"
						aria-label="Search catalogue items"
					/>
				</div>

				<input type="hidden" name="categoryId" value={categoryId === all ? '' : categoryId} />
				<Select.Root type="single" bind:value={categoryId}>
					<Select.Trigger class="w-full" aria-label="Catalogue category">
						{selectedCategory?.path ?? 'All categories'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={all}>All categories</Select.Item>
						{#each data.categories as category (category.id)}
							<Select.Item value={category.id} label={category.path}>{category.path}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>

				<input type="hidden" name="stockType" value={stockType === all ? '' : stockType} />
				<Select.Root type="single" bind:value={stockType}>
					<Select.Trigger class="w-full" aria-label="Stock type">
						{stockType === all ? 'All stock types' : stockTypeLabel(stockType)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={all}>All stock types</Select.Item>
						<Select.Item value="FIXED_NON_CONSUMABLE">Fixed / non-consumable</Select.Item>
						<Select.Item value="CONSUMABLE">Consumable</Select.Item>
					</Select.Content>
				</Select.Root>

				<input
					type="hidden"
					name="trackingMethod"
					value={trackingMethod === all ? '' : trackingMethod}
				/>
				<Select.Root type="single" bind:value={trackingMethod}>
					<Select.Trigger class="w-full" aria-label="Tracking method">
						{trackingMethod === all ? 'All tracking methods' : trackingLabel(trackingMethod)}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={all}>All tracking methods</Select.Item>
						<Select.Item value="INDIVIDUAL">Individual units</Select.Item>
						<Select.Item value="QUANTITY">Quantity balance</Select.Item>
					</Select.Content>
				</Select.Root>

				<input
					type="hidden"
					name="identificationStatus"
					value={identificationStatus === all ? '' : identificationStatus}
				/>
				<Select.Root type="single" bind:value={identificationStatus}>
					<Select.Trigger class="w-full" aria-label="Identification status">
						{identificationStatus === all
							? 'All identification states'
							: identificationStatus === 'CONFIRMED'
								? 'Confirmed definitions'
								: 'Placeholder definitions'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value={all}>All identification states</Select.Item>
						<Select.Item value="CONFIRMED">Confirmed definitions</Select.Item>
						<Select.Item value="PLACEHOLDER">Placeholder definitions</Select.Item>
					</Select.Content>
				</Select.Root>

				<input
					type="hidden"
					name="includeArchived"
					value={archiveVisibility === all ? 'true' : ''}
				/>
				<Select.Root type="single" bind:value={archiveVisibility}>
					<Select.Trigger class="w-full" aria-label="Archive visibility">
						{archiveVisibility === all ? 'Active and archived' : 'Active only'}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="ACTIVE">Active only</Select.Item>
						<Select.Item value={all}>Active and archived</Select.Item>
					</Select.Content>
				</Select.Root>

				<Button type="submit" variant="outline" class="w-full xl:col-start-6">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as item (item.catalogueCode)}
				<a
					href={resolve(`/catalogue-items/${item.catalogueCode}`)}
					class="rounded-xl border bg-card p-4 shadow-xs hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-medium">{item.name}</p>
							<p class="mt-1 font-mono text-xs text-muted-foreground">{item.catalogueCode}</p>
						</div>
						<div class="flex shrink-0 flex-col items-end gap-1">
							<StatusBadge status={item.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
							{#if item.identificationStatus === 'PLACEHOLDER'}
								<StatusBadge status="PLACEHOLDER" />
							{/if}
						</div>
					</div>
					<p class="mt-3 text-sm text-muted-foreground">
						{categoryPath(item.category.id, item.category.name)}
					</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{stockTypeLabel(item.stockType)} · {trackingLabel(item.trackingMethod)} · {item.baseUnit
							.symbol}
					</p>
					{#if item.description}
						<p class="mt-3 line-clamp-2 text-sm">{item.description}</p>
					{/if}
				</a>
			{/each}
		</div>

		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Catalogue item</Table.Head>
						<Table.Head>Category</Table.Head>
						<Table.Head>Stock and tracking</Table.Head>
						<Table.Head>Base unit</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as item (item.catalogueCode)}
						<Table.Row>
							<Table.Cell>
								<a
									href={resolve(`/catalogue-items/${item.catalogueCode}`)}
									class="font-medium hover:underline"
								>
									{item.name}
								</a>
								<p class="mt-1 font-mono text-xs text-muted-foreground">{item.catalogueCode}</p>
							</Table.Cell>
							<Table.Cell class="max-w-xs text-sm">
								{categoryPath(item.category.id, item.category.name)}
							</Table.Cell>
							<Table.Cell class="text-sm">
								{stockTypeLabel(item.stockType)}
								<p class="mt-1 text-xs text-muted-foreground">
									{trackingLabel(item.trackingMethod)}
								</p>
							</Table.Cell>
							<Table.Cell>{item.baseUnit.name} ({item.baseUnit.symbol})</Table.Cell>
							<Table.Cell>
								<div class="flex flex-wrap gap-1">
									<StatusBadge status={item.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
									{#if item.identificationStatus === 'PLACEHOLDER'}
										<StatusBadge status="PLACEHOLDER" />
									{/if}
								</div>
							</Table.Cell>
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
			title="No catalogue items found"
			description="No catalogue item matches the current directory filters."
		/>
	{/if}
</div>
