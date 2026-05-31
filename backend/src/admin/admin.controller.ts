import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { AdminService } from './admin.service'
import { AnalyticsService } from './analytics.service'
import { QueryAnalyticsService } from './query-analytics.service'
import { JwtGuard, AdminGuard } from '../auth/guards'
import { QuestionStatusCounts, CategoryBreakdownItem, TopContributor } from './analytics.service'

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly analyticsService: AnalyticsService,
    private readonly queryAnalyticsService: QueryAnalyticsService,
  ) {}

  @Get('queries')
  @ApiOperation({ summary: 'Admin resolution queue — open and in_progress questions only, oldest first' })
  getQueryQueue(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getQueryQueue({
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
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
  getAnalytics() {
    return this.analyticsService.getAnalytics()
  }

  @Get('query-insights')
  @ApiOperation({ summary: 'Query analytics: category coverage gaps, resolution rates, and representative questions ranked by coverage need' })
  getQueryInsights() {
    return this.queryAnalyticsService.getCategoryCoverage()
  }
}