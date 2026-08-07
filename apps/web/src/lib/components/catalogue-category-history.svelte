<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { CatalogueCategoryDetail } from '$lib/types/catalogue-categories';

	let { versions }: { versions: CatalogueCategoryDetail['versions'] } = $props();

	function changeLabel(value: string) {
		return value
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

<section class="space-y-3">
	<div>
		<h2 class="font-heading text-xl font-semibold">Category history</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Effective-dated definitions, parents, lifecycle changes, and authorization evidence.
		</p>
	</div>
	{#if versions?.length}
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
									<Card.Description>{changeLabel(version.changeKind)}</Card.Description>
								</div>
								<StatusBadge
									status={version.mergedInto
										? 'MERGED'
										: version.archivedAt
											? 'ARCHIVED'
											: 'ACTIVE'}
								/>
							</div>
						</Card.Header>
						<Card.Content class="space-y-4">
							<p class="text-sm leading-6 whitespace-pre-wrap">{version.description}</p>
							<dl class="grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<dt class="text-muted-foreground">Parent</dt>
									<dd>{version.parent?.name ?? 'Top-level category'}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Merged into</dt>
									<dd>{version.mergedInto?.name ?? '—'}</dd>
								</div>
								<div class="sm:col-span-2">
									<dt class="text-muted-foreground">Reason</dt>
									<dd>{version.reason}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Effective from</dt>
									<dd><DateTime value={version.effectiveFrom} /></dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Effective to</dt>
									<dd><DateTime value={version.effectiveTo} fallback="Current" /></dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Changed by</dt>
									<dd>{version.changedBy.displayName}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Authorized at</dt>
									<dd>{version.authorization.resolvedScope.name}</dd>
								</div>
							</dl>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ol>
	{:else}
		<EmptyState
			title="No category history"
			description="No effective versions are recorded for this category."
		/>
	{/if}
</section>
