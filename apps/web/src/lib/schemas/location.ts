import { object } from 'valibot';
import { optionalUuid, reason, requiredText } from './common';

export const createLocationSchema = object({
	name: requiredText('Name'),
	parentId: optionalUuid,
	reason
});

export const renameLocationSchema = object({
	name: requiredText('Name'),
	reason
});

export const reparentLocationSchema = object({
	parentId: optionalUuid,
	reason
});

export const administerLocationSchema = object({
	reason
});
