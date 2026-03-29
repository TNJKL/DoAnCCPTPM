import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceSession, SessionType } from '../entities/voice-session.entity';
import { Channel } from '../entities/channel.entity';

@Injectable()
export class VoiceService {
  constructor(
    @InjectRepository(VoiceSession)
    private voiceSessionRepository: Repository<VoiceSession>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
  ) {}

  async joinVoiceChannel(userId: string, channelId: string): Promise<VoiceSession> {
    // Verify channel exists and is a voice channel
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if user is already in a voice session
    const existingSession = await this.voiceSessionRepository.findOne({
      where: { user_id: userId, left_at: null },
    });

    if (existingSession) {
      // Leave current session first
      await this.leaveVoiceChannel(userId, existingSession.channel_id);
    }

    // Create new voice session
    const voiceSession = this.voiceSessionRepository.create({
      channel_id: channelId,
      user_id: userId,
      session_type: SessionType.VOICE,
      joined_at: new Date(),
    });

    return this.voiceSessionRepository.save(voiceSession);
  }

  async leaveVoiceChannel(userId: string, channelId: string): Promise<void> {
    const voiceSession = await this.voiceSessionRepository.findOne({
      where: { user_id: userId, channel_id: channelId, left_at: null },
    });

    if (voiceSession) {
      await this.voiceSessionRepository.update(voiceSession.id, {
        left_at: new Date(),
      });
    }
  }

  async getVoiceSessions(channelId: string): Promise<VoiceSession[]> {
    return this.voiceSessionRepository.find({
      where: { channel_id: channelId, left_at: null },
      relations: ['user'],
    });
  }
}
