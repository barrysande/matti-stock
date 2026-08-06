import InvalidCatalogueCategoryChangeException from '#exceptions/invalid_catalogue_category_change_exception'
import InvalidCatalogueCategoryMergeException from '#exceptions/invalid_catalogue_category_merge_exception'
import CatalogueCategory from '#models/catalogue_category'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CatalogueCategoryHierarchyService {
  private invalid(message: string): never {
    throw new InvalidCatalogueCategoryChangeException(message)
  }

  private invalidMerge(message: string): never {
    throw new InvalidCatalogueCategoryMergeException(message)
  }

  private depth(
    category: CatalogueCategory,
    categories: Map<string, CatalogueCategory>,
    visited = new Set<string>()
  ): number {
    if (visited.has(category.id)) {
      this.invalid('The catalogue-category hierarchy contains a circular parent relationship.')
    }

    if (!category.parentId) return 0

    const parent = categories.get(category.parentId)

    if (!parent) {
      this.invalid('The catalogue-category hierarchy contains an unavailable parent.')
    }

    visited.add(category.id)

    return this.depth(parent, categories, visited) + 1
  }

  private subtreeHeight(
    categoryId: string,
    categories: CatalogueCategory[],
    visited = new Set<string>()
  ): number {
    if (visited.has(categoryId)) {
      this.invalid('The catalogue-category hierarchy contains a circular child relationship.')
    }

    const nextVisited = new Set(visited).add(categoryId)
    const children = categories.filter((category) => category.parentId === categoryId)

    return children.reduce(
      (height, child) =>
        Math.max(height, this.subtreeHeight(child.id, categories, nextVisited) + 1),
      0
    )
  }

  /** Locks the small institution-wide hierarchy in stable order before a structural mutation. */
  lock(trx: TransactionClientContract) {
    return CatalogueCategory.query({ client: trx }).orderBy('id', 'asc').forUpdate()
  }

  /** Resolves an active parent and ensures a new child stays within three levels. */
  assertCreateParent(parentId: string | null, categories: CatalogueCategory[]) {
    if (!parentId) return

    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    const parent = categoryMap.get(parentId)

    if (!parent || parent.archivedAt) {
      this.invalid('The selected catalogue-category parent is unavailable.')
    }

    if (this.depth(parent, categoryMap) >= 2) {
      this.invalid('A catalogue category cannot be nested deeper than three levels.')
    }
  }

  /** Validates an active reparent target, cycles, and the resulting descendant depth. */
  assertReparent(
    category: CatalogueCategory,
    parentId: string | null,
    categories: CatalogueCategory[]
  ) {
    if (parentId === category.id) {
      this.invalid('A catalogue category cannot be its own parent.')
    }

    const categoryMap = new Map(categories.map((candidate) => [candidate.id, candidate]))
    const parent = parentId ? categoryMap.get(parentId) : null

    if (parentId && (!parent || parent.archivedAt)) {
      this.invalid('The selected catalogue-category parent is unavailable.')
    }

    let cursor = parent
    const visited = new Set<string>()

    while (cursor) {
      if (cursor.id === category.id) {
        this.invalid('A catalogue category cannot be moved beneath one of its descendants.')
      }

      if (visited.has(cursor.id)) {
        this.invalid('The catalogue-category hierarchy contains a circular parent relationship.')
      }

      visited.add(cursor.id)
      cursor = cursor.parentId ? categoryMap.get(cursor.parentId) : undefined
    }

    const proposedDepth = parent ? this.depth(parent, categoryMap) + 1 : 0

    if (proposedDepth + this.subtreeHeight(category.id, categories) > 2) {
      this.invalid('Moving this category would make the hierarchy deeper than three levels.')
    }
  }

  assertNoActiveChildren(category: CatalogueCategory, categories: CatalogueCategory[]) {
    if (
      categories.some((candidate) => candidate.parentId === category.id && !candidate.archivedAt)
    ) {
      this.invalid('Archive or move active child categories before archiving this category.')
    }
  }

  activeChildren(categoryId: string, categories: CatalogueCategory[]) {
    return categories
      .filter((category) => category.parentId === categoryId && !category.archivedAt)
      .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
  }

  assertMergeTarget(
    source: CatalogueCategory,
    target: CatalogueCategory,
    categories: CatalogueCategory[]
  ) {
    if (source.id === target.id) {
      this.invalidMerge('A catalogue category cannot be merged into itself.')
    }

    if (source.archivedAt || source.mergedIntoCategoryId) {
      this.invalidMerge('Only an active, unmerged catalogue category may be merged.')
    }

    if (target.archivedAt || target.mergedIntoCategoryId) {
      this.invalidMerge('The merge target must be an active catalogue category.')
    }

    const categoryMap = new Map(categories.map((category) => [category.id, category]))
    let cursor: CatalogueCategory | undefined = target
    const visited = new Set<string>()

    while (cursor) {
      if (cursor.id === source.id) {
        this.invalidMerge('A catalogue category cannot be merged into one of its descendants.')
      }

      if (visited.has(cursor.id)) {
        this.invalidMerge(
          'The catalogue-category hierarchy contains a circular parent relationship.'
        )
      }

      visited.add(cursor.id)
      cursor = cursor.parentId ? categoryMap.get(cursor.parentId) : undefined
    }
  }

  canonicalMergeTarget(category: CatalogueCategory, categories: CatalogueCategory[]) {
    const categoryMap = new Map(categories.map((candidate) => [candidate.id, candidate]))
    let cursor = category
    const visited = new Set<string>()

    while (cursor.mergedIntoCategoryId) {
      if (visited.has(cursor.id)) {
        this.invalid('The catalogue-category merge history contains a circular relationship.')
      }

      visited.add(cursor.id)
      const target = categoryMap.get(cursor.mergedIntoCategoryId)

      if (!target) {
        this.invalid('The catalogue-category merge history contains an unavailable target.')
      }

      cursor = target
    }

    if (cursor.archivedAt) {
      this.invalid('The catalogue-category merge history does not end at an active category.')
    }

    return cursor
  }

  assertRestorableParent(category: CatalogueCategory, categories: CatalogueCategory[]) {
    if (!category.parentId) return

    const parent = categories.find((candidate) => candidate.id === category.parentId)

    if (!parent || parent.archivedAt) {
      this.invalid('Restore the parent category before restoring this category.')
    }
  }
}
