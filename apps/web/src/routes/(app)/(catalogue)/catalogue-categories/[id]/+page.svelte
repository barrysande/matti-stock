<script lang="ts">
	import { resolve } from '$app/paths';
	import CatalogueCategoryHistory from '$lib/components/catalogue-category-history.svelte';
	import DateTime from '$lib/components/date-time.svelte';
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
	import {
		administerCatalogueCategorySchema,
		reparentCatalogueCategorySchema,
		updateCatalogueCategoryDetailsSchema
	} from '$lib/schemas/catalogue-category';
	import { IconArrowLeft, IconArrowRight } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	const topLevelValue = 'TOP_LEVEL';
	let { data } = $props();

	const isArchived = $derived(Boolean(data.category.archivedAt));
	const isMerged = $derived(Boolean(data.category.mergedIntoCategoryId));
	const canMove = $derived(Boolean(data.category.parentId) || data.parentOptions.length > 0);
	const archiveBlocked = $derived(data.activeChildren.length > 0 || data.mergedSources.length > 0);
	const restoreBlocked = $derived(Boolean(data.parent?.archivedAt));

	let detailsDialogOpen = $state(false);
	let reparentDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const detailsForm = superForm(data.detailsForm, {
		id: 'catalogue-category-details',
		validators: valibotClient(updateCatalogueCategoryDetailsSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') detailsDialogOpen = false;
		}
	});
	const { form: detailsData, enhance: detailsEnhance, submitting: detailsSubmitting } = detailsForm;

	// svelte-ignore state_referenced_locally
	const reparentForm = superForm(data.reparentForm, {
		id: 'catalogue-category-reparent',
		validators: valibotClient(reparentCatalogueCategorySchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') reparentDialogOpen = false;
		}
	});
	const {
		form: reparentData,
		enhance: reparentEnhance,
		submitting: reparentSubmitting
	} = reparentForm;

	// svelte-ignore state_referenced_locally
	const archiveForm = superForm(data.archiveForm, {
		id: 'catalogue-category-archive',
		validators: valibotClient(administerCatalogueCategorySchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') archiveDialogOpen = false;
		}
	});
	const { form: archiveData, enhance: archiveEnhance, submitting: archiveSubmitting } = archiveForm;

	// svelte-ignore state_referenced_locally
	const restoreForm = superForm(data.restoreForm, {
		id: 'catalogue-category-restore',
		validators: valibotClient(administerCatalogueCategorySchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') restoreDialogOpen = false;
		}
	});
	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;

	const selectedParent = $derived(
		data.parentOptions.find((category) => category.id === $reparentData.parentId)
	);

	function selectParent(value: string) {
		$reparentData.parentId = value === topLevelValue ? '' : value;
	}
</script>

