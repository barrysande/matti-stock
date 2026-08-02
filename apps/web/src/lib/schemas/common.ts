import {
	config,
	email as emailValidation,
	literal,
	maxLength,
	minLength,
	nonEmpty,
	optional,
	pipe,
	regex,
	string,
	toLowerCase,
	trim,
	union,
	uuid as uuidValidation
} from 'valibot';

export const requiredText = (label: string, maximum = 255) =>
	config(
		pipe(
			string(),
			trim(),
			nonEmpty(`${label} is required.`),
			maxLength(maximum, `${label} must be ${maximum} characters or fewer.`)
		),
		{ abortPipeEarly: true }
	);

export const email = config(
	pipe(
		string(),
		trim(),
		nonEmpty('Email is required.'),
		emailValidation('Enter a valid email address.'),
		maxLength(254, 'Email must be 254 characters or fewer.'),
		toLowerCase()
	),
	{ abortPipeEarly: true }
);

export const password = config(
	pipe(
		string(),
		minLength(8, 'Password must be at least 8 characters.'),
		maxLength(25, 'Password must be 25 characters or fewer.')
	),
	{ abortPipeEarly: true }
);

export const currentPassword = config(
	pipe(
		string(),
		nonEmpty('Current password is required.'),
		maxLength(25, 'Current password must be 25 characters or fewer.')
	),
	{ abortPipeEarly: true }
);

export const reason = requiredText('Reason', 1000);
export const uuid = pipe(string(), uuidValidation('Select a valid record.'));
export const optionalUuid = optional(union([uuid, literal('')]), '');
export const isoDateInput = pipe(string(), nonEmpty('Date and time are required.'));
export const optionalIsoDateInput = optional(string(), '');
export const fingerprint = pipe(
	string(),
	regex(/^[0-9a-f]{64}$/, 'Refresh the access-impact preview before continuing.')
);
