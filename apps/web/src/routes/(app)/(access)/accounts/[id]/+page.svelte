<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { reasonSchema } from '$lib/schemas/account';
	import DateTime from '$lib/components/date-time.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { IconHistory } from '@tabler/icons-svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.reasonForm, {
		id: 'account-action',
		validators: valibotClient(reasonSchema)
	});
	const { form: formData, enhance, submitting } = form;
</script>

<svelte:head><title>{data.account.person.displayName} · Matti Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Account"
		title={data.account.person.displayName}
		description={data.account.email}
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={`/accounts/${data.account.id}/history`}>
				<IconHistory />Access history
			</Button>
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
		<Card.Root>
			<Card.Header><Card.Description>Status</Card.Description></Card.Header>
			<Card.Content><StatusBadge status={data.account.status} /></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Password setup</Card.Description></Card.Header>
			<Card.Content><StatusBadge status={data.account.setupStatus} /></Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Staff number</Card.Description></Card.Header>
			<Card.Content>{data.account.person.staffNumber ?? 'Not recorded'}</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header><Card.Description>Last login</Card.Description></Card.Header>
			<Card.Content><DateTime value={data.account.lastLoginAt} fallback="Never" /></Card.Content>
		</Card.Root>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
		<div class="space-y-6">
			<section class="space-y-3">
				<h2 class="font-heading text-xl font-semibold">Role assignments</h2>
				{#if data.account.roleAssignments.length}
					<div class="grid gap-3 lg:grid-cols-2">
						{#each data.account.roleAssignments as assignment (assignment.id)}
							<a
								href={`/role-assignments/${assignment.id}`}
								class="rounded-xl border bg-card p-4 hover:bg-accent/50"
							>
								<div class="flex items-start justify-between gap-3">
									<p class="font-medium">{assignment.role.name}</p>
									<StatusBadge status={assignment.status} />
								</div>
								<p class="mt-2 text-sm text-muted-foreground">{assignment.scope.name}</p>
							</a>
						{/each}
					</div>
				{:else}
					<EmptyState
						title="No role assignments"
						description="This account has no recorded direct role assignments."
					/>
				{/if}
			</section>

			<section class="space-y-3">
				<h2 class="font-heading text-xl font-semibold">Delegations</h2>
				{#if data.account.delegations}
					<div class="grid gap-3 lg:grid-cols-2">
						{#each [...data.account.delegations.incoming, ...data.account.delegations.outgoing] as delegation (delegation.id)}
							<a
								href={`/delegations/${delegation.id}`}
								class="rounded-xl border bg-card p-4 hover:bg-accent/50"
							>
								<div class="flex items-start justify-between gap-3">
									<p class="font-medium">
										{delegation.delegator.displayName} → {delegation.delegate.displayName}
									</p>
									<StatusBadge status={delegation.status} />
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<EmptyState
						title="No delegations"
						description="No incoming or outgoing delegations are recorded."
					/>
				{/if}
			</section>
		</div>

		<Card.Root class="h-fit">
			<Card.Header>
				<Card.Title>Administrative action</Card.Title>
				<Card.Description>Every lifecycle or credential action requires an audit reason.</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="POST" use:enhance class="space-y-4">
					<Form.Field {form} name="reason">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Reason</Form.Label>
								<Textarea {...props} bind:value={$formData.reason} />
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
					<div class="grid gap-2">
						<Button
							type="submit"
							variant="outline"
							formaction="?/resetPassword"
							disabled={$submitting}
						>
							Request credential recovery
						</Button>
						{#if data.account.status === 'ACTIVE'}
							<Button type="submit" formaction="?/suspend" disabled={$submitting}>
								Suspend account
							</Button>
							<Button
								type="submit"
								variant="destructive"
								formaction="?/deactivate"
								disabled={$submitting}
							>
								Deactivate account
							</Button>
						{:else if data.account.status === 'SUSPENDED'}
							<Button type="submit" formaction="?/restore" disabled={$submitting}>
								Restore account
							</Button>
							<Button
								type="submit"
								variant="destructive"
								formaction="?/deactivate"
								disabled={$submitting}
							>
								Deactivate account
							</Button>
						{:else if data.account.status === 'DEACTIVATED'}
							<Button type="submit" formaction="?/reactivate" disabled={$submitting}>
								Reactivate account
							</Button>
						{/if}
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
