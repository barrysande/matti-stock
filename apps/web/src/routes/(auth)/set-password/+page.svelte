<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';
	import PasswordCredentialForm from '$lib/components/password-credential-form.svelte';
	import { setPasswordSchema } from '$lib/schemas/auth';

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		validators: valibotClient(setPasswordSchema)
	});
</script>

<svelte:head><title>Set your password · MaTTI Stock</title></svelte:head>

<PasswordCredentialForm
	{form}
	title="Set your password"
	description="Create the password you will use to access MaTTI Stock."
	submitLabel="Set password"
	submittingLabel="Saving…"
/>
