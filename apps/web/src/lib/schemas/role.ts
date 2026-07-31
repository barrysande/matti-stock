import * as v from 'valibot';
import { reason, requiredText } from './common';

const permissionKeys = v.pipe(
	v.array(v.pipe(v.string(), v.trim(), v.nonEmpty())),
	v.minLength(1, 'Select at least one permission.')
);

export const createRoleSchema = v.object({
	name: requiredText('Name'),
	permissionKeys,
	reason
});

export const renameRoleSchema = v.object({
	name: requiredText('Name'),
	reason
});

export const replaceRolePermissionsSchema = v.object({
	permissionKeys,
	reason
});

