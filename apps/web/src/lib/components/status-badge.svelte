<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import type { ComponentProps } from 'svelte';

	let { status }: { status: string } = $props();

	const positive = new Set(['ACTIVE', 'COMPLETE', 'ACCEPTED']);
	const negative = new Set([
		'ARCHIVED',
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
	const friendlyLabels: Record<string, string> = {
		ADMINISTRATIVELY_TERMINATED: 'Ended by administrator'
	};
	const label = $derived(
		friendlyLabels[status] ??
			status
				.toLowerCase()
				.split('_')
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join(' ')
	);
</script>

<Badge {variant}>{label}</Badge>
