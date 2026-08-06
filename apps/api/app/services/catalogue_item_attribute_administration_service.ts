import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueItemAttributeValueService from '#services/catalogue_item_attribute_value_service'
import CatalogueItemHistoryService from '#services/catalogue_item_history_service'
import type { updateCatalogueItemAttributeValuesValidator } from '#validators/catalogue_item'
import type { Infer } from '@vinejs/vine/types'

type ChangeData = Infer<typeof updateCatalogueItemAttributeValuesValidator>

@inject()
export default class CatalogueItemAttributeAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private attributeValues: CatalogueItemAttributeValueService,
    private history: CatalogueItemHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCatalogueItemChangeException(message)
  }

  async update(catalogueCode: string, data: ChangeData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      const item = await CatalogueItem.query({ client: trx })
        .where('catalogue_code', catalogueCode)
        .forUpdate()
        .firstOrFail()

      if (item.archivedAt) {
        this.invalid('Restore the catalogue item before changing its attributes.')
      }

      const attributeIds = await this.attributeValues.applyChanges(
        item.id,
        item.catalogueCategoryId,
        data.changes,
        trx,
        now
      )

      const category = await CatalogueCategory.query({ client: trx })
        .where('id', item.catalogueCategoryId)
        .forUpdate()
        .firstOrFail()

      if (category.archivedAt) {
        this.invalid('Catalogue attribute values cannot change while the category is archived.')
      }

      await this.attributeValues.assertApplicableSetUnchanged(
        item.catalogueCategoryId,
        attributeIds,
        trx
      )

      await this.history.appendVersion(
        item,
        'ATTRIBUTE_VALUES_UPDATED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )

      return item
    })
  }
}
