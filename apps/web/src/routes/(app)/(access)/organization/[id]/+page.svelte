<script lang="ts">
	import { resolve } from '$app/paths';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import OrganizationalAccessImpact from '$lib/components/organizational-access-impact.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		administerOrganizationalUnitFormSchema,
		renameOrganizationalUnitSchema,
		reparentOrganizationalUnitFormSchema,
		type OrganizationalAccessImpact as AccessImpact
	} from '$lib/schemas/organization-unit';
	import { IconArrowLeft, IconShieldCheck } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	const versions = $derived(data.unit.versions ?? []);
	const isInstitute = $derived(data.unit.unitType === 'INSTITUTE');
	const isArchived = $derived(Boolean(data.unit.archivedAt));
	const reparentOptions = $derived(
		data.units.filter((unit) => unit.unitType === 'DEPARTMENT' && unit.id !== data.unit.parentId)
	);

	let renameDialogOpen = $state(false);
	let reparentDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);
	let reparentImpact = $state<AccessImpact | null>(null);
	let archiveImpact = $state<AccessImpact | null>(null);
	let restoreImpact = $state<AccessImpact | null>(null);
	let reviewedParentId = $state<string | null>(null);
	let reparentConfirmationVisible = $state(false);
	let archiveConfirmationVisible = $state(false);
	let restoreConfirmationVisible = $state(false);

	// svelte-ignore state_referenced_locally
	const renameForm = superForm(data.renameForm, {
		id: 'organizational-unit-rename',
		validators: valibotClient(renameOrganizationalUnitSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				renameDialogOpen = false;
			}
		}
	});

	const { form: renameData, enhance: renameEnhance, submitting: renameSubmitting } = renameForm;

	// svelte-ignore state_referenced_locally
	const reparentForm = superForm(data.reparentForm, {
		id: 'organizational-unit-reparent',
		validators: valibotClient(reparentOrganizationalUnitFormSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				reparentDialogOpen = false;
				return;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				impact?: AccessImpact;
				reviewedParentId?: string;
				previewInvalidated?: boolean;
			};

			if (actionData.previewInvalidated) {
				invalidateReparentPreview();
			} else if (actionData.impact && actionData.reviewedParentId) {
				reparentImpact = actionData.impact;
				reviewedParentId = actionData.reviewedParentId;
				reparentConfirmationVisible = true;
				reparentDialogOpen = true;
			}
		}
	});

	const {
		form: reparentData,
		enhance: reparentEnhance,
		submitting: reparentSubmitting
	} = reparentForm;

	// svelte-ignore state_referenced_locally
	const archiveForm = superForm(data.archiveForm, {
		id: 'organizational-unit-archive',
		validators: valibotClient(administerOrganizationalUnitFormSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				archiveDialogOpen = false;
				return;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				impact?: AccessImpact;
				previewInvalidated?: boolean;
			};

			if (actionData.previewInvalidated) {
				invalidateArchivePreview();
			} else if (actionData.impact) {
				archiveImpact = actionData.impact;
				archiveConfirmationVisible = true;
				archiveDialogOpen = true;
			}
		}
	});

	const { form: archiveData, enhance: archiveEnhance, submitting: archiveSubmitting } = archiveForm;

	// svelte-ignore state_referenced_locally
	const restoreForm = superForm(data.restoreForm, {
		id: 'organizational-unit-restore',
		validators: valibotClient(administerOrganizationalUnitFormSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				restoreDialogOpen = false;
				return;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				impact?: AccessImpact;
				previewInvalidated?: boolean;
			};

			if (actionData.previewInvalidated) {
				invalidateRestorePreview();
			} else if (actionData.impact) {
				restoreImpact = actionData.impact;
				restoreConfirmationVisible = true;
				restoreDialogOpen = true;
			}
		}
	});

	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;

	const selectedReparent = $derived(
		reparentOptions.find((unit) => unit.id === $reparentData.parentId)
	);
	const reparentPreviewIsCurrent = $derived(
		reparentImpact !== null &&
			reparentImpact.fingerprint === $reparentData.impactFingerprint &&
			reviewedParentId === $reparentData.parentId
	);
	const archivePreviewIsCurrent = $derived(
		archiveImpact !== null && archiveImpact.fingerprint === $archiveData.impactFingerprint
	);
	const restorePreviewIsCurrent = $derived(
		restoreImpact !== null && restoreImpact.fingerprint === $restoreData.impactFingerprint
	);
	const reparentSubmittedFingerprint = $derived(
		reparentPreviewIsCurrent ? $reparentData.impactFingerprint : ''
	);
	const archiveSubmittedFingerprint = $derived(
		archivePreviewIsCurrent ? $archiveData.impactFingerprint : ''
	);
	const restoreSubmittedFingerprint = $derived(
		restorePreviewIsCurrent ? $restoreData.impactFingerprint : ''
	);

	function unitTypeLabel(value: string) {
		if (value === 'SUB_DEPARTMENT') return 'Sub-department';

		return value.toLowerCase().replace(/^./, (character) => character.toUpperCase());
	}

	function impactDescription(impact: AccessImpact | null) {
		if (!impact) return 'The reviewed access impact is no longer current.';

		return `${impact.assignments.length} active or upcoming role ${
			impact.assignments.length === 1 ? 'assignment changes' : 'assignments change'
		} effective organizational access.`;
	}

	function invalidateReparentPreview() {
		reparentImpact = null;
		reviewedParentId = null;
		reparentConfirmationVisible = false;
		$reparentData.impactFingerprint = '';
	}

	function selectReparentParent(parentId: string) {
		if ($reparentData.parentId === parentId) return;

		invalidateReparentPreview();
		$reparentData.parentId = parentId;
	}

	function invalidateArchivePreview() {
		archiveImpact = null;
		archiveConfirmationVisible = false;
		$archiveData.impactFingerprint = '';
	}

	function invalidateRestorePreview() {
		restoreImpact = null;
		restoreConfirmationVisible = false;
		$restoreData.impactFingerprint = '';
	}
