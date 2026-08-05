export default class CatalogueCategoryNameService {
  normalize(name: string) {
    return name.trim().replace(/\s+/g, ' ')
  }
}
