import InvalidCatalogueCategoryChangeException from '#exceptions/invalid_catalogue_category_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CatalogueCategoryHierarchyService {
  private invalid(message: string): never {
    throw new InvalidCatalogueCategoryChangeException(message)
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

  assertRestorableParent(category: CatalogueCategory, categories: CatalogueCategory[]) {
    if (!category.parentId) return

    const parent = categories.find((candidate) => candidate.id === category.parentId)

    if (!parent || parent.archivedAt) {
      this.invalid('Restore the parent category before restoring this category.')
    }
  }
}
