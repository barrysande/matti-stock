<script lang="ts">
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as NativeSelect from '$lib/components/ui/native-select/index.js';

	let { data } = $props();

	function eventLabel(value: string) {
		return value
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

<svelte:head><title>Access history · {data.account.person.displayName}</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Account timeline"
		title={data.account.person.displayName}
		description="Reverse-chronological account, authentication, credential, assignment, and delegation events."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={`/accounts/${data.account.id}`}>
				Back to account
			</Button>
		{/snippet}
	</PageHeader>

	<Card.Root>
		<Card.Content class="pt-6">
			<form method="GET" class="grid gap-3 md:grid-cols-[12rem_minmax(12rem,1fr)_auto]">
				<NativeSelect.Root
					name="category"
					value={data.filters.category ?? ''}
					aria-label="Event category"
				>
					<NativeSelect.Option value="">All categories</NativeSelect.Option>
					<NativeSelect.Option value="ACCOUNT">Account</NativeSelect.Option>
					<NativeSelect.Option value="AUTHENTICATION">Authentication</NativeSelect.Option>
					<NativeSelect.Option value="CREDENTIAL">Credential</NativeSelect.Option>
					<NativeSelect.Option value="ROLE_ASSIGNMENT">Role assignment</NativeSelect.Option>
					<NativeSelect.Option value="DELEGATION">Delegation</NativeSelect.Option>
				</NativeSelect.Root>
				<Input
					name="eventType"
					value={data.filters.eventType ?? ''}
					placeholder="Exact event type"
					aria-label="Exact event type"
				/>
				<Button type="submit" variant="outline">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.timeline.data.length}
		<ol class="relative ms-3 space-y-5 border-s">
			{#each data.timeline.data as event (event.id)}
				<li class="ms-6">
					<span
						class="absolute -start-2 mt-1.5 size-4 rounded-full border-4 border-background bg-primary"
						aria-hidden="true"
					></span>
					<Card.Root>
						<Card.Header>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<Card.Title class="text-base">{eventLabel(event.eventType)}</Card.Title>
									<Card.Description>
										{event.actor.type === 'SYSTEM'
											? 'System'
											: (event.actor.account?.person.displayName ?? 'Unavailable actor')}
									</Card.Description>
								</div>
								<DateTime value={event.occurredAt} />
							</div>
						</Card.Header>
						{#if event.reason}
							<Card.Content><p class="text-sm">{event.reason}</p></Card.Content>
						{/if}
					</Card.Root>
				</li>
			{/each}
		</ol>
		<PaginationControls
			currentPage={data.timeline.metadata.currentPage}
			lastPage={data.timeline.metadata.lastPage}
			url={page.url}
		/>
	{:else}
		<EmptyState
			title="No access events"
			description="No timeline event matches the selected filters."
		/>
	{/if}
</div>

