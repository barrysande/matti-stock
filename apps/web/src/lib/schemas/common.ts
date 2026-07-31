import * as v from 'valibot';

export const requiredText = (label: string, maximum = 255) =>
	v.pipe(
		v.string(),
		v.trim(),
		v.nonEmpty(`${label} is required.`),
		v.maxLength(maximum, `${label} must be ${maximum} characters or fewer.`)
	);

export const email = v.pipe(
	v.string(),
	v.trim(),
	v.nonEmpty('Email is required.'),
	v.email('Enter a valid email address.'),
	v.maxLength(254, 'Email must be 254 characters or fewer.'),
	v.toLowerCase()
);

export const password = v.pipe(
	v.string(),
	v.minLength(8, 'Password must be at least 8 characters.'),
	v.maxLength(25, 'Password must be 25 characters or fewer.')
);

export const currentPassword = v.pipe(
	v.string(),
	v.nonEmpty('Current password is required.'),
	v.maxLength(25, 'Current password must be 25 characters or fewer.')
);

export const reason = requiredText('Reason', 1000);
export const uuid = v.pipe(v.string(), v.uuid('Select a valid record.'));
export const optionalUuid = v.optional(v.union([uuid, v.literal('')]), '');
export const isoDateInput = v.pipe(v.string(), v.nonEmpty('Date and time are required.'));
export const optionalIsoDateInput = v.optional(v.string(), '');
export const fingerprint = v.pipe(
	v.string(),
	v.regex(/^[0-9a-f]{64}$/, 'Refresh the access-impact preview before continuing.')
);

