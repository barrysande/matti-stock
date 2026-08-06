import { BaseTransformer } from '@adonisjs/core/transformers'
import type CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoiceTransformer from '#transformers/category_attribute_choice_transformer'
import CategoryAttributeVersionTransformer from '#transformers/category_attribute_version_transformer'

export default class CategoryAttributeTransformer extends BaseTransformer<CategoryAttribute> {
  toObject() {
    return {
      id: this.resource.id,
      category: {
        id: this.resource.catalogueCategoryId,
        name: this.resource.catalogueCategory.name,
      },
      name: this.resource.name,
      description: this.resource.description,
      dataType: this.resource.dataType,
      isRequired: this.resource.isRequired,
      scope: this.resource.scope,
      semanticsLockedAt: this.resource.semanticsLockedAt,
      archivedAt: this.resource.archivedAt,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
      choices: CategoryAttributeChoiceTransformer.transform(this.whenLoaded(this.resource.choices)),
    }
  }

  forOverview() {
    return {
      ...this.toObject(),
      choices: CategoryAttributeChoiceTransformer.transform(
        this.whenLoaded(this.resource.choices)
      )?.depth(2),
      versions: CategoryAttributeVersionTransformer.transform(
        this.whenLoaded(this.resource.versions)
      ),
    }
  }
}
