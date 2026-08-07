import {
	administerCatalogueCategorySchema,
	reparentCatalogueCategorySchema,
	updateCatalogueCategoryDetailsSchema
} from '$lib/schemas/catalogue-category';
import {
	archiveCatalogueCategory,
	getCatalogueCategories,
	getCatalogueCategory,
	reparentCatalogueCategory,
	restoreCatalogueCategory,
	updateCatalogueCategoryDetails
} from '$lib/server/api/catalogue-categories';
import { requireAuth, requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import type { CatalogueCategory } from '$lib/types/catalogue-categories';
import { error, fail } from '@sveltejs/kit';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const formIds = {
	details: 'catalogue-category-details',
	reparent: 'catalogue-category-reparent',
	archive: 'catalogue-category-archive',
	restore: 'catalogue-category-restore'
} as const;

function descendantsOf(categories: CatalogueCategory[], categoryId: string) {
	const descendantIds = new Set<string>();
	let found = true;

	while (found) {
		found = false;
		for (const candidate of categories) {
			if (
				!descendantIds.has(candidate.id) &&
				(candidate.parentId === categoryId ||
					(candidate.parentId && descendantIds.has(candidate.parentId)))
			) {
				descendantIds.add(candidate.id);
				found = true;
			}
		}
	}

	return descendantIds;
}

function subtreeHeight(categories: CatalogueCategory[], categoryId: string): number {
	const children = categories.filter((candidate) => candidate.parentId === categoryId);
	return children.reduce(
		(height, child) => Math.max(height, subtreeHeight(categories, child.id) + 1),
		0
	);
}

function redirectToCategory(event: RequestEvent, message: string) {
	redirect(
		303,
		`/catalogue-categories/${event.params.id}`,
		{ type: 'success', message },
		event.cookies
	);
}

export const load: PageServerLoad = async (event) => {
	requireAuth(event);

	const [categoryResult, directoryResult] = await Promise.all([
		getCatalogueCategory(event, event.params.id),
		getCatalogueCategories(event, { includeArchived: true })
	]);
	const [categoryResponse, categoryError] = categoryResult;
	const [directoryResponse, directoryError] = directoryResult;
	if (categoryError)
		error(categoryError.status ?? 404, 'The catalogue category could not be found.');
	if (directoryError)
		error(directoryError.status ?? 502, 'The catalogue-category directory could not be loaded.');

	const category = categoryResponse.data;
	const categories = directoryResponse.data;
	const descendantIds = descendantsOf(categories, category.id);
	const height = subtreeHeight(categories, category.id);
	const parentOptions = categories.filter(
		(candidate) =>
			!candidate.archivedAt &&
			candidate.id !== category.id &&
			candidate.id !== category.parentId &&
			!descendantIds.has(candidate.id) &&
			candidate.depth + height <= 2
	);
	const activeChildren = categories.filter(
		(candidate) => candidate.parentId === category.id && !candidate.archivedAt
	);
	const mergedSources = categories.filter(
		(candidate) => candidate.mergedIntoCategoryId === category.id
	);
	const parent = category.parentId
		? categories.find((candidate) => candidate.id === category.parentId)
		: null;
	const directMergeTarget = category.mergedIntoCategoryId
		? (categories.find((candidate) => candidate.id === category.mergedIntoCategoryId) ?? null)
		: null;
	const canonicalMergeTarget = category.canonicalMergeTarget
		? (categories.find((candidate) => candidate.id === category.canonicalMergeTarget?.id) ?? null)
		: null;

	return {
		category,
		parentOptions,
		activeChildren,
		mergedSources,
		parent,
		directMergeTarget,
		canonicalMergeTarget,
		detailsForm: await superValidate(
			{ name: category.name, description: category.description, reason: '' },
			valibot(updateCatalogueCategoryDetailsSchema),
			{ id: formIds.details }
		),
		reparentForm: await superValidate(
			{ parentId: category.parentId ? '' : (parentOptions[0]?.id ?? ''), reason: '' },
			valibot(reparentCatalogueCategorySchema),
			{ id: formIds.reparent }
		),
		archiveForm: await superValidate({ reason: '' }, valibot(administerCatalogueCategorySchema), {
			id: formIds.archive
		}),
		restoreForm: await superValidate({ reason: '' }, valibot(administerCatalogueCategorySchema), {
			id: formIds.restore
		})
	};
};

export const actions: Actions = {
	details: async (event) => {
		requireCatalogueManager(event);
		const form = await superValidate(event, valibot(updateCatalogueCategoryDetailsSchema), {
			id: formIds.details
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await updateCatalogueCategoryDetails(
			event,
			event.params.id,
			form.data
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue category could not be updated.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCategory(event, response.message);
	},

	reparent: async (event) => {
		requireCatalogueManager(event);
		const form = await superValidate(event, valibot(reparentCatalogueCategorySchema), {
			id: formIds.reparent
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await reparentCatalogueCategory(event, event.params.id, {
			parentId: form.data.parentId || null,
			reason: form.data.reason
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue category could not be moved.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCategory(event, response.message);
	},

	archive: async (event) => {
		requireCatalogueManager(event);
		const form = await superValidate(event, valibot(administerCatalogueCategorySchema), {
			id: formIds.archive
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await archiveCatalogueCategory(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue category could not be archived.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCategory(event, response.message);
	},

	restore: async (event) => {
		requireCatalogueManager(event);
		const form = await superValidate(event, valibot(administerCatalogueCategorySchema), {
			id: formIds.restore
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await restoreCatalogueCategory(
			event,
			event.params.id,
			form.data.reason
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue category could not be restored.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}
		redirectToCategory(event, response.message);
	}
};
