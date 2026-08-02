<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import {
		groupPermissions,
		permissionLabel,
		showPermissionDescription
	} from '$lib/helpers/permission-presentation';
	import type { PermissionMetadata } from '$lib/types/permission-presentation';

	let {
		permissionKeys,
		permissions
	}: { permissionKeys: string[]; permissions: PermissionMetadata[] } = $props();

	const metadata = $derived(new Map(permissions.map((permission) => [permission.key, permission])));
	const selected = $derived(
		permissionKeys.map(
			(key) =>
				metadata.get(key) ?? {
					key,
					description: key,
					customRoleAssignable: false
				}
		)
	);
	const groups = $derived(groupPermissions(selected));
</script>

<div class="grid gap-3 lg:grid-cols-2">
	{#each groups as group (group.key)}
		<div class="rounded-xl border p-4">
			<div class="mb-3 flex items-center justify-between gap-3">
				<h4 class="font-heading text-sm font-semibold">{group.label}</h4>
				<Badge variant="secondary">{group.permissions.length}</Badge>
			</div>
			<ul class="space-y-3">
				{#each group.permissions as permission (permission.key)}
					<li>
						<div class="flex items-start justify-between gap-3">
							<p class="text-sm leading-5 font-medium">{permissionLabel(permission)}</p>
							{#if !permission.customRoleAssignable}
								<Badge variant="outline">System role only</Badge>
							{/if}
						</div>
						{#if showPermissionDescription(permission)}
							<p class="mt-0.5 text-xs leading-5 text-muted-foreground">
								{permission.description}
							</p>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>
