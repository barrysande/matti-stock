<script lang="ts">
	import { resolve } from '$app/paths';
	import CatalogueItemReview from '$lib/components/catalogue-item-review.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { catalogueItemCreationSchema } from '$lib/schemas/catalogue-item';
	import type { CatalogueItemReview as CatalogueItemReviewData } from '$lib/types/catalogue-items';
	import { IconArrowLeft, IconSearch } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type ReviewedSelection = {
		name: string;
		keywordsText: string;
		catalogueCategoryId: string;
		stockType: string;
	};

	let { data } = $props();
	let review = $state<CatalogueItemReviewData | null>(null);
	let reviewedSelection = $state<ReviewedSelection | null>(null);

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'catalogue-item-create',
		validators: valibotClient(catalogueItemCreationSchema),
		resetForm: false,
		onResult({ result }) {
			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				review?: CatalogueItemReviewData;
				reviewedSelection?: ReviewedSelection;
				reviewInvalidated?: boolean;
			};

			if (actionData.reviewInvalidated) {
				review = null;
				reviewedSelection = null;
			} else if (actionData.review && actionData.reviewedSelection) {
				review = actionData.review;
				reviewedSelection = actionData.reviewedSelection;
			}
		}
	});

	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };

	const selectedCategory = $derived(
		data.categories.find((category) => category.id === $formData.catalogueCategoryId)
	);
	const selectedUnit = $derived(data.baseUnits.find((unit) => unit.id === $formData.baseUnitId));
	const reviewIsCurrent = $derived(
		review !== null &&
			reviewedSelection?.name === $formData.name &&
			reviewedSelection?.keywordsText === $formData.keywordsText &&
			reviewedSelection?.catalogueCategoryId === $formData.catalogueCategoryId &&
			reviewedSelection?.stockType === $formData.stockType
	);
	const exactNameExists = $derived(
		reviewIsCurrent &&
			review?.candidates.some((candidate) => candidate.primaryMatchKind === 'EXACT_NAME')
	);
	const candidateConfirmationComplete = $derived(
		!review?.candidates.length ||
			($formData.confirmedNotInterchangeable && Boolean($formData.similarityReason.trim()))
	);
	const trackingConfirmationComplete = $derived(
		Boolean($formData.trackingMethod) && $formData.trackingMethodConfirmed
	);

	function stockTypeLabel(value: string) {
		return value === 'CONSUMABLE' ? 'Consumable' : 'Fixed / non-consumable';
	}

	function trackingLabel(value: string) {
		return value === 'INDIVIDUAL' ? 'Track individual units' : 'Track quantity balances';
	}

	function unitLabel(unit: (typeof data.baseUnits)[number]) {
		return `${unit.name} (${unit.symbol}) · ${
			unit.kind === 'COUNTABLE'
				? 'whole quantities'
				: `${unit.precision} decimal ${unit.precision === 1 ? 'place' : 'places'}`
		}`;
	}
</script>

