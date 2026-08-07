import { catalogueItemCreationSchema, catalogueItemKeywords } from '$lib/schemas/catalogue-item';
import { getBaseUnits } from '$lib/server/api/base-units';
import { getCatalogueCategories } from '$lib/server/api/catalogue-categories';
import {
	createCatalogueItem,
	lookupCatalogueItems,
	reviewCatalogueItemCreation
} from '$lib/server/api/catalogue-items';
import { requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import {
	catalogueItemCreationFormId,
	catalogueItemReviewedSelection,
	initializeCatalogueItemCreationForm
} from '$lib/server/helpers/catalogue-item-form';
import type { CatalogueItemTrackingMethod } from '$lib/types/catalogue-items';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { setError, superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireCatalogueManager(event);

	const [categoryResult, unitResult] = await Promise.all([
		getCatalogueCategories(event, {}),
		getBaseUnits(event, {})
	]);
	const [categoryResponse, categoryError] = categoryResult;
	const [unitResponse, unitError] = unitResult;
	if (categoryError)
		error(categoryError.status ?? 502, 'Catalogue-category choices could not be loaded.');
	if (unitError) error(unitError.status ?? 502, 'Base-unit choices could not be loaded.');

	return {
		categories: categoryResponse.data,
		baseUnits: unitResponse.data,
		form: await initializeCatalogueItemCreationForm()
	};
};

export const actions: Actions = {
	review: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemCreationSchema), {
			id: catalogueItemCreationFormId
		});
		if (!form.valid) return fail(400, { form, reviewInvalidated: true });

		const [response, apiError] = await reviewCatalogueItemCreation(event, {
			name: form.data.name,
			keywords: catalogueItemKeywords(form.data.keywordsText),
			catalogueCategoryId: form.data.catalogueCategoryId,
			stockType: form.data.stockType
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'Similar catalogue items could not be reviewed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, reviewInvalidated: true });
		}

		form.data.reviewFingerprint = response.data.fingerprint;
		form.data.confirmedNotInterchangeable = false;
		form.data.similarityReason = '';

		return {
			form,
			review: response.data,
			reviewedSelection: catalogueItemReviewedSelection(form.data)
		};
	},

	create: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(catalogueItemCreationSchema), {
			id: catalogueItemCreationFormId
		});
		if (!form.valid) return fail(400, { form });
		if (!form.data.reviewFingerprint) {
			setError(
				form,
				'reviewFingerprint',
				'Review similar catalogue items before creating this item.'
			);
			return fail(400, { form, reviewInvalidated: true });
		}
		if (!form.data.trackingMethod) {
			setError(form, 'trackingMethod', 'Select a tracking method.');
			return fail(400, { form });
		}
		if (!form.data.trackingMethodConfirmed) {
			setError(form, 'trackingMethodConfirmed', 'Confirm the selected tracking method.');
			return fail(400, { form });
		}

		const [response, apiError] = await createCatalogueItem(event, {
			name: form.data.name,
			description: form.data.description || null,
			keywords: catalogueItemKeywords(form.data.keywordsText),
			catalogueCategoryId: form.data.catalogueCategoryId,
			stockType: form.data.stockType,
			trackingMethod: form.data.trackingMethod as CatalogueItemTrackingMethod,
			trackingMethodConfirmed: form.data.trackingMethodConfirmed,
			baseUnitId: form.data.baseUnitId,
			identificationStatus: form.data.identificationStatus,
			reviewFingerprint: form.data.reviewFingerprint,
			confirmedNotInterchangeable: form.data.confirmedNotInterchangeable || undefined,
			similarityReason: form.data.similarityReason || null,
			reason: form.data.reason
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue item could not be created.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		const [lookupResponse, lookupError] = await lookupCatalogueItems(event, {
			query: form.data.name
		});
		const created = lookupError
			? null
			: lookupResponse.data.find((item) => item.matchKind === 'EXACT_NAME');

		redirect(
			303,
			created ? `/catalogue-items/${created.catalogueCode}` : '/catalogue-items',
			{ type: 'success', message: response.message },
			event.cookies
		);
	}
};
