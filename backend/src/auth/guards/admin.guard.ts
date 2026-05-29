import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ROLES } from '../../config/roles'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPERADMIN) {
      throw new ForbiddenException('Admin access required')
    }

    return true
  }
}