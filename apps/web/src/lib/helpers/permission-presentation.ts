import { accessLabel } from '$lib/helpers/access-labels';
import type { PermissionMetadata } from '$lib/types/permission-presentation';

const groupLabels: Record<string, string> = {
	access: 'Access administration',
	adjustment: 'Reconciliation adjustments',
	catalogue: 'Catalogue',
	condition: 'Condition and loss reporting',
	disposal: 'Disposal',
	intake: 'Stock intake',
	intake_correction: 'Intake corrections',
	loss: 'Missing stock',
	movement: 'Stock movement',
	reinstatement: 'Reinstatement',
	repair: 'Repairs',
	stocktake: 'Stock take',
	valuation: 'Valuation',
	writeoff: 'Write-off'
};

export function permissionGroupKey(permissionKey: string) {
	return permissionKey.split('.')[0] ?? permissionKey;
}

export function permissionGroupLabel(group: string) {
	return (
		groupLabels[group] ??
		group.replaceAll('_', ' ').replace(/^./, (character) => character.toUpperCase())
	);
}

export function permissionLabel(permission: PermissionMetadata) {
	return accessLabel(permission.key);
}

export function showPermissionDescription(permission: PermissionMetadata) {
	return (
		permission.description !== permission.key &&
		permission.description !== permissionLabel(permission)
	);
}

export function groupPermissions(permissions: PermissionMetadata[]) {
	const groups = new Map<string, PermissionMetadata[]>();
	for (const permission of permissions) {
		const group = permissionGroupKey(permission.key);
		groups.set(group, [...(groups.get(group) ?? []), permission]);
	}

	return [...groups.entries()].map(([key, items]) => ({
		key,
		label: permissionGroupLabel(key),
		permissions: items
	}));
}
