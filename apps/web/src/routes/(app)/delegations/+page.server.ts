import { getDelegations } from '$lib/server/api/delegations';
import { requireAuth } from '$lib/server/auth/guards';
import { delegationRelationship, delegationStatus } from '$lib/server/helpers/delegation-route';
import { positivePage } from '$lib/server/helpers/list-filters';
import type { DelegationStatus } from '$lib/types/delegation';
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

export const load: PageServerLoad = async (event) => {
	const account = requireAuth(event);

	const selectedRelationship = delegationRelationship(event.url.searchParams.get('relationship'));
	const query = {
		page: positivePage(event.url.searchParams.get('page')),
		accountId: selectedRelationship ? account.account.id : undefined,
		direction:
			selectedRelationship === 'PROPOSED_BY_ME'
				? ('OUTGOING' as const)
				: selectedRelationship === 'RECEIVED_BY_ME'
					? ('INCOMING' as const)
					: undefined,
		status: delegationStatus(event.url.searchParams.get('status'), statuses)
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
