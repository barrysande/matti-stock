import {
	boolean,
	check,
	type InferInput,
	literal,
	maxLength,
	object,
	optional,
	picklist,
	pipe,
	regex,
	string,
	trim,
	union
} from 'valibot';
import { reason, requiredText, uuid } from './common';

export const catalogueItemStockTypes = ['FIXED_NON_CONSUMABLE', 'CONSUMABLE'] as const;
export const catalogueItemTrackingMethods = ['INDIVIDUAL', 'QUANTITY'] as const;
export const catalogueItemIdentificationStatuses = ['CONFIRMED', 'PLACEHOLDER'] as const;

const reviewFingerprint = pipe(
	string(),
	regex(/^[0-9a-f]{64}$/, 'Refresh the similar-item review before continuing.')
);

function parsedKeywordLines(value: string) {
	return value
		.split(/\r?\n/)
		.map((keyword) => keyword.trim().replaceAll(/\s+/g, ' '))
		.filter(Boolean);
}

const keywordsText = pipe(
	string(),
	maxLength(2200, 'Keywords must be 2,200 characters or fewer.'),
	check((value) => parsedKeywordLines(value).length <= 20, 'Enter no more than 20 keywords.'),
	check(
		(value) => parsedKeywordLines(value).every((keyword) => keyword.length <= 100),
		'Each keyword must be 100 characters or fewer.'
	),
	check((value) => {
		const normalized = parsedKeywordLines(value).map((keyword) =>
			keyword.toLocaleLowerCase('en-US')
		);
		return new Set(normalized).size === normalized.length;
	}, 'Keywords must be unique.')
);

export const catalogueItemCreationSchema = object({
	name: requiredText('Name'),
	description: optional(pipe(string(), trim(), maxLength(5000)), ''),
	keywordsText,
	catalogueCategoryId: uuid,
	stockType: picklist(catalogueItemStockTypes, 'Select a stock type.'),
	trackingMethod: picklist(['', ...catalogueItemTrackingMethods], 'Select a tracking method.'),
	trackingMethodConfirmed: boolean(),
	baseUnitId: uuid,
	identificationStatus: picklist(
		catalogueItemIdentificationStatuses,
		'Select an identification status.'
	),
	reviewFingerprint: union([reviewFingerprint, literal('')]),
	confirmedNotInterchangeable: boolean(),
	similarityReason: optional(pipe(string(), trim(), maxLength(1000)), ''),
	reason
});

export const catalogueItemCreationDefaults = {
	name: '',
	description: '',
	keywordsText: '',
	catalogueCategoryId: '',
	stockType: 'FIXED_NON_CONSUMABLE',
	trackingMethod: '',
	trackingMethodConfirmed: false,
	baseUnitId: '',
	identificationStatus: 'CONFIRMED',
	reviewFingerprint: '',
	confirmedNotInterchangeable: false,
	similarityReason: '',
	reason: ''
} satisfies InferInput<typeof catalogueItemCreationSchema>;

const reviewConfirmation = {
	reviewFingerprint: union([reviewFingerprint, literal('')]),
	confirmedNotInterchangeable: boolean(),
	similarityReason: optional(pipe(string(), trim(), maxLength(1000)), '')
};

export const catalogueItemDetailsSchema = object({
	name: requiredText('Name'),
	description: optional(pipe(string(), trim(), maxLength(5000)), ''),
	keywordsText,
	identificationStatus: picklist(
		catalogueItemIdentificationStatuses,
		'Select an identification status.'
	),
	...reviewConfirmation,
	reason
});

export const catalogueItemClassificationSchema = object({
	catalogueCategoryId: uuid,
	stockType: picklist(catalogueItemStockTypes, 'Select a stock type.'),
	trackingMethod: picklist(catalogueItemTrackingMethods, 'Select a tracking method.'),
	trackingMethodConfirmed: boolean(),
	baseUnitId: uuid,
	...reviewConfirmation,
	reason
});

export const administerCatalogueItemSchema = object({ reason });

export const restoreCatalogueItemSchema = object({
	...reviewConfirmation,
	reason
});

export function catalogueItemKeywords(value: string) {
	return parsedKeywordLines(value);
}
