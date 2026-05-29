import { IsNotEmpty, IsOptional, IsString, IsArray, IsMongoId, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateQuestionDto {
  @ApiProperty({ example: 'How do I apply for on-campus housing and what documents do I need?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  title: string

  @ApiProperty({ example: 'I am a new postgraduate student arriving next semester. I would like to know the process to apply for on-campus housing...' })
  @IsString()
  @IsNotEmpty()
  body: string

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  category: string

  @ApiPropertyOptional({ example: ['housing', 'accommodation'] })
  @IsArray()
  @IsOptional()
  tags?: string[]
}