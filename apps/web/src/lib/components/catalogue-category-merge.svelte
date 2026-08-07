<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		applyCatalogueCategoryMergeSchema,
		moveCatalogueCategoryChildrenSchema,
		previewCatalogueCategoryMergeSchema
	} from '$lib/schemas/catalogue-category';
	import type {
		CatalogueCategory,
		CatalogueCategoryMergePreview
	} from '$lib/types/catalogue-categories';
	import { IconArrowMerge, IconEye } from '@tabler/icons-svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import type { InferOutput } from 'valibot';
	import { SvelteSet } from 'svelte/reactivity';

	const topLevelValue = 'TOP_LEVEL';
	type MergePreviewFormData = InferOutput<typeof previewCatalogueCategoryMergeSchema>;
	type MoveChildrenFormData = InferOutput<typeof moveCatalogueCategoryChildrenSchema>;
	type MergeApplyFormData = InferOutput<typeof applyCatalogueCategoryMergeSchema>;
	let {
		category,
		categories,
		mergeTargetOptions,
		mergePreviewForm: mergePreviewFormData,
		moveChildrenForm: moveChildrenFormData,
		mergeApplyForm: mergeApplyFormData
	}: {
		category: CatalogueCategory;
		categories: CatalogueCategory[];
		mergeTargetOptions: CatalogueCategory[];
		mergePreviewForm: SuperValidated<MergePreviewFormData>;
		moveChildrenForm: SuperValidated<MoveChildrenFormData>;
		mergeApplyForm: SuperValidated<MergeApplyFormData>;
	} = $props();

	let open = $state(false);
	let preview = $state<CatalogueCategoryMergePreview | null>(null);
	const previewActiveChildren = $derived(preview?.activeChildren ?? []);

	// svelte-ignore state_referenced_locally
	const mergePreviewForm = superForm(mergePreviewFormData, {
		id: 'catalogue-category-merge-preview',
		validators: valibotClient(previewCatalogueCategoryMergeSchema),
		resetForm: false,
		onResult({ result }) {
			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				preview?: CatalogueCategoryMergePreview;
				previewInvalidated?: boolean;
			};

			if (actionData.previewInvalidated) {
				preview = null;
				$mergeApplyData.previewFingerprint = '';
			} else if (actionData.preview) {
				preview = actionData.preview;
				$mergeApplyData.targetCategoryId = actionData.preview.target.id;
				$mergeApplyData.previewFingerprint = actionData.preview.fingerprint;
				$mergeApplyData.terminalConfirmed = false;
				$moveChildrenData.childIds = [];
			}
		}
	});
	const {
		form: mergePreviewData,
		enhance: mergePreviewEnhance,
		submitting: mergePreviewSubmitting
	} = mergePreviewForm;

	// svelte-ignore state_referenced_locally
	const moveChildrenForm = superForm(moveChildrenFormData, {
		id: 'catalogue-category-move-children',
		validators: valibotClient(moveCatalogueCategoryChildrenSchema),
		resetForm: false
	});
	const {
		form: moveChildrenData,
		enhance: moveChildrenEnhance,
		submitting: moveChildrenSubmitting
	} = moveChildrenForm;

	// svelte-ignore state_referenced_locally
	const mergeApplyForm = superForm(mergeApplyFormData, {
		id: 'catalogue-category-merge-apply',
		validators: valibotClient(applyCatalogueCategoryMergeSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				open = false;
			}
		}
	});
	const {
		form: mergeApplyData,
		enhance: mergeApplyEnhance,
		submitting: mergeApplySubmitting
	} = mergeApplyForm;

	const selectedTarget = $derived(
		mergeTargetOptions.find((candidate) => candidate.id === $mergePreviewData.targetCategoryId)
	);
	const previewIsCurrent = $derived(
		preview !== null &&
			preview.target.id === $mergePreviewData.targetCategoryId &&
			preview.fingerprint === $mergeApplyData.previewFingerprint
	);
	const selectedChildren = $derived(
		preview?.activeChildren.filter((child) => $moveChildrenData.childIds.includes(child.id)) ?? []
	);
	const destinationOptions = $derived(
		categories.filter(
			(candidate) =>
				!candidate.archivedAt &&
				candidate.id !== category.id &&
				selectedChildren.every(
					(child) =>
						candidate.id !== child.id &&
						!descendantsOf(categories, child.id).has(candidate.id) &&
						candidate.depth + subtreeHeight(categories, child.id) <= 2
				)
		)
	);
	const selectedDestination = $derived(
		destinationOptions.find((candidate) => candidate.id === $moveChildrenData.parentId)
	);
	const busy = $derived(
		$mergePreviewSubmitting || $moveChildrenSubmitting || $mergeApplySubmitting
	);

	$effect(() => {
		if (
			$moveChildrenData.parentId &&
			!destinationOptions.some((candidate) => candidate.id === $moveChildrenData.parentId)
		) {
			$moveChildrenData.parentId = '';
		}
	});

	function descendantsOf(allCategories: CatalogueCategory[], categoryId: string) {
		const descendantIds = new SvelteSet<string>();
		let found = true;

		while (found) {
			found = false;
			for (const candidate of allCategories) {
				if (
					!descendantIds.has(candidate.id) &&
					(candidate.parentId === categoryId ||
						(candidate.parentId && descendantIds.has(candidate.parentId)))
				) {
					descendantIds.add(candidate.id);
					found = true;
				}
			}
		}

		return descendantIds;
	}

	function subtreeHeight(allCategories: CatalogueCategory[], categoryId: string): number {
		const children = allCategories.filter((candidate) => candidate.parentId === categoryId);
		return children.reduce(
			(height, child) => Math.max(height, subtreeHeight(allCategories, child.id) + 1),
			0
		);
	}

	function setChild(childId: string, checked: boolean) {
		$moveChildrenData.childIds = checked
			? [...new Set([...$moveChildrenData.childIds, childId])]
			: $moveChildrenData.childIds.filter((id) => id !== childId);
	}

	function selectAllChildren() {
		$moveChildrenData.childIds = preview?.activeChildren.map((child) => child.id) ?? [];
	}

	function selectDestination(value: string) {
		$moveChildrenData.parentId = value === topLevelValue ? '' : value;
	}

	function categoryPath(id: string, fallback: string) {
		return categories.find((candidate) => candidate.id === id)?.path ?? fallback;
	}
