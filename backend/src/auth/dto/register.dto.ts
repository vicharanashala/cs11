import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'securepassword123' })
  @IsString()
  @MinLength(8)
  password: string
}