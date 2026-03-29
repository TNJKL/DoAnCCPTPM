import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DmService } from './dm.service';

@ApiTags('Direct Messages')
@Controller('dm')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DmController {
  constructor(private readonly dmService: DmService) {}

  // Place static routes BEFORE dynamic router 
  @Get('recent/contacts/:take?')
  @ApiOperation({ summary: 'Get recent DM contacts' })
  async recent(@Request() req, @Param('take') take = 25) {
    return this.dmService.getRecentContacts(req.user.id, Number(take));
  }

  @Post(':receiverId')
  @ApiOperation({ summary: 'Send direct message' })
  async send(@Request() req, @Param('receiverId') receiverId: string, @Body('content') content: string) {
    try {
      if (!content || !content.trim()) {
        return { message: 'Content is empty' };
      }
      return await this.dmService.sendDirectMessage(req.user.id, receiverId, content.trim());
    } catch (e) {
      console.error('DM send error:', e);
      throw e;
    }
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get conversation with a user' })
  async getConversation(
    @Request() req,
    @Param('userId') userId: string,
    @Query('skip') skip = 0,
    @Query('take') take = 50,
  ) {
    try {
      return await this.dmService.getConversation(req.user.id, userId, Number(take), Number(skip));
    } catch (e) {
      console.error('DM get conv error:', e);
      throw e;
    }
  }
}


