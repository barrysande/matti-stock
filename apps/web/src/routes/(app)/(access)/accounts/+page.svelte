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
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { IconPlus, IconSearch } from '@tabler/icons-svelte';

	let { data } = $props();
</script>

<svelte:head><title>Accounts · Matti Stock</title></svelte:head>

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
		<Card.Content class="pt-6">
			<form method="GET" class="grid gap-3 md:grid-cols-[minmax(12rem,1fr)_12rem_12rem_auto]">
				<div class="relative">
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
				<NativeSelect.Root name="status" value={data.filters.status ?? ''} aria-label="Status">
					<NativeSelect.Option value="">All statuses</NativeSelect.Option>
					<NativeSelect.Option value="INVITED">Invited</NativeSelect.Option>
					<NativeSelect.Option value="ACTIVE">Active</NativeSelect.Option>
					<NativeSelect.Option value="SUSPENDED">Suspended</NativeSelect.Option>
					<NativeSelect.Option value="DEACTIVATED">Deactivated</NativeSelect.Option>
				</NativeSelect.Root>
				<NativeSelect.Root
					name="setupStatus"
					value={data.filters.setupStatus ?? ''}
					aria-label="Setup status"
				>
					<NativeSelect.Option value="">All setup states</NativeSelect.Option>
					<NativeSelect.Option value="PENDING">Pending setup</NativeSelect.Option>
					<NativeSelect.Option value="COMPLETE">Setup complete</NativeSelect.Option>
				</NativeSelect.Root>
				<Button type="submit" variant="outline">Apply filters</Button>
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