</script>

<svelte:head><title>{data.unit.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader eyebrow="Organizational unit" title={data.unit.name} description={data.unit.path}>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/organization')}>
				<IconArrowLeft />Back to organization
			</Button>
			<Button type="button" variant="outline" onclick={() => (renameDialogOpen = true)}>
				Rename
			</Button>
			{#if data.unit.unitType === 'SUB_DEPARTMENT' && !isArchived}
				<Button
					type="button"
					variant="outline"
					disabled={reparentOptions.length === 0}
					title={reparentOptions.length === 0
						? 'No other active department is available.'
						: undefined}
					onclick={() => (reparentDialogOpen = true)}
				>
					Move
				</Button>
			{/if}
			{#if !isInstitute && !isArchived}
				<Button type="button" variant="destructive" onclick={() => (archiveDialogOpen = true)}>
					Archive
				</Button>
			{:else if !isInstitute && isArchived}
				<Button type="button" onclick={() => (restoreDialogOpen = true)}>Restore</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Type</Card.Description></Card.Header>
			<Card.Content>{unitTypeLabel(data.unit.unitType)}</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content>
				<StatusBadge status={data.unit.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Created</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.unit.createdAt} /></Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Last updated</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.unit.updatedAt} /></Card.Content>
		</Card.Root>
	</div>

	<section class="space-y-3">
		<div>
			<h2 class="font-heading text-xl font-semibold">Structural history</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Effective-dated names, parents, and lifecycle changes for this unit.
			</p>
		</div>
		{#if versions.length}
			<ol class="relative ms-3 space-y-5 border-s">
				{#each versions as version (version.id)}
					<li class="ms-6">
						<span
							class="-inset-start-2 absolute mt-1.5 size-4 rounded-full border-4 border-background bg-primary"
							aria-hidden="true"
						></span>
						<Card.Root>
							<Card.Header>
								<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<Card.Title class="text-base"
											>Version {version.version}: {version.name}</Card.Title
										>
										<Card.Description>
											{unitTypeLabel(version.unitType)} · {version.parent?.name ?? 'No parent'}
										</Card.Description>
									</div>
									<StatusBadge status={version.archivedAt ? 'ARCHIVED' : 'ACTIVE'} />
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<dl class="grid gap-3 text-sm sm:grid-cols-2">
									<div class="sm:col-span-2">
										<dt class="text-muted-foreground">Reason</dt>
										<dd>{version.reason}</dd>
									</div>
									<div>
										<dt class="text-muted-foreground">Effective from</dt>
										<dd><DateTime value={version.effectiveFrom} /></dd>
									</div>
									<div>
										<dt class="text-muted-foreground">Effective to</dt>
										<dd><DateTime value={version.effectiveTo} fallback="Current" /></dd>
									</div>
									<div class="sm:col-span-2">
										<dt class="text-muted-foreground">Changed by</dt>
										<dd>{version.changedBy?.displayName ?? 'System'}</dd>
									</div>
								</dl>
							</Card.Content>
						</Card.Root>
					</li>
				{/each}
			</ol>
		{:else}
			<EmptyState
				title="No structural history"
				description="No structural versions are recorded for this organizational unit."
			/>
		{/if}
	</section>

	<Dialog.Root bind:open={renameDialogOpen}>
		<Dialog.Content showCloseButton={!$renameSubmitting}>
			<form method="POST" action="?/rename" use:renameEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Rename {data.unit.name}</Dialog.Title>
					<Dialog.Description>
						The previous name remains available in structural history.
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4">
					<Form.Field form={renameForm} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Unit name</Form.Label>
								<Input {...props} bind:value={$renameData.name} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>
							{#if isInstitute}
								The institute is the sole organizational root and may include “Institute” in its
								name.
							{:else}
								Enter the name only, without “Department” or “Sub-department.”
							{/if}
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={renameForm} name="reason">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Administrative reason</Form.Label>
								<Textarea {...props} bind:value={$renameData.reason} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$renameSubmitting}
						onclick={() => (renameDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" formaction="?/rename" disabled={$renameSubmitting}>
						Rename unit
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={reparentDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-3xl"
			showCloseButton={!$reparentSubmitting}
		>
			<form method="POST" action="?/previewReparent" use:reparentEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>
						{reparentConfirmationVisible && reparentPreviewIsCurrent
							? 'Review access impact'
							: `Move ${data.unit.name}`}
					</Dialog.Title>
					<Dialog.Description>
						{#if reparentConfirmationVisible && reparentPreviewIsCurrent}
							{impactDescription(reparentImpact)}
						{:else}
							Select a different active department and record why this structure is changing.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 overflow-y-auto pe-1">
					{#if reparentConfirmationVisible && reparentImpact && reparentPreviewIsCurrent}
						<OrganizationalAccessImpact impact={reparentImpact} />
					{:else}
						<div class="space-y-4">
							<Form.Field form={reparentForm} name="parentId">
								<Form.Control>
									{#snippet children({ props })}
										<Form.Label>New parent department</Form.Label>
										<Select.Root
											type="single"
											name="parentId"
											bind:value={() => $reparentData.parentId, selectReparentParent}
											disabled={$reparentSubmitting}
										>
											<Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true">
												{selectedReparent?.path ?? 'Select an active department'}
											</Select.Trigger>
											<Select.Content>
												{#each reparentOptions as unit (unit.id)}
													<Select.Item value={unit.id} label={unit.path} class="cursor-pointer">
														{unit.path}
													</Select.Item>
												{/each}
											</Select.Content>
										</Select.Root>
									{/snippet}
								</Form.Control>
								<Form.FieldErrors />
							</Form.Field>
							<Form.Field form={reparentForm} name="reason">
								<Form.Control>
									{#snippet children({ props })}
										<Form.Label>Administrative reason</Form.Label>
										<Textarea {...props} bind:value={$reparentData.reason} aria-required="true" />
									{/snippet}
								</Form.Control>
								<Form.FieldErrors />
							</Form.Field>
						</div>
					{/if}
				</div>
				{#if reparentConfirmationVisible && reparentPreviewIsCurrent}
					<input type="hidden" name="parentId" value={$reparentData.parentId} />
					<input type="hidden" name="reason" value={$reparentData.reason} />
				{/if}
				<input type="hidden" name="impactFingerprint" value={reparentSubmittedFingerprint} />
				<Dialog.Footer>
					{#if reparentConfirmationVisible && reparentPreviewIsCurrent}
						<Button
							type="button"
							variant="outline"
							disabled={$reparentSubmitting}
							onclick={() => (reparentConfirmationVisible = false)}
						>
							Change details
						</Button>
						<Button type="submit" formaction="?/reparent" disabled={$reparentSubmitting}>
							Move sub-department
						</Button>
					{:else}
						<Button
							type="button"
							variant="outline"
							disabled={$reparentSubmitting}
							onclick={() => (reparentDialogOpen = false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							formaction="?/previewReparent"
							disabled={$reparentSubmitting || !$reparentData.parentId}
						>
							<IconShieldCheck />{reparentPreviewIsCurrent ? 'Refresh' : 'Review'} access impact
						</Button>
					{/if}
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={archiveDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-3xl"
			showCloseButton={!$archiveSubmitting}
		>
			<form method="POST" action="?/previewArchive" use:archiveEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>
						{archiveConfirmationVisible && archivePreviewIsCurrent
							? 'Review access impact'
							: `Archive ${data.unit.name}`}
					</Dialog.Title>
					<Dialog.Description>
						{#if archiveConfirmationVisible && archivePreviewIsCurrent}
							{impactDescription(archiveImpact)}
						{:else}
							Archive this unit without deleting its structural or access history.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 overflow-y-auto pe-1">
					{#if archiveConfirmationVisible && archiveImpact && archivePreviewIsCurrent}
						<OrganizationalAccessImpact impact={archiveImpact} />
					{:else}
						<Form.Field form={archiveForm} name="reason">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label>Administrative reason</Form.Label>
									<Textarea {...props} bind:value={$archiveData.reason} aria-required="true" />
								{/snippet}
							</Form.Control>
							<Form.Description>
								Active child units must be moved or archived first.
							</Form.Description>
							<Form.FieldErrors />
						</Form.Field>
					{/if}
				</div>
				{#if archiveConfirmationVisible && archivePreviewIsCurrent}
					<input type="hidden" name="reason" value={$archiveData.reason} />
				{/if}
				<input type="hidden" name="impactFingerprint" value={archiveSubmittedFingerprint} />
				<Dialog.Footer>
					{#if archiveConfirmationVisible && archivePreviewIsCurrent}
						<Button
							type="button"
							variant="outline"
							disabled={$archiveSubmitting}
							onclick={() => (archiveConfirmationVisible = false)}
						>
							Change reason
						</Button>
						<Button
							type="submit"
							variant="destructive"
							formaction="?/archive"
							disabled={$archiveSubmitting}
						>
							Archive unit
						</Button>
					{:else}
						<Button
							type="button"
							variant="outline"
							disabled={$archiveSubmitting}
							onclick={() => (archiveDialogOpen = false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							formaction="?/previewArchive"
							disabled={$archiveSubmitting}
						>
							<IconShieldCheck />{archivePreviewIsCurrent ? 'Refresh' : 'Review'} access impact
						</Button>
					{/if}
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={restoreDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-3xl"
			showCloseButton={!$restoreSubmitting}
		>
			<form method="POST" action="?/previewRestore" use:restoreEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>
						{restoreConfirmationVisible && restorePreviewIsCurrent
							? 'Review access impact'
							: `Restore ${data.unit.name}`}
					</Dialog.Title>
					<Dialog.Description>
						{#if restoreConfirmationVisible && restorePreviewIsCurrent}
							{impactDescription(restoreImpact)}
						{:else}
							Return this unit to active organizational use under its recorded parent.
						{/if}
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 overflow-y-auto pe-1">
					{#if restoreConfirmationVisible && restoreImpact && restorePreviewIsCurrent}
						<OrganizationalAccessImpact impact={restoreImpact} />
					{:else}
						<Form.Field form={restoreForm} name="reason">
							<Form.Control>
								{#snippet children({ props })}
									<Form.Label>Administrative reason</Form.Label>
									<Textarea {...props} bind:value={$restoreData.reason} aria-required="true" />
								{/snippet}
							</Form.Control>
							<Form.Description>
								The unit's recorded parent must already be active.
							</Form.Description>
							<Form.FieldErrors />
						</Form.Field>
					{/if}
				</div>
				{#if restoreConfirmationVisible && restorePreviewIsCurrent}
					<input type="hidden" name="reason" value={$restoreData.reason} />
				{/if}
				<input type="hidden" name="impactFingerprint" value={restoreSubmittedFingerprint} />
				<Dialog.Footer>
					{#if restoreConfirmationVisible && restorePreviewIsCurrent}
						<Button
							type="button"
							variant="outline"
							disabled={$restoreSubmitting}
							onclick={() => (restoreConfirmationVisible = false)}
						>
							Change reason
						</Button>
						<Button type="submit" formaction="?/restore" disabled={$restoreSubmitting}>
							Restore unit
						</Button>
					{:else}
						<Button
							type="button"
							variant="outline"
							disabled={$restoreSubmitting}
							onclick={() => (restoreDialogOpen = false)}
						>
							Cancel
						</Button>
						<Button type="submit" formaction="?/previewRestore" disabled={$restoreSubmitting}>
							<IconShieldCheck />{restorePreviewIsCurrent ? 'Refresh' : 'Review'} access impact
						</Button>
					{/if}
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
