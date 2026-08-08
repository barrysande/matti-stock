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

	let selectedUnitType = $derived<string>(data.filters.unitType ?? 'ALL');

	let archiveVisibility = $derived<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');

	function unitTypeLabel(value: string) {
		if (value === 'SUB_DEPARTMENT') {
			return 'Sub-department';
		}

		return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
	}

	function selectedUnitTypeLabel() {
		return selectedUnitType === 'ALL' ? 'All unit types' : unitTypeLabel(selectedUnitType);
	}

	const directoryItems = $derived(
		data.directory.data.map((unit) => ({
			id: unit.id,
			parentId: unit.parentId,
			name: unit.name,
			path: unit.path,
			metadata: unitTypeLabel(unit.unitType),
			href: resolve(`/organization/${unit.id}`),
			status: unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'
		}))
	);
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

	<Card.Root class="min-w-0 concentric-filter">
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
		<HierarchyDirectory
			items={directoryItems}
			hierarchical={!data.filters.search && !data.filters.unitType}
		/>
	{:else}
		<EmptyState
			title="No organizational units found"
			description="No organizational unit matches the current directory filters."
		/>
	{/if}
</div>
