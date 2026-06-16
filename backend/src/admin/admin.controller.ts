import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AnalyticsService } from './analytics.service'
import { JwtGuard, AdminGuard, SuperadminGuard } from '../auth/guards'
import { QuestionStatusCounts, CategoryBreakdownItem, TopContributor } from './analytics.service'

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('system-health')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'System health snapshot — superadmin only' })
  getSystemHealth() {
    return this.adminService.getSystemHealth()
  }

  @Get('queries')
  @ApiOperation({ summary: 'Admin resolution queue — open and in_progress questions only, oldest first' })
  getQueryQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.getQueryQueue({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      category,
    })
  }

  @Patch('queries/:questionId/resolve')
  @ApiOperation({ summary: 'Admin resolves a question with an official answer — sets question to resolved, +5 rep' })
  resolve(
    @Param('questionId') questionId: string,
    @Body() body: { responseBody: string },
    @Request() req: any,
  ) {
    return this.adminService.resolveQuestion(questionId, body, req.user.userId)
  }

  @Post('rebuild-index')
  @ApiOperation({ summary: 'Trigger AI service to rebuild the FAQ embedding index (admin+)' })
  rebuildIndex() {
    return this.adminService.rebuildIndex()
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Platform analytics dashboard — FAQ counts, question statuses, top contributors, resolution metrics' })
getAnalytics(): Promise<{
  totalFaqs: number
  totalQuestions: QuestionStatusCounts
  totalAnswers: number
  avgResolutionTimeHours: number | null
  topContributors: TopContributor[]
  categoryBreakdown: CategoryBreakdownItem[]
  aiMatchRate: number
  indexStalenessHours: number | null
}> {
  return this.analyticsService.getAnalytics()
}
}