export function normalizeCategoryAttributeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function normalizeCategoryAttributeChoiceLabel(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

export function resolveCategoryAttributeDescription(value: string | null | undefined) {
  const description = value?.trim()
  return description ? description : null
}
