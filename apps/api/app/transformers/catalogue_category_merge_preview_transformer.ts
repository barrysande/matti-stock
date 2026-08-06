import { BaseTransformer } from '@adonisjs/core/transformers'
import type { CatalogueCategoryMergePreview } from '#types/catalogue'

export default class CatalogueCategoryMergePreviewTransformer extends BaseTransformer<CatalogueCategoryMergePreview> {
  toObject() {
    return {
      source: this.resource.source,
      target: this.resource.target,
      activeChildren: this.resource.activeChildren,
      affectedItems: this.resource.affectedItems,
      ready: this.resource.ready,
      fingerprint: this.resource.fingerprint,
    }
  }
}
