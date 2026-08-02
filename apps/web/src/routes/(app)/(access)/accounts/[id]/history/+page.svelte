<script lang="ts">
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	let { data } = $props();

	// This value initializes again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let selectedCategory = $state<string>(data.filters.category ?? 'ALL');

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
			<form method="GET" class="grid min-w-0 gap-3 md:grid-cols-[12rem_minmax(12rem,1fr)_auto]">
				<input
					type="hidden"
					name="category"
					value={selectedCategory === 'ALL' ? '' : selectedCategory}
				/>
				<Select.Root type="single" bind:value={selectedCategory}>
					<Select.Trigger class="w-full" aria-label="Event category">
						{selectedCategory === 'ALL' ? 'All categories' : eventLabel(selectedCategory)}
					</Select.Trigger>
					<Select.Content>
						<Select.Group>
							<Select.Label>Event category</Select.Label>
							<Select.Item value="ALL">All categories</Select.Item>
							<Select.Item value="ACCOUNT">Account</Select.Item>
							<Select.Item value="AUTHENTICATION">Authentication</Select.Item>
							<Select.Item value="CREDENTIAL">Credential</Select.Item>
							<Select.Item value="ROLE_ASSIGNMENT">Role assignment</Select.Item>
							<Select.Item value="DELEGATION">Delegation</Select.Item>
						</Select.Group>
					</Select.Content>
				</Select.Root>
				<div class="space-y-1">
					<Input
						name="eventType"
						value={data.filters.eventType ?? ''}
						placeholder="Exact event type"
						aria-label="Exact event type"
						aria-describedby="event-type-guidance"
					/>
					<p id="event-type-guidance" class="px-3 text-xs text-muted-foreground">
						Use an event card title in uppercase snake case, for example LOGIN_SUCCEEDED.
					</p>
				</div>
				<Button type="submit" variant="outline" class="w-full md:w-auto">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.timeline.data.length}
		<ol class="space-y-5">
			{#each data.timeline.data as event, index (event.id)}
				<li class="relative ps-8">
					{#if index < data.timeline.data.length - 1}
						<span class="absolute start-0 top-8 bottom-[-3.25rem] border-s" aria-hidden="true"
						></span>
					{/if}
					<span class="absolute start-0 top-8 w-8 border-t" aria-hidden="true"></span>
					<span
						class="absolute start-[1.625rem] top-[1.625rem] z-10 size-3 rounded-full bg-primary ring-4 ring-background"
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
							<Card.Content>
								<dl class="text-sm">
									<dt class="text-muted-foreground">Reason</dt>
									<dd>{event.reason}</dd>
								</dl>
							</Card.Content>
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
