import type { EffectiveAccessGrant } from '#types/role_assignment'

export const BASE_UNIT_KINDS = ['COUNTABLE', 'MEASURED'] as const
export type BaseUnitKind = (typeof BASE_UNIT_KINDS)[number]

export const CATEGORY_ATTRIBUTE_DATA_TYPES = [
  'TEXT',
  'NUMBER',
  'DATE',
  'YES_NO',
  'PREDEFINED_CHOICE',
] as const
export type CategoryAttributeDataType = (typeof CATEGORY_ATTRIBUTE_DATA_TYPES)[number]

export const CATEGORY_ATTRIBUTE_SCOPES = ['CATALOGUE', 'INVENTORY_UNIT'] as const
export type CategoryAttributeScope = (typeof CATEGORY_ATTRIBUTE_SCOPES)[number]

export const CATALOGUE_ITEM_STOCK_TYPES = ['FIXED_NON_CONSUMABLE', 'CONSUMABLE'] as const
export type CatalogueItemStockType = (typeof CATALOGUE_ITEM_STOCK_TYPES)[number]

export const CATALOGUE_ITEM_TRACKING_METHODS = ['INDIVIDUAL', 'QUANTITY'] as const
export type CatalogueItemTrackingMethod = (typeof CATALOGUE_ITEM_TRACKING_METHODS)[number]

export const CATALOGUE_ITEM_IDENTIFICATION_STATUSES = ['CONFIRMED', 'PLACEHOLDER'] as const
export type CatalogueItemIdentificationStatus =
  (typeof CATALOGUE_ITEM_IDENTIFICATION_STATUSES)[number]

export const CATALOGUE_ITEM_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'CLASSIFICATION_UPDATED',
  'ATTRIBUTE_VALUES_UPDATED',
  'ARCHIVED',
  'RESTORED',
] as const
export type CatalogueItemChangeKind = (typeof CATALOGUE_ITEM_CHANGE_KINDS)[number]

export const CATALOGUE_ITEM_MATCH_KINDS = ['EXACT_NAME', 'KEYWORD', 'PREFIX', 'SUBSTRING'] as const
export type CatalogueItemMatchKind = (typeof CATALOGUE_ITEM_MATCH_KINDS)[number]

export const CATALOGUE_ITEM_LOOKUP_MATCH_KINDS = [
  'EXACT_CODE',
  'EXACT_NAME',
  'KEYWORD',
  'PREFIX',
  'SUBSTRING',
] as const
export type CatalogueItemLookupMatchKind = (typeof CATALOGUE_ITEM_LOOKUP_MATCH_KINDS)[number]

export interface ResolvedCatalogueAttributeValue {
  categoryAttributeId: string
  dataType: CategoryAttributeDataType
  textValue: string | null
  numberValue: string | null
  dateValue: string | null
  yesNoValue: boolean | null
  choiceId: string | null
}

export const CATEGORY_ATTRIBUTE_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'SEMANTICS_UPDATED',
  'ARCHIVED',
  'RESTORED',
] as const
export type CategoryAttributeChangeKind = (typeof CATEGORY_ATTRIBUTE_CHANGE_KINDS)[number]

export const CATEGORY_ATTRIBUTE_CHOICE_CHANGE_KINDS = [
  'CREATED',
  'LABEL_UPDATED',
  'REORDERED',
  'ARCHIVED',
  'RESTORED',
] as const
export type CategoryAttributeChoiceChangeKind =
  (typeof CATEGORY_ATTRIBUTE_CHOICE_CHANGE_KINDS)[number]

export const CATALOGUE_CATEGORY_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'REPARENTED',
  'ARCHIVED',
  'RESTORED',
] as const
export type CatalogueCategoryChangeKind = (typeof CATALOGUE_CATEGORY_CHANGE_KINDS)[number]

export const BASE_UNIT_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'ARCHIVED',
  'RESTORED',
] as const
export type BaseUnitChangeKind = (typeof BASE_UNIT_CHANGE_KINDS)[number]

export interface CatalogueAuthorization {
  grant: EffectiveAccessGrant
  instituteOrganizationalUnitId: string
}
