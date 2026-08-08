<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PaginationControls from '$lib/components/pagination-controls.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PermissionSelector from '$lib/components/permission-selector.svelte';
	import RolePermissionList from '$lib/components/role-permission-list.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		administerRoleSchema,
		renameRoleSchema,
		replaceRolePermissionsSchema
	} from '$lib/schemas/role';
	import {
		IconArrowLeft,
		IconHistory,
		IconLock,
		IconShield,
		IconUsers,
		IconVersions
	} from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	const versions = $derived(data.history.data);
	const isArchived = $derived(Boolean(data.role.archivedAt));
	const isConfigurable = $derived(!data.role.systemManaged);
	const recordedAssignmentCount = $derived(
		data.role.currentVersion.assignmentCount + data.role.olderVersionAssignmentCount
	);

	function permissionCountLabel(count: number) {
		return `${count} ${count === 1 ? 'permission' : 'permissions'}`;
	}

	let renameDialogOpen = $state(false);
	let permissionsDialogOpen = $state(false);
	let archiveDialogOpen = $state(false);
	let restoreDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const renameForm = superForm(data.renameForm, {
		id: 'role-rename',
		validators: valibotClient(renameRoleSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				renameDialogOpen = false;
			}
		}
	});

	const { form: renameData, enhance: renameEnhance, submitting: renameSubmitting } = renameForm;

	// svelte-ignore state_referenced_locally
	const permissionsForm = superForm(data.permissionsForm, {
		id: 'role-permissions-replace',
		validators: valibotClient(replaceRolePermissionsSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				permissionsDialogOpen = false;
			}
		}
	});

	const {
		form: permissionsData,
		enhance: permissionsEnhance,
		submitting: permissionsSubmitting
	} = permissionsForm;

	// svelte-ignore state_referenced_locally
	const archiveForm = superForm(data.archiveForm, {
		id: 'role-archive',
		validators: valibotClient(administerRoleSchema),
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
		id: 'role-restore',
		validators: valibotClient(administerRoleSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				restoreDialogOpen = false;
			}
		}
	});

	const { form: restoreData, enhance: restoreEnhance, submitting: restoreSubmitting } = restoreForm;
</script>

