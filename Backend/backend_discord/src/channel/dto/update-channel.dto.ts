import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  VIDEO = 'video',
  ANNOUNCEMENT = 'announcement',
}

export class UpdateChannelDto {
  @ApiProperty({ example: 'updated-channel', description: 'Channel name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'Updated description', description: 'Channel description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 0, description: 'Channel position', required: false })
  @IsOptional()
  position?: number;

  @ApiProperty({ example: false, description: 'Is NSFW channel', required: false })
  @IsOptional()
  is_nsfw?: boolean;

  @ApiProperty({ example: 5, description: 'Slowmode in seconds', required: false })
  @IsOptional()
  slowmode_seconds?: number;
}