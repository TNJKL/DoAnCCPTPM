import { IsString, IsOptional, IsBoolean, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VerificationLevel } from '../../entities/server.entity';

export class UpdateServerDto {
  @ApiProperty({ example: 'Updated Server Name', description: 'Server name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Updated description', description: 'Server description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'https://example.com/icon.jpg', description: 'Server icon URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  icon_url?: string;

  @ApiProperty({ example: 'https://example.com/banner.jpg', description: 'Server banner URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  banner_url?: string;

  @ApiProperty({ example: true, description: 'Is server public', required: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiProperty({ example: VerificationLevel.MEDIUM, description: 'Verification level', required: false })
  @IsOptional()
  @IsEnum(VerificationLevel)
  verification_level?: VerificationLevel;
}