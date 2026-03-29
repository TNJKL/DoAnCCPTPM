import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinServerDto {
  @ApiProperty({ example: 'ABC12345', description: 'Server invite code' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  invite_code: string;
}
