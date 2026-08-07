<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import {
		IconBuildingCommunity,
		IconBuildingWarehouse,
		IconChevronRight,
		IconHome,
		IconKey,
		IconMapPin,
		IconRepeat,
		IconRulerMeasure,
		IconShield,
		IconTags,
		IconUserCircle,
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
		{ href: '/account', label: 'My access', icon: IconUserCircle },
		{ href: '/delegations', label: 'Delegations', icon: IconRepeat }
	] as const;
	const catalogue = [
		{ href: '/catalogue-categories', label: 'Categories', icon: IconTags },
		{ href: '/base-units', label: 'Base units', icon: IconRulerMeasure }
	] as const;
	const administration = [
		{ href: '/accounts', label: 'Accounts', icon: IconUsers },
		{ href: '/organization', label: 'Organization', icon: IconBuildingCommunity },
		{ href: '/locations', label: 'Locations', icon: IconMapPin },
		{ href: '/roles', label: 'Roles', icon: IconShield },
		{ href: '/role-assignments', label: 'Assignments', icon: IconKey }
	] as const;
	type NavigationHref =
		| (typeof workspace)[number]['href']
		| (typeof catalogue)[number]['href']
		| (typeof administration)[number]['href'];
	type NavigationSection = 'WORKSPACE' | 'CATALOGUE' | 'ACCESS_ADMINISTRATION';

	function sectionForPath(pathname: string): NavigationSection {
		if (catalogue.some((item) => pathname.startsWith(item.href))) return 'CATALOGUE';
		if (administration.some((item) => pathname.startsWith(item.href))) {
			return 'ACCESS_ADMINISTRATION';
		}
		return 'WORKSPACE';
	}

	let openSection = $state<NavigationSection | null>(sectionForPath(page.url.pathname));

	$effect(() => {
		openSection = sectionForPath(page.url.pathname);
	});

	function active(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}

	function navigationHref(href: NavigationHref) {
		switch (href) {
			case '/':
				return resolve('/');
			case '/account':
				return resolve('/account');
			case '/delegations':
				return resolve('/delegations');
			case '/catalogue-categories':
				return resolve('/catalogue-categories');
			case '/base-units':
				return resolve('/base-units');
			case '/accounts':
				return resolve('/accounts');
			case '/organization':
				return resolve('/organization');
			case '/locations':
				return resolve('/locations');
			case '/roles':
				return resolve('/roles');
			case '/role-assignments':
				return resolve('/role-assignments');
			default:
				return href;
		}
	}

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}

	function toggleSection(section: NavigationSection) {
		openSection = openSection === section ? null : section;
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
			<Sidebar.GroupLabel class="h-auto px-0">
				<button
					type="button"
					class="flex h-8 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden"
					aria-expanded={openSection === 'WORKSPACE'}
					aria-controls="sidebar-workspace-links"
					onclick={() => toggleSection('WORKSPACE')}
				>
					<span>Workspace</span>
					<IconChevronRight
						class={`transition-transform ${openSection === 'WORKSPACE' ? 'rotate-90' : ''}`}
					/>
				</button>
			</Sidebar.GroupLabel>
			{#if openSection === 'WORKSPACE'}
				<Sidebar.GroupContent id="sidebar-workspace-links">
					<Sidebar.Menu>
						{#each workspace as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={active(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<!-- Dynamic navigation targets are resolved centrally above. -->
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
			{/if}
		</Sidebar.Group>
		<Sidebar.Group>
			<Sidebar.GroupLabel class="h-auto px-0">
				<button
					type="button"
					class="flex h-8 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden"
					aria-expanded={openSection === 'CATALOGUE'}
					aria-controls="sidebar-catalogue-links"
					onclick={() => toggleSection('CATALOGUE')}
				>
					<span>Catalogue</span>
					<IconChevronRight
						class={`transition-transform ${openSection === 'CATALOGUE' ? 'rotate-90' : ''}`}
					/>
				</button>
			</Sidebar.GroupLabel>
			{#if openSection === 'CATALOGUE'}
				<Sidebar.GroupContent id="sidebar-catalogue-links">
					<Sidebar.Menu>
						{#each catalogue as item (item.href)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={active(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<!-- Dynamic navigation targets are resolved centrally above. -->
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
			{/if}
		</Sidebar.Group>
		{#if isRoot}
			<Sidebar.Group>
				<Sidebar.GroupLabel class="h-auto px-0">
					<button
						type="button"
						class="flex h-8 w-full cursor-pointer items-center justify-between rounded-xl px-3 text-xs font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-hidden"
						aria-expanded={openSection === 'ACCESS_ADMINISTRATION'}
						aria-controls="sidebar-administration-links"
						onclick={() => toggleSection('ACCESS_ADMINISTRATION')}
					>
						<span>Access administration</span>
						<IconChevronRight
							class={`transition-transform ${openSection === 'ACCESS_ADMINISTRATION' ? 'rotate-90' : ''}`}
						/>
					</button>
				</Sidebar.GroupLabel>
				{#if openSection === 'ACCESS_ADMINISTRATION'}
					<Sidebar.GroupContent id="sidebar-administration-links">
						<Sidebar.Menu>
							{#each administration as item (item.href)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={active(item.href)} tooltipContent={item.label}>
										{#snippet child({ props })}
											<!-- Dynamic navigation targets are resolved centrally above. -->
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
				{/if}
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if account}<SessionMenu {account} />{/if}
	</Sidebar.Footer>
</Sidebar.Root>
