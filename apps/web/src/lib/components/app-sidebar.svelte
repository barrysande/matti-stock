<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {
		IconBuildingCommunity,
		IconBuildingWarehouse,
		IconHome,
		IconKey,
		IconMapPin,
		IconRepeat,
		IconShield,
		IconUsers
	} from '@tabler/icons-svelte';
	import type { ComponentProps } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SessionMenu from '$lib/components/session-menu.svelte';

	let {
		account,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		account?: {
			account: { email: string };
			person: { displayName: string };
			effectivePermissionKeys: string[];
		};
	} = $props();

	const sidebar = Sidebar.useSidebar();
	const isRoot = $derived(account?.effectivePermissionKeys.includes('access.root') ?? false);
	const workspace = [
		{ href: '/', label: 'Home', icon: IconHome },
		{ href: '/account', label: 'My access', icon: IconKey },
		{ href: '/delegations', label: 'Delegations', icon: IconRepeat }
	] as const;
	const administration = [
		{ href: '/accounts', label: 'Accounts', icon: IconUsers },
		{ href: '/organization', label: 'Organization', icon: IconBuildingCommunity },
		{ href: '/locations', label: 'Locations', icon: IconMapPin },
		{ href: '/roles', label: 'Roles', icon: IconShield },
		{ href: '/role-assignments', label: 'Assignments', icon: IconKey }
	] as const;
	type NavigationHref =
		(typeof workspace)[number]['href'] | (typeof administration)[number]['href'];

	function active(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}

	function navigationHref(href: NavigationHref) {
		switch (href) {
			case '/':
				return resolve('/');
			case '/account':
				return resolve('/account');
			case '/accounts':
				return resolve('/accounts');
			case '/organization':
				return resolve('/organization');
			default:
				return href;
		}
	}

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:p-1.5!">
					{#snippet child({ props })}
						<a href={resolve('/')} {...props} onclick={closeMobileSidebar}>
							<IconBuildingWarehouse class="size-5!" />
							<span class="font-heading text-base font-semibold">MaTTI Stock</span>
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
					{#each workspace as item (item.href)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={active(item.href)} tooltipContent={item.label}>
								{#snippet child({ props })}
									<!-- Existing routes are resolved by navigationHref; pending routes retain their declared paths. -->
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
									<a href={navigationHref(item.href)} {...props} onclick={closeMobileSidebar}>
										<item.icon />
										<span>{item.label}</span>
									</a>
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		{#if isRoot}
			<Sidebar.Group>
				<Sidebar.GroupLabel>Access administration</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each administration as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={active(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<!-- Existing routes are resolved by navigationHref; pending routes retain their declared paths. -->
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
										<a href={navigationHref(item.href)} {...props} onclick={closeMobileSidebar}>
											<item.icon />
											<span>{item.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if account}<SessionMenu {account} />{/if}
	</Sidebar.Footer>
</Sidebar.Root>
