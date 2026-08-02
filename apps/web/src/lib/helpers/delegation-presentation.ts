export function delegationRelationshipLabel(relationship?: string) {
	if (relationship === 'PROPOSED_BY_ME') return 'Proposed by me';
	if (relationship === 'RECEIVED_BY_ME') return 'Received by me';
	return 'All visible';
}

export function delegationStatusLabel(status: string) {
	if (status === 'ADMINISTRATIVELY_TERMINATED') return 'Ended by an administrator';
	return status
		.toLowerCase()
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function delegatedItemCountLabel(effective: number, total: number) {
	if (effective === total)
		return `${total} ${total === 1 ? 'assignment' : 'assignments'} effective`;
	return `${effective} of ${total} assignments effective`;
}

const delegationErrorLabels: Record<string, string> = {
	'A startsAt value cannot be supplied when a delegation starts now.':
		'Choose either an immediate start or an exact scheduled start.',
	'An exact startsAt value is required for a scheduled delegation.':
		'Choose an exact start date and time for scheduled coverage.',
	'A scheduled delegation must start in the future.':
		'Scheduled coverage must start in the future.',
	'The delegation expiry must be later than its start time.':
		'The expiry must be later than the start.',
	'A source assignment may appear only once in a delegation proposal.':
		'Each assignment may be selected only once.',
	'Every source must be a currently effective direct assignment held by you.':
		'One or more selected assignments can no longer be provided by you.',
	'MASTER_ADMIN and access.root authority cannot be delegated.':
		'This protected access cannot be provided temporarily.',
	'A delegation cannot expire after the known end of a source assignment.':
		'The expiry cannot be later than the end of a selected assignment.',
	'A source assignment already has an overlapping pending or accepted delegation.':
		'A selected assignment already has temporary coverage during these dates.',
	'An account cannot delegate authority to itself.':
		'Choose another account to receive temporary coverage.',
	'Only an active account may propose a delegation.':
		'Only an active account may propose temporary coverage.',
	'Authority may be delegated only to an active account.':
		'Temporary coverage may be proposed only to an active account.',
	'Every source must share an organizational branch with a direct delegate assignment that remains open through the delegation expiry.':
		'The selected recipient is no longer eligible for every assignment through the chosen expiry.',
	'Only the proposed delegate may respond to this delegation.':
		'Only the selected recipient may respond to this proposal.',
	'This delegation proposal has already received a response.':
		'This proposal has already received a response.',
	'This delegation proposal has already been terminated.': 'This proposal has already ended.',
	'An expired delegation proposal can no longer receive a response.':
		'An expired proposal can no longer receive a response.',
	'Only an active account may respond to a delegation.':
		'Only an active account may respond to temporary coverage.',
	'The delegation cannot be accepted because a source is no longer effective.':
		'This proposal cannot be accepted because an included assignment is no longer effective.',
	'The delegation cannot be accepted because the delegate no longer has compatible direct organizational authority through its expiry.':
		'This proposal cannot be accepted because the recipient is no longer eligible through its expiry.',
	'This delegation has already been terminated.': 'This temporary coverage has already ended.',
	'A rejected delegation cannot be terminated.': 'A declined proposal cannot be ended again.',
	'An expired delegation cannot be terminated early.':
		'Expired temporary coverage cannot be ended again.',
	'Only an active account may terminate a delegation.':
		'Only an active account may end temporary coverage.',
	'Only the delegator may revoke this delegation.':
		'Only the proposer may withdraw or end this temporary coverage.',
	'Only the delegate may relinquish this delegation.':
		'Only the recipient may relinquish this temporary coverage.',
	'Only an accepted delegation may be relinquished.':
		'Only accepted temporary coverage may be relinquished.'
};

export function delegationErrorMessage(message: string, fallback: string) {
	return delegationErrorLabels[message] ?? fallback;
}
