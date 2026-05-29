import { Controller, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { SeedService } from './seed.service'
import { JwtGuard, SuperadminGuard } from '../auth/guards'

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('bootstrap')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger bootstrap superadmin creation (superadmin only)' })
  bootstrap() {
    return this.seedService.onModuleInit()
  }
}