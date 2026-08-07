import {
	catalogueItemCreationDefaults,
	catalogueItemCreationSchema
} from '$lib/schemas/catalogue-item';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { InferOutput } from 'valibot';

export const catalogueItemCreationFormId = 'catalogue-item-create';

export const catalogueItemDetailFormIds = {
	details: 'catalogue-item-details',
	classification: 'catalogue-item-classification',
	archive: 'catalogue-item-archive',
	restore: 'catalogue-item-restore'
} as const;

export function initializeCatalogueItemCreationForm() {
	return superValidate({ ...catalogueItemCreationDefaults }, valibot(catalogueItemCreationSchema), {
		id: catalogueItemCreationFormId
	});
}

export function catalogueItemReviewedSelection(
	form: Pick<
		InferOutput<typeof catalogueItemCreationSchema>,
		'name' | 'keywordsText' | 'catalogueCategoryId' | 'stockType'
	>
) {
	return {
		name: form.name,
		keywordsText: form.keywordsText,
		catalogueCategoryId: form.catalogueCategoryId,
		stockType: form.stockType
	};
}

export function catalogueItemReviewConfirmation(data: {
	reviewFingerprint: string;
	confirmedNotInterchangeable: boolean;
	similarityReason: string;
}) {
	return {
		reviewFingerprint: data.reviewFingerprint || undefined,
		confirmedNotInterchangeable: data.confirmedNotInterchangeable || undefined,
		similarityReason: data.similarityReason || null
	};
}
