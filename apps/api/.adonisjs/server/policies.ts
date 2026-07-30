export const policies = {
  AccessPolicy: () => import('#policies/access_policy'),
  DelegationPolicy: () => import('#policies/delegation_policy'),
  OrganizationalUnitPolicy: () => import('#policies/organizational_unit_policy'),
  PhysicalLocationPolicy: () => import('#policies/physical_location_policy'),
  RoleAssignmentPolicy: () => import('#policies/role_assignment_policy'),
  RolePolicy: () => import('#policies/role_policy'),
}

