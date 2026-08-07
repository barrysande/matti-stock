import { array, boolean, check, minLength, object, pipe, regex, string } from 'valibot';
import { optionalUuid, reason, requiredText, uuid } from './common';

const mergeFingerprint = pipe(
	string(),
	regex(/^[0-9a-f]{64}$/, 'Refresh the category-merge preview before continuing.')
);

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

export const previewCatalogueCategoryMergeSchema = object({ targetCategoryId: uuid });

export const moveCatalogueCategoryChildrenSchema = object({
	childIds: pipe(array(uuid), minLength(1, 'Select at least one active child.')),
	parentId: optionalUuid,
	reason
});

export const applyCatalogueCategoryMergeSchema = object({
	targetCategoryId: uuid,
	previewFingerprint: mergeFingerprint,
	terminalConfirmed: pipe(
		boolean(),
		check((value) => value, 'Confirm that this merge is terminal.')
	),
	reason
});
