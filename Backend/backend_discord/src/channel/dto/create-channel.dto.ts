import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  VIDEO = 'video',
  ANNOUNCEMENT = 'announcement',
}

export class CreateChannelDto {
  @ApiProperty({ example: 'general', description: 'Channel name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'text', enum: ChannelType, description: 'Channel type' })
  @IsEnum(ChannelType)
  type: ChannelType;

  @ApiProperty({ example: 'General discussion', description: 'Channel description', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'server-id', description: 'Server ID' })
  @IsString()
  server_id: string;

  @ApiProperty({ example: 'parent-channel-id', description: 'Parent channel ID for categories', required: false })
  @IsOptional()
  @IsString()
  parent_id?: string;
}