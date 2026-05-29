import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { FlagsService } from './flags.service'
import { JwtGuard, AdminGuard } from '../auth/guards'

@ApiTags('flags')
@Controller('flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report content (intern+)' })
  create(@Body() body: { targetId: string; targetType: 'faq' | 'question' | 'answer'; reason: string }, @Request() req: any) {
    return this.flagsService.create(req.user.userId, body)
  }

  @Get()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reports (admin+)' })
  findAll(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.flagsService.findAll({
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Patch(':id/review')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review a flag (admin+)' })
  review(@Param('id') id: string, @Body() body: { action: string; note?: string }, @Request() req: any) {
    return this.flagsService.review(id, req.user.userId, body.action, body.note)
  }

  @Patch(':id/resolve')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a flag (admin+)' })
  resolve(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.flagsService.resolve(id, req.user.userId, body.note)
  }

  @Patch(':id/dismiss')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dismiss a flag (admin+)' })
  dismiss(@Param('id') id: string, @Body() body: { note?: string }, @Request() req: any) {
    return this.flagsService.dismiss(id, req.user.userId, body.note)
  }
}