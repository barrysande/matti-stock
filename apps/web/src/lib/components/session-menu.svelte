<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { IconKey, IconLogout, IconUserCircle } from '@tabler/icons-svelte';

	let {
		account
	}: {
		account: {
			account: { email: string };
			person: { displayName: string };
		};
	} = $props();

	const sidebar = Sidebar.useSidebar();

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="min-w-0 px-2 py-1">
			<p class="truncate text-sm font-medium">{account.person.displayName}</p>
			<p class="truncate text-xs text-muted-foreground">{account.account.email}</p>
		</div>
	</Sidebar.MenuItem>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton tooltipContent="My access">
			{#snippet child({ props })}
				<a href={resolve('/account')} {...props} onclick={closeMobileSidebar}>
					<IconUserCircle />
					<span>My access</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton tooltipContent="Change password">
			{#snippet child({ props })}
				<!-- The route base is resolved before its in-page fragment is appended. -->
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={`${resolve('/account')}#password`} {...props} onclick={closeMobileSidebar}>
					<IconKey />
					<span>Change password</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
	<Sidebar.MenuItem>
		<form method="POST" action="/logout">
			<Button type="submit" variant="ghost" class="w-full justify-start">
				<IconLogout />
				Log out
			</Button>
		</form>
	</Sidebar.MenuItem>
</Sidebar.Menu>
