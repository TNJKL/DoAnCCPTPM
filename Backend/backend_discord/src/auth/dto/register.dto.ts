import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'johndoe', description: 'Username' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Password' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  display_name?: string;
}
