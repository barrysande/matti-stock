<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<svelte:head>
	<title>{page.status} · Matti Stock</title>
</svelte:head>

<section class="flex min-h-[60svh] items-center justify-center py-12">
	<div class="w-full max-w-lg rounded-3xl bg-card p-6 text-card-foreground shadow-sm md:p-8">
		<p class="font-heading text-sm font-semibold tracking-[0.18em] text-primary uppercase">
			Error {page.status}
		</p>
		<h1 class="mt-3 font-heading text-2xl font-semibold tracking-tight">
			We could not complete that request
		</h1>
		<p class="mt-3 text-sm leading-6 text-muted-foreground">
			{page.error?.message ?? 'An unexpected error occurred. Please try again.'}
		</p>
		<Button href="/" class="mt-6">Return home</Button>
	</div>
</section>
