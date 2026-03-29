import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

import { Message } from '../entities/message.entity';
import { MessageType } from '../enums/message-type.enum';
import { Channel } from '../entities/channel.entity';
import { User, UserStatus } from '../entities/user.entity';
import { ServerMember } from '../entities/server-member.entity';
import { DirectMessage } from '../entities/direct-message.entity';
import { Reaction } from '../entities/reaction.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.WS_CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId
  private userToSocket = new Map<string, string>(); // userId -> socketId
  private voiceParticipants = new Map<string, Set<string>>(); // channelId -> userIds

  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ServerMember)
    private serverMemberRepository: Repository<ServerMember>,
    @InjectRepository(DirectMessage)
    private dmRepository: Repository<DirectMessage>,
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    console.log('🔌 New WebSocket connection attempt:', client.id);
    try {
      const token = client.handshake.auth.token;
      if (!token) { client.disconnect(); return; }
      const userId = await this.verifyToken(token);
      if (!userId) { client.disconnect(); return; }

      this.connectedUsers.set(client.id, userId);
      this.userToSocket.set(userId, client.id);

      await this.userRepository.update(userId, { 
        status: UserStatus.ONLINE,
        last_seen: new Date()
      });
      await this.broadcastUserStatus(userId, UserStatus.ONLINE);
      await this.joinUserToServerRooms(client, userId);
      try {
        const memberships = await this.serverMemberRepository.find({ where: { user_id: userId } });
        const serverIds = memberships.map((m) => m.server_id);
        client.emit('rooms_info', { userId, serverIds });
      } catch {}
      client.join(`user:${userId}`);
      
      // Gửi voice participants hiện tại cho user mới connect

      await this.sendCurrentVoiceParticipants(client, userId);
    } catch (error) {
      client.disconnect();
    }
  }

  @SubscribeMessage('send_direct_message')
  async handleSendDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; content: string },
  ) {
    const senderId = this.connectedUsers.get(client.id);
    if (!senderId) return;
    const dm = await this.dmRepository.save({
      sender_id: senderId,
      receiver_id: data.receiverId,
      content: data.content,
    });
    const dmWithUsers = await this.dmRepository.findOne({ where: { id: dm.id }, relations: ['sender', 'receiver'] });
    this.server.to(`user:${senderId}`).emit('new_dm', dmWithUsers);
    this.server.to(`user:${data.receiverId}`).emit('new_dm', dmWithUsers);
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      await this.userRepository.update(userId, {
        status: UserStatus.OFFLINE,
        last_seen: new Date(),
      });
      await this.broadcastUserStatus(userId, UserStatus.OFFLINE);
      this.connectedUsers.delete(client.id);
      this.userToSocket.delete(userId);
      // Remove from any voice rooms
      for (const [channelId, set] of this.voiceParticipants.entries()) {
        if (set.has(userId)) {
          set.delete(userId);
          this.server.to(`voice:${channelId}`).emit('user_left_voice', { userId, channelId });
        }
      }
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    const hasAccess = await this.verifyChannelAccess(userId, data.channelId);
    if (!hasAccess) return;
    client.join(`channel:${data.channelId}`);
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.leave(`channel:${data.channelId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      channelId: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
    },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    const hasAccess = await this.verifyChannelAccess(userId, data.channelId);
    if (!hasAccess) return;

    const messageType = data.messageType ? 
      (Object.values(MessageType).includes(data.messageType as MessageType) ? 
        data.messageType as MessageType : MessageType.TEXT) : 
      MessageType.TEXT;

    const savedMessage = await this.messageRepository.save({
      channel_id: data.channelId,
      user_id: userId,
      content: data.content,
      message_type: messageType,
      file_url: data.fileUrl,
      file_name: data.fileName,
      file_size: data.fileSize,
    });

    const messageWithUser = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['user', 'reactions', 'reactions.user'],
    });

    // Emit to users in the channel (for normal messaging)
    this.server.to(`channel:${data.channelId}`).emit('new_message', messageWithUser);

    // Emit notification to all server members (for notification)
    const channel = await this.channelRepository.findOne({
      where: { id: data.channelId },
      relations: ['server'],
    });

    if (channel?.server) {
      // Detect mentions by username in content, collect userIds in this server
      let mentionedUserIds: string[] = [];
      try {
        if (data.content && typeof data.content === 'string') {
          const members = await this.serverMemberRepository.find({ where: { server_id: channel.server.id }, relations: ['user'] });
          const content = data.content;
          const set = new Set<string>();
          for (const m of members) {
            const username = m.user?.username;
            const display = (m.user as any)?.display_name;
            if (username) {
              const reU = new RegExp(`(^|\\s)@${this.escapeRegex(username)}(\\b|\\s|$)`, 'i');
              if (reU.test(content)) set.add(m.user_id);
            }
            if (display) {
              const reD = new RegExp(`(^|\\s)@${this.escapeRegex(display)}(\\b|\\s|$)`, 'i');
              if (reD.test(content)) set.add(m.user_id);
            }
          }
          mentionedUserIds = Array.from(set);
        }
      } catch {}
      const notificationData = {
        channelId: data.channelId,
        channelName: channel.name,
        senderId: userId,
        senderUsername: messageWithUser?.user?.username,
        content: data.content,
        serverId: channel.server.id,
        serverName: channel.server.name,
        messageId: savedMessage.id,
        _ts: Date.now(),
        mentionedUserIds,
      } as any;
      
      console.log(`📢 Broadcasting text message notification for channel ${data.channelId} to server ${channel.server.id}`);
      // Send to server room, and clients should dedupe by _ts+messageId
      this.server.to(`server:${channel.server.id}`).emit('text_message_notification', notificationData);

      // Redundant per-user emit to ensure delivery even if a client hasn't joined server room yet
      try {
        const memberRecords = await this.serverMemberRepository.find({ where: { server_id: channel.server.id } });
        for (const m of memberRecords) {
          this.server.to(`user:${m.user_id}`).emit('text_message_notification', notificationData);
        }
      } catch (e) {
        console.warn('Failed per-user notification emit:', e);
      }
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;
    client.to(`channel:${data.channelId}`).emit('user_typing', { userId, username: user.username, channelId: data.channelId });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    client.to(`channel:${data.channelId}`).emit('user_stop_typing', { userId, channelId: data.channelId });
  }

  @SubscribeMessage('join_voice')
  async handleJoinVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    const hasAccess = await this.verifyChannelAccess(userId, data.channelId);
    if (!hasAccess) return;

    // Tìm và rời khỏi voice channel cũ (nếu có)
    for (const [channelId, participants] of this.voiceParticipants.entries()) {
      if (participants.has(userId) && channelId !== data.channelId) {
        console.log(`🔄 User ${userId} leaving old voice channel ${channelId} to join ${data.channelId}`);
        
        // Remove user khỏi channel cũ
        participants.delete(userId);
        client.leave(`voice:${channelId}`);
        
        // Broadcast update cho channel cũ
        const oldChannel = await this.channelRepository.findOne({ 
          where: { id: channelId },
          relations: ['server']
        });
        if (oldChannel?.server) {
          const oldParticipants = Array.from(this.voiceParticipants.get(channelId) || []);
          console.log(`📢 Broadcasting voice participants update for old channel ${channelId} to server ${oldChannel.server.id}:`, oldParticipants);
          this.server.to(`server:${oldChannel.server.id}`).emit('voice_participants_updated', {
            channelId: channelId,
            participants: oldParticipants
          });
        }
        
        // Thông báo user left cho channel cũ
        this.server.to(`voice:${channelId}`).emit('user_left_voice', { userId, channelId });
        break;
      }
    }

    // Join voice channel mới
    client.join(`voice:${data.channelId}`);
    if (!this.voiceParticipants.has(data.channelId)) this.voiceParticipants.set(data.channelId, new Set());
    this.voiceParticipants.get(data.channelId)!.add(userId);

    // Gửi danh sách participants hiện tại cho người vừa vào
    const participants = Array.from(this.voiceParticipants.get(data.channelId) || []);
    client.emit('voice_participants', { channelId: data.channelId, participants });

    // Thông báo cho phòng voice
    this.server.to(`voice:${data.channelId}`).emit('user_joined_voice', { userId, channelId: data.channelId });
    // Broadcast voice participants cho toàn bộ server
    const channel = await this.channelRepository.findOne({ 
      where: { id: data.channelId },
      relations: ['server']
    });
    if (channel?.server) {
      console.log(`📢 Broadcasting voice participants for channel ${data.channelId} to server ${channel.server.id}:`, participants);
      this.server.to(`server:${channel.server.id}`).emit('voice_participants_updated', {
        channelId: data.channelId,
        participants: participants
      });
    }
  }

  @SubscribeMessage('leave_voice')
  async handleLeaveVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    client.leave(`voice:${data.channelId}`);
    const set = this.voiceParticipants.get(data.channelId);
    if (set) set.delete(userId);
    
    // Thông báo cho phòng voice
    this.server.to(`voice:${data.channelId}`).emit('user_left_voice', { userId, channelId: data.channelId });

    // Broadcast voice participants cho toàn bộ server
    const channel = await this.channelRepository.findOne({ 
      where: { id: data.channelId },
      relations: ['server']
    });
    if (channel?.server) {
      const participants = Array.from(this.voiceParticipants.get(data.channelId) || []);
      console.log(`📢 Broadcasting voice participants update for leave channel ${data.channelId} to server ${channel.server.id}:`, participants);
      this.server.to(`server:${channel.server.id}`).emit('voice_participants_updated', {
        channelId: data.channelId,
        participants: participants
      });
    }
  }

  // Signaling chuyển tiếp giữa hai user
  @SubscribeMessage('voice_signal')
  async handleVoiceSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; targetUserId: string; payload: any },
  ) {
    const fromUserId = this.connectedUsers.get(client.id);
    if (!fromUserId) return;
    const targetSocketId = this.userToSocket.get(data.targetUserId);
    if (!targetSocketId) return;
    this.server.to(targetSocketId).emit('voice_signal', { fromUserId, channelId: data.channelId, payload: data.payload });
  }

  // Broadcast mute state to voice room
  @SubscribeMessage('voice_mute')
  async handleVoiceMute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; muted: boolean },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    this.server.to(`voice:${data.channelId}`).emit('voice_mute', { userId, channelId: data.channelId, muted: data.muted });
  }

  // Broadcast deafen state to voice room
  @SubscribeMessage('voice_deafen')
  async handleVoiceDeafen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; deafened: boolean },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    this.server.to(`voice:${data.channelId}`).emit('voice_deafen', { userId, channelId: data.channelId, deafened: data.deafened });
  }

  // Broadcast camera on/off to voice room
  @SubscribeMessage('voice_camera')
  async handleVoiceCamera(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; cameraOn: boolean },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    this.server.to(`voice:${data.channelId}`).emit('voice_camera', { userId, channelId: data.channelId, cameraOn: data.cameraOn });
  }

  // Request voice participants - để force broadcast lại
  @SubscribeMessage('request_voice_participants')
  async handleRequestVoiceParticipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    
    const participants = Array.from(this.voiceParticipants.get(data.channelId) || []);
    console.log(`📡 User ${userId} requested voice participants for channel ${data.channelId}:`, participants);
    
    const channel = await this.channelRepository.findOne({ 
      where: { id: data.channelId },
      relations: ['server']
    });
    
    if (channel?.server) {
      console.log(`📢 Force broadcasting voice participants for channel ${data.channelId} to server ${channel.server.id}:`, participants);
      this.server.to(`server:${channel.server.id}`).emit('voice_participants_updated', {
        channelId: data.channelId,
        participants: participants
      });
    }
  }

  private async verifyToken(token: string): Promise<string | null> {
    try {
      const payload = this.jwtService.verify(token);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!payload.sub || !uuidRegex.test(payload.sub)) return null;
      return payload.sub;
    } catch (error) {
      return null;
    }
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async verifyChannelAccess(userId: string, channelId: string): Promise<boolean> {
    try {
      const channel = await this.channelRepository.findOne({ where: { id: channelId }, relations: ['server'] });
      if (!channel) return false;
      const membership = await this.serverMemberRepository.findOne({ where: { server_id: channel.server_id, user_id: userId } });
      return !!membership;
    } catch (error) {
      return false;
    }
  }

  // Allow client to explicitly re-join all server rooms after connect
  @SubscribeMessage('join_all_servers')
  async handleJoinAllServers(
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;
    await this.joinUserToServerRooms(client, userId);
    try {
      const memberships = await this.serverMemberRepository.find({ where: { user_id: userId } });
      const serverIds = memberships.map((m) => m.server_id);
      client.emit('rooms_info', { userId, serverIds, rejoined: true });
    } catch {}
  }

  private async joinUserToServerRooms(client: Socket, userId: string): Promise<void> {
    try {
      const memberships = await this.serverMemberRepository.find({ where: { user_id: userId }, relations: ['server'] });
      for (const membership of memberships) {
        client.join(`server:${membership.server_id}`);
      }
    } catch (error) {}
  }

  async broadcastUserStatus(userId: string, status: UserStatus): Promise<void> {
    try {
      const memberships = await this.serverMemberRepository.find({ where: { user_id: userId }, relations: ['server'] });
      for (const membership of memberships) {
        this.server.to(`server:${membership.server_id}`).emit('user_status_update', { userId, status });
      }
    } catch (error) {}
  }

  private async sendCurrentVoiceParticipants(client: Socket, userId: string): Promise<void> {
    try {
      const memberships = await this.serverMemberRepository.find({ where: { user_id: userId }, relations: ['server'] });
      for (const membership of memberships) {
        const server = membership.server;
        const channels = await this.channelRepository.find({ where: { server_id: server.id, type: 'voice' as any } });
        
        for (const channel of channels) {
          const participants = Array.from(this.voiceParticipants.get(channel.id) || []);
          if (participants.length > 0) {
            client.emit('voice_participants_updated', {
              channelId: channel.id,
              participants: participants
            });
          }
        }
      }
    } catch (error) {
      console.error('Error sending current voice participants:', error);
    }
  }

  // Helper method to emit reaction events
  public async emitReactionEvent(messageId: string, eventType: 'added' | 'removed', data: any) {
    try {
      const message = await this.messageRepository.findOne({
        where: { id: messageId },
        relations: ['channel'],
      });

      if (message) {
        this.server.to(`channel:${message.channel_id}`).emit(`reaction_${eventType}`, data);
      }
    } catch (error) {
      console.error('Error emitting reaction event:', error);
    }
  }
}
