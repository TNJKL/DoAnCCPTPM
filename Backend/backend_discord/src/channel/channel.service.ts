import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Channel } from '../entities/channel.entity';
import { ServerMember } from '../entities/server-member.entity';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelService {
  constructor(
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(ServerMember)
    private serverMemberRepository: Repository<ServerMember>,
  ) {}

  async createChannel(userId: string, createChannelDto: CreateChannelDto): Promise<Channel> {
    const { server_id, name, type, description, parent_id } = createChannelDto;

    // Verify user has permission to create channels in this server
    const hasPermission = await this.verifyChannelPermission(userId, server_id);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to create channels in this server');
    }

    const channel = this.channelRepository.create({
      server_id,
      name,
      type,
      description,
      parent_id,
    });

    return this.channelRepository.save(channel);
  }

  async getChannelById(id: string): Promise<Channel> {
    const channel = await this.channelRepository.findOne({
      where: { id },
      relations: ['server', 'messages'],
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async updateChannel(userId: string, id: string, updateChannelDto: UpdateChannelDto): Promise<Channel> {
    const channel = await this.getChannelById(id);

    // Verify user has permission to update this channel
    const hasPermission = await this.verifyChannelPermission(userId, channel.server_id);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to update this channel');
    }

    await this.channelRepository.update(id, {
      ...updateChannelDto,
      updated_at: new Date(),
    });

    return this.getChannelById(id);
  }

  async deleteChannel(userId: string, id: string): Promise<void> {
    const channel = await this.getChannelById(id);

    // Verify user has permission to delete this channel
    const hasPermission = await this.verifyChannelPermission(userId, channel.server_id);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to delete this channel');
    }

    await this.channelRepository.delete(id);
  }

  private async verifyChannelPermission(userId: string, serverId: string): Promise<boolean> {
    const membership = await this.serverMemberRepository.findOne({
      where: { server_id: serverId, user_id: userId },
    });

    return !!membership;
  }
}