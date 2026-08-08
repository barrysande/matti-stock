<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BaseUnitHistory from '$lib/components/base-unit-history.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
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
	import { administerBaseUnitSchema, baseUnitDetailsSchema } from '$lib/schemas/base-unit';
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	const isArchived = $derived(Boolean(data.unit.archivedAt));
	const isUsed = $derived(Boolean(data.unit.firstUsedAt));
	let detailsDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const detailsForm = superForm(data.detailsForm, {
		id: 'base-unit-details',
		validators: valibotClient(baseUnitDetailsSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				detailsDialogOpen = false;
			}
		}
	});
	const { form: detailsData, enhance: detailsEnhance, submitting: detailsSubmitting } = detailsForm;

	// svelte-ignore state_referenced_locally
	const archiveForm = superForm(data.archiveForm, {
		id: 'base-unit-archive',
		validators: valibotClient(administerBaseUnitSchema),
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
		id: 'base-unit-restore',
		validators: valibotClient(administerBaseUnitSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				restoreDialogOpen = false;
			}
		}
	});
	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;

	function kindLabel(value: string) {
		return value === 'COUNTABLE' ? 'Countable' : 'Measured';
	}

	function precisionLabel(value: number | string) {
		const precision = Number(value);
		return precision === 0
			? 'Whole quantities only'
			: `${precision} decimal ${precision === 1 ? 'place' : 'places'}`;
	}

	function selectKind(value: string) {
		if (value !== 'COUNTABLE' && value !== 'MEASURED') return;
		$detailsData.kind = value;
		$detailsData.precision = value === 'COUNTABLE' ? '0' : '3';
	}
</script>

