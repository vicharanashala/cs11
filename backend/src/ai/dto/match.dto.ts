import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class MatchRequestDto {
  @ApiProperty({ example: 'How do I apply for on-campus housing?' })
  @IsString()
  @IsNotEmpty()
  question: string

  @ApiPropertyOptional({ example: ['housing', 'facilities'] })
  @IsArray()
  @IsOptional()
  tags?: string[]

  @ApiPropertyOptional({ example: 'Facilities' })
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional({ description: 'Any additional user context metadata' })
  @IsOptional()
  userContext?: Record<string, unknown>
}

export class MatchResultDto {
  @ApiProperty()
  id: string

  @ApiProperty({ enum: ['faq', 'question'] })
  type: 'faq' | 'question'

  @ApiProperty()
  confidence: number

  @ApiProperty()
  ranking: number

  @ApiPropertyOptional()
  explanation?: string
}

export class MatchResponseDto {
  @ApiProperty({ type: [MatchResultDto] })
  matches: MatchResultDto[]
}