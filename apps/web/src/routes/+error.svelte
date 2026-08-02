<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ErrorState from '$lib/components/error-state.svelte';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { IconBuildingWarehouse } from '@tabler/icons-svelte';

	const title = $derived(page.status === 404 ? 'Page not found' : 'Something went wrong');
</script>

<svelte:head><title>{title} · MaTTI Stock</title></svelte:head>

<main
	class="relative grid min-h-svh place-items-center overflow-hidden bg-muted/35 px-4 py-12 sm:px-6"
>
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-primary/10 to-transparent"
		aria-hidden="true"
	></div>

	<div class="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
		<ModeToggle />
	</div>

	<div class="relative flex w-full max-w-lg flex-col items-center">
		<a href={resolve('/')} class="mb-6 flex items-center gap-2 font-heading font-semibold">
			<span class="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
				<IconBuildingWarehouse class="size-5" />
			</span>
			MaTTI Stock
		</a>
		<ErrorState status={page.status} />
	</div>
</main>
