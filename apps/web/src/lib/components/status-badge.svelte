<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { ComponentProps } from 'svelte';

	let { status }: { status: string } = $props();

	const positive = new Set(['ACTIVE', 'COMPLETE', 'ACCEPTED']);
	const negative = new Set([
		'SUSPENDED',
		'DEACTIVATED',
		'REJECTED',
		'REVOKED',
		'RELINQUISHED',
		'ADMINISTRATIVELY_TERMINATED',
		'CANCELLED',
		'ENDED',
		'EXPIRED'
	]);

	const variant = $derived<ComponentProps<typeof Badge>['variant']>(
		positive.has(status) ? 'default' : negative.has(status) ? 'destructive' : 'secondary'
	);
	const label = $derived(
		status
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	);
</script>

<Badge {variant}>{label}</Badge>

