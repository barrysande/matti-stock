import { forward, object, partialCheck, picklist, pipe } from 'valibot';
import { optionalIsoDateInput, reason, uuid } from './common';

export const scopeModes = ['THIS_NODE_ONLY', 'INCLUDE_DESCENDANTS'] as const;
export const startModes = ['NOW', 'SCHEDULED'] as const;

export const grantRoleAssignmentSchema = pipe(
	object({
		accountId: uuid,
		roleId: uuid,
		scopeOrganizationalUnitId: uuid,
		scopeMode: picklist(scopeModes),
		startMode: picklist(startModes),
		startsAt: optionalIsoDateInput,
		expiresAt: optionalIsoDateInput,
		reason
	}),
	forward(
		partialCheck(
			[['startMode'], ['startsAt']],
			(input) => input.startMode === 'NOW' || input.startsAt !== '',
			'Start date and time are required for a scheduled assignment.'
		),
		['startsAt']
	)
);
