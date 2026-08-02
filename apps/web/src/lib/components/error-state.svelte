<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { IconAlertTriangle, IconFileUnknown, IconLock } from '@tabler/icons-svelte';

	let { status }: { status: number } = $props();

	const content = $derived.by(() => {
		if (status === 404) {
			return {
				title: 'Page not found',
				description: 'The page may have moved, or the address may be incorrect.',
				icon: IconFileUnknown
			};
		}
		if (status === 403) {
			return {
				title: 'Access unavailable',
				description: 'Your account does not have access to this page.',
				icon: IconLock
			};
		}
		return {
			title: 'Something went wrong',
			description: 'We could not open this page. Please return home and try again.',
			icon: IconAlertTriangle
		};
	});
	const StatusIcon = $derived(content.icon);
</script>

<Card.Root class="w-full max-w-lg shadow-sm">
	<Card.Header class="items-center text-center">
		<div class="mb-2 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
			<StatusIcon class="size-7" />
		</div>
		<p class="font-heading text-xs font-semibold tracking-[0.18em] text-primary uppercase">
			Error {status}
		</p>
		<Card.Title class="text-2xl">{content.title}</Card.Title>
		<Card.Description class="max-w-sm text-sm leading-6">
			{content.description}
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex justify-center">
		<Button href={resolve('/')}>Return home</Button>
	</Card.Content>
</Card.Root>
