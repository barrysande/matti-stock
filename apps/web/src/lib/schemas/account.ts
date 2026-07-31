import * as v from 'valibot';
import { email, reason, requiredText } from './common';

export const accountStatuses = ['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;
export const accountSetupStatuses = ['PENDING', 'COMPLETE'] as const;

export const createAccountSchema = v.object({
	displayName: requiredText('Display name'),
	staffNumber: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(100)), ''),
	email,
	reason
});

export const reasonSchema = v.object({ reason });