<svelte:head><title>{data.category.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Catalogue category"
		title={data.category.name}
		description={data.category.path}
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/catalogue-categories')}>
				<IconArrowLeft />Back to categories
			</Button>
			{#if data.account?.canManageCatalogue && !isMerged}
				{#if !isArchived}
					<Button type="button" variant="outline" onclick={() => (detailsDialogOpen = true)}
						>Edit details</Button
					>
					<Button
						type="button"
						variant="outline"
						disabled={!canMove}
						title={!canMove
							? 'No valid alternative parent or top-level placement is available.'
							: undefined}
						onclick={() => (reparentDialogOpen = true)}>Move</Button
					>
					<Button
						type="button"
						variant="destructive"
						disabled={archiveBlocked}
						title={archiveBlocked
							? 'Resolve the category blockers shown below before archiving.'
							: undefined}
						onclick={() => (archiveDialogOpen = true)}>Archive</Button
					>
				{:else}
					<Button
						type="button"
						disabled={restoreBlocked}
						title={restoreBlocked ? 'Restore the parent category first.' : undefined}
						onclick={() => (restoreDialogOpen = true)}>Restore</Button
					>
				{/if}
			{/if}
		{/snippet}
	</PageHeader>

	{#if isMerged}
		<Alert.Root>
			<Alert.Title>This category was merged and is now a terminal historical record.</Alert.Title>
			<Alert.Description>
				Its former items now use
				{#if data.directMergeTarget}
					<a
						class="font-medium underline"
						href={resolve(`/catalogue-categories/${data.directMergeTarget.id}`)}
						>{data.directMergeTarget.path}</a
					>
				{:else}
					the recorded direct target
				{/if}. It cannot be edited, moved, archived again, or restored.
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if data.account?.canManageCatalogue && archiveBlocked && !isArchived}
		<Alert.Root variant="destructive">
			<Alert.Title>This category cannot currently be archived.</Alert.Title>
			<Alert.Description>
				{#if data.activeChildren.length}
					Move, merge, or archive its active {data.activeChildren.length === 1
						? 'child'
						: 'children'} first:
					{data.activeChildren.map((child) => child.path).join(', ')}.
				{/if}
				{#if data.mergedSources.length}
					It is the replacement for {data.mergedSources.length} merged {data.mergedSources
						.length === 1
						? 'category'
						: 'categories'} and must itself be merged instead of ordinarily archived.
				{/if}
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if data.account?.canManageCatalogue && restoreBlocked && isArchived && !isMerged}
		<Alert.Root variant="destructive">
			<Alert.Title>Restore the parent category first.</Alert.Title>
			<Alert.Description
				>{data.parent?.path ?? 'The recorded parent'} is archived, so this category cannot yet return
				to active use.</Alert.Description
			>
		</Alert.Root>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content
				><StatusBadge
					status={isMerged ? 'MERGED' : isArchived ? 'ARCHIVED' : 'ACTIVE'}
				/></Card.Content
			>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Parent</Card.Description></Card.Header>
			<Card.Content>{data.parent?.path ?? 'Top-level category'}</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Created</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.category.createdAt} /></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Last updated</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.category.updatedAt} /></Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>What belongs in this category</Card.Title>
			<Card.Description
				>The shared description may include examples and recognition guidance.</Card.Description
			>
		</Card.Header>
		<Card.Content
			><p class="leading-7 whitespace-pre-wrap">{data.category.description}</p></Card.Content
		>
	</Card.Root>

	{#if isMerged && data.canonicalMergeTarget && data.canonicalMergeTarget.id !== data.directMergeTarget?.id}
		<Card.Root>
			<Card.Header>
				<Card.Title>Current canonical category</Card.Title>
				<Card.Description>The direct target was merged again later.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button
					variant="outline"
					href={resolve(`/catalogue-categories/${data.canonicalMergeTarget.id}`)}
				>
					{data.canonicalMergeTarget.path}<IconArrowRight />
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<CatalogueCategoryHistory versions={data.category.versions} />

	<Dialog.Root bind:open={detailsDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$detailsSubmitting}
		>
			<form method="POST" action="?/details" use:detailsEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Edit category details</Dialog.Title>
					<Dialog.Description
						>The previous definition remains in effective history.</Dialog.Description
					>
				</Dialog.Header>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<Form.Field form={detailsForm} name="name">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Category name</Form.Label><Input
									{...props}
									bind:value={$detailsData.name}
									aria-required="true"
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
									aria-required="true"
								/>{/snippet}</Form.Control
						>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={detailsForm} name="reason">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
									{...props}
									bind:value={$detailsData.reason}
									aria-required="true"
								/>{/snippet}</Form.Control
						>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$detailsSubmitting}
						onclick={() => (detailsDialogOpen = false)}>Cancel</Button
					>
					<Button type="submit" disabled={$detailsSubmitting}>Save details</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={reparentDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$reparentSubmitting}
		>
			<form method="POST" action="?/reparent" use:reparentEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Move {data.category.name}</Dialog.Title>
					<Dialog.Description
						>Choose a different eligible active parent or move this category to the top level.</Dialog.Description
					>
				</Dialog.Header>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<Form.Field form={reparentForm} name="parentId">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>New parent category</Form.Label>
								<Select.Root
									type="single"
									bind:value={() => $reparentData.parentId || topLevelValue, selectParent}
									disabled={$reparentSubmitting}
								>
									<Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true"
										>{selectedParent?.path ?? 'Top-level category'}</Select.Trigger
									>
									<Select.Content>
										{#if data.category.parentId}<Select.Item
												value={topLevelValue}
												class="cursor-pointer">Top-level category</Select.Item
											>{/if}
										{#each data.parentOptions as category (category.id)}<Select.Item
												value={category.id}
												label={category.path}
												class="cursor-pointer">{category.path}</Select.Item
											>{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="parentId" value={$reparentData.parentId} />
							{/snippet}
						</Form.Control>
						<Form.Description
							>Current placement, descendants, archived categories, and parents that would exceed
							three levels are excluded.</Form.Description
						>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={reparentForm} name="reason">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
									{...props}
									bind:value={$reparentData.reason}
									aria-required="true"
								/>{/snippet}</Form.Control
						>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$reparentSubmitting}
						onclick={() => (reparentDialogOpen = false)}>Cancel</Button
					>
					<Button type="submit" disabled={$reparentSubmitting}>Move category</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={archiveDialogOpen}>
		<Dialog.Content showCloseButton={!$archiveSubmitting}>
			<form method="POST" action="?/archive" use:archiveEnhance class="space-y-4">
				<Dialog.Header
					><Dialog.Title>Archive {data.category.name}</Dialog.Title><Dialog.Description
						>Archived categories remain in history but cannot be selected for new catalogue items.</Dialog.Description
					></Dialog.Header
				>
				<Form.Field form={archiveForm} name="reason">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
								{...props}
								bind:value={$archiveData.reason}
								aria-required="true"
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$archiveSubmitting}
						onclick={() => (archiveDialogOpen = false)}>Cancel</Button
					><Button type="submit" variant="destructive" disabled={$archiveSubmitting}
						>Archive category</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={restoreDialogOpen}>
		<Dialog.Content showCloseButton={!$restoreSubmitting}>
			<form method="POST" action="?/restore" use:restoreEnhance class="space-y-4">
				<Dialog.Header
					><Dialog.Title>Restore {data.category.name}</Dialog.Title><Dialog.Description
						>The API will recheck its parent and active sibling name before restoring it.</Dialog.Description
					></Dialog.Header
				>
				<Form.Field form={restoreForm} name="reason">
					<Form.Control
						>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
								{...props}
								bind:value={$restoreData.reason}
								aria-required="true"
							/>{/snippet}</Form.Control
					>
					<Form.FieldErrors />
				</Form.Field>
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$restoreSubmitting}
						onclick={() => (restoreDialogOpen = false)}>Cancel</Button
					><Button type="submit" disabled={$restoreSubmitting}>Restore category</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
