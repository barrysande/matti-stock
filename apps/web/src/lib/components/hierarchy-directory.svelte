<script lang="ts">
	import {
		buildHierarchyDirectory,
		visibleHierarchyDirectory
	} from '$lib/helpers/hierarchy-directory';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { IconChevronRight } from '@tabler/icons-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	interface DisplayItem {
		id: string;
		parentId: string | null;
		name: string;
		path: string;
		href: string;
		status: string;
		description?: string;
		metadata?: string;
	}

	let { items, hierarchical = true }: { items: DisplayItem[]; hierarchical?: boolean } = $props();

	const openIds = new SvelteSet<string>();
	const roots = $derived(buildHierarchyDirectory(items));
	const rows = $derived(
		hierarchical
			? visibleHierarchyDirectory(roots, openIds)
			: items.map((item) => ({ item, children: [], depth: 0 }))
	);

	function toggle(itemId: string) {
		if (openIds.has(itemId)) {
			openIds.delete(itemId);
		} else {
			openIds.add(itemId);
		}
	}
</script>

<div class="overflow-hidden rounded-xl border bg-card">
	{#each rows as row (row.item.id)}
		<div
			class="flex min-w-0 items-start gap-2 border-b p-3 last:border-b-0 hover:bg-accent/30 sm:items-center"
			style={`padding-inline-start: ${0.75 + row.depth * 1.5}rem`}
		>
			{#if hierarchical && row.children.length > 0}
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					class="mt-0.5 shrink-0 sm:mt-0"
					aria-expanded={openIds.has(row.item.id)}
					aria-label={`${openIds.has(row.item.id) ? 'Collapse' : 'Expand'} ${row.item.name}`}
					onclick={() => toggle(row.item.id)}
				>
					<IconChevronRight
						class={`transition-transform ${openIds.has(row.item.id) ? 'rotate-90' : ''}`}
					/>
				</Button>
			{:else}
				<span class="size-8 shrink-0" aria-hidden="true"></span>
			{/if}

			<div class="min-w-0 flex-1">
				<!-- The directory page resolves each route before it reaches this shared component. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={row.item.href} class="font-medium hover:underline">{row.item.name}</a>
				<p class="mt-0.5 text-xs leading-5 text-muted-foreground">{row.item.path}</p>
				{#if row.item.description}
					<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.item.description}</p>
				{/if}
				{#if row.item.metadata}
					<p class="mt-1 text-sm text-muted-foreground">{row.item.metadata}</p>
				{/if}
				{#if hierarchical && row.children.length > 0}
					<p class="mt-1 text-xs text-muted-foreground">
						{row.children.length}
						{row.children.length === 1 ? 'child' : 'children'}
					</p>
				{/if}
			</div>

			<StatusBadge status={row.item.status} />
		</div>
	{/each}
</div>
