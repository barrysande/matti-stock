import {
	array,
	forward,
	maxLength,
	minLength,
	object,
	optional,
	partialCheck,
	picklist,
	pipe,
	string,
	trim
} from 'valibot';
import { isoDateInput, optionalIsoDateInput, reason, uuid } from './common';
import { startModes } from './role-assignment';

export const createDelegationSchema = pipe(
	object({
		delegateAccountId: uuid,
		assignmentIds: pipe(array(uuid), minLength(1, 'Select at least one assignment.')),
		startMode: picklist(startModes),
		startsAt: optionalIsoDateInput,
		expiresAt: isoDateInput,
		reason
	}),
	forward(
		partialCheck(
			[['startMode'], ['startsAt']],
			(input) => input.startMode === 'NOW' || input.startsAt !== '',
			'Start date and time are required for a scheduled delegation.'
		),
		['startsAt']
	)
);

export const optionalReasonSchema = object({
	reason: optional(pipe(string(), trim(), maxLength(1000)), '')
});

export const delegationReasonSchema = object({ reason });
