<script lang="ts">
	import { resolve } from '$app/paths';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { CatalogueItemVersion } from '$lib/types/catalogue-items';

	let { versions }: { versions: CatalogueItemVersion[] } = $props();

	function changeLabel(value: string) {
		return value
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}

	function stockTypeLabel(value: string) {
		return value === 'CONSUMABLE' ? 'Consumable' : 'Fixed / non-consumable';
	}

	function trackingLabel(value: string) {
		return value === 'INDIVIDUAL' ? 'Individual units' : 'Quantity balance';
	}
</script>

<section class="space-y-3">
	<div>
		<h2 class="font-heading text-xl font-semibold">Catalogue-item history</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Effective definitions, classifications, lifecycle changes, similarity evidence, and
			authorization.
		</p>
	</div>

	{#if versions?.length}
		<ol class="relative ms-3 space-y-5 border-s">
			{#each versions as version (version.version)}
				<li class="ms-6">
					<span
						class="-inset-start-2 absolute mt-1.5 size-4 rounded-full border-4 border-background bg-primary"
						aria-hidden="true"
					></span>
					<Card.Root>
						<Card.Header>
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<Card.Title class="text-base">
										Version {version.version}: {version.name}
									</Card.Title>
									<Card.Description>{changeLabel(version.changeKind)}</Card.Description>
								</div>
								<div class="flex flex-wrap gap-1">
									<StatusBadge status={version.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
									{#if version.identificationStatus === 'PLACEHOLDER'}
										<StatusBadge status="PLACEHOLDER" />
									{/if}
								</div>
							</div>
						</Card.Header>
						<Card.Content class="space-y-4">
							{#if version.description}
								<p class="text-sm leading-6 whitespace-pre-wrap">{version.description}</p>
							{/if}
							<dl class="grid gap-3 text-sm sm:grid-cols-2">
								<div>
									<dt class="text-muted-foreground">Classification</dt>
									<dd>{version.category.name} · {stockTypeLabel(version.stockType)}</dd>
								</div>
								<div>
									<dt class="text-muted-foreground">Tracking and base unit</dt>
									<dd>
										{trackingLabel(version.trackingMethod)} · {version.baseUnit.name} ({version
											.baseUnit.symbol})
									</dd>
								</div>
								<div class="sm:col-span-2">
									<dt class="text-muted-foreground">Keywords</dt>
									<dd>{version.keywords.length ? version.keywords.join(', ') : '—'}</dd>
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

							{#if version.reviewedCandidates.length}
								<div class="rounded-xl border p-4 text-sm">
									<p class="font-medium">Reviewed similar definitions</p>
									<ul class="mt-2 space-y-2">
										{#each version.reviewedCandidates as candidate (candidate.catalogueCode)}
											<li>
												<a
													href={resolve(`/catalogue-items/${candidate.catalogueCode}`)}
													class="font-medium hover:underline"
												>
													{candidate.catalogueCode} · {candidate.name}
												</a>
												<p class="text-muted-foreground">{candidate.confirmationReason}</p>
											</li>
										{/each}
									</ul>
								</div>
							{/if}
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ol>
	{:else}
		<EmptyState
			title="No catalogue-item history"
			description="No effective versions are recorded for this catalogue item."
		/>
	{/if}
</section>
