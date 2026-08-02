<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { createLocationSchema } from '$lib/schemas/location';
	import { IconArrowLeft } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	const topLevelValue = 'TOP_LEVEL';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'physical-location-create',
		validators: valibotClient(createLocationSchema),
		resetForm: false
	});

	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };

	const selectedParent = $derived(
		data.locations.find((location) => location.id === $formData.parentId)
	);

	function selectParent(value: string) {
		$formData.parentId = value === topLevelValue ? '' : value;
	}
</script>

<svelte:head><title>Create physical location · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Physical locations"
		title="Create physical location"
		description="Add a campus, building, room, storage area, shelf, bin, or another physical place at the level of detail the institute needs."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/locations')}>
				<IconArrowLeft />Back to physical locations
			</Button>
		{/snippet}
	</PageHeader>

	<form method="POST" action="?/create" use:enhance class="space-y-6">
		<Card.Root class="max-w-3xl">
			<Card.Header>
				<Card.Title>Location details</Card.Title>
				<Card.Description>
					Choose top level for a campus or independent site, or place the location beneath any
					active location.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-5">
				<Form.Field {form} name="name">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Location name</Form.Label>
							<Input {...props} bind:value={$formData.name} aria-required="true" />
						{/snippet}
					</Form.Control>
					<Form.Description>
						Active locations beneath the same parent cannot share a name.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>

				<Form.Field {form} name="parentId">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>Parent location</Form.Label>
							<Select.Root
								type="single"
								bind:value={() => $formData.parentId || topLevelValue, selectParent}
								disabled={$submitting}
							>
								<Select.Trigger {...props} class="w-full cursor-pointer">
									{selectedParent?.path ?? 'Top-level location'}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value={topLevelValue} class="cursor-pointer">
										Top-level location
									</Select.Item>
									{#each data.locations as location (location.id)}
										<Select.Item value={location.id} label={location.path} class="cursor-pointer">
											{location.path}
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="parentId" value={$formData.parentId} />
						{/snippet}
					</Form.Control>
					<Form.Description>
						The hierarchy may be as deep as needed for precise stock location.
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
						This reason becomes part of the location's immutable structural history.
					</Form.Description>
					<Form.FieldErrors />
				</Form.Field>
			</Card.Content>
			<Card.Footer class="justify-end gap-2">
				<Button type="button" variant="outline" href={resolve('/locations')}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>Create physical location</Button>
			</Card.Footer>
		</Card.Root>
	</form>
</div>
