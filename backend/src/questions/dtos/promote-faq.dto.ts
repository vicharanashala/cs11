import { IsString, IsOptional, IsArray, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PromoteFaqDto {
  @ApiPropertyOptional({ description: 'Specific answerId to promote. Falls back to the accepted answer if omitted.' })
  @IsOptional()
  @IsString()
  answerId?: string

  @ApiProperty({ description: 'Title for the FAQ entry' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ description: 'MongoDB ObjectId of the target category' })
  @IsString()
  @IsNotEmpty()
  category: string

  @ApiPropertyOptional({ description: 'Tags for the FAQ entry' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}