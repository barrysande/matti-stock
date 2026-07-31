import * as v from 'valibot';
import { isoDateInput, optionalIsoDateInput, reason, uuid } from './common';
import { startModes } from './role-assignment';

export const createDelegationSchema = v.pipe(
	v.object({
		delegateAccountId: uuid,
		assignmentIds: v.pipe(v.array(uuid), v.minLength(1, 'Select at least one assignment.')),
		startMode: v.picklist(startModes),
		startsAt: optionalIsoDateInput,
		expiresAt: isoDateInput,
		reason
	}),
	v.forward(
		v.partialCheck(
			[['startMode'], ['startsAt']],
			(input) => input.startMode === 'NOW' || input.startsAt !== '',
			'Start date and time are required for a scheduled delegation.'
		),
		['startsAt']
	)
);

export const optionalReasonSchema = v.object({
	reason: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(1000)), '')
});

export const delegationReasonSchema = v.object({ reason });
