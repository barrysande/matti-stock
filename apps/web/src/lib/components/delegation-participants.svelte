<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { IconChevronRight } from '@tabler/icons-svelte';

	type Participant = {
		displayName: string;
		email: string;
	};

	let {
		delegator,
		delegate,
		showEmails = true,
		heading = false
	}: {
		delegator: Participant;
		delegate: Participant;
		showEmails?: boolean;
		heading?: boolean;
	} = $props();
</script>

<div class="relative grid min-w-0 grid-cols-2 items-center">
	<div class="min-w-0 pr-5">
		<span
			class={cn(
				'block truncate group-hover/participants:underline group-focus-visible/participants:underline',
				!heading && 'font-medium'
			)}
			title={delegator.displayName}
		>
			{delegator.displayName}
		</span>
		{#if showEmails}
			<span
				class="block truncate text-xs font-normal text-muted-foreground"
				title={delegator.email}
			>
				{delegator.email}
			</span>
		{/if}
	</div>

	<span
		class="absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center text-muted-foreground"
	>
		<IconChevronRight class={heading ? 'size-5' : 'size-4'} aria-hidden="true" />
		<span class="sr-only">to</span>
	</span>

	<div class="min-w-0 pl-5">
		<span
			class={cn(
				'block truncate group-hover/participants:underline group-focus-visible/participants:underline',
				!heading && 'font-medium'
			)}
			title={delegate.displayName}
		>
			{delegate.displayName}
		</span>
		{#if showEmails}
			<span class="block truncate text-xs font-normal text-muted-foreground" title={delegate.email}>
				{delegate.email}
			</span>
		{/if}
	</div>
</div>
