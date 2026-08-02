<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DelegationProposalForm from '$lib/components/delegation-proposal-form.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { createDelegationSchema } from '$lib/schemas/delegation';
	import { IconArrowLeft, IconSearch } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'delegation-create',
		validators: valibotClient(createDelegationSchema),
		resetForm: false
	});

	function selectRecipientHref(accountId: string) {
		return `${resolve('/delegations/new')}?delegateAccountId=${encodeURIComponent(accountId)}`;
	}
</script>

<svelte:head><title>Propose temporary coverage · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Delegations"
		title="Propose temporary coverage"
		description="Choose an eligible recipient, then select the complete assignments they will cover."
	>
		{#snippet actions()}
			<Button variant="outline" href={resolve('/delegations')}>
				<IconArrowLeft />Back to delegations
			</Button>
		{/snippet}
	</PageHeader>

	{#if data.options.selectedDelegate}
		<div class="flex justify-end">
			<Button variant="outline" href={resolve('/delegations/new')}>Change recipient</Button>
		</div>
		<DelegationProposalForm
			{form}
			delegate={data.options.selectedDelegate}
			assignments={data.options.sourceAssignments}
		/>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Choose a recipient</Card.Title>
				<Card.Description>
					Only active accounts with compatible current responsibilities are shown. Search by name or
					official email.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="GET" class="flex flex-col gap-3 sm:flex-row">
					<div class="relative flex-1">
						<IconSearch
							class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							name="search"
							value={data.filters.search ?? ''}
							placeholder="Name or official email"
							class="ps-9"
						/>
					</div>
					<Button type="submit" variant="outline">Search recipients</Button>
				</form>
			</Card.Content>
		</Card.Root>

		{#if data.options.candidates.data.length}
			<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.options.candidates.data as candidate (candidate.accountId)}
					<Card.Root>
						<Card.Header>
							<Card.Title class="truncate text-base">{candidate.displayName}</Card.Title>
							<Card.Description class="truncate">{candidate.email}</Card.Description>
						</Card.Header>
						<Card.Content>
							<Button class="w-full" href={selectRecipientHref(candidate.accountId)}>
								Select recipient
							</Button>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
			<PaginationControls
				currentPage={data.options.candidates.metadata.currentPage}
				lastPage={data.options.candidates.metadata.lastPage}
				url={page.url}
			/>
		{:else}
			<EmptyState
				title="No eligible recipients found"
				description={data.filters.search
					? 'Try another name or official email.'
					: 'You do not currently have an assignment that can be provided to another eligible account.'}
			/>
		{/if}
	{/if}
</div>
