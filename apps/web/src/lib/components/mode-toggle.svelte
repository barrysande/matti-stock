<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { mode, toggleMode } from 'mode-watcher';
	import { IconMoon, IconSun } from '@tabler/icons-svelte';

	const actionLabel = $derived(
		mode.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
	);
</script>

<Tooltip.Provider delayDuration={300}>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					type="button"
					variant="ghost"
					size="icon"
					onclick={toggleMode}
					aria-label={actionLabel}
				>
					<IconSun class="size-5 dark:hidden" />
					<IconMoon class="hidden size-5 dark:block" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>{actionLabel}</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
