<script lang="ts">
	import { resolve } from '$app/paths';
	import ModeToggle from '$lib/components/mode-toggle.svelte';
	import { IconBuildingWarehouse } from '@tabler/icons-svelte';

	let { children } = $props();
</script>

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
	<div class="relative w-full max-w-md">
		<a
			href={resolve('/')}
			class="mb-6 flex items-center justify-center gap-2 font-heading font-semibold"
		>
			<span class="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
				<IconBuildingWarehouse class="size-5" />
			</span>
			Matti Stock
		</a>
		{@render children()}
	</div>
</main>
