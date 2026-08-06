import { BaseTransformer } from '@adonisjs/core/transformers'
import type CatalogueItemAttributeValue from '#models/catalogue_item_attribute_value'

export default class CatalogueItemAttributeValueTransformer extends BaseTransformer<CatalogueItemAttributeValue> {
  toObject() {
    return {
      id: this.resource.id,
      attribute: {
        id: this.resource.categoryAttributeId,
        name: this.resource.categoryAttribute.name,
        dataType: this.resource.dataType,
        isRequired: this.resource.categoryAttribute.isRequired,
      },
      value: {
        text: this.resource.textValue,
        number: this.resource.numberValue === null ? null : String(this.resource.numberValue),
        date: this.resource.dateValue?.toISODate() ?? null,
        yesNo: this.resource.yesNoValue,
        choice: this.resource.choiceId
          ? { id: this.resource.choiceId, label: this.resource.choice.label }
          : null,
      },
    }
  }
}
