import { ApiProperty } from '@nestjs/swagger'

export class CategoryCoverageItemDto {
  @ApiProperty()
  categoryId: string

  @ApiProperty()
  categoryName: string

  @ApiProperty()
  categorySlug: string

  @ApiProperty()
  totalQuestions: number

  @ApiProperty()
  resolvedCount: number

  @ApiProperty()
  unresolvedCount: number

  @ApiProperty()
  resolutionRate: number

  @ApiProperty()
  faqCount: number

  @ApiProperty()
  coverageGap: number

  @ApiProperty()
  representativeQuery: string
}

export class CategoryCoverageResponseDto {
  @ApiProperty()
  generatedAt: string

  @ApiProperty({ type: [CategoryCoverageItemDto] })
  categories: CategoryCoverageItemDto[]
}