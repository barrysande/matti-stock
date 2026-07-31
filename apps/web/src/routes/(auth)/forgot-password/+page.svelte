<script lang="ts">
	import { resolve } from '$app/paths';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { forgotPasswordSchema } from '$lib/schemas/auth';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(forgotPasswordSchema)
	});
	const { form: formData, enhance, submitting } = form;
</script>

<svelte:head><title>Reset password · MaTTI Stock</title></svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title>Reset your password</Card.Title>
		<Card.Description>
			Enter your account email. The response remains the same whether an account exists.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance class="space-y-5">
			<Form.Field {form} name="email">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Email address</Form.Label>
						<Input
							{...props}
							type="email"
							autocomplete="email"
							inputmode="email"
							bind:value={$formData.email}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			<Button type="submit" class="w-full" disabled={$submitting}>
				{$submitting ? 'Requesting…' : 'Send reset link'}
			</Button>
			<a href={resolve('/login')} class="block text-center text-sm text-primary hover:underline">
				Return to sign in
			</a>
		</form>
	</Card.Content>
</Card.Root>
