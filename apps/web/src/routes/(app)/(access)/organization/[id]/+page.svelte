<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	let { data } = $props();
	const versions = $derived(data.unit.versions ?? []);

	function unitTypeLabel(value: string) {
		if (value === 'SUB_DEPARTMENT') return 'Sub-department';

		return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
	}
</script>

<svelte:head><title>{data.unit.name} · Matti Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader eyebrow="Organizational unit" title={data.unit.name} description={data.unit.path}>
		{#snippet actions()}
			<Button type="button" variant="outline" href="/organization">Back to organization</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Type</Card.Description></Card.Header>
			<Card.Content>{unitTypeLabel(data.unit.unitType)}</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content>
				<StatusBadge status={data.unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Created</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.unit.createdAt} /></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Last updated</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.unit.updatedAt} /></Card.Content>
		</Card.Root>
	</div>

	<section class="space-y-3">
		<div>
			<h2 class="font-heading text-xl font-semibold">Structural history</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Effective-dated names, parents, and lifecycle changes for this unit.
			</p>
		</div>
		{#if versions.length}
			<ol class="relative ms-3 space-y-5 border-s">
				{#each versions as version (version.id)}
					<li class="ms-6">
						<span
							class="-inset-start-2 absolute mt-1.5 size-4 rounded-full border-4 border-background bg-primary"
							aria-hidden="true"
						></span>
						<Card.Root>
							<Card.Header>
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<Card.Title class="text-base"
											>Version {version.version}: {version.name}</Card.Title
										>
										<Card.Description>
											{unitTypeLabel(version.unitType)} · {version.parent?.name ?? 'No parent'}
										</Card.Description>
									</div>
									<StatusBadge status={version.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<p class="text-sm">{version.reason}</p>
								<dl class="grid gap-3 text-sm sm:grid-cols-2">
									<div>
										<dt class="text-muted-foreground">Effective from</dt>
										<dd><DateTime value={version.effectiveFrom} /></dd>
									</div>
									<div>
										<dt class="text-muted-foreground">Effective to</dt>
										<dd><DateTime value={version.effectiveTo} fallback="Current" /></dd>
									</div>
									<div class="sm:col-span-2">
										<dt class="text-muted-foreground">Changed by</dt>
										<dd>{version.changedBy?.displayName ?? 'System'}</dd>
									</div>
								</dl>
							</Card.Content>
						</Card.Root>
					</li>
				{/each}
			</ol>
		{:else}
			<EmptyState
				title="No structural history"
				description="No structural versions are recorded for this organizational unit."
			/>
		{/if}
	</section>
</div>
