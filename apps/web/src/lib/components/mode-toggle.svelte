<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { resetMode, setMode } from 'mode-watcher';
	import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-svelte';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				type="button"
				variant="ghost"
				size="icon"
				class="relative"
				aria-label="Change color theme"
			>
				<IconSun class="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
				<IconMoon
					class="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
				/>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="min-w-40">
		<DropdownMenu.Label>Color theme</DropdownMenu.Label>
		<DropdownMenu.Item onclick={() => setMode('light')}>
			<IconSun />
			Light
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={() => setMode('dark')}>
			<IconMoon />
			Dark
		</DropdownMenu.Item>
		<DropdownMenu.Item onclick={resetMode}>
			<IconDeviceDesktop />
			System
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
