import type { Data } from 'api/data';

export type CatalogueCategory = Data.CatalogueCategory;
export type CatalogueCategoryDetail = Data.CatalogueCategory.Variants['forDetailedView'];
export type CatalogueCategoryCreationReview = Data.CatalogueCategoryCreationReview;
export type CatalogueCategoryMergePreview = Data.CatalogueCategoryMergePreview;

export interface CatalogueCategoryDirectoryQuery {
	search?: string;
	includeArchived?: boolean;
}

export interface CreateCatalogueCategoryBody {
	name: string;
	description: string;
	parentId?: string;
	reason: string;
}

export interface ReviewCatalogueCategoryCreationBody {
	name: string;
	parentId?: string;
}

export interface UpdateCatalogueCategoryDetailsBody {
	name: string;
	description: string;
	reason: string;
}

export interface ReparentCatalogueCategoryBody {
	parentId: string | null;
	reason: string;
}

export interface MergeCatalogueCategoryBody {
	targetCategoryId: string;
	previewFingerprint: string;
	reason: string;
}