<svelte:head><title>Create catalogue item · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue items"
		title="Create catalogue item"
		description="Define one interchangeable kind of stock, review similar definitions, and explicitly confirm how its holdings will be tracked."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/catalogue-items')}>
				<IconArrowLeft />Back to catalogue
			</Button>
		{/snippet}
	</PageHeader>

	<form method="POST" action="?/review" use:enhance class="space-y-6">
		<Card.Root class="max-w-4xl">
			<Card.Header>
				<Card.Title>Shared definition</Card.Title>
				<Card.Description>
					Record details shared by interchangeable holdings. Do not include a physical unit's serial
					number, condition, location, custodian, or holder.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Catalogue-item name</Form.Label>
							<Input {...props} bind:value={$formData.name} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.Description>
						Name the meaningful brand, model, compatibility, purpose, or specification difference.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="description">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label
								>Description <span class="text-muted-foreground">(optional)</span></Form.Label
							>
							<Textarea {...props} bind:value={$formData.description} rows={7} />
						{/snippet}
					</Form.Control>
					<Form.Description>
						Include shared recognition, specification, compatibility, material, dimensions, model,
						or purpose details.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="keywordsText">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label
								>Search keywords <span class="text-muted-foreground">(optional)</span></Form.Label
							>
							<Textarea
								{...props}
								bind:value={$formData.keywordsText}
								rows={4}
								placeholder="probook 450&#10;hp laptop"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>Enter one unique keyword or phrase per line, up to 20.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="identificationStatus">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Identification quality</Form.Label>
							<Select.Root
								type="single"
								bind:value={$formData.identificationStatus}
								disabled={$submitting}
							>
								<Select.Trigger {...props} class="w-full">
									{$formData.identificationStatus === 'CONFIRMED'
										? 'Confirmed definition'
										: 'Placeholder requiring later review'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="CONFIRMED">Confirmed definition</Select.Item>
									<Select.Item value="PLACEHOLDER">Placeholder requiring later review</Select.Item>
								</Select.Content>
							</Select.Root>
							<input
								type="hidden"
								name="identificationStatus"
								value={$formData.identificationStatus}
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>
						Use a placeholder only when an item cannot yet be identified precisely.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<Card.Root class="max-w-4xl">
			<Card.Header>
				<Card.Title>Classification and quantity</Card.Title>
				<Card.Description>
					Choose what the item is, how the institute treats it, and the unit in which stock will be
					recorded.
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid gap-5 md:grid-cols-2">
				<Form.Field {form} name="catalogueCategoryId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Catalogue category</Form.Label>
							<Select.Root
								type="single"
								bind:value={$formData.catalogueCategoryId}
								disabled={$submitting}
							>
								<Select.Trigger {...props} class="w-full">
									{selectedCategory?.path ?? 'Select a category'}
								</Select.Trigger>
								<Select.Content>
									{#each data.categories as category (category.id)}
										<Select.Item value={category.id} label={category.path}
											>{category.path}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
							<input
								type="hidden"
								name="catalogueCategoryId"
								value={$formData.catalogueCategoryId}
							/>
						{/snippet}
					</Form.Control>
					<Form.Description
						>Only active categories are available for new definitions.</Form.Description
					>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="stockType">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Stock type</Form.Label>
							<Select.Root type="single" bind:value={$formData.stockType} disabled={$submitting}>
								<Select.Trigger {...props} class="w-full"
									>{stockTypeLabel($formData.stockType)}</Select.Trigger
								>
								<Select.Content>
									<Select.Item value="FIXED_NON_CONSUMABLE">Fixed / non-consumable</Select.Item>
									<Select.Item value="CONSUMABLE">Consumable</Select.Item>
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="stockType" value={$formData.stockType} />
						{/snippet}
					</Form.Control>
					<Form.Description>
						Stock type is separate from whether holdings are tracked individually or as quantities.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="baseUnitId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Base unit</Form.Label>
							<Select.Root type="single" bind:value={$formData.baseUnitId} disabled={$submitting}>
								<Select.Trigger {...props} class="w-full">
									{selectedUnit ? unitLabel(selectedUnit) : 'Select a base unit'}
								</Select.Trigger>
								<Select.Content>
									{#each data.baseUnits as unit (unit.id)}
										<Select.Item value={unit.id} label={unitLabel(unit)}
											>{unitLabel(unit)}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="baseUnitId" value={$formData.baseUnitId} />
						{/snippet}
					</Form.Control>
					<Form.Description>
						All future balances and movements use this unit; packaging does not redefine it.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<Card.Root class="max-w-4xl">
			<Card.Header>
				<Card.Title>Administrative reason</Card.Title>
				<Card.Description
					>This reason becomes part of the catalogue item's immutable history.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<Form.Field {form} name="reason">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Reason</Form.Label>
							<Textarea {...props} bind:value={$formData.reason} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
			<Card.Footer class="flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button type="button" variant="outline" href={resolve('/catalogue-items')}>Cancel</Button>
				<Button type="submit" formaction="?/review" disabled={$submitting}>
					<IconSearch />{reviewIsCurrent ? 'Refresh review' : 'Review similar items'}
				</Button>
			</Card.Footer>
		</Card.Root>

		<input type="hidden" name="reviewFingerprint" value={$formData.reviewFingerprint} />

		{#if review && reviewIsCurrent}
			<section class="max-w-4xl space-y-6" aria-live="polite">
				<Card.Root>
					<Card.Header>
						<Card.Title>Similar catalogue items</Card.Title>
						<Card.Description>
							Reuse an existing definition when the proposed stock is interchangeable with it.
						</Card.Description>
					</Card.Header>
					<Card.Content><CatalogueItemReview {review} /></Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Confirm tracking method</Card.Title>
						<Card.Description>{review.trackingGuidance.explanation}</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-5">
						{#if review.trackingGuidance.recommendation}
							<Alert.Root>
								<Alert.Title
									>Recommended: {trackingLabel(review.trackingGuidance.recommendation)}</Alert.Title
								>
								<Alert.Description
									>The recommendation is guidance; you remain responsible for the choice.</Alert.Description
								>
							</Alert.Root>
						{/if}

						<Form.Field {form} name="trackingMethod">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label>Tracking method</Form.Label>
									<Select.Root
										type="single"
										bind:value={$formData.trackingMethod}
										disabled={$submitting}
									>
										<Select.Trigger {...props} class="w-full">
											{$formData.trackingMethod
												? trackingLabel($formData.trackingMethod)
												: 'Select a tracking method'}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="INDIVIDUAL">Track individual units</Select.Item>
											<Select.Item value="QUANTITY">Track quantity balances</Select.Item>
										</Select.Content>
									</Select.Root>
									<input type="hidden" name="trackingMethod" value={$formData.trackingMethod} />
								{/snippet}
							</Form.Control>
							<Form.Description>
								Individual tracking gives each physical unit its own identity and history. Quantity
								tracking maintains pooled balances.
							</Form.Description>
							<Form.FieldErrors />
						</Form.Field>

						<Form.Field {form} name="trackingMethodConfirmed">
							<Form.Control>
								{#snippet children({ props })}
									<div class="flex items-start gap-3 rounded-xl border p-4">
										<Checkbox {...props} bind:checked={$formData.trackingMethodConfirmed} />
										<Form.Label class="leading-5">
											I confirm that the selected tracking method matches how this stock will be
											held and managed.
										</Form.Label>
									</div>
								{/snippet}
							</Form.Control>
							<Form.FieldErrors />
						</Form.Field>
					</Card.Content>
				</Card.Root>

				{#if review.candidates.length}
					<Card.Root>
						<Card.Header>
							<Card.Title>Confirm a separate definition</Card.Title>
							<Card.Description>
								Creation may continue only when this proposal is not interchangeable with the
								candidates.
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-5">
							<Form.Field {form} name="confirmedNotInterchangeable">
								<Form.Control>
									{#snippet children({ props })}
										<div class="flex items-start gap-3 rounded-xl border p-4">
											<Checkbox {...props} bind:checked={$formData.confirmedNotInterchangeable} />
											<Form.Label class="leading-5">
												I confirm that the proposed item is not interchangeable with the candidates
												shown above.
											</Form.Label>
										</div>
									{/snippet}
								</Form.Control>
								<Form.FieldErrors />
							</Form.Field>

							<Form.Field {form} name="similarityReason">
								<Form.Control>
									{#snippet children({ props })}
										<Form.Label>Why is this a separate interchangeable definition?</Form.Label>
										<Textarea
											{...props}
											bind:value={$formData.similarityReason}
											aria-required="true"
										/>
									{/snippet}
								</Form.Control>
								<Form.Description>
									Explain the material brand, model, compatibility, specification, purpose, or
									reporting difference.
								</Form.Description>
								<Form.FieldErrors />
							</Form.Field>
						</Card.Content>
					</Card.Root>
				{/if}

				{#if exactNameExists}
					<Alert.Root variant="destructive">
						<Alert.Title>An exact catalogue-item name already exists.</Alert.Title>
						<Alert.Description
							>Use the existing definition or choose a materially distinct name.</Alert.Description
						>
					</Alert.Root>
				{/if}

				<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
					<Button type="submit" formaction="?/review" variant="outline" disabled={$submitting}>
						Refresh review
					</Button>
					<Button
						type="submit"
						formaction="?/create"
						disabled={$submitting ||
							exactNameExists ||
							!candidateConfirmationComplete ||
							!trackingConfirmationComplete}
					>
						Create catalogue item
					</Button>
				</div>
			</section>
		{:else if review}
			<Alert.Root class="max-w-4xl">
				<Alert.Title>The proposal changed after review.</Alert.Title>
				<Alert.Description
					>Review the current name, keywords, category, and stock type again before creating the
					item.</Alert.Description
				>
			</Alert.Root>
		{/if}
	</form>
</div>
