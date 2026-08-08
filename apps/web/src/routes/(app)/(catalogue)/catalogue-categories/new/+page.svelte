<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { createCatalogueCategorySchema } from '$lib/schemas/catalogue-category';
	import type { CatalogueCategoryCreationReview } from '$lib/types/catalogue-categories';
	import { IconArrowLeft, IconSearch } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type ReviewedSelection = { name: string; parentId: string };
	const topLevelValue = 'TOP_LEVEL';

	let { data } = $props();
	let candidates = $state<CatalogueCategoryCreationReview[] | null>(null);
	let reviewedSelection = $state<ReviewedSelection | null>(null);
	let reviewDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'catalogue-category-create',
		validators: valibotClient(createCatalogueCategorySchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				reviewDialogOpen = false;
				return;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				candidates?: CatalogueCategoryCreationReview[];
				reviewedSelection?: ReviewedSelection;
				reviewInvalidated?: boolean;
			};

			if (actionData.reviewInvalidated) {
				candidates = null;
				reviewedSelection = null;
				reviewDialogOpen = false;
			} else if (actionData.candidates && actionData.reviewedSelection) {
				candidates = actionData.candidates;
				reviewedSelection = actionData.reviewedSelection;
				reviewDialogOpen = true;
			}
		}
	});

	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };

	const selectedParent = $derived(
		data.parentOptions.find((category) => category.id === $formData.parentId)
	);
	const reviewIsCurrent = $derived(
		candidates !== null &&
			reviewedSelection?.name === $formData.name &&
			reviewedSelection?.parentId === $formData.parentId
	);
	const exactSiblingExists = $derived(
		reviewIsCurrent &&
			candidates?.some(
				(candidate) =>
					candidate.matchKind === 'EXACT_NAME' &&
					(candidate.parentId ?? '') === $formData.parentId &&
					!candidate.archivedAt
			)
	);

	function selectParent(value: string) {
		$formData.parentId = value === topLevelValue ? '' : value;
	}

	function candidateStatus(candidate: CatalogueCategoryCreationReview) {
		if (candidate.mergedIntoCategoryId) return 'MERGED';
		return candidate.archivedAt ? 'ARCHIVED' : 'ACTIVE';
	}
</script>

<svelte:head><title>Create catalogue category · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue categories"
		title="Create catalogue category"
		description="Describe what belongs in this category, then review similar definitions before creating it."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/catalogue-categories')}>
				<IconArrowLeft />Back to categories
			</Button>
		{/snippet}
	</PageHeader>

	<form
		id="catalogue-category-create-form"
		method="POST"
		action="?/review"
		use:enhance
		class="space-y-6"
	>
		<Card.Root class="max-w-3xl">
			<Card.Header>
				<Card.Title>Category definition</Card.Title>
				<Card.Description
					>Categories describe what an item is, not its location, condition, custody, stock type, or
					tracking method.</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-5">
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Category name</Form.Label>
							<Input
								{...props}
								bind:value={$formData.name}
								aria-required="true"
								placeholder="e.g Computers or Motor Vehicles"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description
						>Active categories beneath the same parent cannot share a normalized name.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="parentId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Parent category</Form.Label>
							<Select.Root
								type="single"
								bind:value={() => $formData.parentId || topLevelValue, selectParent}
								disabled={$submitting}
							>
								<Select.Trigger {...props} class="w-full cursor-pointer"
									>{selectedParent?.path ?? 'Top-level category'}</Select.Trigger
								>
								<Select.Content>
									<Select.Item value={topLevelValue} class="cursor-pointer"
										>Top-level category</Select.Item
									>
									{#each data.parentOptions as category (category.id)}
										<Select.Item value={category.id} label={category.path} class="cursor-pointer"
											>{category.path}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="parentId" value={$formData.parentId} />
						{/snippet}
					</Form.Control>
					<Form.Description
						>The hierarchy is limited to three levels. Only eligible active parents are offered.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="description">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Description</Form.Label>
							<Textarea
								{...props}
								bind:value={$formData.description}
								rows={6}
								aria-required="true"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description
						>Explain what belongs here. Useful examples may be included in this description.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="reason">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Administrative reason</Form.Label>
							<Textarea {...props} bind:value={$formData.reason} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.Description
						>This reason becomes part of the category's immutable history.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
			<Card.Footer class="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button type="button" variant="outline" href={resolve('/catalogue-categories')}
					>Cancel</Button
				>
				<Button type="submit" formaction="?/review" disabled={$submitting}>
					<IconSearch />{reviewIsCurrent
						? 'Refresh similar categories'
						: 'Review similar categories'}
				</Button>
			</Card.Footer>
		</Card.Root>

		{#if candidates && reviewIsCurrent}
			<Card.Root class="max-w-3xl" aria-live="polite">
				<Card.Content
					class="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p class="font-medium">Similar-category review is current</p>
						<p class="mt-1 text-sm text-muted-foreground">
							{candidates.length} possible {candidates.length === 1 ? 'match was' : 'matches were'} found.
						</p>
					</div>
					<Button type="button" variant="outline" onclick={() => (reviewDialogOpen = true)}
						>Open review</Button
					>
				</Card.Content>
			</Card.Root>
		{/if}
	</form>

	<Dialog.Root bind:open={reviewDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-3xl"
			showCloseButton={!$submitting}
		>
			<Dialog.Header>
				<Dialog.Title>Review similar categories</Dialog.Title>
				<Dialog.Description
					>Use an existing definition when it already describes the same kind of item.</Dialog.Description
				>
			</Dialog.Header>

			<div class="min-h-0 space-y-3 overflow-y-auto pe-1">
				{#if candidates?.length && reviewIsCurrent}
					{#each candidates as candidate (candidate.id)}
						<Card.Root class="border border-border shadow-none ring-0">
							<Card.Header>
								<div class="flex items-start justify-between gap-3">
									<div>
										<Card.Title class="text-base"
											><a
												href={resolve(`/catalogue-categories/${candidate.id}`)}
												class="hover:underline">{candidate.path}</a
											></Card.Title
										>
										<Card.Description>{candidate.description}</Card.Description>
									</div>
									<StatusBadge status={candidateStatus(candidate)} />
								</div>
							</Card.Header>
						</Card.Root>
					{/each}
				{:else if reviewIsCurrent}
					<Alert.Root>
						<Alert.Title>No similar categories found</Alert.Title>
						<Alert.Description
							>The reviewed name does not resemble a current or historical category.</Alert.Description
						>
					</Alert.Root>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					disabled={$submitting}
					onclick={() => (reviewDialogOpen = false)}>Return to form</Button
				>
				<Button
					type="submit"
					form="catalogue-category-create-form"
					formaction="?/create"
					disabled={$submitting || !reviewIsCurrent || exactSiblingExists}
					title={exactSiblingExists
						? 'An active category already uses this name beneath the selected parent.'
						: undefined}>Create category</Button
				>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
