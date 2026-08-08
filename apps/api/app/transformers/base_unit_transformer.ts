import { BaseTransformer } from '@adonisjs/core/transformers'
import type BaseUnit from '#models/base_unit'

export default class BaseUnitTransformer extends BaseTransformer<BaseUnit> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      symbol: this.resource.symbol,
      kind: this.resource.kind,
      precision: Number(this.resource.precision),
      firstUsedAt: this.resource.firstUsedAt,
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forDetailedView() {
    return this.toObject()
  }
}
