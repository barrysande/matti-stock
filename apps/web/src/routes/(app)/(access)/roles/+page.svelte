<script lang="ts">
	import { resolve } from '$app/paths';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { IconPlus, IconSearch, IconShield, IconVersions } from '@tabler/icons-svelte';

	let { data } = $props();

	// These values initialize again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let archiveVisibility = $state<string>(data.filters.includeArchived ? 'ALL' : 'ACTIVE');
	// svelte-ignore state_referenced_locally
	let roleType = $state<string>(
		data.filters.systemManaged === true
			? 'SYSTEM'
			: data.filters.systemManaged === false
				? 'CONFIGURABLE'
				: 'ALL'
	);

	function recordedAssignments(role: (typeof data.directory.data)[number]) {
		return role.currentVersion.assignmentCount + role.olderVersionAssignmentCount;
	}

	function permissionCountLabel(count: number) {
		return `${count} ${count === 1 ? 'permission' : 'permissions'}`;
	}
</script>

<svelte:head><title>Roles · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Access administration"
		title="Roles"
		description="Manage reusable permission bundles independently from the accounts and organizational scopes where they are assigned."
	>
		{#snippet actions()}
			<Button href={resolve('/roles/new')}><IconPlus />Create role</Button>
		{/snippet}
	</PageHeader>

	<Card.Root class="min-w-0">
		<Card.Content>
			<form
				method="GET"
				class="grid min-w-0 gap-3 lg:grid-cols-[minmax(12rem,1fr)_13rem_13rem_auto]"
			>
				<div class="relative min-w-0">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Role name or key"
						class="ps-9"
						aria-label="Search roles"
					/>
				</div>
				<input
					type="hidden"
					name="includeArchived"
					value={archiveVisibility === 'ALL' ? 'true' : ''}
				/>
				<Select.Root type="single" bind:value={archiveVisibility}>
					<Select.Trigger class="w-full" aria-label="Archive visibility">
						{archiveVisibility === 'ALL' ? 'Active and archived' : 'Active only'}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Archive visibility</Select.Label>
							<Select.Item value="ACTIVE">Active only</Select.Item>
							<Select.Item value="ALL">Active and archived</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<input
					type="hidden"
					name="systemManaged"
					value={roleType === 'SYSTEM' ? 'true' : roleType === 'CONFIGURABLE' ? 'false' : ''}
				/>
				<Select.Root type="single" bind:value={roleType}>
					<Select.Trigger class="w-full" aria-label="Role type">
						{roleType === 'SYSTEM'
							? 'System-managed'
							: roleType === 'CONFIGURABLE'
								? 'Configurable'
								: 'All role types'}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Role type</Select.Label>
							<Select.Item value="ALL">All role types</Select.Item>
							<Select.Item value="CONFIGURABLE">Configurable</Select.Item>
							<Select.Item value="SYSTEM">System-managed</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<Button type="submit" variant="outline" class="w-full lg:w-auto">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as role (role.id)}
				<a
					href={resolve(`/roles/${role.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-accent/50"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="font-heading font-semibold">{role.name}</p>
							<p class="mt-1 font-mono text-xs break-all text-muted-foreground">{role.key}</p>
						</div>
						<StatusBadge status={role.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
					</div>
					<div class="mt-4 flex flex-wrap gap-2">
						<Badge variant="outline">
							<IconShield />{role.systemManaged ? 'System-managed' : 'Configurable'}
						</Badge>
						<Badge variant="secondary">
							<IconVersions />Version {role.currentVersion.version}
						</Badge>
					</div>
					<dl class="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
						<div>
							<dt class="text-muted-foreground">Permissions</dt>
							<dd class="font-medium">{role.currentVersion.permissionKeys.length}</dd>
						</div>
						<div>
							<dt class="text-muted-foreground">Recorded assignments</dt>
							<dd class="font-medium">{recordedAssignments(role)}</dd>
						</div>
					</dl>
				</a>
			{/each}
		</div>

		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Role</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Current version</Table.Head>
						<Table.Head>Assignments</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as role (role.id)}
						<Table.Row>
							<Table.Cell>
								<a href={resolve(`/roles/${role.id}`)} class="font-medium hover:underline">
									{role.name}
								</a>
								<p class="mt-1 font-mono text-xs break-all text-muted-foreground">{role.key}</p>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline">
									{role.systemManaged ? 'System-managed' : 'Configurable'}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<p class="font-medium">Version {role.currentVersion.version}</p>
								<p class="mt-1 text-xs text-muted-foreground">
									{permissionCountLabel(role.currentVersion.permissionKeys.length)}
								</p>
							</Table.Cell>
							<Table.Cell>{recordedAssignments(role)}</Table.Cell>
							<Table.Cell>
								<StatusBadge status={role.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<EmptyState
			title="No roles found"
			description="No reusable role matches the current directory filters."
		/>
	{/if}
</div>
