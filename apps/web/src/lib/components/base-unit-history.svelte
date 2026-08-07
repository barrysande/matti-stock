<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { BaseUnitDetail } from '$lib/types/base-units';

	let { versions }: { versions: BaseUnitDetail['versions'] } = $props();

	function kindLabel(value: string) {
		return value === 'COUNTABLE' ? 'Countable' : 'Measured';
	}

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
		<h2 class="font-heading text-xl font-semibold">Base-unit history</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Effective-dated definitions, lifecycle changes, and authorization evidence.
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
						<Card.Header
							><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<Card.Title class="text-base"
										>Version {version.version}: {version.name} ({version.symbol})</Card.Title
									><Card.Description>{changeLabel(version.changeKind)}</Card.Description>
								</div>
								<StatusBadge status={version.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
							</div></Card.Header
						>
						<Card.Content>
							<dl class="grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<dt class="text-muted-foreground">Quantity rules</dt>
									<dd>
										{kindLabel(version.kind)} · {version.precision === 0
											? 'Whole quantities only'
											: `${version.precision} decimal ${version.precision === 1 ? 'place' : 'places'}`}
									</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Changed by</dt>
									<dd>{version.changedBy.displayName}</dd>
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
								<div class="sm:col-span-2">
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
			title="No base-unit history"
			description="No effective versions are recorded for this base unit."
		/>
	{/if}
</section>
