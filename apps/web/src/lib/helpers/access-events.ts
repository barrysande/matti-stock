const accountAccessEventLabels = {
	MASTER_ADMIN_BOOTSTRAPPED: 'Master admin bootstrapped',
	ACCOUNT_CREATED: 'Account created',
	ACCOUNT_ACTIVATED: 'Account activated',
	ACCOUNT_SUSPENDED: 'Account suspended',
	ACCOUNT_SUSPENSION_ENDED: 'Account suspension ended',
	ACCOUNT_DEACTIVATED: 'Account deactivated',
	ACCOUNT_REACTIVATED: 'Account reactivated',
	LOGIN_SUCCEEDED: 'Login succeeded',
	LOGIN_REJECTED_ACCOUNT_STATUS: 'Login rejected for account status',
	LOGOUT_COMPLETED: 'Logout completed',
	SESSION_INVALIDATED: 'Session invalidated',
	PASSWORD_SETUP_REQUESTED: 'Password setup requested',
	PASSWORD_RESET_REQUESTED: 'Password reset requested',
	PASSWORD_RESET_REJECTED_ACCOUNT_STATUS: 'Password reset rejected for account status',
	PASSWORD_SETUP_REJECTED: 'Password setup rejected',
	PASSWORD_RESET_REJECTED: 'Password reset rejected',
	ACCOUNT_PASSWORD_SET: 'Account password set',
	PASSWORD_RESET_COMPLETED: 'Password reset completed',
	PASSWORD_CHANGE_REJECTED: 'Password change rejected',
	PASSWORD_CHANGED: 'Password changed',
	ROLE_ASSIGNMENT_GRANTED: 'Role assignment granted',
	ROLE_ASSIGNMENT_ENDED: 'Role assignment ended',
	ROLE_ASSIGNMENT_CANCELLED: 'Role assignment cancelled',
	ROLE_ASSIGNMENT_REPLACED: 'Role assignment replaced',
	DELEGATION_PROPOSED: 'Delegation proposed',
	DELEGATION_ACCEPTED: 'Delegation accepted',
	DELEGATION_REJECTED: 'Delegation rejected',
	DELEGATION_REVOKED: 'Delegation revoked',
	DELEGATION_RELINQUISHED: 'Delegation relinquished',
	DELEGATION_ADMINISTRATIVELY_TERMINATED: 'Delegation ended by administrator'
} as const;

export const accountAccessEventOptions = Object.entries(accountAccessEventLabels).map(
	([value, label]) => ({ value, label })
);

function comparableEventType(value: string) {
	return value
		.trim()
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.toLowerCase();
}

function snakeCaseEventType(value: string) {
	return value
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[^a-zA-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.toUpperCase();
}

export function accessEventTypeFromInput(input: string | undefined) {
	if (!input) {
		return undefined;
	}

	const comparableInput = comparableEventType(input);
	const match = accountAccessEventOptions.find(
		(option) =>
			comparableEventType(option.value) === comparableInput ||
			comparableEventType(option.label) === comparableInput
	);
	const normalizedInput = snakeCaseEventType(input);

	return match?.value ?? (normalizedInput || input.trim().toUpperCase());
}

export function accessEventTypeLabel(value: string) {
	return (
		accountAccessEventLabels[value as keyof typeof accountAccessEventLabels] ??
		value
			.toLowerCase()
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ')
	);
}
