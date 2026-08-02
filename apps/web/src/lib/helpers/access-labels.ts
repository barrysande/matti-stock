const permissionLabels: Record<string, string> = {
	'access.root': 'Manage accounts, roles, and organization',
	'adjustment.approve': 'Approve reconciliation adjustments',
	'adjustment.propose': 'Propose reconciliation adjustments',
	'catalogue.manage': 'Manage the stock catalogue',
	'condition.report': 'Report stock condition or missing stock',
	'condition.review': 'Review stock condition reports',
	'disposal.approve': 'Authorize stock disposal',
	'disposal.complete': 'Record physical stock disposal',
	'disposal.propose': 'Propose stock disposal',
	'intake.record': 'Record stock intake',
	'intake_correction.approve': 'Approve intake corrections',
	'intake_correction.propose': 'Propose intake corrections',
	'loss.confirm': 'Confirm stock as lost',
	'loss.investigate': 'Investigate missing stock',
	'movement.allocate': 'Allocate central stock',
	'movement.receive': 'Confirm stock receipt',
	'movement.release': 'Confirm stock release',
	'movement.request': 'Request stock movement',
	'reinstatement.approve': 'Approve stock reinstatement',
	'reinstatement.propose': 'Propose stock reinstatement',
	'repair.approve': 'Authorize stock repair costs',
	'repair.manage': 'Manage stock repairs',
	'stocktake.count': 'Count stock',
	'stocktake.finalize': 'Finalize stock takes',
	'stocktake.manage': 'Manage stock takes',
	'stocktake.review': 'Review stock takes',
	'valuation.record': 'Record stock valuations',
	'writeoff.approve': 'Approve stock write-offs',
	'writeoff.propose': 'Propose stock write-offs'
};

const scopeLabels: Record<string, (unitName?: string) => string> = {
	THIS_NODE_ONLY: (unitName) => (unitName ? `${unitName} only` : 'This unit only'),
	INCLUDE_DESCENDANTS: (unitName) =>
		unitName ? `${unitName} and its sub-units` : 'This unit and its sub-units'
};

function humanizeSystemTerm(systemTerm: string) {
	const words = systemTerm.replaceAll(/[._]/g, ' ');
	return words.replace(/^./, (character) => character.toUpperCase());
}

export function accessLabel(systemTerm: string, unitName?: string) {
	return (
		scopeLabels[systemTerm]?.(unitName) ??
		permissionLabels[systemTerm] ??
		humanizeSystemTerm(systemTerm)
	);
}
