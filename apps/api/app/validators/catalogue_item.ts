import vine from '@vinejs/vine'
import {
  CATALOGUE_ITEM_IDENTIFICATION_STATUSES,
  CATALOGUE_ITEM_STOCK_TYPES,
  CATALOGUE_ITEM_TRACKING_METHODS,
} from '#types/catalogue'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const description = () => vine.string().trim().minLength(1).maxLength(5000).nullable().optional()
const reason = () => vine.string().trim().minLength(1).maxLength(5000)
const fingerprint = () => vine.string().trim().minLength(64).maxLength(64)
const keywords = () => vine.array(vine.string().trim().minLength(1).maxLength(100)).maxLength(20)

const similarityProposalProperties = () => ({
  name: name(),
  keywords: keywords(),
  catalogueCategoryId: vine.string().uuid(),
  stockType: vine.enum(CATALOGUE_ITEM_STOCK_TYPES),
})

const reviewConfirmationProperties = () => ({
  reviewFingerprint: fingerprint(),
  confirmedNotInterchangeable: vine.boolean().optional(),
  similarityReason: reason().nullable().optional(),
})

export const reviewCatalogueItemCreationValidator = vine.create(similarityProposalProperties())

export const reviewCatalogueItemChangeValidator = vine.create(similarityProposalProperties())

export const createCatalogueItemValidator = vine.create({
  ...similarityProposalProperties(),
  description: description(),
  trackingMethod: vine.enum(CATALOGUE_ITEM_TRACKING_METHODS),
  trackingMethodConfirmed: vine.boolean(),
  baseUnitId: vine.string().uuid(),
  identificationStatus: vine.enum(CATALOGUE_ITEM_IDENTIFICATION_STATUSES),
  ...reviewConfirmationProperties(),
  reason: reason(),
})

export const updateCatalogueItemDetailsValidator = vine.create({
  name: name(),
  description: description(),
  keywords: keywords(),
  identificationStatus: vine.enum(CATALOGUE_ITEM_IDENTIFICATION_STATUSES),
  reviewFingerprint: fingerprint().optional(),
  confirmedNotInterchangeable: vine.boolean().optional(),
  similarityReason: reason().nullable().optional(),
  reason: reason(),
})

export const updateCatalogueItemClassificationValidator = vine.create({
  catalogueCategoryId: vine.string().uuid(),
  stockType: vine.enum(CATALOGUE_ITEM_STOCK_TYPES),
  trackingMethod: vine.enum(CATALOGUE_ITEM_TRACKING_METHODS),
  trackingMethodConfirmed: vine.boolean(),
  baseUnitId: vine.string().uuid(),
  reviewFingerprint: fingerprint().optional(),
  confirmedNotInterchangeable: vine.boolean().optional(),
  similarityReason: reason().nullable().optional(),
  reason: reason(),
})

export const indexCatalogueItemsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  categoryId: vine.string().uuid().optional(),
  stockType: vine.enum(CATALOGUE_ITEM_STOCK_TYPES).optional(),
  trackingMethod: vine.enum(CATALOGUE_ITEM_TRACKING_METHODS).optional(),
  identificationStatus: vine.enum(CATALOGUE_ITEM_IDENTIFICATION_STATUSES).optional(),
  includeArchived: vine.boolean().optional(),
})

export const catalogueItemHistoryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
})

export const lookupCatalogueItemsValidator = vine.create({
  query: vine.string().trim().minLength(1).maxLength(255),
  includeArchived: vine.boolean().optional(),
})

export const administerCatalogueItemValidator = vine.create({
  reason: reason(),
})

export const restoreCatalogueItemValidator = vine.create({
  ...reviewConfirmationProperties(),
  reason: reason(),
})
