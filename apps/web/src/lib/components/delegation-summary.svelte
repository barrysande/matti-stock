<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import DelegationParticipants from '$lib/components/delegation-participants.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { delegatedItemCountLabel } from '$lib/helpers/delegation-presentation';
	import type { DelegationSummary as DelegationSummaryType } from '$lib/types/delegation';

	let {
		delegation,
		currentAccountId
	}: { delegation: DelegationSummaryType; currentAccountId: string } = $props();

	const relationship = $derived(
		delegation.delegator.accountId === currentAccountId
			? 'Proposed by you'
			: delegation.delegate.accountId === currentAccountId
				? 'Received by you'
				: 'Temporary coverage'
	);
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{relationship}
			</p>
			<DelegationParticipants delegator={delegation.delegator} delegate={delegation.delegate} />
		</div>
		<StatusBadge status={delegation.status} />
	</div>

	<div class="flex flex-wrap gap-2 text-sm">
		{#each delegation.assignments as assignment (assignment.id)}
			<span class="rounded-md bg-muted px-2 py-1">{assignment.role.name}</span>
		{/each}
	</div>

	<dl class="grid gap-2 text-sm sm:grid-cols-2">
		<div>
			<dt class="text-muted-foreground">When it applies (EAT)</dt>
			<dd>
				<DateTime value={delegation.startsAt} /> – <DateTime value={delegation.expiresAt} />
			</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">Assignments</dt>
			<dd>{delegatedItemCountLabel(delegation.effectiveItemCount, delegation.totalItemCount)}</dd>
		</div>
	</dl>
</div>
