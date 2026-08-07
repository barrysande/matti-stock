import { object } from 'valibot';
import { optionalUuid, reason, requiredText } from './common';

const categoryDetails = {
	name: requiredText('Name'),
	description: requiredText('Description', 5000)
};

export const createCatalogueCategorySchema = object({
	...categoryDetails,
	parentId: optionalUuid,
	reason
});

export const updateCatalogueCategoryDetailsSchema = object({
	...categoryDetails,
	reason
});

export const reparentCatalogueCategorySchema = object({
	parentId: optionalUuid,
	reason
});

export const administerCatalogueCategorySchema = object({ reason });
