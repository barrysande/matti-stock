import { BaseTransformer } from '@adonisjs/core/transformers'
import type CategoryAttributeChoice from '#models/category_attribute_choice'
import CategoryAttributeChoiceVersionTransformer from '#transformers/category_attribute_choice_version_transformer'

export default class CategoryAttributeChoiceTransformer extends BaseTransformer<CategoryAttributeChoice> {
  toObject() {
    return {
      id: this.resource.id,
      label: this.resource.label,
      displayOrder: this.resource.displayOrder,
      firstUsedAt: this.resource.firstUsedAt,
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      versions: CategoryAttributeChoiceVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
