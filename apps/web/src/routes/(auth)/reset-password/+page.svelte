<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import PasswordCredentialForm from '$lib/components/password-credential-form.svelte';
	import { resetPasswordSchema } from '$lib/schemas/auth';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(resetPasswordSchema)
	});
</script>

<svelte:head><title>Choose a new password · Matti Stock</title></svelte:head>

<PasswordCredentialForm
	{form}
	title="Choose a new password"
	description="This link can only be used once and may expire."
	submitLabel="Reset password"
	submittingLabel="Resetting…"
/>
