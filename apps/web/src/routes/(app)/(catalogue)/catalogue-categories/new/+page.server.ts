import { createCatalogueCategorySchema } from '$lib/schemas/catalogue-category';
import {
	createCatalogueCategory,
	getCatalogueCategories,
	reviewCatalogueCategoryCreation
} from '$lib/server/api/catalogue-categories';
import { requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formId = 'catalogue-category-create';

export const load: PageServerLoad = async (event) => {
	requireCatalogueManager(event);

	const [response, apiError] = await getCatalogueCategories(event, {});
	if (apiError)
		error(apiError.status ?? 502, 'The catalogue-category directory could not be loaded.');

	return {
		parentOptions: response.data.filter((category) => category.depth < 3),
		form: await superValidate(
			{ name: '', description: '', parentId: '', reason: '' },
			valibot(createCatalogueCategorySchema),
			{ id: formId }
		)
	};
};

export const actions: Actions = {
	review: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(createCatalogueCategorySchema), { id: formId });
		if (!form.valid) return fail(400, { form, reviewInvalidated: true });

		const [response, apiError] = await reviewCatalogueCategoryCreation(event, {
			name: form.data.name,
			...(form.data.parentId ? { parentId: form.data.parentId } : {})
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'Similar categories could not be reviewed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, reviewInvalidated: true });
		}

		return {
			form,
			candidates: response.data,
			reviewedSelection: {
				name: form.data.name,
				parentId: form.data.parentId
			}
		};
	},

	create: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(createCatalogueCategorySchema), { id: formId });
		if (!form.valid) return fail(400, { form });

		const { parentId, ...details } = form.data;
		const [response, apiError] = await createCatalogueCategory(event, {
			...details,
			...(parentId ? { parentId } : {})
		});
		if (apiError) {
			const errorDetails = apiErrorDetails(
				apiError,
				'The catalogue category could not be created.'
			);
			setFlash({ type: 'error', message: errorDetails.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirect(
			303,
			'/catalogue-categories',
			{ type: 'success', message: response.message },
			event.cookies
		);
	}
};
