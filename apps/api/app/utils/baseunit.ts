import InvalidBaseUnitChangeException from '#exceptions/invalid_base_unit_change_exception'
import type { BaseUnitKind } from '#types/catalogue'

export function normalizeBaseUnitName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function normalizeBaseUnitSymbol(symbol: string) {
  return symbol.trim().replace(/\s+/g, ' ')
}

export function resolveBaseUnitDetails(
  name: string,
  symbol: string,
  kind: BaseUnitKind,
  precision?: number
) {
  if (kind === 'COUNTABLE') {
    if (precision !== undefined && precision !== 0) {
      throw new InvalidBaseUnitChangeException('A countable base unit must use zero precision.')
    }

    return {
      name: normalizeBaseUnitName(name),
      symbol: normalizeBaseUnitSymbol(symbol),
      kind,
      precision: 0,
    }
  }

  const measuredPrecision = precision ?? 3
  if (measuredPrecision < 1 || measuredPrecision > 3) {
    throw new InvalidBaseUnitChangeException(
      'A measured base unit must use between one and three decimal places.'
    )
  }

  return {
    name: normalizeBaseUnitName(name),
    symbol: normalizeBaseUnitSymbol(symbol),
    kind,
    precision: measuredPrecision,
  }
}
