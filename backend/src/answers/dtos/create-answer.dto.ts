import { IsNotEmpty, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateAnswerDto {
  @ApiProperty({
    example:
      'You need to visit the housing portal at housing.example.edu, fill out the application form, and submit your student ID and a deposit. The deadline for on-campus housing applications is typically 2 weeks before semester start.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  body: string
}