import { createHash } from 'node:crypto'
import type {
  CatalogueItemMatchKind,
  CatalogueItemStockType,
  CatalogueItemTrackingMethod,
} from '#types/catalogue'

export interface NormalizedKeyword {
  keyword: string
  normalizedKeyword: string
}

export interface SimilarityFingerprintCandidate {
  catalogueCode: string
  primaryMatchKind: CatalogueItemMatchKind
  updatedAt: string
}

function collapseWhitespace(value: string) {
  return value.trim().replaceAll(/\s+/g, ' ')
}

export function normalizeCatalogueItemName(value: string) {
  return collapseWhitespace(value)
}

export function catalogueItemNameKey(value: string) {
  return normalizeCatalogueItemName(value).toLocaleLowerCase('en-US')
}

export function resolveCatalogueItemDescription(value?: string | null) {
  const resolved = value?.trim()
  return resolved ? resolved : null
}

export function normalizeCatalogueItemKeywords(values: string[]): NormalizedKeyword[] {
  const normalized = values.map((value) => {
    const keyword = collapseWhitespace(value)
    return { keyword, normalizedKeyword: keyword.toLocaleLowerCase('en-US') }
  })
  const keys = normalized.map(({ normalizedKeyword }) => normalizedKeyword)
  if (new Set(keys).size !== keys.length) {
    throw new Error('Catalogue item keywords must be unique after normalization.')
  }
  return normalized
}

export function trackingGuidance(stockType: CatalogueItemStockType): {
  recommendation: CatalogueItemTrackingMethod | null
  explanation: string
} {
  if (stockType === 'CONSUMABLE') {
    return {
      recommendation: 'QUANTITY',
      explanation:
        'Consumables normally reduce as quantities when issued, but the tracking method must still be confirmed.',
    }
  }
  return {
    recommendation: null,
    explanation:
      'Fixed or non-consumable items may be tracked individually or as quantities. Choose based on whether each physical unit needs its own identity and history.',
  }
}

export function catalogueSimilarityFingerprint(input: {
  name: string
  keywords: NormalizedKeyword[]
  catalogueCategoryId: string
  candidates: SimilarityFingerprintCandidate[]
}) {
  const stable = {
    normalizedName: catalogueItemNameKey(input.name),
    normalizedKeywords: input.keywords.map(({ normalizedKeyword }) => normalizedKeyword),
    catalogueCategoryId: input.catalogueCategoryId,
    candidates: input.candidates
      .map((candidate) => ({ ...candidate }))
      .sort((left, right) => left.catalogueCode.localeCompare(right.catalogueCode)),
  }
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex')
}
