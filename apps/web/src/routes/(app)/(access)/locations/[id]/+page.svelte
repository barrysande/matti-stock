<script lang="ts">
	import { resolve } from '$app/paths';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
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
		administerLocationSchema,
		renameLocationSchema,
		reparentLocationSchema
	} from '$lib/schemas/location';
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	const topLevelValue = 'TOP_LEVEL';
	let { data } = $props();
	const versions = $derived(data.location.versions ?? []);
	const currentVersion = $derived(versions[0]);
	const isArchived = $derived(Boolean(data.location.archivedAt));
	const canMove = $derived(Boolean(data.location.parentId) || data.parentOptions.length > 0);

	let renameDialogOpen = $state(false);
	let reparentDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const renameForm = superForm(data.renameForm, {
		id: 'physical-location-rename',
		validators: valibotClient(renameLocationSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') renameDialogOpen = false;
		}
	});
	const { form: renameData, enhance: renameEnhance, submitting: renameSubmitting } = renameForm;

	// svelte-ignore state_referenced_locally
	const reparentForm = superForm(data.reparentForm, {
		id: 'physical-location-reparent',
		validators: valibotClient(reparentLocationSchema),
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
		id: 'physical-location-archive',
		validators: valibotClient(administerLocationSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') archiveDialogOpen = false;
		}
	});
	const { form: archiveData, enhance: archiveEnhance, submitting: archiveSubmitting } = archiveForm;

	// svelte-ignore state_referenced_locally
	const restoreForm = superForm(data.restoreForm, {
		id: 'physical-location-restore',
		validators: valibotClient(administerLocationSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') restoreDialogOpen = false;
		}
	});
	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;

	const selectedParent = $derived(
		data.parentOptions.find((location) => location.id === $reparentData.parentId)
	);

	function selectParent(value: string) {
		$reparentData.parentId = value === topLevelValue ? '' : value;
	}
</script>

<svelte:head><title>{data.location.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Physical location"
		title={data.location.name}
		description={data.location.path}
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/locations')}>
				<IconArrowLeft />Back to physical locations
			</Button>
			{#if !isArchived}
				<Button type="button" variant="outline" onclick={() => (renameDialogOpen = true)}>
					Rename
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={!canMove}
					title={!canMove
						? 'No valid alternative parent or top-level placement is available.'
						: undefined}
					onclick={() => (reparentDialogOpen = true)}
				>
					Move
				</Button>
				<Button type="button" variant="destructive" onclick={() => (archiveDialogOpen = true)}>
					Archive
				</Button>
			{:else}
				<Button type="button" onclick={() => (restoreDialogOpen = true)}>Restore</Button>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Parent</Card.Description></Card.Header>
			<Card.Content>{currentVersion?.parent?.name ?? 'Top-level location'}</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content>
				<StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} />
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Created</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.location.createdAt} /></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Last updated</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.location.updatedAt} /></Card.Content>
		</Card.Root>
	</div>

	<section class="space-y-3">
		<div>
			<h2 class="font-heading text-xl font-semibold">Structural history</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Effective-dated names, parents, and lifecycle changes for this physical location.
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
										<Card.Title class="text-base">
											Version {version.version}: {version.name}
										</Card.Title>
										<Card.Description>
											{version.parent?.name ?? 'Top-level location'}
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
				description="No structural versions are recorded for this physical location."
			/>
		{/if}
	</section>

	<Dialog.Root bind:open={renameDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$renameSubmitting}
		>
			<form method="POST" action="?/rename" use:renameEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Rename {data.location.name}</Dialog.Title>
					<Dialog.Description>
						The previous name remains available in structural history.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<Form.Field form={renameForm} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Location name</Form.Label>
								<Input {...props} bind:value={$renameData.name} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>
							Active locations beneath the same parent cannot share a name.
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
					<Button type="submit" disabled={$renameSubmitting}>Rename location</Button>
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
					<Dialog.Title>Move {data.location.name}</Dialog.Title>
					<Dialog.Description>
						Choose a different active parent or promote this location to top level.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<Form.Field form={reparentForm} name="parentId">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>New parent location</Form.Label>
								<Select.Root
									type="single"
									bind:value={() => $reparentData.parentId || topLevelValue, selectParent}
									disabled={$reparentSubmitting}
								>
									<Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true">
										{selectedParent?.path ?? 'Top-level location'}
									</Select.Trigger>
									<Select.Content>
										{#if data.location.parentId}
											<Select.Item value={topLevelValue} class="cursor-pointer">
												Top-level location
											</Select.Item>
										{/if}
										{#each data.parentOptions as location (location.id)}
											<Select.Item value={location.id} label={location.path} class="cursor-pointer">
												{location.path}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
								<input type="hidden" name="parentId" value={$reparentData.parentId} />
							{/snippet}
						</Form.Control>
						<Form.Description>
							The current parent, this location, and its descendants are excluded.
						</Form.Description>
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
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$reparentSubmitting}
						onclick={() => (reparentDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={$reparentSubmitting}>Move location</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={archiveDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$archiveSubmitting}
		>
			<form method="POST" action="?/archive" use:archiveEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Archive {data.location.name}</Dialog.Title>
					<Dialog.Description>
						Archive this location without deleting its structural history.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 overflow-y-auto pe-1">
					<Form.Field form={archiveForm} name="reason">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Administrative reason</Form.Label>
								<Textarea {...props} bind:value={$archiveData.reason} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>
							Active child locations must be moved or archived first.
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$archiveSubmitting}
						onclick={() => (archiveDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" variant="destructive" disabled={$archiveSubmitting}>
						Archive location
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={restoreDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$restoreSubmitting}
		>
			<form method="POST" action="?/restore" use:restoreEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Restore {data.location.name}</Dialog.Title>
					<Dialog.Description>
						Return this physical location to active use under its recorded parent.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 overflow-y-auto pe-1">
					<Form.Field form={restoreForm} name="reason">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Administrative reason</Form.Label>
								<Textarea {...props} bind:value={$restoreData.reason} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>
							The location's recorded parent must already be active.
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$restoreSubmitting}
						onclick={() => (restoreDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={$restoreSubmitting}>Restore location</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
