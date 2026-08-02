<script lang="ts">
	import DateTime from '$lib/components/date-time.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import { accessLabel } from '$lib/helpers/access-labels';
	import type { RoleAssignmentSummary } from '$lib/types/role-assignment';

	let {
		assignment,
		showAccount = true
	}: { assignment: RoleAssignmentSummary; showAccount?: boolean } = $props();
</script>

<div class="space-y-3">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0">
			<p class="font-medium">{assignment.role.name}</p>
		</div>
		<StatusBadge status={assignment.status} />
	</div>
	{#if showAccount}
		<div>
			<p class="text-sm font-medium">{assignment.account.displayName}</p>
			<p class="text-xs text-muted-foreground">{assignment.account.email}</p>
		</div>
	{/if}
	<dl class="grid gap-2 text-sm sm:grid-cols-2">
		<div>
			<dt class="text-muted-foreground">Applies within</dt>
			<dd>{assignment.scope.path}</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">Coverage</dt>
			<dd>{accessLabel(assignment.scope.mode, assignment.scope.name)}</dd>
		</div>
		<div>
			<dt class="text-muted-foreground">Starts (EAT)</dt>
			<dd><DateTime value={assignment.startsAt} /></dd>
		</div>
		<div>
			<dt class="text-muted-foreground">Expires (EAT)</dt>
			<dd><DateTime value={assignment.expiresAt} fallback="No expiry" /></dd>
		</div>
	</dl>
</div>
