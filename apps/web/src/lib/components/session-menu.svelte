<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { cn } from '$lib/utils.js';
	import { IconDotsVertical, IconLockPassword, IconLogout } from '@tabler/icons-svelte';

	let {
		account
	}: {
		account: {
			account: { email: string };
			person: { displayName: string };
		};
	} = $props();

	const sidebar = Sidebar.useSidebar();
	const initials = $derived(
		account.person.displayName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('') || '?'
	);

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{account.person.displayName}</span>
							<span class="truncate text-xs text-muted-foreground">{account.account.email}</span>
						</div>
						<IconDotsVertical class="ms-auto size-4" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Fallback class="rounded-lg">{initials}</Avatar.Fallback>
						</Avatar.Root>
						<div class="grid min-w-0 flex-1 text-start text-sm leading-tight">
							<span class="truncate font-medium">{account.person.displayName}</span>
							<span class="truncate text-xs text-muted-foreground">{account.account.email}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item>
					{#snippet child({ props })}
						<!-- The route base is resolved before its in-page fragment is appended. -->
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
						<a href={`${resolve('/account')}#password`} {...props} onclick={closeMobileSidebar}>
							<IconLockPassword />
							<span>Change password</span>
						</a>
					{/snippet}
				</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<form method="POST" action="/logout">
					<DropdownMenu.Item variant="destructive">
						{#snippet child({ props })}
							{@const { class: itemClass, ...rest } = props}
							<button
								type="submit"
								{...rest}
								class={cn(itemClass as string, 'w-full cursor-pointer')}
							>
								<IconLogout />
								<span>Log out</span>
							</button>
						{/snippet}
					</DropdownMenu.Item>
				</form>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>