<svelte:head><title>{data.role.name} · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Reusable role"
		title={data.role.name}
		description="Review the current permission bundle, assignment usage, and immutable version history."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/roles')}>
				<IconArrowLeft />Back to roles
			</Button>
			{#if isConfigurable && !isArchived}
				<Button type="button" variant="outline" onclick={() => (renameDialogOpen = true)}>
					Rename
				</Button>
				<Button type="button" variant="outline" onclick={() => (permissionsDialogOpen = true)}>
					Change permissions
				</Button>
				<Button type="button" variant="destructive" onclick={() => (archiveDialogOpen = true)}>
					Archive
				</Button>
			{:else if isConfigurable}
				<Button type="button" onclick={() => (restoreDialogOpen = true)}>Restore</Button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if data.role.systemManaged}
		<Card.Root class="border-primary/30 bg-primary/5">
			<Card.Content class="flex items-start gap-3">
				<div class="rounded-lg bg-primary/10 p-2 text-primary"><IconLock /></div>
				<div>
					<p class="font-heading font-semibold">Protected system role</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">
						This role anchors access administration and cannot be renamed, reconfigured, archived,
						or restored through role administration.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.role.olderVersionAssignmentCount > 0}
		<Card.Root class="border-amber-500/40 bg-amber-500/5">
			<Card.Content class="flex items-start gap-3">
				<div class="rounded-lg bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
					<IconHistory />
				</div>
				<div>
					<p class="font-heading font-semibold">Older versions have recorded assignments</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">
						{data.role.olderVersionAssignmentCount} recorded role {data.role
							.olderVersionAssignmentCount === 1
							? 'assignment remains'
							: 'assignments remain'} linked to an earlier version. Permission changes never rewrite existing
						assignments.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content><StatusBadge status={isArchived ? 'ARCHIVED' : 'ACTIVE'} /></Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Role type</Card.Description></Card.Header>
			<Card.Content>
				<div class="flex items-center gap-2 font-medium">
					<IconShield class="size-4 text-muted-foreground" />
					{data.role.systemManaged ? 'System-managed' : 'Configurable'}
				</div>
				<p class="mt-1 font-mono text-xs break-all text-muted-foreground">{data.role.key}</p>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Current version</Card.Description></Card.Header>
			<Card.Content class="flex items-center gap-2 font-medium">
				<IconVersions class="size-4 text-muted-foreground" />
				Version {data.role.currentVersion.version} · {permissionCountLabel(
					data.role.currentVersion.permissionKeys.length
				)}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Description>Recorded assignments</Card.Description></Card.Header>
			<Card.Content class="flex items-center gap-2 font-medium">
				<IconUsers class="size-4 text-muted-foreground" />{recordedAssignmentCount}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Card.Title>Current permissions</Card.Title>
					<Card.Description>
						These permissions are used when a new assignment is created from version {data.role
							.currentVersion.version}.
					</Card.Description>
				</div>
				<Badge variant="secondary">
					{permissionCountLabel(data.role.currentVersion.permissionKeys.length)}
				</Badge>
			</div>
		</Card.Header>
		<Card.Content>
			<RolePermissionList
				permissionKeys={data.role.currentVersion.permissionKeys}
				permissions={data.permissions}
			/>
		</Card.Content>
	</Card.Root>

	<section class="space-y-3">
		<div>
			<h2 class="font-heading text-xl font-semibold">Permission version history</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Every permission change creates a new immutable version; assignments retain the version they
				received.
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
										<Card.Title class="text-base">Version {version.version}</Card.Title>
										<Card.Description>
											Created by {version.createdBy?.displayName ?? 'System'} · <DateTime
												value={version.createdAt}
											/>
										</Card.Description>
									</div>
									<div class="flex flex-wrap gap-2">
										{#if version.version === data.role.currentVersion.version}
											<Badge>Current</Badge>
										{/if}
										<Badge variant="secondary">
											{version.assignmentCount} recorded {version.assignmentCount === 1
												? 'assignment'
												: 'assignments'}
										</Badge>
									</div>
								</div>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div>
									<p class="text-sm text-muted-foreground">Reason</p>
									<p class="text-sm">{version.reason}</p>
								</div>
								<RolePermissionList
									permissionKeys={version.permissionKeys}
									permissions={data.permissions}
								/>
							</Card.Content>
						</Card.Root>
					</li>
				{/each}
			</ol>
		{:else}
			<EmptyState title="No permission history" description="No role versions are recorded." />
		{/if}

		<PaginationControls
			currentPage={data.history.metadata.currentPage}
			lastPage={data.history.metadata.lastPage}
			url={page.url}
		/>
	</section>

	<Dialog.Root bind:open={renameDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$renameSubmitting}
		>
			<form method="POST" action="?/rename" use:renameEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Rename {data.role.name}</Dialog.Title>
					<Dialog.Description>
						Rename the reusable role without changing its permissions or assignments.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 space-y-4 overflow-y-auto pe-1">
					<Form.Field form={renameForm} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Role name</Form.Label>
								<Input {...props} bind:value={$renameData.name} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>Active reusable roles cannot share a name.</Form.Description>
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
					<Button type="submit" disabled={$renameSubmitting}>Rename role</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Dialog.Root bind:open={permissionsDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] max-w-5xl! grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden"
			showCloseButton={!$permissionsSubmitting}
		>
			<form method="POST" action="?/replacePermissions" use:permissionsEnhance class="contents">
				<Dialog.Header>
					<Dialog.Title>Change permissions for {data.role.name}</Dialog.Title>
					<Dialog.Description>
						This creates version {data.role.currentVersion.version + 1} for future assignments. Existing
						assignments keep their current permission version.
					</Dialog.Description>
				</Dialog.Header>
				<div class="min-h-0 space-y-5 overflow-y-auto pe-1">
					<Form.Field form={permissionsForm} name="permissionKeys">
						<Form.Control>
							{#snippet children({ props })}
								<PermissionSelector
									{...props}
									permissions={data.assignablePermissions}
									bind:selected={$permissionsData.permissionKeys}
									disabled={$permissionsSubmitting}
									role="group"
									aria-label="Role permissions"
									aria-required="true"
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<Form.Field form={permissionsForm} name="reason">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Administrative reason</Form.Label>
								<Textarea {...props} bind:value={$permissionsData.reason} aria-required="true" />
							{/snippet}
						</Form.Control>
						<Form.Description>
							Explain why the permission bundle is changing; this is retained with the new version.
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
				</div>
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						disabled={$permissionsSubmitting}
						onclick={() => (permissionsDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={$permissionsSubmitting}>Create new version</Button>
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
					<Dialog.Title>Archive {data.role.name}</Dialog.Title>
					<Dialog.Description>
						Stop this role from being used for new assignments without deleting its versions or
						history.
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
							All active and upcoming assignments using any version must be ended first.
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
						Archive role
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
					<Dialog.Title>Restore {data.role.name}</Dialog.Title>
					<Dialog.Description>
						Return this role to active use with its latest permission version unchanged.
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
							Restoration can fail if another active role now uses the same name.
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
					<Button type="submit" disabled={$restoreSubmitting}>Restore role</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
</div>
