<script lang="ts">
	import { resolve } from '$app/paths';
	import PageHeader from '$lib/components/page-header.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Form from '$lib/components/ui/form/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { baseUnitDetailsSchema } from '$lib/schemas/base-unit';
	import { IconArrowLeft, IconCalculator, IconRulerMeasure } from '@tabler/icons-svelte';
	import { superForm } from 'sveltekit-superforms';
	import { valibotClient } from 'sveltekit-superforms/adapters';

	let { data } = $props();

	// svelte-ignore state_referenced_locally
	const form = superForm(data.form, {
		id: 'base-unit-create',
		validators: valibotClient(baseUnitDetailsSchema),
		resetForm: false
	});
	const { form: formData, enhance, submitting, capture, restore } = form;
	export const snapshot = { capture, restore };

	function selectKind(value: string) {
		if (value !== 'COUNTABLE' && value !== 'MEASURED') return;
		$formData.kind = value;
		$formData.precision = value === 'COUNTABLE' ? '0' : '3';
	}

	function precisionLabel(value: string) {
		return `${value} decimal ${value === '1' ? 'place' : 'places'}`;
	}
</script>

<svelte:head><title>Create base unit · MaTTI Stock</title></svelte:head>

<div class="space-y-6 pb-8">
	<PageHeader
		eyebrow="Base units"
		title="Create base unit"
		description="Define the one unit in which a catalogue item's quantities will be recorded and validated."
	>
		{#snippet actions()}
			<Button type="button" variant="outline" href={resolve('/base-units')}
				><IconArrowLeft />Back to base units</Button
			>
		{/snippet}
	</PageHeader>

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header
				><div class="flex items-start gap-3">
					<div class="rounded-lg bg-primary/10 p-2 text-primary"><IconCalculator /></div>
					<div>
						<Card.Title>Countable</Card.Title><Card.Description
							>For pieces, packs, boxes, and other quantities that must remain whole.</Card.Description
						>
					</div>
				</div></Card.Header
			>
			<Card.Content class="text-sm leading-6 text-muted-foreground"
				>A countable unit always uses zero decimal places. A quantity such as 2.5 pieces is
				rejected.</Card.Content
			>
		</Card.Root>
		<Card.Root>
			<Card.Header
				><div class="flex items-start gap-3">
					<div class="rounded-lg bg-primary/10 p-2 text-primary"><IconRulerMeasure /></div>
					<div>
						<Card.Title>Measured</Card.Title><Card.Description
							>For weight, volume, length, and other quantities that may contain fractions.</Card.Description
						>
					</div>
				</div></Card.Header
			>
			<Card.Content class="text-sm leading-6 text-muted-foreground"
				>Choose one to three decimal places. Three is the default and records values as precisely as
				1.125.</Card.Content
			>
		</Card.Root>
	</div>

	<form method="POST" action="?/create" use:enhance>
		<Card.Root class="max-w-3xl">
			<Card.Header
				><Card.Title>Unit definition</Card.Title><Card.Description
					>Names and symbols must both be unique among active base units.</Card.Description
				></Card.Header
			>
			<Card.Content class="space-y-5">
				<div class="grid gap-5 sm:grid-cols-2">
					<Form.Field {form} name="name"
						><Form.Control
							>{#snippet children({ props })}<Form.Label>Unit name</Form.Label><Input
									{...props}
									bind:value={$formData.name}
									placeholder="Piece"
									aria-required="true"
								/>{/snippet}</Form.Control
						><Form.FieldErrors /></Form.Field
					>
					<Form.Field {form} name="symbol"
						><Form.Control
							>{#snippet children({ props })}<Form.Label>Symbol</Form.Label><Input
									{...props}
									bind:value={$formData.symbol}
									placeholder="pc"
									aria-required="true"
								/>{/snippet}</Form.Control
						><Form.FieldErrors /></Form.Field
					>
				</div>

				<div class="grid gap-5 sm:grid-cols-2">
					<Form.Field {form} name="kind">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Quantity kind</Form.Label><Select.Root
									type="single"
									bind:value={() => $formData.kind, selectKind}
									disabled={$submitting}
									><Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true"
										>{$formData.kind === 'COUNTABLE' ? 'Countable' : 'Measured'}</Select.Trigger
									><Select.Content
										><Select.Item value="COUNTABLE">Countable</Select.Item><Select.Item
											value="MEASURED">Measured</Select.Item
										></Select.Content
									></Select.Root
								><input type="hidden" name="kind" value={$formData.kind} />{/snippet}</Form.Control
						><Form.FieldErrors />
					</Form.Field>
					<Form.Field {form} name="precision">
						<Form.Control
							>{#snippet children({ props })}<Form.Label>Decimal places</Form.Label
								>{#if $formData.kind === 'COUNTABLE'}<Input
										{...props}
										value="0 — whole quantities only"
										disabled
									/>{:else}<Select.Root
										type="single"
										bind:value={$formData.precision}
										disabled={$submitting}
										><Select.Trigger {...props} class="w-full cursor-pointer" aria-required="true"
											>{precisionLabel($formData.precision)}</Select.Trigger
										><Select.Content
											>{#each ['1', '2', '3'] as precision}<Select.Item value={precision}
													>{precisionLabel(precision)}</Select.Item
												>{/each}</Select.Content
										></Select.Root
									>{/if}<input
									type="hidden"
									name="precision"
									value={$formData.precision}
								/>{/snippet}</Form.Control
						><Form.Description
							>{$formData.kind === 'COUNTABLE'
								? 'Fractions are not permitted.'
								: 'This is the maximum precision allowed for recorded quantities.'}</Form.Description
						><Form.FieldErrors />
					</Form.Field>
				</div>

				<Form.Field {form} name="reason"
					><Form.Control
						>{#snippet children({ props })}<Form.Label>Administrative reason</Form.Label><Textarea
								{...props}
								bind:value={$formData.reason}
								aria-required="true"
							/>{/snippet}</Form.Control
					><Form.Description
						>This reason becomes part of the unit's immutable history.</Form.Description
					><Form.FieldErrors /></Form.Field
				>
			</Card.Content>
			<Card.Footer class="flex-col-reverse gap-3 sm:flex-row sm:justify-end"
				><Button type="button" variant="outline" href={resolve('/base-units')}>Cancel</Button
				><Button type="submit" disabled={$submitting}>Create base unit</Button></Card.Footer
			>
		</Card.Root>
	</form>
</div>
