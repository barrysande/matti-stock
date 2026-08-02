import { array, config, minLength, nonEmpty, object, pipe, string, trim } from 'valibot';
import { reason, requiredText } from './common';

const permissionKeys = config(
	pipe(array(pipe(string(), trim(), nonEmpty())), minLength(1, 'Select at least one permission.')),
	{ abortPipeEarly: true }
);

export const createRoleSchema = object({
	name: requiredText('Name'),
	permissionKeys,
	reason
});

export const renameRoleSchema = object({
	name: requiredText('Name'),
	reason
});

export const replaceRolePermissionsSchema = object({
	permissionKeys,
	reason
});

export const administerRoleSchema = object({ reason });
