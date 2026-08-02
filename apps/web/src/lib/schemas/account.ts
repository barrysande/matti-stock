import { maxLength, object, optional, pipe, string, trim } from 'valibot';
import { email, reason, requiredText } from './common';

export const accountStatuses = ['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;
export const accountSetupStatuses = ['PENDING', 'COMPLETE'] as const;

export const createAccountSchema = object({
	displayName: requiredText('Display name'),
	staffNumber: optional(pipe(string(), trim(), maxLength(100)), ''),
	email,
	reason
});

export const reasonSchema = object({ reason });
