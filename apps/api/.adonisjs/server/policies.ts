export const policies = {
  AccessPolicy: () => import('#policies/access_policy'),
  BaseUnitPolicy: () => import('#policies/base_unit_policy'),
  CatalogueCategoryPolicy: () => import('#policies/catalogue_category_policy'),
  DelegationPolicy: () => import('#policies/delegation_policy'),
  OrganizationalUnitPolicy: () => import('#policies/organizational_unit_policy'),
  PhysicalLocationPolicy: () => import('#policies/physical_location_policy'),
  RoleAssignmentPolicy: () => import('#policies/role_assignment_policy'),
  RolePolicy: () => import('#policies/role_policy'),
}

