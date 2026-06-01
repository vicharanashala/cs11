import { IsNotEmpty, IsOptional, IsString, IsArray, IsMongoId, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFaqDto {
  @ApiProperty({ example: 'How do I reset my student portal password?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  title: string

  @ApiProperty({ example: 'Visit the IT helpdesk with your student ID card...' })
  @IsString()
  @IsNotEmpty()
  body: string

  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  category: string

  @ApiPropertyOptional({ example: ['password', 'portal', 'account'] })
  @IsArray()
  @IsOptional()
  tags?: string[]

  @ApiPropertyOptional({ example: 'Visit the IT helpdesk with your student ID card. You will receive a temporary password within 24 hours.' })
  @IsString()
  @IsOptional()
  officialAnswer?: string
}