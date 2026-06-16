import { Controller, Get, Patch, Body, Param, Query, UseGuards, NotFoundException, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { Request } from 'express'
import { UsersService } from './users.service'
import { ReputationService } from '../reputation/reputation.service'
import { JwtGuard, SuperadminGuard } from '../auth/guards'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly reputationService: ReputationService,
  ) {}

  @Get()
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users — superadmin only' })
  findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
  ) {
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '20', 10) || 20))
    return this.usersService.findAll({ page, limit, search })
  }

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

  @Get('me/reputation')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user reputation score and history' })
  async getMyReputation(
    @Req() req: Request & { user: { userId: string } },
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
  ) {
    const userId = req.user.userId
    const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(limitStr ?? '20', 10) || 20))

    const [reputation, historyResult] = await Promise.all([
      this.reputationService.getReputation(userId),
      this.reputationService.getHistory(userId, page, limit),
    ])

    return { reputation, history: historyResult }
  }

  @Patch(':id/role')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user role — superadmin only. Cannot assign superadmin role.' })
  async updateRole(@Param('id') id: string, @Body('role') role: string, @Req() req: Request & { user: { userId: string } }) {
    const user = await this.usersService.updateRole(id, role, req.user.userId)
    return user.toObject()
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-deactivate a user — superadmin only' })
  async deactivate(@Param('id') id: string, @Req() req: Request & { user: { userId: string } }) {
    const user = await this.usersService.deactivate(id, req.user.userId)
    return user.toObject()
  }

  @Patch(':id/reactivate')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a deactivated user — superadmin only' })
  async reactivate(@Param('id') id: string) {
    const user = await this.usersService.reactivate(id)
    return user.toObject()
  }
}