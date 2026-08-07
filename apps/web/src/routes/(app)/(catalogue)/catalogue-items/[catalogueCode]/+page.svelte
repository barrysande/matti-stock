<script lang="ts">
	import { resolve } from '$app/paths';
	import CatalogueItemHistory from '$lib/components/catalogue-item-history.svelte';
	import CatalogueItemReview from '$lib/components/catalogue-item-review.svelte';
	import DateTime from '$lib/components/date-time.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		administerCatalogueItemSchema,
		catalogueItemClassificationSchema,
		catalogueItemDetailsSchema,
		restoreCatalogueItemSchema
	} from '$lib/schemas/catalogue-item';
	import type { CatalogueItemReview as CatalogueItemReviewData } from '$lib/types/catalogue-items';
	import { IconArrowLeft, IconSearch } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type DetailsReviewedSelection = { name: string; keywordsText: string };
	type ClassificationReviewedSelection = { catalogueCategoryId: string; stockType: string };

	let { data } = $props();
	const item = $derived(data.item);
	const isArchived = $derived(Boolean(item.archivedAt));
	const semanticsLocked = $derived(Boolean(item.inventorySemanticsLockedAt));
	const categoryPath = $derived(
		data.categories.find((category) => category.id === item.category.id)?.path ?? item.category.name
	);
	const currentCategory = $derived(
		data.categories.find((category) => category.id === item.category.id)
	);
	const currentBaseUnit = $derived(data.baseUnits.find((unit) => unit.id === item.baseUnit.id));
	const restoreBlocked = $derived(
		Boolean(currentCategory?.archivedAt || currentBaseUnit?.archivedAt)
	);
	const activeCategories = $derived(data.categories.filter((category) => !category.archivedAt));
	const activeBaseUnits = $derived(data.baseUnits.filter((unit) => !unit.archivedAt));

	let detailsDialogOpen = $state(false);
	let classificationDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);
	let detailsReview = $state<CatalogueItemReviewData | null>(null);
	let detailsReviewedSelection = $state<DetailsReviewedSelection | null>(null);
	let classificationReview = $state<CatalogueItemReviewData | null>(null);
	let classificationReviewedSelection = $state<ClassificationReviewedSelection | null>(null);
	let restoreReview = $state<CatalogueItemReviewData | null>(null);

	// svelte-ignore state_referenced_locally
	const detailsForm = superForm(data.detailsForm, {
		id: 'catalogue-item-details',
		validators: valibotClient(catalogueItemDetailsSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				detailsDialogOpen = false;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				review?: CatalogueItemReviewData;
				reviewedSelection?: DetailsReviewedSelection;
				reviewInvalidated?: boolean;
			};

			if (actionData.reviewInvalidated) {
				detailsReview = null;
				detailsReviewedSelection = null;
			} else if (actionData.review && actionData.reviewedSelection) {
				detailsReview = actionData.review;
				detailsReviewedSelection = actionData.reviewedSelection;
			}
		}
	});
	const { form: detailsData, enhance: detailsEnhance, submitting: detailsSubmitting } = detailsForm;

	// svelte-ignore state_referenced_locally
	const classificationForm = superForm(data.classificationForm, {
		id: 'catalogue-item-classification',
		validators: valibotClient(catalogueItemClassificationSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				classificationDialogOpen = false;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				review?: CatalogueItemReviewData;
				reviewedSelection?: ClassificationReviewedSelection;
				reviewInvalidated?: boolean;
			};

			if (actionData.reviewInvalidated) {
				classificationReview = null;
				classificationReviewedSelection = null;
			} else if (actionData.review && actionData.reviewedSelection) {
				classificationReview = actionData.review;
				classificationReviewedSelection = actionData.reviewedSelection;
			}
		}
	});
	const {
		form: classificationData,
		enhance: classificationEnhance,
		submitting: classificationSubmitting
	} = classificationForm;

	// svelte-ignore state_referenced_locally
	const archiveForm = superForm(data.archiveForm, {
		id: 'catalogue-item-archive',
		validators: valibotClient(administerCatalogueItemSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				archiveDialogOpen = false;
			}
		}
	});
	const { form: archiveData, enhance: archiveEnhance, submitting: archiveSubmitting } = archiveForm;

	// svelte-ignore state_referenced_locally
	const restoreForm = superForm(data.restoreForm, {
		id: 'catalogue-item-restore',
		validators: valibotClient(restoreCatalogueItemSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				restoreDialogOpen = false;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				review?: CatalogueItemReviewData;
				reviewInvalidated?: boolean;
			};

			if (actionData.reviewInvalidated) {
				restoreReview = null;
			} else if (actionData.review) {
				restoreReview = actionData.review;
			}
		}
	});
	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;

	const detailsIdentityChanged = $derived(
		identityKey($detailsData.name, $detailsData.keywordsText) !==
			identityKey(item.name, item.keywords.join('\n'))
	);

	const detailsReviewCurrent = $derived(
		detailsReview !== null &&
			detailsReviewedSelection?.name === $detailsData.name &&
			detailsReviewedSelection?.keywordsText === $detailsData.keywordsText
	);

	const classificationCategoryChanged = $derived(
		$classificationData.catalogueCategoryId !== item.category.id
	);

	const classificationReviewCurrent = $derived(
		classificationReview !== null &&
			classificationReviewedSelection?.catalogueCategoryId ===
				$classificationData.catalogueCategoryId &&
			classificationReviewedSelection?.stockType === $classificationData.stockType
	);

	const detailsCanSubmit = $derived(
		!detailsIdentityChanged || reviewComplete(detailsReview, detailsReviewCurrent, $detailsData)
	);
	const classificationCanSubmit = $derived(
		$classificationData.trackingMethodConfirmed &&
			(!classificationCategoryChanged ||
				reviewComplete(classificationReview, classificationReviewCurrent, $classificationData))
	);

	const restoreCanSubmit = $derived(
		!restoreBlocked &&
			reviewComplete(restoreReview, Boolean($restoreData.reviewFingerprint), $restoreData)
	);

	const selectedCategory = $derived(
		activeCategories.find((category) => category.id === $classificationData.catalogueCategoryId)
	);

	const selectedBaseUnit = $derived(
		activeBaseUnits.find((unit) => unit.id === $classificationData.baseUnitId)
	);

	function normalizedKeywords(value: string) {
		return value
			.split(/\r?\n/)
			.map((keyword) => keyword.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase('en-US'))
			.filter(Boolean)
			.join(':');
	}

	function identityKey(name: string, keywords: string) {
		return `${name.trim().replaceAll(/\s+/g, ' ').toLocaleLowerCase('en-US')}|${normalizedKeywords(keywords)}`;
	}

	function reviewComplete(
		review: CatalogueItemReviewData | null,
		current: boolean,
		confirmation: { confirmedNotInterchangeable: boolean; similarityReason: string }
	) {
		if (!review || !current) return false;
		if (review.candidates.some((candidate) => candidate.primaryMatchKind === 'EXACT_NAME')) {
			return false;
		}
		return (
			!review.candidates.length ||
			(confirmation.confirmedNotInterchangeable && Boolean(confirmation.similarityReason.trim()))
		);
	}

	function stockTypeLabel(value: string) {
		return value === 'CONSUMABLE' ? 'Consumable' : 'Fixed / non-consumable';
	}

	function trackingLabel(value: string) {
		return value === 'INDIVIDUAL' ? 'Individual units' : 'Quantity balance';
	}

	function unitLabel(unit: (typeof data.baseUnits)[number]) {
		return `${unit.name} (${unit.symbol}) · ${
			unit.kind === 'COUNTABLE'
				? 'whole quantities'
				: `${unit.precision} decimal ${unit.precision === 1 ? 'place' : 'places'}`
		}`;
	}
