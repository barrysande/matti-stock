import { Exception } from '@adonisjs/core/exceptions'

export default class StaleCatalogueCategoryMergePreviewException extends Exception {
  static status = 409
  static code = 'E_STALE_CATALOGUE_CATEGORY_MERGE_PREVIEW'

  constructor() {
    super('Catalogue categories or affected items changed. Review the merge again.')
  }
}
