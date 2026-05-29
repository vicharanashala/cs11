import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { JwtGuard, AdminGuard } from '../auth/guards'

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories with published FAQ count' })
  findAll() {
    return this.categoriesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findById(id)
  }

  @Post()
  @UseGuards(JwtGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category — slug auto-generated (admin+)' })
  create(
    @Body() body: { name: string; description?: string; color: string },
    @Request() req: any,
  ) {
    return this.categoriesService.create(body, req.user.userId)
  }
}