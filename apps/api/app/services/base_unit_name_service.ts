export default class BaseUnitNameService {
  normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ')
  }

  normalizeSymbol(symbol: string) {
    return symbol.trim().replace(/\s+/g, ' ')
  }
}
