<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { accessLabel } from '$lib/helpers/access-labels';
	import type { DelegationAssignmentPresentation } from '$lib/types/delegation';

	let {
		assignment,
		showPermissions = false,
		showEffectiveness = false
	}: {
		assignment: DelegationAssignmentPresentation;
		showPermissions?: boolean;
		showEffectiveness?: boolean;
	} = $props();

	const path = $derived(
		assignment.source?.scope.path ?? assignment.scope.path ?? assignment.scope.name
	);
	const startsAt = $derived(assignment.source?.startsAt ?? assignment.startsAt);
	const expiresAt = $derived(assignment.source?.expiresAt ?? assignment.expiresAt);
	const permissionKeys = $derived(
		assignment.source?.role.permissionKeys ?? assignment.role.permissionKeys ?? []
	);
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<p class="font-medium">{assignment.role.name}</p>
			<p class="text-sm text-muted-foreground">{path}</p>
		</div>
		{#if showEffectiveness && assignment.sourceStatus}
			<StatusBadge status={assignment.sourceStatus} />
		{/if}
	</div>

	<dl class="grid gap-2 text-sm sm:grid-cols-2">
		<div>
			<dt class="text-muted-foreground">Coverage</dt>
			<dd>{accessLabel(assignment.scope.mode, assignment.scope.name)}</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">Assignment interval (EAT)</dt>
			<dd>
				<DateTime value={startsAt} /> – <DateTime value={expiresAt} fallback="No expiry" />
			</dd>
		</div>
	</dl>

	{#if showEffectiveness}
		<p
			class:text-destructive={assignment.effectiveNow === false}
			class="text-sm text-muted-foreground"
		>
			{assignment.effectiveNow
				? 'This assignment currently contributes temporary access.'
				: 'This assignment does not currently contribute temporary access.'}
		</p>
	{/if}

	{#if showPermissions}
		<div>
			<p class="mb-2 text-sm text-muted-foreground">Permissions included</p>
			<div class="flex flex-wrap gap-2">
				{#each permissionKeys as permissionKey (permissionKey)}
					<Badge variant="secondary">{accessLabel(permissionKey)}</Badge>
				{/each}
			</div>
		</div>
	{/if}
</div>