</script>

<svelte:head><title>{item.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader eyebrow={item.catalogueCode} title={item.name} description={categoryPath}>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/catalogue-items')}>
				<IconArrowLeft />Back to catalogue
			</Button>
			{#if data.account?.canManageCatalogue}
				{#if !isArchived}
					<Button type="button" variant="outline" onclick={() => (detailsDialogOpen = true)}>
						Edit details
					</Button>
					<Button type="button" variant="outline" onclick={() => (classificationDialogOpen = true)}>
						Edit classification
					</Button>
					<Button type="button" variant="destructive" onclick={() => (archiveDialogOpen = true)}>
						Archive
					</Button>
				{:else}
					<Button
						type="button"
						disabled={restoreBlocked}
						title={restoreBlocked ? 'Restore the category and base unit first.' : undefined}
						onclick={() => (restoreDialogOpen = true)}
					>
						Restore
					</Button>
				{/if}
			{/if}
		{/snippet}
	</PageHeader>

	{#if item.identificationStatus === 'PLACEHOLDER'}
		<Alert.Root>
			<Alert.Title>This is a placeholder catalogue definition.</Alert.Title>
			<Alert.Description>
				Its historical source did not identify the interchangeable item precisely. Shared details
				may be corrected when better information becomes available.
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if data.account?.canManageCatalogue && restoreBlocked && isArchived}
		<Alert.Root variant="destructive">
			<Alert.Title>This catalogue item cannot currently be restored.</Alert.Title>
			<Alert.Description>
				Restore its {currentCategory?.archivedAt && currentBaseUnit?.archivedAt
					? 'catalogue category and base unit'
					: currentCategory?.archivedAt
						? 'catalogue category'
						: 'base unit'} first.
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if semanticsLocked}
		<Alert.Root>
			<Alert.Title>Inventory semantics are in use.</Alert.Title>
			<Alert.Description>
				Stock type, tracking method, and base unit now require a controlled conversion. Name,
				description, keywords, identification quality, and category remain correctable with history.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content class="flex flex-wrap gap-1">
				<StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} />
				<StatusBadge status={item.identificationStatus} />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Stock and tracking</Card.Description></Card.Header>
			<Card.Content>
				{stockTypeLabel(item.stockType)}
				<p class="mt-1 text-sm text-muted-foreground">{trackingLabel(item.trackingMethod)}</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Base unit</Card.Description></Card.Header>
			<Card.Content>
				{item.baseUnit.name} ({item.baseUnit.symbol})
				<p class="mt-1 text-sm text-muted-foreground">
					{item.baseUnit.kind === 'COUNTABLE'
						? 'Whole quantities only'
						: `${item.baseUnit.precision} decimal ${item.baseUnit.precision === 1 ? 'place' : 'places'}`}
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Last updated</Card.Description></Card.Header>
			<Card.Content><DateTime value={item.updatedAt} /></Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
		<Card.Root>
			<Card.Header>
				<Card.Title>Shared description</Card.Title>
				<Card.Description
					>Recognition, specification, compatibility, material, model, or purpose.</Card.Description
				>
			</Card.Header>
			<Card.Content>
				<p class="leading-7 whitespace-pre-wrap text-muted-foreground">
					{item.description ?? 'No shared description has been recorded.'}
				</p>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Title>Search keywords</Card.Title></Card.Header>
			<Card.Content>
				{#if item.keywords.length}
					<div class="flex flex-wrap gap-2">
						{#each item.keywords as keyword (keyword)}
							<span class="rounded-full border px-3 py-1 text-sm">{keyword}</span>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No search keywords recorded.</p>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<CatalogueItemHistory versions={item.versions} />

	<Dialog.Root bind:open={detailsDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
			showCloseButton={!$detailsSubmitting}
		>
			<Dialog.Header>
				<Dialog.Title>Edit shared details</Dialog.Title>
				<Dialog.Description
					>Name or keyword changes require a fresh similar-item review.</Dialog.Description
				>
			</Dialog.Header>
			<form method="POST" action="?/details" use:detailsEnhance class="space-y-5">
				<Form.Field form={detailsForm} name="name">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Name</Form.Label><Input
								{...props}
								bind:value={$detailsData.name}
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field form={detailsForm} name="description">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Description</Form.Label><Textarea
								{...props}
								bind:value={$detailsData.description}
								rows={6}
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field form={detailsForm} name="keywordsText">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Keywords</Form.Label><Textarea
								{...props}
								bind:value={$detailsData.keywordsText}
								rows={4}
							/>{/snippet}</Form.Control
					>
					<Form.Description>Enter one unique keyword or phrase per line.</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field form={detailsForm} name="identificationStatus">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Identification quality</Form.Label>
							<Select.Root
								type="single"
								bind:value={$detailsData.identificationStatus}
								disabled={$detailsSubmitting}
							>
								<Select.Trigger {...props} class="w-full"
									>{$detailsData.identificationStatus === 'CONFIRMED'
										? 'Confirmed definition'
										: 'Placeholder requiring review'}</Select.Trigger
								>
								<Select.Content
									><Select.Item value="CONFIRMED">Confirmed definition</Select.Item><Select.Item
										value="PLACEHOLDER">Placeholder requiring review</Select.Item
									></Select.Content
								>
							</Select.Root>
							<input
								type="hidden"
								name="identificationStatus"
								value={$detailsData.identificationStatus}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field form={detailsForm} name="reason">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Reason</Form.Label><Textarea
								{...props}
								bind:value={$detailsData.reason}
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<input type="hidden" name="reviewFingerprint" value={$detailsData.reviewFingerprint} />

				{#if detailsIdentityChanged}
					<Button
						type="submit"
						formaction="?/reviewDetails"
						variant="outline"
						disabled={$detailsSubmitting}
					>
						<IconSearch />{detailsReviewCurrent ? 'Refresh similar items' : 'Review similar items'}
					</Button>
					{#if detailsReview && detailsReviewCurrent}
						<CatalogueItemReview review={detailsReview} />
						{#if detailsReview.candidates.length}
							<Form.Field form={detailsForm} name="confirmedNotInterchangeable">
								<Form.Control
									>{#snippet children({ props })}<div
											class="flex items-start gap-3 rounded-xl border p-4"
										>
											<Checkbox
												{...props}
												bind:checked={$detailsData.confirmedNotInterchangeable}
											/><Form.Label class="leading-5"
												>This definition is not interchangeable with the candidates.</Form.Label
											>
										</div>{/snippet}</Form.Control
								>
								<Form.FieldErrors />
							</Form.Field>
							<Form.Field form={detailsForm} name="similarityReason">
								<Form.Control
									>{#snippet children({ props })}<Form.Label>Reason for the distinction</Form.Label
										><Textarea
											{...props}
											bind:value={$detailsData.similarityReason}
										/>{/snippet}</Form.Control
								>
								<Form.FieldErrors />
							</Form.Field>
						{/if}
					{/if}
				{/if}
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$detailsSubmitting}
						onclick={() => (detailsDialogOpen = false)}>Cancel</Button
					>
					<Button
						type="submit"
						formaction="?/details"
						disabled={$detailsSubmitting || !detailsCanSubmit}>Save details</Button
					>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={classificationDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
			showCloseButton={!$classificationSubmitting}
		>
			<Dialog.Header>
				<Dialog.Title>Edit classification</Dialog.Title>
				<Dialog.Description
					>Category changes require similar-item review. Tracking must always be explicitly
					confirmed.</Dialog.Description
				>
			</Dialog.Header>
			<form method="POST" action="?/classification" use:classificationEnhance class="space-y-5">
				<Form.Field form={classificationForm} name="catalogueCategoryId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Catalogue category</Form.Label>
							<Select.Root
								type="single"
								bind:value={$classificationData.catalogueCategoryId}
								disabled={$classificationSubmitting}
							>
								<Select.Trigger {...props} class="w-full"
									>{selectedCategory?.path ?? categoryPath}</Select.Trigger
								>
								<Select.Content
									>{#each activeCategories as category (category.id)}<Select.Item
											value={category.id}
											label={category.path}>{category.path}</Select.Item
										>{/each}</Select.Content
								>
							</Select.Root>
							<input
								type="hidden"
								name="catalogueCategoryId"
								value={$classificationData.catalogueCategoryId}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<div class="grid gap-5 sm:grid-cols-2">
					<Form.Field form={classificationForm} name="stockType">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Stock type</Form.Label><Select.Root
									type="single"
									bind:value={$classificationData.stockType}
									disabled={$classificationSubmitting || semanticsLocked}
									><Select.Trigger {...props} class="w-full"
										>{stockTypeLabel($classificationData.stockType)}</Select.Trigger
									><Select.Content
										><Select.Item value="FIXED_NON_CONSUMABLE">Fixed / non-consumable</Select.Item
										><Select.Item value="CONSUMABLE">Consumable</Select.Item></Select.Content
									></Select.Root
								><input
									type="hidden"
									name="stockType"
									value={$classificationData.stockType}
								/>{/snippet}</Form.Control
						>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={classificationForm} name="trackingMethod">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Tracking method</Form.Label><Select.Root
									type="single"
									bind:value={$classificationData.trackingMethod}
									disabled={$classificationSubmitting || semanticsLocked}
									><Select.Trigger {...props} class="w-full"
										>{trackingLabel($classificationData.trackingMethod)}</Select.Trigger
									><Select.Content
										><Select.Item value="INDIVIDUAL">Individual units</Select.Item><Select.Item
											value="QUANTITY">Quantity balance</Select.Item
										></Select.Content
									></Select.Root
								><input
									type="hidden"
									name="trackingMethod"
									value={$classificationData.trackingMethod}
								/>{/snippet}</Form.Control
						>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Form.Field form={classificationForm} name="baseUnitId">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Base unit</Form.Label><Select.Root
								type="single"
								bind:value={$classificationData.baseUnitId}
								disabled={$classificationSubmitting || semanticsLocked}
								><Select.Trigger {...props} class="w-full"
									>{selectedBaseUnit
										? unitLabel(selectedBaseUnit)
										: `${item.baseUnit.name} (${item.baseUnit.symbol})`}</Select.Trigger
								><Select.Content
									>{#each activeBaseUnits as unit (unit.id)}<Select.Item
											value={unit.id}
											label={unitLabel(unit)}>{unitLabel(unit)}</Select.Item
										>{/each}</Select.Content
								></Select.Root
							><input
								type="hidden"
								name="baseUnitId"
								value={$classificationData.baseUnitId}
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				{#if semanticsLocked}<p class="text-sm text-muted-foreground">
						Stock type, tracking method, and base unit are read-only because holdings exist.
					</p>{/if}
				<Form.Field form={classificationForm} name="trackingMethodConfirmed">
					<Form.Control
						>{#snippet children({ props })}<div
								class="flex items-start gap-3 rounded-xl border p-4"
							>
								<Checkbox
									{...props}
									bind:checked={$classificationData.trackingMethodConfirmed}
								/><Form.Label class="leading-5"
									>I confirm that the displayed tracking method matches how this stock is held.</Form.Label
								>
							</div>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field form={classificationForm} name="reason">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Reason</Form.Label><Textarea
								{...props}
								bind:value={$classificationData.reason}
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<input
					type="hidden"
					name="reviewFingerprint"
					value={$classificationData.reviewFingerprint}
				/>
				{#if classificationCategoryChanged}
					<Button
						type="submit"
						formaction="?/reviewClassification"
						variant="outline"
						disabled={$classificationSubmitting}
						><IconSearch />{classificationReviewCurrent
							? 'Refresh similar items'
							: 'Review similar items'}</Button
					>
					{#if classificationReview && classificationReviewCurrent}
						<CatalogueItemReview review={classificationReview} />
						{#if classificationReview.candidates.length}
							<Form.Field form={classificationForm} name="confirmedNotInterchangeable"
								><Form.Control
									>{#snippet children({ props })}<div
											class="flex items-start gap-3 rounded-xl border p-4"
										>
											<Checkbox
												{...props}
												bind:checked={$classificationData.confirmedNotInterchangeable}
											/><Form.Label class="leading-5"
												>This definition is not interchangeable with the candidates.</Form.Label
											>
										</div>{/snippet}</Form.Control
								><Form.FieldErrors /></Form.Field
							>
							<Form.Field form={classificationForm} name="similarityReason"
								><Form.Control
									>{#snippet children({ props })}<Form.Label>Reason for the distinction</Form.Label
										><Textarea
											{...props}
											bind:value={$classificationData.similarityReason}
										/>{/snippet}</Form.Control
								><Form.FieldErrors /></Form.Field
							>
						{/if}
					{/if}
				{/if}
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$classificationSubmitting}
						onclick={() => (classificationDialogOpen = false)}>Cancel</Button
					><Button
						type="submit"
						formaction="?/classification"
						disabled={$classificationSubmitting || !classificationCanSubmit}
						>Save classification</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={archiveDialogOpen}>
		<Dialog.Content showCloseButton={!$archiveSubmitting}>
			<Dialog.Header
				><Dialog.Title>Archive catalogue item?</Dialog.Title><Dialog.Description
					>Archived definitions remain readable but cannot be selected for new intake.</Dialog.Description
				></Dialog.Header
			>
			<form method="POST" action="?/archive" use:archiveEnhance class="space-y-4">
				<Form.Field form={archiveForm} name="reason"
					><Form.Control
						>{#snippet children({ props })}<Form.Label>Reason</Form.Label><Textarea
								{...props}
								bind:value={$archiveData.reason}
							/>{/snippet}</Form.Control
					><Form.FieldErrors /></Form.Field
				>
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$archiveSubmitting}
						onclick={() => (archiveDialogOpen = false)}>Cancel</Button
					><Button type="submit" variant="destructive" disabled={$archiveSubmitting}
						>Archive item</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={restoreDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-3xl"
			showCloseButton={!$restoreSubmitting}
		>
			<Dialog.Header
				><Dialog.Title>Restore catalogue item</Dialog.Title><Dialog.Description
					>Review current active definitions before making this item available again.</Dialog.Description
				></Dialog.Header
			>
			<form method="POST" action="?/reviewRestore" use:restoreEnhance class="space-y-5">
				<Form.Field form={restoreForm} name="reason"
					><Form.Control
						>{#snippet children({ props })}<Form.Label>Reason</Form.Label><Textarea
								{...props}
								bind:value={$restoreData.reason}
							/>{/snippet}</Form.Control
					><Form.FieldErrors /></Form.Field
				>
				<input type="hidden" name="reviewFingerprint" value={$restoreData.reviewFingerprint} />
				<Button
					type="submit"
					formaction="?/reviewRestore"
					variant="outline"
					disabled={$restoreSubmitting || restoreBlocked}
					><IconSearch />{restoreReview ? 'Refresh similar items' : 'Review similar items'}</Button
				>
				{#if restoreReview}
					<CatalogueItemReview review={restoreReview} />
					{#if restoreReview.candidates.length}
						<Form.Field form={restoreForm} name="confirmedNotInterchangeable"
							><Form.Control
								>{#snippet children({ props })}<div
										class="flex items-start gap-3 rounded-xl border p-4"
									>
										<Checkbox
											{...props}
											bind:checked={$restoreData.confirmedNotInterchangeable}
										/><Form.Label class="leading-5"
											>This restored definition is not interchangeable with the candidates.</Form.Label
										>
									</div>{/snippet}</Form.Control
							><Form.FieldErrors /></Form.Field
						>
						<Form.Field form={restoreForm} name="similarityReason"
							><Form.Control
								>{#snippet children({ props })}<Form.Label>Reason for the distinction</Form.Label
									><Textarea
										{...props}
										bind:value={$restoreData.similarityReason}
									/>{/snippet}</Form.Control
							><Form.FieldErrors /></Form.Field
						>
					{/if}
				{/if}
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$restoreSubmitting}
						onclick={() => (restoreDialogOpen = false)}>Cancel</Button
					><Button
						type="submit"
						formaction="?/restore"
						disabled={$restoreSubmitting || !restoreCanSubmit}>Restore item</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
