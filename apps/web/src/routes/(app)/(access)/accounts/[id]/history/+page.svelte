<script lang="ts">
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import { accessEventTypeLabel } from '$lib/helpers/access-events';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	let { data } = $props();

	// This value initializes again after the ordinary GET form navigation completes.
	// svelte-ignore state_referenced_locally
	let selectedCategory = $state<string>(data.filters.category ?? 'ALL');
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

	<Card.Root class="concentric-filter">
		<Card.Content>
			<form method="GET" class="grid min-w-0 gap-3 md:grid-cols-[12rem_minmax(12rem,1fr)_auto]">
				<input
					type="hidden"
					name="category"
					value={selectedCategory === 'ALL' ? '' : selectedCategory}
				/>
				<Select.Root type="single" bind:value={selectedCategory}>
					<Select.Trigger class="w-full" aria-label="Event category">
						{selectedCategory === 'ALL' ? 'All categories' : accessEventTypeLabel(selectedCategory)}
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

				<Input
					name="eventType"
					value={data.filters.eventType ?? ''}
					placeholder="Enter an event title, for example Login succeeded."
					aria-label="Event title"
					aria-describedby="event-type-guidance"
				/>

				<Button type="submit" variant="outline" class="w-full md:w-auto">Apply filters</Button>
			</form>
		</Card.Content>
	</Card.Root>

	{#if data.timeline.data.length}
		<ol class="space-y-5">
			{#each data.timeline.data as event, index (event.id)}
				<li class="relative ps-8">
					{#if index < data.timeline.data.length - 1}
						<span class="absolute inset-s-0 top-8 -bottom-13 border-s" aria-hidden="true"></span>
					{/if}
					<span class="absolute inset-s-0 top-8 w-8 border-t" aria-hidden="true"></span>
					<span
						class="absolute inset-s-6.5 top-6.5 z-10 size-3 rounded-full bg-primary ring-4 ring-background"
						aria-hidden="true"
					></span>
					<Card.Root>
						<Card.Header>
							<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<Card.Title class="text-base">{accessEventTypeLabel(event.eventType)}</Card.Title>
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
