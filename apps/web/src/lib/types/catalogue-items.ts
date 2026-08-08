import type { Data } from 'api/data';

export type CatalogueItem = Data.CatalogueItem;
export type CatalogueItemDetail = Data.CatalogueItem.Variants['forDetailedView'];
export type CatalogueItemVersion = Data.CatalogueItemVersion;
export type CatalogueItemReview = Data.CatalogueItemReview;
export type CatalogueItemStockType = 'FIXED_NON_CONSUMABLE' | 'CONSUMABLE';
export type CatalogueItemTrackingMethod = 'INDIVIDUAL' | 'QUANTITY';
export type CatalogueItemIdentificationStatus = 'CONFIRMED' | 'PLACEHOLDER';

export interface CatalogueItemDirectoryQuery {
	page?: number;
	search?: string;
	categoryId?: string;
	stockType?: CatalogueItemStockType;
	trackingMethod?: CatalogueItemTrackingMethod;
	identificationStatus?: CatalogueItemIdentificationStatus;
	includeArchived?: boolean;
}

export interface CatalogueItemLookupQuery {
	query: string;
	includeArchived?: boolean;
}

export interface CatalogueItemReviewBody {
	name: string;
	keywords: string[];
	catalogueCategoryId: string;
	stockType: CatalogueItemStockType;
}

export interface CreateCatalogueItemBody extends CatalogueItemReviewBody {
	description?: string | null;
	trackingMethod: CatalogueItemTrackingMethod;
	trackingMethodConfirmed: boolean;
	baseUnitId: string;
	identificationStatus: CatalogueItemIdentificationStatus;
	reviewFingerprint: string;
	confirmedNotInterchangeable?: boolean;
	similarityReason?: string | null;
	reason: string;
}

export interface CatalogueItemReviewConfirmation {
	reviewFingerprint?: string;
	confirmedNotInterchangeable?: boolean;
	similarityReason?: string | null;
}

export interface UpdateCatalogueItemDetailsBody extends CatalogueItemReviewConfirmation {
	name: string;
	description?: string | null;
	keywords: string[];
	identificationStatus: CatalogueItemIdentificationStatus;
	reason: string;
}

export interface UpdateCatalogueItemClassificationBody extends CatalogueItemReviewConfirmation {
	catalogueCategoryId: string;
	stockType: CatalogueItemStockType;
	trackingMethod: CatalogueItemTrackingMethod;
	trackingMethodConfirmed: boolean;
	baseUnitId: string;
	reason: string;
}

export interface RestoreCatalogueItemBody extends CatalogueItemReviewConfirmation {
	reviewFingerprint: string;
	reason: string;
}
