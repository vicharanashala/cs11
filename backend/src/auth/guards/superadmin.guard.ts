import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ROLES } from '../../config/roles'

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    if (user.role !== ROLES.SUPERADMIN) {
      throw new ForbiddenException('Superadmin access required')
    }

    return true
  }
}