<svelte:head><title>{data.unit.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Base unit"
		title={data.unit.name}
		description={`${data.unit.symbol} · ${kindLabel(data.unit.kind)} · ${precisionLabel(data.unit.precision)}`}
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/base-units')}
				><IconArrowLeft />Back to base units</Button
			>
			{#if data.account?.canManageCatalogue}
				{#if !isArchived}
					<Button type="button" variant="outline" onclick={() => (detailsDialogOpen = true)}
						>Edit details</Button
					>
					<Button type="button" variant="destructive" onclick={() => (archiveDialogOpen = true)}
						>Archive</Button
					>
				{:else}
					<Button type="button" onclick={() => (restoreDialogOpen = true)}>Restore</Button>
				{/if}
			{/if}
		{/snippet}
	</PageHeader>

	{#if isUsed}
		<Alert.Root>
			<Alert.Title>Quantity meaning is locked by catalogue use.</Alert.Title>
			<Alert.Description
				>This unit has been assigned to a catalogue item. Its name or symbol may be corrected, but
				changing between countable and measured—or changing decimal precision—requires a controlled
				conversion workflow.</Alert.Description
			>
		</Alert.Root>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root
			><Card.Header><Card.Description>Status</Card.Description></Card.Header><Card.Content
				><StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} /></Card.Content
			></Card.Root
		>
		<Card.Root
			><Card.Header><Card.Description>Quantity kind</Card.Description></Card.Header><Card.Content
				>{kindLabel(data.unit.kind)}</Card.Content
			></Card.Root
		>
		<Card.Root
			><Card.Header><Card.Description>Allowed precision</Card.Description></Card.Header
			><Card.Content>{precisionLabel(data.unit.precision)}</Card.Content></Card.Root
		>
		<Card.Root
			><Card.Header><Card.Description>First catalogue use</Card.Description></Card.Header
			><Card.Content
				><DateTime value={data.unit.firstUsedAt} fallback="Not yet used" /></Card.Content
			></Card.Root
		>
	</div>

	<Card.Root>
		<Card.Header
			><Card.Title>How quantities are recorded</Card.Title><Card.Description
				>The unit definition applies to every catalogue item that selects it.</Card.Description
			></Card.Header
		>
		<Card.Content class="space-y-2 text-sm leading-6">
			{#if data.unit.kind === 'COUNTABLE'}
				<p>
					Record whole quantities using <strong>{data.unit.symbol}</strong>. Fractions such as 2.5 {data
						.unit.symbol} are rejected.
				</p>
			{:else}
				<p>
					Record measured quantities using <strong>{data.unit.symbol}</strong>, with up to {data
						.unit.precision} decimal {data.unit.precision === 1 ? 'place' : 'places'}.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<BaseUnitHistory versions={data.history.data} />
	<PaginationControls
		currentPage={data.history.metadata.currentPage}
		lastPage={data.history.metadata.lastPage}
		url={page.url}
	/>

	<Dialog.Root bind:open={detailsDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$detailsSubmitting}
		>
			<form method="POST" action="?/details" use:detailsEnhance class="contents">
				<Dialog.Header
					><Dialog.Title>Edit base-unit details</Dialog.Title><Dialog.Description
						>The previous definition remains in effective history.</Dialog.Description
					></Dialog.Header
				>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<div class="grid gap-4 sm:grid-cols-2">
						<Form.Field form={detailsForm} name="name"
							><Form.Control
								>{#snippet children({ props })}<Form.Label>Unit name</Form.Label><Input
										{...props}
										bind:value={$detailsData.name}
										aria-required="true"
									/>{/snippet}</Form.Control
							><Form.FieldErrors /></Form.Field
						>
						<Form.Field form={detailsForm} name="symbol"
							><Form.Control
								>{#snippet children({ props })}<Form.Label>Symbol</Form.Label><Input
										{...props}
										bind:value={$detailsData.symbol}
										aria-required="true"
									/>{/snippet}</Form.Control
							><Form.FieldErrors /></Form.Field
						>
					</div>

					{#if isUsed}
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<p class="text-sm font-medium">Quantity kind</p>
								<p class="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
									{kindLabel($detailsData.kind)}
								</p>
							</div>
							<div>
								<p class="text-sm font-medium">Decimal places</p>
								<p class="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
									{precisionLabel($detailsData.precision)}
								</p>
							</div>
						</div>
						<input type="hidden" name="kind" value={$detailsData.kind} />
						<input type="hidden" name="precision" value={$detailsData.precision} />
					{:else}
						<div class="grid gap-4 sm:grid-cols-2">
							<Form.Field form={detailsForm} name="kind"
								><Form.Control
									>{#snippet children({ props })}<Form.Label>Quantity kind</Form.Label><Select.Root
											type="single"
											bind:value={() => $detailsData.kind, selectKind}
											disabled={$detailsSubmitting}
											><Select.Trigger {...props} class="w-full cursor-pointer"
												>{kindLabel($detailsData.kind)}</Select.Trigger
											><Select.Content
												><Select.Item value="COUNTABLE">Countable</Select.Item><Select.Item
													value="MEASURED">Measured</Select.Item
												></Select.Content
											></Select.Root
										><input
											type="hidden"
											name="kind"
											value={$detailsData.kind}
										/>{/snippet}</Form.Control
								><Form.FieldErrors /></Form.Field
							>
							<Form.Field form={detailsForm} name="precision"
								><Form.Control
									>{#snippet children({ props })}<Form.Label>Decimal places</Form.Label
										>{#if $detailsData.kind === 'COUNTABLE'}<Input
												{...props}
												value="0 — whole quantities only"
												disabled
											/>{:else}<Select.Root
												type="single"
												bind:value={$detailsData.precision}
												disabled={$detailsSubmitting}
												><Select.Trigger {...props} class="w-full cursor-pointer"
													>{precisionLabel($detailsData.precision)}</Select.Trigger
												><Select.Content
													>{#each ['1', '2', '3'] as precision (precision)}<Select.Item
															value={precision}>{precisionLabel(precision)}</Select.Item
														>{/each}</Select.Content
												></Select.Root
											>{/if}<input
											type="hidden"
											name="precision"
											value={$detailsData.precision}
										/>{/snippet}</Form.Control
								><Form.FieldErrors /></Form.Field
							>
						</div>
					{/if}

					<Form.Field form={detailsForm} name="reason"
						><Form.Control
							>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
									{...props}
									bind:value={$detailsData.reason}
									aria-required="true"
								/>{/snippet}</Form.Control
						><Form.FieldErrors /></Form.Field
					>
				</div>
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$detailsSubmitting}
						onclick={() => (detailsDialogOpen = false)}>Cancel</Button
					><Button type="submit" disabled={$detailsSubmitting}>Save details</Button></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={archiveDialogOpen}>
		<Dialog.Content showCloseButton={!$archiveSubmitting}>
			<form method="POST" action="?/archive" use:archiveEnhance class="space-y-4">
				<Dialog.Header
					><Dialog.Title>Archive {data.unit.name}</Dialog.Title><Dialog.Description
						>Existing catalogue history retains this unit, but it will be excluded from new
						selections.</Dialog.Description
					></Dialog.Header
				>
				<Form.Field form={archiveForm} name="reason"
					><Form.Control
						>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
								{...props}
								bind:value={$archiveData.reason}
								aria-required="true"
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
						>Archive base unit</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={restoreDialogOpen}>
		<Dialog.Content showCloseButton={!$restoreSubmitting}>
			<form method="POST" action="?/restore" use:restoreEnhance class="space-y-4">
				<Dialog.Header
					><Dialog.Title>Restore {data.unit.name}</Dialog.Title><Dialog.Description
						>The API will recheck that its active name and symbol remain available.</Dialog.Description
					></Dialog.Header
				>
				<Form.Field form={restoreForm} name="reason"
					><Form.Control
						>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
								{...props}
								bind:value={$restoreData.reason}
								aria-required="true"
							/>{/snippet}</Form.Control
					><Form.FieldErrors /></Form.Field
				>
				<Dialog.Footer
					><Button
						type="button"
						variant="outline"
						disabled={$restoreSubmitting}
						onclick={() => (restoreDialogOpen = false)}>Cancel</Button
					><Button type="submit" disabled={$restoreSubmitting}>Restore base unit</Button
					></Dialog.Footer
				>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
