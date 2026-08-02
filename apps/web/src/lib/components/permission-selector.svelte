<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import {
		groupPermissions,
		permissionLabel,
		showPermissionDescription
	} from '$lib/helpers/permission-presentation';
	import type { PermissionMetadata } from '$lib/types/permission-presentation';
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		permissions,
		selected = $bindable([]),
		disabled = false,
		class: className,
		...restProps
	}: {
		permissions: PermissionMetadata[];
		selected?: string[];
		disabled?: boolean;
	} & HTMLAttributes<HTMLDivElement> = $props();

	const groups = $derived(groupPermissions(permissions));

	function setPermission(permissionKey: string, checked: boolean) {
		selected = checked
			? [...new Set([...selected, permissionKey])].sort()
			: selected.filter((key) => key !== permissionKey);
	}
</script>

<div class={cn('space-y-4', className)} {...restProps}>
	<div class="flex flex-wrap items-center justify-between gap-2">
		<p class="text-sm text-muted-foreground">
			Choose the actions this reusable role grants within an assigned organizational scope.
		</p>
		<Badge variant="secondary">{selected.length} selected</Badge>
	</div>

	<div class="grid gap-4 lg:grid-cols-2">
		{#each groups as group (group.key)}
			<fieldset class="min-w-0 rounded-xl border bg-card p-4">
				<legend class="px-1 font-heading text-sm font-semibold">{group.label}</legend>
				<div class="mt-1 divide-y">
					{#each group.permissions as permission (permission.key)}
						<label class="flex cursor-pointer items-start gap-3 py-3 first:pt-1 last:pb-0">
							<Checkbox
								checked={selected.includes(permission.key)}
								onCheckedChange={(checked) => setPermission(permission.key, checked)}
								{disabled}
								aria-label={permissionLabel(permission)}
							/>
							<span class="min-w-0">
								<span class="block text-sm leading-5 font-medium">
									{permissionLabel(permission)}
								</span>
								{#if showPermissionDescription(permission)}
									<span class="mt-0.5 block text-xs leading-5 text-muted-foreground">
										{permission.description}
									</span>
								{/if}
							</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{/each}
	</div>

	{#each selected as permissionKey (permissionKey)}
		<input type="hidden" name="permissionKeys" value={permissionKey} />
	{/each}
</div>
