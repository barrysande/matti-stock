<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { IconChevronLeft, IconChevronRight } from '@tabler/icons-svelte';

	let {
		currentPage: serializedCurrentPage,
		lastPage: serializedLastPage,
		url
	}: { currentPage: number | string; lastPage: number | string; url: URL } = $props();

	const currentPage = $derived(Number(serializedCurrentPage));
	const lastPage = $derived(Number(serializedLastPage));

	function href(page: number) {
		const next = new URL(url);
		next.searchParams.set('page', String(page));
		return `${next.pathname}${next.search}`;
	}
</script>

{#if lastPage > 1}
	<nav class="flex items-center justify-between gap-4" aria-label="Pagination">
		<Button
			type="button"
			variant="outline"
			disabled={currentPage <= 1}
			href={currentPage > 1 ? href(currentPage - 1) : undefined}
		>
			<IconChevronLeft />
			Previous
		</Button>
		<p class="text-sm text-muted-foreground">
			Page <span class="font-medium text-foreground">{currentPage}</span> of {lastPage}
		</p>
		<Button
			type="button"
			variant="outline"
			disabled={currentPage >= lastPage}
			href={currentPage < lastPage ? href(currentPage + 1) : undefined}
		>
			Next
			<IconChevronRight />
		</Button>
	</nav>
{/if}
