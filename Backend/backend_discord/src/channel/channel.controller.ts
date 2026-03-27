import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new channel' })
  @ApiResponse({ status: 201, description: 'Channel created successfully' })
  async createChannel(@Request() req, @Body() createChannelDto: CreateChannelDto) {
    return this.channelService.createChannel(req.user.id, createChannelDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID' })
  @ApiResponse({ status: 200, description: 'Channel retrieved successfully' })
  async getChannelById(@Param('id') id: string) {
    return this.channelService.getChannelById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update channel' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  async updateChannel(
    @Request() req,
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    return this.channelService.updateChannel(req.user.id, id, updateChannelDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete channel' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  async deleteChannel(@Request() req, @Param('id') id: string) {
    return this.channelService.deleteChannel(req.user.id, id);
  }
}