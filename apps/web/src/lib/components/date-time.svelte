<script lang="ts">
	let {
		value,
		fallback = '—'
	}: { value: unknown; fallback?: string } = $props();

	const date = $derived(
		value instanceof Date
			? value
			: typeof value === 'string' || typeof value === 'number'
				? new Date(value)
				: value && typeof value === 'object' && 'toString' in value
					? new Date(String(value))
					: null
	);
	const valid = $derived(date !== null && !Number.isNaN(date.getTime()));
	const formatted = $derived(
		valid
			? new Intl.DateTimeFormat('en-KE', {
					dateStyle: 'medium',
					timeStyle: 'short',
					timeZone: 'Africa/Nairobi'
				}).format(date!)
			: fallback
	);
</script>

{#if valid}
	<time datetime={date!.toISOString()}>{formatted}</time>
{:else}
	{fallback}
{/if}
