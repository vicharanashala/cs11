import { IsIn, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class VoteDto {
  @ApiProperty({ example: 1, description: '1 for upvote, -1 for downvote' })
  @IsNotEmpty()
  @IsIn([1, -1])
  value: 1 | -1
}