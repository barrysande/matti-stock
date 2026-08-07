import {
	applyCatalogueCategoryMergeSchema,
	administerCatalogueCategorySchema,
	moveCatalogueCategoryChildrenSchema,
	previewCatalogueCategoryMergeSchema,
	reparentCatalogueCategorySchema,
	updateCatalogueCategoryDetailsSchema
} from '$lib/schemas/catalogue-category';
import {
	archiveCatalogueCategory,
	getCatalogueCategories,
	getCatalogueCategory,
	mergeCatalogueCategory,
	previewCatalogueCategoryMerge,
	reparentCatalogueCategory,
	restoreCatalogueCategory,
	updateCatalogueCategoryDetails
} from '$lib/server/api/catalogue-categories';
import { requireAuth, requireCatalogueManager } from '$lib/server/auth/guards';
import { apiErrorDetails } from '$lib/server/helpers/api-error';
import {
	catalogueCategoryDescendants,
	catalogueCategorySubtreeHeight,
	redirectToCatalogueCategory
} from '$lib/server/helpers/catalogue-category-route';
import { error, fail } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';
import { superValidate } from 'sveltekit-superforms';
import { valibot } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

const formIds = {
	details: 'catalogue-category-details',
	reparent: 'catalogue-category-reparent',
	archive: 'catalogue-category-archive',
	restore: 'catalogue-category-restore',
	mergePreview: 'catalogue-category-merge-preview',
	moveChildren: 'catalogue-category-move-children',
	mergeApply: 'catalogue-category-merge-apply'
} as const;

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
	const descendantIds = catalogueCategoryDescendants(categories, category.id);
	const height = catalogueCategorySubtreeHeight(categories, category.id);
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
	const mergeTargetOptions = categories.filter(
		(candidate) =>
			!candidate.archivedAt && candidate.id !== category.id && !descendantIds.has(candidate.id)
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
		categories,
		parentOptions,
		mergeTargetOptions,
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
		}),
		mergePreviewForm: await superValidate(
			{ targetCategoryId: mergeTargetOptions[0]?.id ?? '' },
			valibot(previewCatalogueCategoryMergeSchema),
			{ id: formIds.mergePreview }
		),
		moveChildrenForm: await superValidate(
			{ childIds: [] as string[], parentId: '', reason: '' },
			valibot(moveCatalogueCategoryChildrenSchema),
			{ id: formIds.moveChildren }
		),
		mergeApplyForm: await superValidate(
			{
				targetCategoryId: '',
				previewFingerprint: '',
				terminalConfirmed: false,
				reason: ''
			},
			valibot(applyCatalogueCategoryMergeSchema),
			{ id: formIds.mergeApply }
		)
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
		redirectToCatalogueCategory(event, response.message);
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
		redirectToCatalogueCategory(event, response.message);
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
		redirectToCatalogueCategory(event, response.message);
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
		redirectToCatalogueCategory(event, response.message);
	},

	mergePreview: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(previewCatalogueCategoryMergeSchema), {
			id: formIds.mergePreview
		});
		if (!form.valid) return fail(400, { form, previewInvalidated: true });

		const [response, apiError] = await previewCatalogueCategoryMerge(
			event,
			event.params.id,
			form.data.targetCategoryId
		);
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The category merge could not be previewed.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form, previewInvalidated: true });
		}

		return { form, preview: response.data };
	},

	moveChildren: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(moveCatalogueCategoryChildrenSchema), {
			id: formIds.moveChildren
		});
		if (!form.valid) return fail(400, { form });

		const [directoryResponse, directoryError] = await getCatalogueCategories(event, {
			includeArchived: true
		});
		if (directoryError) {
			const details = apiErrorDetails(
				directoryError,
				'Current category choices could not be loaded.'
			);
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(directoryError.status ?? 400, { form });
		}

		const categories = directoryResponse.data;
		const childIds = [...new Set(form.data.childIds)];
		const activeChildIds = new Set(
			categories
				.filter((category) => category.parentId === event.params.id && !category.archivedAt)
				.map((category) => category.id)
		);
		if (childIds.some((childId) => !activeChildIds.has(childId))) {
			setFlash(
				{ type: 'error', message: 'Select only current active child categories.' },
				event.cookies
			);
			return fail(400, { form, invalidSelection: true });
		}
		if (form.data.parentId === event.params.id) {
			setFlash(
				{ type: 'error', message: 'Move child categories outside the merge source.' },
				event.cookies
			);
			return fail(400, { form, invalidSelection: true });
		}

		let moved = 0;
		for (const childId of childIds) {
			const [, apiError] = await reparentCatalogueCategory(event, childId, {
				parentId: form.data.parentId || null,
				reason: form.data.reason
			});
			if (apiError) {
				const details = apiErrorDetails(apiError, 'A selected child category could not be moved.');
				redirectToCatalogueCategory(
					event,
					moved
						? `${moved} ${moved === 1 ? 'child was' : 'children were'} moved before the workflow stopped. ${details.message}`
						: details.message,
					'error'
				);
			}
			moved += 1;
		}

		redirectToCatalogueCategory(
			event,
			`${moved} ${moved === 1 ? 'child category was' : 'child categories were'} moved. Refresh the merge preview to continue.`
		);
	},

	mergeApply: async (event) => {
		requireCatalogueManager(event);

		const form = await superValidate(event, valibot(applyCatalogueCategoryMergeSchema), {
			id: formIds.mergeApply
		});
		if (!form.valid) return fail(400, { form });

		const [response, apiError] = await mergeCatalogueCategory(event, event.params.id, {
			targetCategoryId: form.data.targetCategoryId,
			previewFingerprint: form.data.previewFingerprint,
			reason: form.data.reason
		});
		if (apiError) {
			const details = apiErrorDetails(apiError, 'The catalogue category could not be merged.');
			setFlash({ type: 'error', message: details.message }, event.cookies);
			return fail(apiError.status ?? 400, { form });
		}

		redirectToCatalogueCategory(event, response.message);
	}
};
