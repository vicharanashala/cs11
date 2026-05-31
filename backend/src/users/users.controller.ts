import { Controller, Get, Patch, Body, Param, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtGuard, AdminGuard } from '../auth/guards'
import { ROLES } from '../config/roles'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findById(id)
    if (!user) throw new NotFoundException('User not found')
    const { passwordHash, ...result } = user.toObject()
    return result
  }

  @Patch(':id/role')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user role (admin/superadmin only)' })
  async updateRole(@Param('id') id: string, @Body('role') role: string) {
    const validRoles = [ROLES.INTERN, ROLES.ADMIN, ROLES.SUPERADMIN]
    if (!role || !validRoles.includes(role as 'intern' | 'admin' | 'superadmin')) {
      throw new BadRequestException('Invalid role')
    }
    const user = await this.usersService.updateRole(id, role)
    const { passwordHash, ...result } = user.toObject()
    return result
  }
}