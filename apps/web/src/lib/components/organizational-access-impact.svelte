<script lang="ts">
	import { accessLabel } from '$lib/helpers/access-labels';
	import type { OrganizationalAccessImpact } from '$lib/schemas/organization-unit';
	import DateTime from '$lib/components/date-time.svelte';
	import StatusBadge from '$lib/components/status-badge.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { IconCheck } from '@tabler/icons-svelte';

	let {
		impact,
		emptyDescription = 'No active or upcoming role assignment changes its organizational reach.'
	}: {
		impact: OrganizationalAccessImpact;
		emptyDescription?: string;
	} = $props();
</script>

{#if impact.assignments.length}
	<ul class="grid gap-4 lg:grid-cols-2">
		{#each impact.assignments as assignment (assignment.id)}
			<li>
				<Card.Root class="h-full border border-border shadow-none">
					<Card.Header>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<Card.Title class="text-base">{assignment.account.displayName}</Card.Title>
								<Card.Description>
									{assignment.role.name} · Version {assignment.role.version}
								</Card.Description>
							</div>
							<div>
								<span class="sr-only">Account status: </span>
								<StatusBadge status={assignment.account.status} />
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						<dl class="grid gap-3 text-sm sm:grid-cols-2">
							<div class="sm:col-span-2">
								<dt class="text-muted-foreground">Organizational scope</dt>
								<dd>{accessLabel(assignment.scope.mode, assignment.scope.name)}</dd>
							</div>
							<div>
								<dt class="text-muted-foreground">Effective from</dt>
								<dd><DateTime value={assignment.startsAt} /></dd>
							</div>
							<div>
								<dt class="text-muted-foreground">Effective until</dt>
								<dd><DateTime value={assignment.expiresAt} fallback="No expiry" /></dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ul>
{:else}
	<div class="flex items-start gap-3 rounded-2xl border p-4">
		<IconCheck class="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
		<div>
			<p class="font-medium">No assignments are affected</p>
			<p class="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
		</div>
	</div>
{/if}
