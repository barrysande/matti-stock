<script lang="ts">
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ModeToggle from '$lib/components/mode-toggle.svelte';

	let { title = 'Overview' }: { title?: string } = $props();
</script>

<header
	class="sticky top-0 z-20 flex min-h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-t-2xl"
	style="padding-top: env(safe-area-inset-top);"
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
		<Sidebar.Trigger class="-ms-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		<p class="font-heading text-base font-semibold">{title}</p>
		<div class="ms-auto"><ModeToggle /></div>
	</div>
</header>
