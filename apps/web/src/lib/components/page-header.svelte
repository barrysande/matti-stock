<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		eyebrow,
		title,
		titleContent,
		description,
		actions
	}: {
		eyebrow?: string;
		title: string;
		titleContent?: Snippet;
		description?: string;
		actions?: Snippet;
	} = $props();
</script>

<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
	<div class="min-w-0">
		{#if eyebrow}
			<p class="font-heading text-xs font-semibold tracking-[0.16em] text-primary uppercase">
				{eyebrow}
			</p>
		{/if}
		<h1
			class="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl"
			aria-label={titleContent ? title : undefined}
		>
			{#if titleContent}
				{@render titleContent()}
			{:else}
				{title}
			{/if}
		</h1>
		{#if description}
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</header>
