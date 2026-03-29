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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { ServerService } from './server.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Servers')
@Controller('servers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new server' })
  @ApiResponse({ status: 201, description: 'Server created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createServer(
    @Request() req, 
    @Body() createServerDto: CreateServerDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.serverService.createServer(req.user.id, createServerDto, avatar);
  }

  @Get()
  @ApiOperation({ summary: 'Get user servers' })
  @ApiResponse({ status: 200, description: 'Servers retrieved successfully' })
  async getUserServers(@Request() req) {
    return this.serverService.getUserServers(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  @ApiResponse({ status: 200, description: 'Server retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async getServerById(@Param('id') id: string) {
    return this.serverService.getServerById(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update server' })
  @ApiResponse({ status: 200, description: 'Server updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async updateServer(
    @Request() req,
    @Param('id') id: string,
    @Body() updateServerDto: UpdateServerDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.serverService.updateServer(req.user.id, id, updateServerDto, avatar);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete server' })
  @ApiResponse({ status: 200, description: 'Server deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async deleteServer(@Request() req, @Param('id') id: string) {
    return this.serverService.deleteServer(req.user.id, id);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join server by invite code' })
  @ApiResponse({ status: 200, description: 'Joined server successfully' })
  @ApiResponse({ status: 400, description: 'Invalid invite code' })
  async joinServer(@Request() req, @Body() joinServerDto: JoinServerDto) {
    return this.serverService.joinServer(req.user.id, joinServerDto.invite_code);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave server' })
  @ApiResponse({ status: 200, description: 'Left server successfully' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async leaveServer(@Request() req, @Param('id') id: string) {
    return this.serverService.leaveServer(req.user.id, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get server members' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getServerMembers(@Param('id') id: string) {
    return this.serverService.getServerMembers(id);
  }

  @Get(':id/channels')
  @ApiOperation({ summary: 'Get server channels' })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  async getServerChannels(@Param('id') id: string) {
    return this.serverService.getServerChannels(id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Generate invite code' })
  @ApiResponse({ status: 200, description: 'Invite code generated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async generateInviteCode(@Request() req, @Param('id') id: string) {
    return this.serverService.generateInviteCode(req.user.id, id);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload server avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async uploadServerAvatar(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.serverService.uploadServerAvatar(req.user.id, id, file);
  }

  @Delete(':id/avatar')
  @ApiOperation({ summary: 'Remove server avatar' })
  @ApiResponse({ status: 200, description: 'Avatar removed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Server not found' })
  async removeServerAvatar(@Request() req, @Param('id') id: string) {
    return this.serverService.removeServerAvatar(req.user.id, id);
  }
}