</script>

<Button type="button" variant="destructive" onclick={() => (open = true)}>
	<IconArrowMerge />Merge category
</Button>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl"
		showCloseButton={!busy}
	>
		<Dialog.Header>
			<Dialog.Title>Merge {category.path}</Dialog.Title>
			<Dialog.Description>
				A merge is terminal. Review the target, child blockers, and every affected catalogue item
				before applying it.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/mergePreview" use:mergePreviewEnhance class="space-y-4">
			<Form.Field form={mergePreviewForm} name="targetCategoryId">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Replacement category</Form.Label>
						<Select.Root
							type="single"
							bind:value={$mergePreviewData.targetCategoryId}
							disabled={busy}
						>
							<Select.Trigger {...props} class="w-full">
								{selectedTarget?.path ?? 'Select an active replacement'}
							</Select.Trigger>
							<Select.Content>
								{#each mergeTargetOptions as target (target.id)}
									<Select.Item value={target.id} label={target.path}>{target.path}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<input
							type="hidden"
							name="targetCategoryId"
							value={$mergePreviewData.targetCategoryId}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>
					Self, descendant, archived, and already-merged categories are excluded locally; the API
					revalidates the target.
				</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Button type="submit" disabled={busy || !$mergePreviewData.targetCategoryId}>
				<IconEye />Preview merge impact
			</Button>
		</form>

		{#if preview && previewIsCurrent}
			<div class="space-y-5" aria-live="polite">
				<div class="grid gap-3 sm:grid-cols-2">
					<Card.Root>
						<Card.Header
							><Card.Title class="text-base">Source: {category.path}</Card.Title></Card.Header
						>
						<Card.Content class="text-sm text-muted-foreground"
							>{preview.source.description}</Card.Content
						>
					</Card.Root>
					<Card.Root>
						<Card.Header
							><Card.Title class="text-base"
								>Target: {categoryPath(preview.target.id, preview.target.name)}</Card.Title
							></Card.Header
						>
						<Card.Content class="text-sm text-muted-foreground"
							>{preview.target.description}</Card.Content
						>
					</Card.Root>
				</div>

				<Card.Root>
					<Card.Header>
						<Card.Title>Affected catalogue items ({preview.affectedItems.length})</Card.Title>
						<Card.Description
							>Active and archived items will move to the replacement category without changing
							lifecycle state.</Card.Description
						>
					</Card.Header>
					<Card.Content>
						{#if preview.affectedItems.length}
							<ul class="space-y-3">
								{#each preview.affectedItems as item (item.catalogueCode)}
									<li class="flex items-start justify-between gap-3 rounded-xl border p-3">
										<div class="min-w-0">
											<a
												href={resolve(`/catalogue-items/${item.catalogueCode}`)}
												class="font-medium hover:underline">{item.name}</a
											>
											<p class="font-mono text-xs text-muted-foreground">{item.catalogueCode}</p>
										</div>
										<StatusBadge status={item.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
									</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-muted-foreground">
								No catalogue items are directly classified here.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				{#if previewActiveChildren.length}
					<Card.Root>
						<Card.Header>
							<Card.Title>Move active child categories first</Card.Title>
							<Card.Description
								>Select one, several, or all children to move to one destination. Repeat for a
								different destination when needed.</Card.Description
							>
						</Card.Header>
						<Card.Content>
							<form method="POST" action="?/moveChildren" use:moveChildrenEnhance class="space-y-5">
								<Form.Field form={moveChildrenForm} name="childIds">
									<Form.Control>
										{#snippet children({ props })}
											<fieldset aria-describedby={props['aria-describedby']} class="space-y-3">
												<legend class="sr-only">Active children to move</legend>
												{#each previewActiveChildren as child (child.id)}
													<div class="flex items-start gap-3 rounded-xl border p-3">
														<Checkbox
															checked={$moveChildrenData.childIds.includes(child.id)}
															onCheckedChange={(checked) => setChild(child.id, checked)}
															disabled={busy}
															aria-label={`Move ${categoryPath(child.id, child.name)}`}
														/>
														<div>
															<p class="font-medium">{categoryPath(child.id, child.name)}</p>
															<p class="text-sm text-muted-foreground">{child.description}</p>
														</div>
													</div>
												{/each}
											</fieldset>
										{/snippet}
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
								{#each $moveChildrenData.childIds as childId (childId)}<input
										type="hidden"
										name="childIds"
										value={childId}
									/>{/each}
								<Button type="button" variant="outline" disabled={busy} onclick={selectAllChildren}
									>Select all children</Button
								>
								<Form.Field form={moveChildrenForm} name="parentId">
									<Form.Control
										>{#snippet children({ props })}<Form.Label>Destination parent</Form.Label
											><Select.Root
												type="single"
												bind:value={
													() => $moveChildrenData.parentId || topLevelValue, selectDestination
												}
												disabled={busy || !selectedChildren.length}
												><Select.Trigger {...props} class="w-full"
													>{selectedDestination?.path ?? 'Top-level category'}</Select.Trigger
												><Select.Content
													><Select.Item value={topLevelValue}>Top-level category</Select.Item
													>{#each destinationOptions as destination (destination.id)}<Select.Item
															value={destination.id}
															label={destination.path}>{destination.path}</Select.Item
														>{/each}</Select.Content
												></Select.Root
											><input
												type="hidden"
												name="parentId"
												value={$moveChildrenData.parentId}
											/>{/snippet}</Form.Control
									>
									<Form.FieldErrors />
								</Form.Field>
								<Form.Field form={moveChildrenForm} name="reason"
									><Form.Control
										>{#snippet children({ props })}<Form.Label
												>Reason for moving the selected children</Form.Label
											><Textarea
												{...props}
												bind:value={$moveChildrenData.reason}
											/>{/snippet}</Form.Control
									><Form.FieldErrors /></Form.Field
								>
								<Button type="submit" disabled={busy || !selectedChildren.length}
									>Move selected children</Button
								>
							</form>
						</Card.Content>
					</Card.Root>
				{:else}
					<Card.Root>
						<Card.Header
							><Card.Title>Apply terminal merge</Card.Title><Card.Description
								>The preview is ready. Applying it moves the listed catalogue items, archives the
								source, and permanently links it to the target.</Card.Description
							></Card.Header
						>
						<Card.Content>
							<form method="POST" action="?/mergeApply" use:mergeApplyEnhance class="space-y-5">
								<input
									type="hidden"
									name="targetCategoryId"
									value={$mergeApplyData.targetCategoryId}
								/>
								<input
									type="hidden"
									name="previewFingerprint"
									value={$mergeApplyData.previewFingerprint}
								/>
								<Form.Field form={mergeApplyForm} name="reason"
									><Form.Control
										>{#snippet children({ props })}<Form.Label
												>Reason for merging this category</Form.Label
											><Textarea
												{...props}
												bind:value={$mergeApplyData.reason}
											/>{/snippet}</Form.Control
									><Form.FieldErrors /></Form.Field
								>
								<Form.Field form={mergeApplyForm} name="terminalConfirmed"
									><Form.Control
										>{#snippet children({ props })}<div
												class="flex items-start gap-3 rounded-xl border border-destructive/50 p-4"
											>
												<Checkbox
													{...props}
													bind:checked={$mergeApplyData.terminalConfirmed}
												/><Form.Label class="leading-5"
													>I understand that this merge is terminal and the source category cannot
													be restored.</Form.Label
												>
											</div>{/snippet}</Form.Control
									><Form.FieldErrors /></Form.Field
								>
								<Button
									type="submit"
									variant="destructive"
									disabled={busy || !$mergeApplyData.terminalConfirmed}
									>Merge category permanently</Button
								>
							</form>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
