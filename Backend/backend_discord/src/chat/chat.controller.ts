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

import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get messages from channel' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.chatService.getMessages(channelId, page, limit);
  }

  @Post('channels/:channelId/messages')
  @ApiOperation({ summary: 'Send message to channel' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Request() req,
    @Param('channelId') channelId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.id, channelId, sendMessageDto);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async editMessage(
    @Request() req,
    @Param('id') id: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(req.user.id, id, content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Request() req, @Param('id') id: string) {
    return this.chatService.deleteMessage(req.user.id, id);
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to message' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  async addReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(req.user.id, messageId, emoji);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  @ApiOperation({ summary: 'Remove reaction from message' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.chatService.removeReaction(req.user.id, messageId, emoji);
  }
}