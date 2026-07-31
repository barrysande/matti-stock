import * as v from 'valibot';
import { optionalUuid, reason, requiredText } from './common';

export const createLocationSchema = v.object({
	name: requiredText('Name'),
	parentId: optionalUuid,
	reason
});

export const renameLocationSchema = v.object({
	name: requiredText('Name'),
	reason
});

export const reparentLocationSchema = v.object({
	parentId: optionalUuid,
	reason
});
