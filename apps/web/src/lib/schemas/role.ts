import { array, minLength, nonEmpty, object, pipe, string, trim } from 'valibot';
import { reason, requiredText } from './common';

const permissionKeys = pipe(
	array(pipe(string(), trim(), nonEmpty())),
	minLength(1, 'Select at least one permission.')
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
