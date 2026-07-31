<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { IconPlus, IconSearch } from '@tabler/icons-svelte';

	let { data } = $props();
	// These values initialize again after the ordinary GET form navigation completes.

	let selectedStatus = $derived<string>(data.filters.status ?? 'ALL');

	let selectedSetupStatus = $derived<string>(data.filters.setupStatus ?? 'ALL');

	function statusLabel(value: string) {
		return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
	}
</script>

<svelte:head><title>Accounts · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Access administration"
		title="Accounts"
		description="Manage account lifecycle, credential recovery, and person-linked access."
	>
		{#snippet actions()}
			<Button href="/accounts/new"><IconPlus />Create account</Button>
		{/snippet}
	</PageHeader>

	<Card.Root>
		<Card.Content>
			<form
				method="GET"
				class="grid min-w-0 gap-3 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto]"
			>
				<div class="relative min-w-0">
					<IconSearch
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						name="search"
						value={data.filters.search ?? ''}
						placeholder="Name, email, or staff number"
						class="ps-9"
						aria-label="Search accounts"
					/>
				</div>
				<input type="hidden" name="status" value={selectedStatus === 'ALL' ? '' : selectedStatus} />
				<Select.Root type="single" bind:value={selectedStatus}>
					<Select.Trigger class="w-full" aria-label="Status">
						{selectedStatus === 'ALL' ? 'All statuses' : statusLabel(selectedStatus)}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Account status</Select.Label>
							<Select.Item value="ALL">All statuses</Select.Item>
							<Select.Item value="INVITED">Invited</Select.Item>
							<Select.Item value="ACTIVE">Active</Select.Item>
							<Select.Item value="SUSPENDED">Suspended</Select.Item>
							<Select.Item value="DEACTIVATED">Deactivated</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<input
					type="hidden"
					name="setupStatus"
					value={selectedSetupStatus === 'ALL' ? '' : selectedSetupStatus}
				/>
				<Select.Root type="single" bind:value={selectedSetupStatus}>
					<Select.Trigger class="w-full" aria-label="Setup status">
						{selectedSetupStatus === 'ALL'
							? 'All setup states'
							: selectedSetupStatus === 'PENDING'
								? 'Pending setup'
								: 'Setup complete'}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Setup status</Select.Label>
							<Select.Item value="ALL">All setup states</Select.Item>
							<Select.Item value="PENDING">Pending setup</Select.Item>
							<Select.Item value="COMPLETE">Setup complete</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<Button type="submit" variant="outline" class="w-full md:w-auto">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.directory.data.length}
		<div class="grid gap-3 md:hidden">
			{#each data.directory.data as account (account.id)}
				<a
					href={resolve(`/accounts/${account.id}`)}
					class="rounded-xl border bg-card p-4 shadow-xs"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="truncate font-medium">{account.person.displayName}</p>
							<p class="truncate text-sm text-muted-foreground">{account.email}</p>
						</div>
						<StatusBadge status={account.status} />
					</div>
					<p class="mt-3 text-xs text-muted-foreground">
						Last login: <DateTime value={account.lastLoginAt} fallback="Never" />
					</p>
				</a>
			{/each}
		</div>
		<div class="hidden overflow-hidden rounded-xl border md:block">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Person</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Setup</Table.Head>
						<Table.Head>Last login</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.directory.data as account (account.id)}
						<Table.Row>
							<Table.Cell>
								<a href={resolve(`/accounts/${account.id}`)} class="font-medium hover:underline">
									{account.person.displayName}
								</a>
								<p class="text-xs text-muted-foreground">{account.email}</p>
							</Table.Cell>
							<Table.Cell><StatusBadge status={account.status} /></Table.Cell>
							<Table.Cell><StatusBadge status={account.setupStatus} /></Table.Cell>
							<Table.Cell><DateTime value={account.lastLoginAt} fallback="Never" /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<PaginationControls
			currentPage={data.directory.metadata.currentPage}
			lastPage={data.directory.metadata.lastPage}
			url={page.url}
		/>
	{:else}
		<EmptyState
			title="No accounts found"
			description="No account matches the current directory filters."
		/>
	{/if}
</div>
