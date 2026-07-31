<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import { loginSchema } from '$lib/schemas/auth';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { IconEye, IconEyeOff } from '@tabler/icons-svelte';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(loginSchema)
	});
	const { form: formData, enhance, submitting } = form;
	let showPassword = $state(false);
</script>

<svelte:head><title>Sign in · Matti Stock</title></svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title>Welcome back</Card.Title>
		<Card.Description>Sign in to your stock-management workspace.</Card.Description>
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

			<Form.Field {form} name="password">
				<Form.Control>
					{#snippet children({ props })}
						<div class="flex items-center gap-4">
							<Form.Label>Password</Form.Label>
							<a href="/forgot-password" class="ms-auto text-sm text-primary hover:underline">
								Forgot password?
							</a>
						</div>
						<div class="relative">
							<Input
								{...props}
								type={showPassword ? 'text' : 'password'}
								autocomplete="current-password"
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
				<Form.FieldErrors />
			</Form.Field>

			<Button type="submit" class="w-full" disabled={$submitting}>
				{$submitting ? 'Signing in…' : 'Sign in'}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
