import type { CatalogueCategory } from '$lib/types/catalogue-categories';
import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from 'sveltekit-flash-message/server';

export function catalogueCategoryDescendants(categories: CatalogueCategory[], categoryId: string) {
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

export function catalogueCategorySubtreeHeight(
	categories: CatalogueCategory[],
	categoryId: string
): number {
	const children = categories.filter((candidate) => candidate.parentId === categoryId);
	return children.reduce(
		(height, child) => Math.max(height, catalogueCategorySubtreeHeight(categories, child.id) + 1),
		0
	);
}

export function redirectToCatalogueCategory(
	event: RequestEvent,
	message: string,
	type: 'success' | 'error' = 'success'
) {
	redirect(303, `/catalogue-categories/${event.params.id}`, { type, message }, event.cookies);
}
