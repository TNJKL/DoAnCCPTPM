import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message } from '../entities/message.entity';
import { MessageType } from '../enums/message-type.enum';
import { Channel } from '../entities/channel.entity';
import { User } from '../entities/user.entity';
import { Reaction } from '../entities/reaction.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from '../gateway/chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async getMessages(channelId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const messages = await this.messageRepository.find({
      where: { channel_id: channelId },
      relations: ['user', 'reactions', 'reactions.user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      messages: messages.reverse(),
      pagination: {
        page,
        limit,
        total: await this.messageRepository.count({ where: { channel_id: channelId } }),
      },
    };
  }

  async sendMessage(userId: string, channelId: string, sendMessageDto: SendMessageDto) {
    const { content, message_type, file_url, file_name, file_size, reply_to_id } = sendMessageDto;

    // Verify channel exists
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const messageType = message_type ? 
      (Object.values(MessageType).includes(message_type as MessageType) ? 
        message_type as MessageType : MessageType.TEXT) : 
      MessageType.TEXT;

    const savedMessage = await this.messageRepository.save({
      channel_id: channelId,
      user_id: userId,
      content,
      message_type: messageType,
      file_url,
      file_name,
      file_size,
      reply_to_id,
    });

    // Return message with user info
    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['user'],
    });
  }

  async editMessage(userId: string, messageId: string, content: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    await this.messageRepository.update(messageId, {
      content,
      is_edited: true,
      edited_at: new Date(),
    });

    return this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['user'],
    });
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.delete(messageId);
    return { message: 'Message deleted successfully' };
  }

  async addReaction(userId: string, messageId: string, emoji: string) {
    // Check if message exists
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if reaction already exists
    const existingReaction = await this.reactionRepository.findOne({
      where: { message_id: messageId, user_id: userId, emoji },
    });

    if (existingReaction) {
      // If reaction exists, remove it (toggle behavior)
      await this.reactionRepository.delete(existingReaction.id);
      
      // Emit WebSocket event
      await this.chatGateway.emitReactionEvent(messageId, 'removed', {
        messageId,
        emoji,
        userId,
      });
      
      return { message: 'Reaction removed successfully', action: 'removed' };
    }

    // Create new reaction
    const reaction = await this.reactionRepository.save({
      message_id: messageId,
      user_id: userId,
      emoji,
    });

    const reactionWithUser = await this.reactionRepository.findOne({
      where: { id: reaction.id },
      relations: ['user'],
    });

    // Emit WebSocket event
    await this.chatGateway.emitReactionEvent(messageId, 'added', {
      messageId,
      reaction: reactionWithUser,
    });

    return reactionWithUser;
  }

  async removeReaction(userId: string, messageId: string, emoji: string) {
    const reaction = await this.reactionRepository.findOne({
      where: { message_id: messageId, user_id: userId, emoji },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.reactionRepository.delete(reaction.id);
    
    // Emit WebSocket event
    await this.chatGateway.emitReactionEvent(messageId, 'removed', {
      messageId,
      emoji,
      userId,
    });
    
    return { message: 'Reaction removed successfully' };
  }
}
