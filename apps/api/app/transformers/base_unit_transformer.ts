import { BaseTransformer } from '@adonisjs/core/transformers'
import type BaseUnit from '#models/base_unit'
import BaseUnitVersionTransformer from '#transformers/base_unit_version_transformer'

export default class BaseUnitTransformer extends BaseTransformer<BaseUnit> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      symbol: this.resource.symbol,
      kind: this.resource.kind,
      precision: Number(this.resource.precision),
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }

  forOverview() {
    return {
      ...this.toObject(),
      versions: BaseUnitVersionTransformer.transform(this.whenLoaded(this.resource.versions)),
    }
  }
}
