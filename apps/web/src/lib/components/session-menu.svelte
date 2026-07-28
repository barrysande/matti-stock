<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { IconLogout } from '@tabler/icons-svelte';

	let {
		account
	}: {
		account: {
			account: { email: string };
			person: { displayName: string };
		};
	} = $props();
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<div class="min-w-0 px-2 py-1">
			<p class="truncate text-sm font-medium">{account.person.displayName}</p>
			<p class="truncate text-xs text-muted-foreground">{account.account.email}</p>
		</div>
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
