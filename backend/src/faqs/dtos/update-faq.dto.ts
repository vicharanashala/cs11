import { IsOptional, IsString, IsArray, IsMongoId } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateFaqDto {
  @ApiPropertyOptional({ example: 'How do I reset my student portal password?' })
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional({ example: 'Visit the IT helpdesk with your student ID card...' })
  @IsString()
  @IsOptional()
  body?: string

  @ApiPropertyOptional({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ example: ['password', 'portal', 'account'] })
  @IsArray()
  @IsOptional()
  tags?: string[]

  @ApiPropertyOptional({ example: 'Visit the IT helpdesk with your student ID card. You will receive a temporary password within 24 hours.' })
  @IsString()
  @IsOptional()
  officialAnswer?: string

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'] })
  @IsString()
  @IsOptional()
  status?: 'draft' | 'published' | 'archived'
}