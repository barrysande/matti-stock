const accessLabels: Record<string, (unitName?: string) => string> = {
	'access.root': () => 'Manage accounts, roles, and organization',
	THIS_NODE_ONLY: (unitName) => (unitName ? `${unitName} only` : 'This unit only'),
	INCLUDE_DESCENDANTS: (unitName) =>
		unitName ? `${unitName} and its sub-units` : 'This unit and its sub-units'
};

export function accessLabel(systemTerm: string, unitName?: string) {
	return accessLabels[systemTerm]?.(unitName) ?? systemTerm;
}
