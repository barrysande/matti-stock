import CatalogueItemKeyword from '#models/catalogue_item_keyword'
import type { NormalizedKeyword } from '#utils/catalogue_item'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class CatalogueItemKeywordService {
  private lockCurrent(catalogueItemId: string, trx: TransactionClientContract) {
    return CatalogueItemKeyword.query({ client: trx })
      .where('catalogue_item_id', catalogueItemId)
      .orderBy('id', 'asc')
      .forUpdate()
  }

  async replace(
    catalogueItemId: string,
    keywords: NormalizedKeyword[],
    trx: TransactionClientContract
  ) {
    await this.lockCurrent(catalogueItemId, trx)

    await CatalogueItemKeyword.query({ client: trx })
      .where('catalogue_item_id', catalogueItemId)
      .delete()

    for (const [index, keyword] of keywords.entries()) {
      await CatalogueItemKeyword.create(
        {
          catalogueItemId,
          ...keyword,
          displayOrder: index + 1,
        },
        { client: trx }
      )
    }
  }
}
