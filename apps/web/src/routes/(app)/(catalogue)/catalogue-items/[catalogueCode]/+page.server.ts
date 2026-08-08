import {
	administerCatalogueItemSchema,
	catalogueItemClassificationSchema,
	catalogueItemDetailsSchema,
	catalogueItemKeywords,
	restoreCatalogueItemSchema
} from '$lib/schemas/catalogue-item';
import { getBaseUnits } from '$lib/server/api/base-units';
import { getCatalogueCategories } from '$lib/server/api/catalogue-categories';
import {
	archiveCatalogueItem,
	getCatalogueItem,
	getCatalogueItemHistory,
	restoreCatalogueItem,
	updateCatalogueItemClassification,
	updateCatalogueItemDetails
} from '$lib/server/api/catalogue-items';
import { requireAuth, requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import {
	catalogueItemDetailFormIds,
	catalogueItemReviewConfirmation
} from '$lib/server/helpers/catalogue-item-form';
import {
	getCurrentCatalogueItem,
	redirectToCatalogueItem,
	reviewCurrentCatalogueItemChange
} from '$lib/server/helpers/catalogue-item-route';
import { positivePage } from '$lib/server/helpers/list-filters';
import type {
	CatalogueItemIdentificationStatus,
	CatalogueItemStockType,
	CatalogueItemTrackingMethod
} from '$lib/types/catalogue-items';
import { error, fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [itemResult, historyResult, categoryResult, unitResult] = await Promise.all([
		getCatalogueItem(event, event.params.catalogueCode),
		getCatalogueItemHistory(
			event,
			event.params.catalogueCode,
			positivePage(event.url.searchParams.get('page'))
		),
		getCatalogueCategories(event, { includeArchived: true }),
		getBaseUnits(event, { includeArchived: true })
	]);
	const [itemResponse, itemError] = itemResult;
	const [historyResponse, historyError] = historyResult;
	const [categoryResponse, categoryError] = categoryResult;
	const [unitResponse, unitError] = unitResult;
	if (itemError) {
		error(itemError.status ?? 404, 'The catalogue item could not be found.');
	}

	if (historyError) {
		error(historyError.status ?? 502, 'The catalogue-item history could not be loaded.');
	}

	if (categoryError) {
		error(categoryError.status ?? 502, 'Catalogue-category choices could not be loaded.');
	}

	if (unitError) {
		error(unitError.status ?? 502, 'Base-unit choices could not be loaded.');
	}

	const item = itemResponse.data;

	return {
		item,
		history: historyResponse,
		categories: categoryResponse.data,
		baseUnits: unitResponse.data,
		detailsForm: await superValidate(
			{
				name: item.name,
				description: item.description ?? '',
				keywordsText: item.keywords.join('\n'),
				identificationStatus: item.identificationStatus as CatalogueItemIdentificationStatus,
				reviewFingerprint: '',
				confirmedNotInterchangeable: false,
				similarityReason: '',
				reason: ''
			},
			valibot(catalogueItemDetailsSchema),
			{ id: catalogueItemDetailFormIds.details }
		),
		classificationForm: await superValidate(
			{
				catalogueCategoryId: item.category.id,
				stockType: item.stockType as CatalogueItemStockType,
				trackingMethod: item.trackingMethod as CatalogueItemTrackingMethod,
				trackingMethodConfirmed: false,
				baseUnitId: item.baseUnit.id,
				reviewFingerprint: '',
				confirmedNotInterchangeable: false,
				similarityReason: '',
				reason: ''
			},
			valibot(catalogueItemClassificationSchema),
			{ id: catalogueItemDetailFormIds.classification }
		),
		archiveForm: await superValidate({ reason: '' }, valibot(administerCatalogueItemSchema), {
			id: catalogueItemDetailFormIds.archive
		}),
		restoreForm: await superValidate(
			{
				reviewFingerprint: '',
				confirmedNotInterchangeable: false,
				similarityReason: '',
				reason: ''
			},
			valibot(restoreCatalogueItemSchema),
			{ id: catalogueItemDetailFormIds.restore }
		)
	};
};

export const actions: Actions = {
	reviewDetails: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemDetailsSchema), {
			id: catalogueItemDetailFormIds.details
		});
		if (!form.valid) return fail(400, { form, reviewInvalidated: true });

		const item = await getCurrentCatalogueItem(event, event.params.catalogueCode);
		const { response, apiError } = await reviewCurrentCatalogueItemChange(
			event,
			event.params.catalogueCode,
			{
				name: form.data.name,
				keywords: catalogueItemKeywords(form.data.keywordsText),
				catalogueCategoryId: item.category.id,
				stockType: item.stockType as CatalogueItemStockType
			}
		);
		if (apiError || !response)
			return fail(apiError?.status ?? 400, { form, reviewInvalidated: true });

		form.data.reviewFingerprint = response.data.fingerprint;
		form.data.confirmedNotInterchangeable = false;
		form.data.similarityReason = '';

		return {
			form,
			review: response.data,
			reviewedSelection: {
				name: form.data.name,
				keywordsText: form.data.keywordsText
			}
		};
	},

	details: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemDetailsSchema), {
			id: catalogueItemDetailFormIds.details
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await updateCatalogueItemDetails(
			event,
			event.params.catalogueCode,
			{
				name: form.data.name,
				description: form.data.description || null,
				keywords: catalogueItemKeywords(form.data.keywordsText),
				identificationStatus: form.data.identificationStatus,
				...catalogueItemReviewConfirmation(form.data),
				reason: form.data.reason
			}
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue-item details could not be updated.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCatalogueItem(event, event.params.catalogueCode, response.message);
	},

	reviewClassification: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemClassificationSchema), {
			id: catalogueItemDetailFormIds.classification
		});
		if (!form.valid) return fail(400, { form, reviewInvalidated: true });

		const item = await getCurrentCatalogueItem(event, event.params.catalogueCode);
		const { response, apiError } = await reviewCurrentCatalogueItemChange(
			event,
			event.params.catalogueCode,
			{
				name: item.name,
				keywords: item.keywords,
				catalogueCategoryId: form.data.catalogueCategoryId,
				stockType: form.data.stockType
			}
		);
		if (apiError || !response)
			return fail(apiError?.status ?? 400, { form, reviewInvalidated: true });

		form.data.reviewFingerprint = response.data.fingerprint;
		form.data.confirmedNotInterchangeable = false;
		form.data.similarityReason = '';

		return {
			form,
			review: response.data,
			reviewedSelection: {
				catalogueCategoryId: form.data.catalogueCategoryId,
				stockType: form.data.stockType
			}
		};
	},

	classification: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemClassificationSchema), {
			id: catalogueItemDetailFormIds.classification
		});
		if (!form.valid) return fail(400, { form });
		if (!form.data.trackingMethodConfirmed) {
			setError(form, 'trackingMethodConfirmed', 'Confirm the selected tracking method.');
			return fail(400, { form });
		}

		const [response, apiError] = await updateCatalogueItemClassification(
			event,
			event.params.catalogueCode,
			{
				catalogueCategoryId: form.data.catalogueCategoryId,
				stockType: form.data.stockType,
				trackingMethod: form.data.trackingMethod as CatalogueItemTrackingMethod,
				trackingMethodConfirmed: form.data.trackingMethodConfirmed,
				baseUnitId: form.data.baseUnitId,
				...catalogueItemReviewConfirmation(form.data),
				reason: form.data.reason
			}
		);
		if (apiError) {
			const details = apiErrorDetails(
				apiError,
				'The catalogue-item classification could not be updated.'
			);
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCatalogueItem(event, event.params.catalogueCode, response.message);
	},

	archive: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(administerCatalogueItemSchema), {
			id: catalogueItemDetailFormIds.archive
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await archiveCatalogueItem(
			event,
			event.params.catalogueCode,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue item could not be archived.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCatalogueItem(event, event.params.catalogueCode, response.message);
	},

	reviewRestore: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(restoreCatalogueItemSchema), {
			id: catalogueItemDetailFormIds.restore
		});
		if (!form.valid) return fail(400, { form, reviewInvalidated: true });

		const item = await getCurrentCatalogueItem(event, event.params.catalogueCode);
		const { response, apiError } = await reviewCurrentCatalogueItemChange(
			event,
			event.params.catalogueCode,
			{
				name: item.name,
				keywords: item.keywords,
				catalogueCategoryId: item.category.id,
				stockType: item.stockType as CatalogueItemStockType
			}
		);
		if (apiError || !response)
			return fail(apiError?.status ?? 400, { form, reviewInvalidated: true });

		form.data.reviewFingerprint = response.data.fingerprint;
		form.data.confirmedNotInterchangeable = false;
		form.data.similarityReason = '';

		return { form, review: response.data };
	},

	restore: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(restoreCatalogueItemSchema), {
			id: catalogueItemDetailFormIds.restore
		});
		if (!form.valid) return fail(400, { form });
		if (!form.data.reviewFingerprint) {
			setError(
				form,
				'reviewFingerprint',
				'Review similar catalogue items before restoring this item.'
			);
			return fail(400, { form, reviewInvalidated: true });
		}

		const [response, apiError] = await restoreCatalogueItem(event, event.params.catalogueCode, {
			reviewFingerprint: form.data.reviewFingerprint,
			confirmedNotInterchangeable: form.data.confirmedNotInterchangeable || undefined,
			similarityReason: form.data.similarityReason || null,
			reason: form.data.reason
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue item could not be restored.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCatalogueItem(event, event.params.catalogueCode, response.message);
	}
};
