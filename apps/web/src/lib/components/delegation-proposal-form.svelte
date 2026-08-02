<script lang="ts">
	import DateTimePicker from '$lib/components/date-time-picker.svelte';
	import DelegationAssignmentSummary from '$lib/components/delegation-assignment-summary.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { createDelegationSchema } from '$lib/schemas/delegation';
	import type { DelegationProposalOptions } from '$lib/types/delegation';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { InferOutput } from 'valibot';

	type ProposalForm = InferOutput<typeof createDelegationSchema>;
	type SelectedDelegate = NonNullable<DelegationProposalOptions['selectedDelegate']>;
	type SourceAssignment = DelegationProposalOptions['sourceAssignments'][number];

	let {
		form,
		delegate,
		assignments
	}: {
		form: SuperForm<ProposalForm>;
		delegate: SelectedDelegate;
		assignments: SourceAssignment[];
	} = $props();

	const formData = $derived(form.form);
	const enhance = $derived(form.enhance);
	const submitting = $derived(form.submitting);

	function setAssignment(id: string, checked: boolean) {
		$formData.assignmentIds = checked
			? [...new Set([...$formData.assignmentIds, id])].sort()
			: $formData.assignmentIds.filter((assignmentId) => assignmentId !== id);
	}

	function selectStartMode(value: string) {
		$formData.startMode = value as ProposalForm['startMode'];
		if (value === 'NOW') $formData.startsAt = '';
	}
</script>

<form method="POST" action="?/create" use:enhance class="space-y-6">
	<input type="hidden" name="delegateAccountId" value={delegate.accountId} />

	<Card.Root>
		<Card.Header>
			<Card.Title>Temporary recipient</Card.Title>
			<Card.Description>This person will respond through their own account.</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="rounded-lg border bg-muted/30 p-4">
				<p class="font-medium">{delegate.displayName}</p>
				<p class="text-sm text-muted-foreground">{delegate.email}</p>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Assignments to cover</Card.Title>
			<Card.Description>
				Select complete assignments. Every permission, area, and descendant reach shown for a
				selected assignment will be provided temporarily.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Form.Field {form} name="assignmentIds">
				<Form.Control>
					{#snippet children({ props })}
						<fieldset aria-describedby={props['aria-describedby']} class="grid gap-3">
							<legend class="sr-only">Assignments to cover</legend>
							{#each assignments as assignment (assignment.id)}
								<div class="flex items-start gap-3 rounded-xl border p-4">
									<Checkbox
										checked={$formData.assignmentIds.includes(assignment.id)}
										onCheckedChange={(checked) => setAssignment(assignment.id, checked)}
										disabled={$submitting}
										aria-label={`Temporarily provide ${assignment.role.name}`}
									/>
									<div class="min-w-0 flex-1">
										<DelegationAssignmentSummary {assignment} showPermissions />
									</div>
								</div>
							{/each}
						</fieldset>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			{#each $formData.assignmentIds as assignmentId (assignmentId)}
				<input type="hidden" name="assignmentIds" value={assignmentId} />
			{/each}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>When this temporary coverage applies</Card.Title>
			<Card.Description>All dates and times are entered in East Africa Time (EAT).</Card.Description
			>
		</Card.Header>
		<Card.Content class="space-y-5">
			<Form.Field {form} name="startMode">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>Start</Form.Label>
						<input type="hidden" name={props.name} value={$formData.startMode} />
						<Select.Root
							type="single"
							bind:value={() => $formData.startMode, selectStartMode}
							disabled={$submitting}
						>
							<Select.Trigger id={props.id} class="w-full max-w-xl">
								{$formData.startMode === 'NOW' ? 'Start immediately' : 'Schedule a start'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="NOW">Start immediately</Select.Item>
								<Select.Item value="SCHEDULED">Schedule a start</Select.Item>
							</Select.Content>
						</Select.Root>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>

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
									disabled={$submitting}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				{:else}
					<input type="hidden" name="startsAt" value="" />
				{/if}

				<Form.Field {form} name="expiresAt">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Expiry (EAT)</Form.Label>
							<DateTimePicker
								id={props.id}
								name={props.name}
								bind:value={$formData.expiresAt}
								placeholder="Select expiry date"
								defaultTime="17:00"
								accessibleLabel="Expiry"
								describedBy={props['aria-describedby']}
								invalid={props['aria-invalid']}
								required
								disabled={$submitting}
							/>
						{/snippet}
					</Form.Control>
					<Form.Description>Temporary coverage must have an exact end.</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Reason</Card.Title>
			<Card.Description>Explain why this temporary coverage is needed.</Card.Description>
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
		<Button type="submit" disabled={$submitting}>Send proposal</Button>
	</div>
</form>
