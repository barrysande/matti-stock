<script lang="ts">
	import { resolve } from '$app/paths';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { accessLabel } from '$lib/helpers/access-labels';
	import { changePasswordSchema } from '$lib/schemas/auth';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { IconEye, IconEyeOff } from '@tabler/icons-svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(changePasswordSchema)
	});
	const { form: formData, enhance, submitting } = form;

	let showNewPassword = $state(false);
</script>

<svelte:head><title>My access · MaTTI Stock</title></svelte:head>

<div class="space-y-8 pb-8">
	<PageHeader
		eyebrow="Workspace"
		title="My access"
		description="Review the roles and delegated authority currently contributing to your access."
	/>

	<div class="grid gap-4 lg:grid-cols-3">
		<Card.Root>
			<Card.Header>
				<Card.Title>{data.account.person.displayName}</Card.Title>
				<Card.Description>{data.account.account.email}</Card.Description>
			</Card.Header>
			<Card.Content><StatusBadge status={data.account.account.status} /></Card.Content>
		</Card.Root>
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<Card.Title>Effective permissions</Card.Title>
				<Card.Description>Combined direct and delegated permissions.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-wrap gap-2">
				{#each data.account.effectivePermissionKeys as permission (permission)}
					<span class="rounded-md bg-muted px-2 py-1 text-xs">{accessLabel(permission)}</span>
				{/each}
			</Card.Content>
		</Card.Root>
	</div>

	<section class="space-y-4">
		<h2 class="font-heading text-xl font-semibold">Direct role assignments</h2>
		{#if data.account.roleAssignments.length}
			<div class="grid gap-4 lg:grid-cols-2">
				{#each data.account.roleAssignments as assignment (assignment.id)}
					<Card.Root>
						<Card.Header>
							<Card.Title>{assignment.role.name}</Card.Title>
							<Card.Description>{accessLabel(assignment.scope.mode)}</Card.Description>
						</Card.Header>
						<Card.Content class="flex flex-wrap gap-2">
							{#each assignment.permissionKeys as permission (permission)}
								<span class="rounded-md bg-muted px-2 py-1 text-xs">
									{accessLabel(permission)}
								</span>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<EmptyState
				title="No direct role assignments"
				description="Your current access is not backed by a direct role assignment."
			/>
		{/if}
	</section>

	<section class="space-y-4">
		<h2 class="font-heading text-xl font-semibold">Delegated role assignments</h2>
		{#if data.account.delegatedRoleAssignments.length}
			<div class="grid gap-4 lg:grid-cols-2">
				{#each data.account.delegatedRoleAssignments as assignment (`${assignment.delegationId}:${assignment.sourceAssignmentId}`)}
					<Card.Root>
						<Card.Header>
							<Card.Title>{assignment.role.name}</Card.Title>
							<Card.Description>
								Valid <DateTime value={assignment.startsAt} /> – <DateTime
									value={assignment.expiresAt}
								/>
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3">
							<p class="text-sm">{assignment.reason}</p>
							<Button variant="outline" href={resolve(`/delegations/${assignment.delegationId}`)}>
								Open coverage record
							</Button>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<EmptyState
				title="No delegated access"
				description="No accepted delegation currently contributes to your access."
			/>
		{/if}
	</section>

	<Card.Root id="password" class="max-w-2xl scroll-mt-24">
		<Card.Header>
			<Card.Title>Change password</Card.Title>
			<Card.Description>Changing your password signs out the current session.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/changePassword" use:enhance class="space-y-5">
				<Form.Field {form} name="currentPassword">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Current password</Form.Label>
							<Input
								{...props}
								type="password"
								autocomplete="current-password"
								bind:value={$formData.currentPassword}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="password">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>New password</Form.Label>
							<div class="relative">
								<Input
									{...props}
									type={showNewPassword ? 'text' : 'password'}
									autocomplete="new-password"
									class="pe-11"
									bind:value={$formData.password}
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="absolute top-1/2 right-1 -translate-y-1/2"
									aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
									onclick={() => (showNewPassword = !showNewPassword)}
								>
									{#if showNewPassword}<IconEyeOff />{:else}<IconEye />{/if}
								</Button>
							</div>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Button type="submit" disabled={$submitting}>
					{$submitting ? 'Changing…' : 'Change password'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
