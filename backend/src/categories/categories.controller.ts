import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { CategoriesService } from './categories.service'
import { JwtGuard, AdminGuard, SuperadminGuard } from '../auth/guards'

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
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a category — superadmin only' })
  create(
    @Body() body: { name: string; slug?: string; description?: string; color: string },
    @Request() req: any,
  ) {
    return this.categoriesService.create(body, req.user.userId)
  }

  @Patch(':id')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category — superadmin only. Slug is immutable.' })
  update(@Param('id') id: string, @Body() body: { name?: string; description?: string; color?: string }) {
    return this.categoriesService.update(id, body)
  }

  @Delete(':id')
  @UseGuards(JwtGuard, SuperadminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category — superadmin only. Blocked if category is in use.' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id)
  }
}