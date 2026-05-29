export const ROLES = {
  INTERN: 'intern',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.INTERN]: 1,
  [ROLES.ADMIN]: 2,
  [ROLES.SUPERADMIN]: 3,
}

export function hasRoleOrAbove(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
}