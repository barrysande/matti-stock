<script lang="ts">
	import { resolve } from '$app/paths';
	import OrganizationalAccessImpact from '$lib/components/organizational-access-impact.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import {
		createOrganizationalUnitFormSchema,
		type OrganizationalAccessImpact as AccessImpact
	} from '$lib/schemas/organization-unit';
	import { IconArrowLeft, IconShieldCheck } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	type ReviewedSelection = {
		unitType: 'DEPARTMENT' | 'SUB_DEPARTMENT';
		parentId: string;
	};

	let { data } = $props();

	let impact = $state<AccessImpact | null>(null);
	let reviewedSelection = $state<ReviewedSelection | null>(null);
	let impactDialogOpen = $state(false);

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'organizational-unit-create',
		validators: valibotClient(createOrganizationalUnitFormSchema),
		resetForm: false,
		onResult({ result }) {
			if (result.type === 'redirect') {
				impactDialogOpen = false;
				return;
			}

			if ((result.type !== 'success' && result.type !== 'failure') || !result.data) {
				return;
			}

			const actionData = result.data as {
				impact?: AccessImpact;
				reviewedSelection?: ReviewedSelection;
				previewInvalidated?: boolean;
			};

			if (actionData.previewInvalidated) {
				impact = null;
				reviewedSelection = null;
				impactDialogOpen = false;
			} else if (actionData.impact && actionData.reviewedSelection) {
				impact = actionData.impact;
				reviewedSelection = actionData.reviewedSelection;
				impactDialogOpen = true;
			}
		}
	});

	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };

	const institute = $derived(data.units.find((unit) => unit.unitType === 'INSTITUTE'));
	const departments = $derived(data.units.filter((unit) => unit.unitType === 'DEPARTMENT'));
	const parentOptions = $derived(
		$formData.unitType === 'DEPARTMENT' ? (institute ? [institute] : []) : departments
	);
	const selectedParent = $derived(parentOptions.find((unit) => unit.id === $formData.parentId));
	const previewIsCurrent = $derived(
		impact !== null &&
			impact.fingerprint === $formData.impactFingerprint &&
			reviewedSelection?.unitType === $formData.unitType &&
			reviewedSelection?.parentId === $formData.parentId
	);
	const submittedFingerprint = $derived(previewIsCurrent ? $formData.impactFingerprint : '');

	function unitTypeLabel(value: string) {
		return value === 'SUB_DEPARTMENT' ? 'Sub-department' : 'Department';
	}

	function invalidatePreview() {
		impact = null;
		reviewedSelection = null;
		impactDialogOpen = false;
		$formData.impactFingerprint = '';
	}

	function selectUnitType(value: string) {
		if (value !== 'DEPARTMENT' && value !== 'SUB_DEPARTMENT') return;
		if ($formData.unitType === value) return;

		invalidatePreview();
		$formData.unitType = value;
		$formData.parentId = value === 'DEPARTMENT' ? (institute?.id ?? '') : '';
	}

	function selectParent(parentId: string) {
		if ($formData.parentId === parentId) return;

		invalidatePreview();
		$formData.parentId = parentId;
	}
</script>

<svelte:head><title>Create organizational unit · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Organization"
		title="Create organizational unit"
		description="Add a department or sub-department, review who will gain descendant access, and then confirm the change."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/organization')}>
				<IconArrowLeft />Back to organization
			</Button>
		{/snippet}
	</PageHeader>

	<form
		id="organizational-unit-create-form"
		method="POST"
		action="?/preview"
		use:enhance
		class="space-y-6"
	>
		<Card.Root class="max-w-3xl">
			<Card.Header>
				<Card.Title>Organizational details</Card.Title>
				<Card.Description>
					The unit type determines which active organizational parent can be selected.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="grid gap-5 sm:grid-cols-2">
					<Form.Field {form} name="unitType">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Unit type</Form.Label>
								<Select.Root
									type="single"
									name="unitType"
									bind:value={() => $formData.unitType, selectUnitType}
									disabled={$submitting}
								>
									<Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true">
										{unitTypeLabel($formData.unitType)}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="DEPARTMENT" class="cursor-pointer">Department</Select.Item>
										<Select.Item value="SUB_DEPARTMENT" class="cursor-pointer">
											Sub-department
										</Select.Item>
									</Select.Content>
								</Select.Root>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="parentId">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>Parent</Form.Label>
								<Select.Root
									type="single"
									name="parentId"
									bind:value={() => $formData.parentId, selectParent}
									disabled={$submitting || parentOptions.length === 0}
								>
									<Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true">
										{selectedParent?.path ?? 'Select an active parent'}
									</Select.Trigger>
									<Select.Content>
										{#each parentOptions as unit (unit.id)}
											<Select.Item value={unit.id} label={unit.path} class="cursor-pointer">
												{unit.path}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							{/snippet}
						</Form.Control>
						<Form.Description>
							{#if $formData.unitType === 'DEPARTMENT'}
								Departments belong directly to the institute.
							{:else if departments.length}
								Sub-departments belong directly to an active department.
							{:else}
								Create a department before adding a sub-department.
							{/if}
						</Form.Description>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Unit name</Form.Label>
							<Input {...props} bind:value={$formData.name} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.Description>
						Enter the name only, without “Department” or “Sub-department.” Active sibling units
						cannot share a name.
					</Form.Description>
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
						This reason becomes part of the unit's immutable structural and access history.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<input type="hidden" name="impactFingerprint" value={submittedFingerprint} />

				<div class="flex justify-end">
					<Button
						type="submit"
						formaction="?/preview"
						variant="outline"
						disabled={$submitting || !$formData.parentId}
					>
						<IconShieldCheck />{previewIsCurrent ? 'Refresh' : 'Review'} access impact
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

		{#if impact && previewIsCurrent}
			<Card.Root class="max-w-3xl" aria-live="polite">
				<Card.Content
					class="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<p class="font-medium">Access impact reviewed</p>
						<p class="mt-1 text-sm text-muted-foreground">
							{impact.assignments.length} active or upcoming role {impact.assignments.length === 1
								? 'assignment gains'
								: 'assignments gain'} access to the proposed unit.
						</p>
					</div>
					<Button type="button" variant="outline" onclick={() => (impactDialogOpen = true)}>
						View reviewed impact
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}

		<div class="flex max-w-3xl justify-end">
			<Button type="button" variant="outline" href={resolve('/organization')}>Cancel</Button>
		</div>
	</form>

	<Dialog.Root bind:open={impactDialogOpen}>
		<Dialog.Content
			class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-3xl"
			showCloseButton={!$submitting}
		>
			<Dialog.Header>
				<Dialog.Title>Review access impact</Dialog.Title>
				<Dialog.Description>
					{#if impact}
						{impact.assignments.length} active or upcoming role {impact.assignments.length === 1
							? 'assignment gains'
							: 'assignments gain'} access to the proposed unit.
					{:else}
						The reviewed access impact is no longer current.
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<div class="min-h-0 overflow-y-auto pe-1">
				{#if impact && previewIsCurrent}
					<OrganizationalAccessImpact
						{impact}
						emptyDescription="No active or upcoming role assignment gains descendant access from this change."
					/>
				{/if}
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					disabled={$submitting}
					onclick={() => (impactDialogOpen = false)}
				>
					Return to form
				</Button>
				<Button
					type="submit"
					form="organizational-unit-create-form"
					formaction="?/create"
					disabled={$submitting || !previewIsCurrent}
				>
					Create organizational unit
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
