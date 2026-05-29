import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { FaqsService } from './faqs.service'
import { CreateFaqDto } from './dtos/create-faq.dto'
import { UpdateFaqDto } from './dtos/update-faq.dto'
import { JwtGuard, AdminGuard } from '../auth/guards'

@ApiTags('faqs')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqsService: FaqsService) {}

  @Get()
  @ApiOperation({ summary: 'List published FAQs (public) or all FAQs (admin)' })
  findAll(
    @Query('category') category?: string,
    @Query('tags') tags?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const isAdmin = req?.user?.role === 'admin' || req?.user?.role === 'superadmin'
    const parsedTags = tags ? tags.split(',').map((t: string) => t.trim()) : undefined

    return this.faqsService.findAll({
      category,
      tags: parsedTags,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      isAdmin,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get FAQ by ID — increments viewCount atomically' })
  findOne(@Param('id') id: string) {
    return this.faqsService.findById(id)
  }

  @Post()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new FAQ — status set to published (admin+)' })
  create(@Body() dto: CreateFaqDto, @Request() req: any) {
    return this.faqsService.create(dto, req.user.userId)
  }

  @Patch(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Partial update of an FAQ (admin+)' })
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete FAQ — sets status to archived (admin+)' })
  archive(@Param('id') id: string) {
    return this.faqsService.archive(id)
  }
}