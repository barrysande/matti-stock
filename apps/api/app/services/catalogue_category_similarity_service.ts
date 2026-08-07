import { inject } from '@adonisjs/core'
import CatalogueCategoryDirectoryService from '#services/catalogue_category_directory_service'
import { normalizeCategoryName } from '#utils/category'
import type { reviewCatalogueCategoryCreationValidator } from '#validators/catalogue_category'
import type { Infer } from '@vinejs/vine/types'

type ReviewData = Infer<typeof reviewCatalogueCategoryCreationValidator>
type CategoryMatchKind = 'EXACT_NAME' | 'PREFIX' | 'SUBSTRING'

export interface CatalogueCategorySimilarityCandidate {
  category: Awaited<ReturnType<CatalogueCategoryDirectoryService['list']>>[number]
  matchKind: CategoryMatchKind
}

@inject()
export default class CatalogueCategorySimilarityService {
  constructor(private directory: CatalogueCategoryDirectoryService) {}

  private matchKind(proposedName: string, candidateName: string): CategoryMatchKind | null {
    if (candidateName === proposedName) return 'EXACT_NAME'

    if (candidateName.startsWith(proposedName) || proposedName.startsWith(candidateName)) {
      return 'PREFIX'
    }

    if (candidateName.includes(proposedName) || proposedName.includes(candidateName)) {
      return 'SUBSTRING'
    }

    return null
  }

  /** Ranks likely duplicates across the complete hierarchy without making review binding. */
  async review(data: ReviewData) {
    const proposedName = normalizeCategoryName(data.name).toLowerCase()
    const categories = await this.directory.list({ includeArchived: true })
    const priority: Record<CategoryMatchKind, number> = {
      EXACT_NAME: 0,
      PREFIX: 1,
      SUBSTRING: 2,
    }

    const candidates = categories.flatMap((category) => {
      const matchKind = this.matchKind(proposedName, category.name.toLowerCase())

      return matchKind ? [{ category, matchKind }] : []
    })

    return candidates
      .sort((left, right) => {
        const kindDifference = priority[left.matchKind] - priority[right.matchKind]
        if (kindDifference) return kindDifference

        const leftParent = left.category.parentId === (data.parentId ?? null) ? 0 : 1
        const rightParent = right.category.parentId === (data.parentId ?? null) ? 0 : 1

        return (
          leftParent - rightParent ||
          String(left.category.$extras.path).localeCompare(String(right.category.$extras.path))
        )
      })
      .slice(0, 10)
  }
}
