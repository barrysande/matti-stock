<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { children } = $props();
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 64); --header-height: calc(var(--spacing) * 14);"
>
	<AppSidebar variant="inset" />
	<Sidebar.Inset>
		<SiteHeader />
		<div
			class="@container/main mx-auto flex w-full max-w-screen-2xl flex-1 flex-col px-4 pt-4 md:px-6 md:pt-6"
			style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
		>
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
