import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateQuestionDto {
  @ApiProperty({ example: 'How do I reset my student portal password?' })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ example: 'I have been trying to reset my password but...' })
  @IsString()
  @IsNotEmpty()
  body: string

  @ApiProperty({ example: 'IT Support' })
  @IsString()
  @IsNotEmpty()
  category: string

  @ApiPropertyOptional({ example: ['password', 'portal', 'account'] })
  @IsArray()
  @IsOptional()
  tags?: string[]
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[]

  @ApiPropertyOptional({ enum: ['open', 'in_progress', 'resolved', 'closed'] })
  @IsString()
  @IsOptional()
  status?: string
}