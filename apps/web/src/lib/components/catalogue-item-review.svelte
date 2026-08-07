<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import type { CatalogueItemReview } from '$lib/types/catalogue-items';

	let { review }: { review: CatalogueItemReview } = $props();

	function matchLabel(value: string) {
		switch (value) {
			case 'EXACT_NAME':
				return 'Exact name';
			case 'KEYWORD':
				return 'Shared keyword';
			case 'PREFIX':
				return 'Name or keyword prefix';
			default:
				return 'Similar wording';
		}
	}
</script>

{#if review.candidates.length}
	<div class="grid gap-3">
		{#each review.candidates as candidate (candidate.catalogueCode)}
			<Card.Root>
				<Card.Header>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
						<div class="min-w-0">
							<Card.Title class="text-base">
								<a
									href={resolve(`/catalogue-items/${candidate.catalogueCode}`)}
									class="hover:underline"
								>
									{candidate.name}
								</a>
							</Card.Title>
							<Card.Description>
								{candidate.catalogueCode} · {candidate.category.name}
							</Card.Description>
						</div>
						<span class="rounded-full border px-2.5 py-1 text-xs font-medium">
							{matchLabel(candidate.primaryMatchKind)}
						</span>
					</div>
				</Card.Header>
				<Card.Content class="space-y-2 text-sm">
					{#if candidate.description}
						<p class="line-clamp-3 text-muted-foreground">{candidate.description}</p>
					{/if}
					{#if candidate.keywords.length}
						<p><span class="font-medium">Keywords:</span> {candidate.keywords.join(', ')}</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{:else}
	<Alert.Root>
		<Alert.Title>No similar active catalogue items found</Alert.Title>
		<Alert.Description>
			The reviewed name, keywords, and category do not currently produce a likely match.
		</Alert.Description>
	</Alert.Root>
{/if}
