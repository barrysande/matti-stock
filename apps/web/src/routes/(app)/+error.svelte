<script lang="ts">
	import { page } from '$app/state';
	import ErrorState from '$lib/components/error-state.svelte';

	const title = $derived(page.status === 404 ? 'Page not found' : 'Something went wrong');
</script>

<svelte:head><title>{title} · MaTTI Stock</title></svelte:head>

<section class="flex min-h-[60svh] items-center justify-center py-12">
	<ErrorState status={page.status} />
</section>
