import { createHash } from 'node:crypto'
import { inject } from '@adonisjs/core'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueCategoryHierarchyService from '#services/catalogue_category_hierarchy_service'
import type { CatalogueCategoryMergePreview } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class CatalogueCategoryMergePreviewService {
  constructor(private hierarchy: CatalogueCategoryHierarchyService) {}

  private categoryQuery(client?: TransactionClientContract) {
    return client ? CatalogueCategory.query({ client }) : CatalogueCategory.query()
  }

  private itemQuery(client?: TransactionClientContract) {
    return client ? CatalogueItem.query({ client }) : CatalogueItem.query()
  }

  private fingerprint(
    sourceId: string,
    targetId: string,
    categories: CatalogueCategory[],
    items: CatalogueItem[]
  ) {
    const state = {
      sourceId,
      targetId,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        mergedIntoCategoryId: category.mergedIntoCategoryId,
        archivedAt: category.archivedAt?.toISO() ?? null,
        updatedAt: category.updatedAt.toISO(),
      })),
      items: items.map((item) => ({
        id: item.id,
        catalogueCode: item.catalogueCode,
        name: item.name,
        description: item.description,
        catalogueCategoryId: item.catalogueCategoryId,
        stockType: item.stockType,
        trackingMethod: item.trackingMethod,
        baseUnitId: item.baseUnitId,
        identificationStatus: item.identificationStatus,
        inventorySemanticsLockedAt: item.inventorySemanticsLockedAt?.toISO() ?? null,
        archivedAt: item.archivedAt?.toISO() ?? null,
        updatedAt: item.updatedAt.toISO(),
      })),
    }

    return createHash('sha256').update(JSON.stringify(state)).digest('hex')
  }

  async preview(
    sourceId: string,
    targetId: string,
    client?: TransactionClientContract
  ): Promise<CatalogueCategoryMergePreview> {
    const categories = await this.categoryQuery(client).orderBy('id', 'asc')
    const source = categories.find((category) => category.id === sourceId)
    const target = categories.find((category) => category.id === targetId)

    if (!source) {
      await this.categoryQuery(client).where('id', sourceId).firstOrFail()
      throw new Error('Unreachable missing source category')
    }

    if (!target) {
      await this.categoryQuery(client).where('id', targetId).firstOrFail()
      throw new Error('Unreachable missing target category')
    }

    this.hierarchy.assertMergeTarget(source, target, categories)

    const relevantItems = await this.itemQuery(client)
      .whereIn('catalogue_category_id', [source.id, target.id])
      .orderBy('id', 'asc')
    const affectedItems = relevantItems.filter((item) => item.catalogueCategoryId === source.id)
    const activeChildren = this.hierarchy.activeChildren(source.id, categories)

    return {
      source: {
        id: source.id,
        name: source.name,
        description: source.description,
      },
      target: {
        id: target.id,
        name: target.name,
        description: target.description,
      },
      activeChildren: activeChildren.map((child) => ({
        id: child.id,
        name: child.name,
        description: child.description,
      })),
      affectedItems: affectedItems.map((item) => ({
        catalogueCode: item.catalogueCode,
        name: item.name,
        description: item.description,
        archivedAt: item.archivedAt,
      })),
      ready: activeChildren.length === 0,
      fingerprint: this.fingerprint(source.id, target.id, categories, relevantItems),
    }
  }
}
