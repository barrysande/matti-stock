<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { createAccountSchema } from '$lib/schemas/account';
	import PageHeader from '$lib/components/page-header.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(createAccountSchema)
	});
	const { form: formData, enhance, submitting } = form;
</script>

<svelte:head><title>Create account · Matti Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Accounts"
		title="Create account"
		description="Create the person and sign-in account atomically. A password-setting link will be queued."
	/>
	<Card.Root class="max-w-2xl">
		<Card.Content class="pt-6">
			<form method="POST" use:enhance class="space-y-5">
				<Form.Field {form} name="displayName">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Display name</Form.Label>
							<Input {...props} autocomplete="name" bind:value={$formData.displayName} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="staffNumber">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Staff number</Form.Label>
							<Input {...props} bind:value={$formData.staffNumber} />
						{/snippet}
					</Form.Control>
					<Form.Description>Optional.</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="email">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Email address</Form.Label>
							<Input
								{...props}
								type="email"
								autocomplete="email"
								bind:value={$formData.email}
							/>
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<Form.Field {form} name="reason">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Administrative reason</Form.Label>
							<Textarea {...props} bind:value={$formData.reason} />
						{/snippet}
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
				<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button type="button" variant="outline" href="/accounts">Cancel</Button>
					<Button type="submit" disabled={$submitting}>
						{$submitting ? 'Creating…' : 'Create account'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
