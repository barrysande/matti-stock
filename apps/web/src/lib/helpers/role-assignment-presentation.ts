const ineffectiveReasonLabels: Record<string, string> = {
	ACCOUNT_NOT_ACTIVE: 'The account is not active.',
	ROLE_ARCHIVED: 'The assigned role is archived.',
	SCOPE_ARCHIVED: 'The area where this assignment applies is archived.',
	NOT_STARTED: 'The scheduled start has not arrived.',
	EXPIRED: 'The assignment has expired.',
	TERMINATED: 'The assignment has been ended, cancelled, or replaced.'
};

export function ineffectiveReasonLabel(reason: string) {
	return ineffectiveReasonLabels[reason] ?? reason.toLowerCase().replaceAll('_', ' ');
}
