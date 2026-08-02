<script lang="ts">
	import AuthorityIntervalFields from '$lib/components/authority-interval-fields.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { accessLabel } from '$lib/helpers/access-labels';
	import { grantRoleAssignmentSchema } from '$lib/schemas/role-assignment';
	import type {
		AssignmentAccountOption,
		OrganizationalUnitOption,
		RoleOption
	} from '$lib/types/role-assignment';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { InferOutput } from 'valibot';

	type GrantForm = InferOutput<typeof grantRoleAssignmentSchema>;

	let {
		form,
		account,
		roles,
		organizationalUnits,
		action,
		submitLabel,
		lockedRole = null
	}: {
		form: SuperForm<GrantForm>;
		account: AssignmentAccountOption;
		roles: RoleOption[];
		organizationalUnits: OrganizationalUnitOption[];
		action: string;
		submitLabel: string;
		lockedRole?: RoleOption | null;
	} = $props();

	const formData = $derived(form.form);
	const enhance = $derived(form.enhance);
	const submitting = $derived(form.submitting);
	const selectedRole = $derived(lockedRole ?? roles.find((role) => role.id === $formData.roleId));
	const selectedScope = $derived(
		organizationalUnits.find((unit) => unit.id === $formData.scopeOrganizationalUnitId)
	);

	function selectRole(roleId: string) {
		if (lockedRole) return;
		$formData.roleId = roleId;
		const role = roles.find(({ id }) => id === roleId);
		if (role?.key !== 'MASTER_ADMIN') return;

		const institute = organizationalUnits.find(({ unitType }) => unitType === 'INSTITUTE');
		$formData.scopeOrganizationalUnitId = institute?.id ?? '';
		$formData.scopeMode = 'INCLUDE_DESCENDANTS';
	}

	function selectScope(value: string) {
		$formData.scopeOrganizationalUnitId = value;
	}

	function selectScopeMode(value: string) {
		$formData.scopeMode = value as GrantForm['scopeMode'];
	}
</script>

<form method="POST" {action} use:enhance class="space-y-6">
	<input type="hidden" name="accountId" value={account.id} />
	{#if lockedRole}<input type="hidden" name="roleId" value={lockedRole.id} />{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Appointment</Card.Title>
			<Card.Description>Choose the person's role and where it applies.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-5">
			<div class="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-4">
				<div class="min-w-0">
					<p class="font-medium">{account.displayName}</p>
					<p class="truncate text-sm text-muted-foreground">{account.email}</p>
				</div>
				<StatusBadge status={account.status} />
			</div>

			<Form.Field {form} name="roleId">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Role</Form.Label>
						{#if lockedRole}
							<div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
								{lockedRole.name}
							</div>
						{:else}
							<input type="hidden" name={props.name} value={$formData.roleId} />
							<Select.Root
								type="single"
								bind:value={() => $formData.roleId, selectRole}
								disabled={$submitting}
							>
								<Select.Trigger class="w-full">
									{selectedRole?.name ?? 'Select a role'}
								</Select.Trigger>
								<Select.Content>
									{#each roles as role (role.id)}
										<Select.Item value={role.id}>{role.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{/if}
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

			<div class="grid gap-5 md:grid-cols-2">
				<Form.Field {form} name="scopeOrganizationalUnitId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Applies within</Form.Label>
							<input type="hidden" name={props.name} value={$formData.scopeOrganizationalUnitId} />
							<Select.Root
								type="single"
								bind:value={() => $formData.scopeOrganizationalUnitId, selectScope}
								disabled={$submitting || selectedRole?.key === 'MASTER_ADMIN'}
							>
								<Select.Trigger class="w-full">
									{selectedScope?.path ?? 'Select an area'}
								</Select.Trigger>
								<Select.Content>
									{#each organizationalUnits as unit (unit.id)}
										<Select.Item value={unit.id}>{unit.path}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="scopeMode">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Coverage</Form.Label>
							<input type="hidden" name={props.name} value={$formData.scopeMode} />
							<Select.Root
								type="single"
								bind:value={() => $formData.scopeMode, selectScopeMode}
								disabled={$submitting || selectedRole?.key === 'MASTER_ADMIN'}
							>
								<Select.Trigger class="w-full">
									{accessLabel($formData.scopeMode, selectedScope?.name)}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="THIS_NODE_ONLY">This unit only</Select.Item>
									<Select.Item value="INCLUDE_DESCENDANTS">This unit and its sub-units</Select.Item>
								</Select.Content>
							</Select.Root>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>When this assignment applies</Card.Title>
			<Card.Description>All dates and times are entered in East Africa Time (EAT).</Card.Description
			>
		</Card.Header>
		<Card.Content>
			<AuthorityIntervalFields {form} disabled={$submitting} />
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Audit reason</Card.Title>
			<Card.Description>Explain why this assignment is being created or replaced.</Card.Description>
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
	</Card.Root>

	<div class="flex justify-end">
		<Button type="submit" disabled={$submitting}>{submitLabel}</Button>
	</div>
</form>
