<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { IconBuildingWarehouse, IconHome } from '@tabler/icons-svelte';
	import type { ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import SessionMenu from '$lib/components/session-menu.svelte';

	let {
		account,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		account: {
			account: { email: string };
			person: { displayName: string };
		};
	} = $props();
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:p-1.5!">
					{#snippet child({ props })}
						<a href={resolve('/')} {...props}>
							<IconBuildingWarehouse class="size-5!" />
							<span class="font-heading text-base font-semibold">Matti Stock</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton isActive tooltipContent="Home">
							{#snippet child({ props })}
								<a href={resolve('/')} {...props}>
									<IconHome />
									<span>Home</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<SessionMenu {account} />
	</Sidebar.Footer>
</Sidebar.Root>
