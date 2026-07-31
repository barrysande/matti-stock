<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/matili logo.png';
	import FlashToaster from '$lib/components/flash-toaster.svelte';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<svelte:head>
	<title>MaTTI Stock</title>
	<meta
		name="description"
		content="Secure stock control for receiving, counting, issuing, and auditing inventory."
	/>
	<link rel="icon" type="image/png" href={favicon} />
</svelte:head>

<ModeWatcher />
<Toaster richColors closeButton />
<FlashToaster />
{@render children()}
