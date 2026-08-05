import InvalidBaseUnitChangeException from '#exceptions/invalid_base_unit_change_exception'
import BaseUnitNameService from '#services/base_unit_name_service'
import type { BaseUnitKind } from '#types/catalogue'

export default class BaseUnitDetailsService {
  constructor(private names = new BaseUnitNameService()) {}

  resolve(name: string, symbol: string, kind: BaseUnitKind, precision?: number) {
    if (kind === 'COUNTABLE') {
      if (precision !== undefined && precision !== 0) {
        throw new InvalidBaseUnitChangeException('A countable base unit must use zero precision.')
      }
      return {
        name: this.names.normalizeName(name),
        symbol: this.names.normalizeSymbol(symbol),
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
      name: this.names.normalizeName(name),
      symbol: this.names.normalizeSymbol(symbol),
      kind,
      precision: measuredPrecision,
    }
  }
}
