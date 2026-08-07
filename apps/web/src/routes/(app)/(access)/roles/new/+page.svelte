<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/page-header.svelte';
	import PermissionSelector from '$lib/components/permission-selector.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { createRoleSchema } from '$lib/schemas/role';
	import { IconArrowLeft, IconShieldPlus } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'role-create',
		validators: valibotClient(createRoleSchema),
		resetForm: false
	});

	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };
</script>

<svelte:head><title>Create role · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Roles"
		title="Create reusable role"
		description="Bundle stable application permissions into a role that can later be assigned within an explicit organizational scope."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/roles')}>
				<IconArrowLeft />Back to roles
			</Button>
		{/snippet}
	</PageHeader>

	<form method="POST" action="?/create" use:enhance class="space-y-6">
		<Card.Root class="max-w-3xl">
			<Card.Header>
				<Card.Title>Role identity</Card.Title>
				<Card.Description>
					Names describe institutional responsibility. The system creates a stable internal key.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Role name</Form.Label>
							<Input
								{...props}
								bind:value={$formData.name}
								aria-required="true"
								placeholder="e.g Catalogue Manager"
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>Active reusable roles cannot share a name.</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="reason">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Administrative reason</Form.Label>
							<Textarea {...props} bind:value={$formData.reason} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.Description>
						This reason becomes part of the role's immutable first permission version.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-start gap-3">
					<div class="rounded-lg bg-primary/10 p-2 text-primary"><IconShieldPlus /></div>
					<div>
						<Card.Title>Permissions</Card.Title>
						<Card.Description>
							A role grants these actions only after it is assigned to an account with a scope.
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<Form.Field {form} name="permissionKeys">
					<Form.Control>
						{#snippet children({ props })}
							<PermissionSelector
								{...props}
								permissions={data.permissions}
								bind:selected={$formData.permissionKeys}
								disabled={$submitting}
								role="group"
								aria-label="Role permissions"
								aria-required="true"
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
		</Card.Root>

		<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
			<Button type="button" variant="outline" href={resolve('/roles')}>Cancel</Button>
			<Button type="submit" disabled={$submitting || data.permissions.length === 0}>
				Create role
			</Button>
		</div>
	</form>
</div>
