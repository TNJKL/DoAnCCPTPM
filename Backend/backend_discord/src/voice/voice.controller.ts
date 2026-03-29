import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('join/:channelId')
  async joinVoiceChannel(@Param('channelId') channelId: string, @Request() req: any) {
    return this.voiceService.joinVoiceChannel(req.user.id, channelId);
  }

  @Post('leave/:channelId')
  async leaveVoiceChannel(@Param('channelId') channelId: string, @Request() req: any) {
    return this.voiceService.leaveVoiceChannel(req.user.id, channelId);
  }

  @Get('sessions/:channelId')
  async getVoiceSessions(@Param('channelId') channelId: string) {
    return this.voiceService.getVoiceSessions(channelId);
  }
}
