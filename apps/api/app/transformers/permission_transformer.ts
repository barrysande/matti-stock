import { BaseTransformer } from '@adonisjs/core/transformers'
import type Permission from '#models/permission'

export default class PermissionTransformer extends BaseTransformer<Permission> {
  toObject() {
    return {
      key: this.resource.key,
      description: this.resource.description,
      customRoleAssignable: this.resource.customRoleAssignable,
    }
  }
}
