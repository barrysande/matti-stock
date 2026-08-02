<script lang="ts">
	import DateTimePicker from '$lib/components/date-time-picker.svelte';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { grantRoleAssignmentSchema } from '$lib/schemas/role-assignment';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { InferOutput } from 'valibot';

	type GrantForm = InferOutput<typeof grantRoleAssignmentSchema>;

	let {
		form,
		disabled = false
	}: {
		form: SuperForm<GrantForm>;
		disabled?: boolean;
	} = $props();

	const formData = $derived(form.form);

	function selectStartMode(value: string) {
		$formData.startMode = value as GrantForm['startMode'];
		if (value === 'NOW') $formData.startsAt = '';
	}
</script>

<div class="space-y-5">
	<div class="max-w-xl">
		<Form.Field {form} name="startMode">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Start</Form.Label>
					<input type="hidden" name={props.name} value={$formData.startMode} />
					<Select.Root
						type="single"
						bind:value={() => $formData.startMode, selectStartMode}
						{disabled}
					>
						<Select.Trigger
							id={props.id}
							class="w-full"
							aria-describedby={props['aria-describedby']}
							aria-invalid={props['aria-invalid']}
						>
							{$formData.startMode === 'NOW' ? 'Start immediately' : 'Schedule a start'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="NOW">Start immediately</Select.Item>
							<Select.Item value="SCHEDULED">Schedule a start</Select.Item>
						</Select.Content>
					</Select.Root>
				{/snippet}
			</Form.Control>
			<Form.Description>The assignment starts as soon as it is submitted.</Form.Description>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<div class="grid gap-5 lg:grid-cols-2">
		{#if $formData.startMode === 'SCHEDULED'}
			<Form.Field {form} name="startsAt">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Scheduled start (EAT)</Form.Label>
						<DateTimePicker
							id={props.id}
							name={props.name}
							bind:value={$formData.startsAt}
							placeholder="Select start date"
							defaultTime="09:00"
							accessibleLabel="Scheduled start"
							describedBy={props['aria-describedby']}
							invalid={props['aria-invalid']}
							required
							{disabled}
						/>
					{/snippet}
				</Form.Control>
				<Form.Description>Select the institutional date and exact EAT time.</Form.Description>
				<Form.FieldErrors />
			</Form.Field>
		{:else}
			<input type="hidden" name="startsAt" value="" />
		{/if}

		<Form.Field {form} name="expiresAt">
			<Form.Control>
				{#snippet children({ props })}
					<Form.Label>Expiry (EAT, optional)</Form.Label>
					<DateTimePicker
						id={props.id}
						name={props.name}
						bind:value={$formData.expiresAt}
						placeholder="No expiry selected"
						defaultTime="17:00"
						accessibleLabel="Expiry"
						describedBy={props['aria-describedby']}
						invalid={props['aria-invalid']}
						optional
						{disabled}
					/>
				{/snippet}
			</Form.Control>
			<Form.Description>Leave empty for an open-ended assignment.</Form.Description>
			<Form.FieldErrors />
		</Form.Field>
	</div>
</div>
