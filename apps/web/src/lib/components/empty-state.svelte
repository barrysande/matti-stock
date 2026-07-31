<script lang="ts">
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { IconDatabaseOff } from '@tabler/icons-svelte';
	import type { Snippet } from 'svelte';

	let { title, description, actions }: { title: string; description: string; actions?: Snippet } =
		$props();
</script>

<Empty.Root class="border">
	<Empty.Header>
		<Empty.Media variant="icon"><IconDatabaseOff /></Empty.Media>
		<Empty.Title>{title}</Empty.Title>
		<Empty.Description>{description}</Empty.Description>
	</Empty.Header>
	{#if actions}
		<Empty.Content>{@render actions()}</Empty.Content>
	{/if}
</Empty.Root>
