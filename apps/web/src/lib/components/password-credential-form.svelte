<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { resetPasswordSchema } from '$lib/schemas/auth';
	import { IconEye, IconEyeOff } from '@tabler/icons-svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { InferOutput } from 'valibot';

	type PasswordCredentialForm = InferOutput<typeof resetPasswordSchema>;

	let {
		form,
		title,
		description,
		submitLabel,
		submittingLabel
	}: {
		form: SuperForm<PasswordCredentialForm>;
		title: string;
		description: string;
		submitLabel: string;
		submittingLabel: string;
	} = $props();

	// svelte-ignore state_referenced_locally
	const { form: formData, enhance, submitting } = form;
	let showPassword = $state(false);
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{title}</Card.Title>
		<Card.Description>{description}</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" use:enhance class="space-y-5">
			<input type="hidden" name="token" value={$formData.token} />
			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>New password</Form.Label>
						<div class="relative">
							<Input
								{...props}
								type={showPassword ? 'text' : 'password'}
								autocomplete="new-password"
								class="pe-11"
								bind:value={$formData.password}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="absolute top-1/2 right-1 -translate-y-1/2"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								onclick={() => (showPassword = !showPassword)}
							>
								{#if showPassword}<IconEyeOff />{:else}<IconEye />{/if}
							</Button>
						</div>
					{/snippet}
				</Form.Control>
				<Form.Description>Use 8–25 characters.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
			<Button type="submit" class="w-full" disabled={$submitting}>
				{$submitting ? submittingLabel : submitLabel}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
