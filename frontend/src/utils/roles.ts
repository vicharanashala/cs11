import { UserRole } from '@/types'

export function hasRole(userRole: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(userRole)
}

export function isAdminOrAbove(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin'
}

export function isSuperadmin(role: UserRole): boolean {
  return role === 'superadmin'
}

export function canVote(role: UserRole): boolean {
  return ['intern', 'admin', 'superadmin'].includes(role)
}

export function canAsk(role: UserRole): boolean {
  return ['intern', 'admin', 'superadmin'].includes(role)
}

export function canModerate(role: UserRole): boolean {
  return role === 'admin' || role === 'superadmin'
}

export function canManageSystem(role: UserRole): boolean {
  return role === 'superadmin'
}