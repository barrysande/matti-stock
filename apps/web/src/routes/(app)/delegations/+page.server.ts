import { getDelegations } from '$lib/server/api/delegations';
import { requireAuth } from '$lib/server/auth/guards';
import { positivePage } from '$lib/server/helpers/list-filters';
import type { DelegationRelationship, DelegationStatus } from '$lib/types/delegation';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const statuses: DelegationStatus[] = [
	'PENDING',
	'UPCOMING',
	'ACTIVE',
	'REJECTED',
	'EXPIRED',
	'REVOKED',
	'RELINQUISHED',
	'ADMINISTRATIVELY_TERMINATED'
];

function delegationStatus(value: string | null) {
	return statuses.find((status) => status === value);
}

function relationship(value: string | null): DelegationRelationship | undefined {
	if (value === 'PROPOSED_BY_ME' || value === 'RECEIVED_BY_ME') return value;
}

export const load: PageServerLoad = async (event) => {
	const account = requireAuth(event);
	const selectedRelationship = relationship(event.url.searchParams.get('relationship'));
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		accountId: selectedRelationship ? account.account.id : undefined,
		direction:
			selectedRelationship === 'PROPOSED_BY_ME'
				? ('OUTGOING' as const)
				: selectedRelationship === 'RECEIVED_BY_ME'
					? ('INCOMING' as const)
					: undefined,
		status: delegationStatus(event.url.searchParams.get('status'))
	};
	const [directory, directoryError] = await getDelegations(event, query);
	if (directoryError)
		error(directoryError.status ?? 502, 'Temporary coverage records could not be loaded.');

	return {
		directory,
		currentAccountId: account.account.id,
		filters: {
			relationship: selectedRelationship,
			status: query.status
		}
	};
};
