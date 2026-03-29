import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { Server, VerificationLevel } from '../entities/server.entity';
import { ServerMember } from '../entities/server-member.entity';
import { Channel, ChannelType } from '../entities/channel.entity';
import { Message, MessageType } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { ChatGateway } from '../gateway/chat.gateway';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class ServerService {
  constructor(
    @InjectRepository(Server)
    private serverRepository: Repository<Server>,
    @InjectRepository(ServerMember)
    private serverMemberRepository: Repository<ServerMember>,
    @InjectRepository(Channel)
    private channelRepository: Repository<Channel>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private chatGateway: ChatGateway,
  ) {}

  async createServer(userId: string, createServerDto: CreateServerDto, avatar?: Express.Multer.File): Promise<Server> {
    const { name, description, is_public } = createServerDto;

    // Generate unique invite code
    const invite_code = this.generateInviteCodeString();

    let icon_url = null;
    
    // Handle avatar upload if provided
    if (avatar) {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(avatar.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (avatar.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB');
      }

      // Generate unique filename
      const fileExtension = path.extname(avatar.originalname);
      const fileName = `server-avatar-${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
      
      // Create upload directory if it doesn't exist
      const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // Save file to disk
      const filePath = path.join(uploadPath, fileName);
      fs.writeFileSync(filePath, avatar.buffer);

      icon_url = `/uploads/${fileName}`;
    }

    // Create server
    const server = this.serverRepository.create({
      name,
      description,
      owner_id: userId,
      invite_code,
      member_count: 1,
      is_public: is_public !== false,
      icon_url,
    });

    const savedServer = await this.serverRepository.save(server);

    // Add owner as member
    await this.serverMemberRepository.save({
      server_id: savedServer.id,
      user_id: userId,
      nickname: null,
    });

    // Create default channels
    await this.createDefaultChannels(savedServer.id);

    // Create default roles
    await this.createDefaultRoles(savedServer.id);

    return this.getServerById(savedServer.id);
  }

  async getUserServers(userId: string): Promise<Server[]> {
    const memberships = await this.serverMemberRepository.find({
      where: { user_id: userId },
      relations: ['server'],
    });

    return memberships.map(membership => membership.server);
  }

  async getServerById(id: string): Promise<Server> {
    const server = await this.serverRepository.findOne({
      where: { id },
      relations: ['owner', 'channels', 'members', 'roles'],
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async updateServer(userId: string, id: string, updateServerDto: UpdateServerDto, avatar?: Express.Multer.File): Promise<Server> {
    const server = await this.getServerById(id);

    // Check if user is owner
    if (server.owner_id !== userId) {
      throw new ForbiddenException('Only server owner can update server');
    }

    // If avatar provided, replace existing avatar file and set icon_url
    let newIconUrl: string | undefined;
    if (avatar) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(avatar.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
      }
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (avatar.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB');
      }

      const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      // Delete old file if exists
      if (server.icon_url) {
        const oldFilePath = path.join(uploadPath, path.basename(server.icon_url));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const fileExtension = path.extname(avatar.originalname);
      const fileName = `server-avatar-${id}-${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadPath, fileName);
      fs.writeFileSync(filePath, avatar.buffer);
      newIconUrl = `/uploads/${fileName}`;
    }

    await this.serverRepository.update(id, {
      ...updateServerDto,
      ...(newIconUrl ? { icon_url: newIconUrl } : {}),
      updated_at: new Date(),
    });

    return this.getServerById(id);
  }

  async deleteServer(userId: string, id: string): Promise<void> {
    const server = await this.getServerById(id);

    // Check if user is owner
    if (server.owner_id !== userId) {
      throw new ForbiddenException('Only server owner can delete server');
    }

    // Delete avatar file if exists
    if (server.icon_url) {
      const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
      const filePath = path.join(uploadPath, path.basename(server.icon_url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.serverRepository.delete(id);
  }

  async joinServer(userId: string, inviteCode: string): Promise<Server> {
    const server = await this.serverRepository.findOne({
      where: { invite_code: inviteCode },
    });

    if (!server) {
      throw new BadRequestException('Invalid invite code');
    }

    // Check if user is already a member
    const existingMember = await this.serverMemberRepository.findOne({
      where: { server_id: server.id, user_id: userId },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this server');
    }

    // Check server capacity
    if (server.member_count >= server.max_members) {
      throw new BadRequestException('Server is full');
    }

    // Add user as member
    await this.serverMemberRepository.save({
      server_id: server.id,
      user_id: userId,
    });

    // Update member count
    await this.serverRepository.update(server.id, {
      member_count: server.member_count + 1,
    });

    // Gửi tin nhắn chào mừng vào kênh #general nếu tồn tại
    try {
      const general = await this.channelRepository.findOne({
        where: { server_id: server.id, type: ChannelType.TEXT, name: 'general' },
      });
      if (general) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const content = `Chào mừng ${user?.display_name || user?.username || 'thành viên mới'} đến với server ${server.name}`;
        const saved = await this.messageRepository.save({
          channel_id: general.id,
          user_id: userId,
          content,
          message_type: MessageType.TEXT,
        });
        const messageWithUser = await this.messageRepository.findOne({
          where: { id: saved.id },
          relations: ['user'],
        });
        try {
          this.chatGateway.server.to(`channel:${general.id}`).emit('new_message', messageWithUser);
          // Emit notification giống ChatGateway
          const notificationData = {
            channelId: general.id,
            channelName: general.name,
            senderId: userId,
            senderUsername: messageWithUser?.user?.username,
            content,
            serverId: server.id,
            serverName: server.name,
            messageId: saved.id,
            _ts: Date.now(),
          } as any;
          this.chatGateway.server.to(`server:${server.id}`).emit('text_message_notification', notificationData);
          try {
            const memberRecords = await this.serverMemberRepository.find({ where: { server_id: server.id } });
            for (const m of memberRecords) {
              this.chatGateway.server.to(`user:${m.user_id}`).emit('text_message_notification', notificationData);
            }
          } catch {}
        } catch {}
      }
    } catch (e) {
      // Không để lỗi chào mừng làm hỏng flow join
      console.warn('Failed to send welcome message:', e?.message || e);
    }

    return this.getServerById(server.id);
  }

  async leaveServer(userId: string, serverId: string): Promise<void> {
    const server = await this.getServerById(serverId);

    // Check if user is owner
    if (server.owner_id === userId) {
      throw new BadRequestException('Server owner cannot leave server');
    }

    // Remove user from server
    await this.serverMemberRepository.delete({
      server_id: serverId,
      user_id: userId,
    });

    // Update member count
    await this.serverRepository.update(serverId, {
      member_count: server.member_count - 1,
    });

    // Gửi tin nhắn rời server vào kênh #general nếu có
    try {
      const general = await this.channelRepository.findOne({
        where: { server_id: serverId, type: ChannelType.TEXT, name: 'general' },
      });
      if (general) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const content = `${user?.display_name || user?.username || 'Một thành viên'} đã rời server ${server.name}`;
        const saved = await this.messageRepository.save({
          channel_id: general.id,
          user_id: userId,
          content,
          message_type: MessageType.TEXT,
        });
        const messageWithUser = await this.messageRepository.findOne({ where: { id: saved.id }, relations: ['user'] });
        try {
          this.chatGateway.server.to(`channel:${general.id}`).emit('new_message', messageWithUser);
          const notificationData = {
            channelId: general.id,
            channelName: general.name,
            senderId: userId,
            senderUsername: messageWithUser?.user?.username,
            content,
            serverId: serverId,
            serverName: server.name,
            messageId: saved.id,
            _ts: Date.now(),
          } as any;
          this.chatGateway.server.to(`server:${serverId}`).emit('text_message_notification', notificationData);
          try {
            const memberRecords = await this.serverMemberRepository.find({ where: { server_id: serverId } });
            for (const m of memberRecords) {
              this.chatGateway.server.to(`user:${m.user_id}`).emit('text_message_notification', notificationData);
            }
          } catch {}
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to send leave message:', e?.message || e);
    }
  }

  async getServerMembers(serverId: string): Promise<ServerMember[]> {
    return this.serverMemberRepository.find({
      where: { server_id: serverId },
      relations: ['user'],
    });
  }

  async getServerChannels(serverId: string): Promise<Channel[]> {
    return this.channelRepository.find({
      where: { server_id: serverId },
      order: { position: 'ASC' },
    });
  }

  async generateInviteCode(userId: string, serverId: string): Promise<{ invite_code: string }> {
    const server = await this.getServerById(serverId);

    // Check if user has permission to generate invite codes
    const hasPermission = await this.checkInvitePermission(userId, serverId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to generate invite codes');
    }

    const invite_code = this.generateInviteCodeString();

    await this.serverRepository.update(serverId, {
      invite_code,
    });

    return { invite_code };
  }

  private async checkInvitePermission(userId: string, serverId: string): Promise<boolean> {
    const server = await this.getServerById(serverId);
    
    // Owner always has permission
    if (server.owner_id === userId) {
      return true;
    }

    // Check if user is a member of the server
    const member = await this.serverMemberRepository.findOne({
      where: { server_id: serverId, user_id: userId },
    });

    if (!member) {
      return false;
    }

    // Check if user has admin or moderator role with invite permission
    const userRoles = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoin('role.user_roles', 'userRole')
      .where('role.server_id = :serverId', { serverId })
      .andWhere('userRole.user_id = :userId', { userId })
      .getMany();

    for (const role of userRoles) {
      if (role.permissions) {
        try {
          const permissions = JSON.parse(role.permissions);
          // Check if role has 'CREATE_INSTANT_INVITE' permission
          if (permissions.includes('CREATE_INSTANT_INVITE')) {
            return true;
          }
        } catch (error) {
          console.error('Error parsing role permissions:', error);
        }
      }
    }

    return false;
  }

  private generateInviteCodeString(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async createDefaultChannels(serverId: string): Promise<void> {
    const defaultChannels = [
      { name: 'general', type: ChannelType.TEXT, position: 0 },
      { name: 'announcements', type: ChannelType.ANNOUNCEMENT, position: 1 },
      { name: 'voice-chat', type: ChannelType.VOICE, position: 2 },
    ];

    for (const channel of defaultChannels) {
      await this.channelRepository.save({
        server_id: serverId,
        ...channel,
      });
    }
  }

  private async createDefaultRoles(serverId: string): Promise<void> {
    const defaultRoles = [
      {
        name: 'Admin',
        color: '#FF0000',
        permissions: JSON.stringify({ admin: true }),
        position: 0,
        is_mentionable: true,
      },
      {
        name: 'Member',
        color: '#99AAB5',
        permissions: JSON.stringify({ send_messages: true }),
        position: 1,
        is_mentionable: false,
      },
    ];

    for (const role of defaultRoles) {
      await this.roleRepository.save({
        server_id: serverId,
        ...role,
      });
    }
  }

  async uploadServerAvatar(userId: string, serverId: string, file: Express.Multer.File): Promise<Server> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if user is server owner
    const server = await this.serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.owner_id !== userId) {
      throw new ForbiddenException('Only server owner can upload avatar');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `server-avatar-${serverId}-${Date.now()}${fileExtension}`;
    
    // Create upload directory if it doesn't exist
    const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Delete old avatar if exists
    if (server.icon_url) {
      const oldFilePath = path.join(uploadPath, path.basename(server.icon_url));
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Save new file to disk
    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Update server with new avatar URL
    const avatarUrl = `/uploads/${fileName}`;
    await this.serverRepository.update(serverId, {
      icon_url: avatarUrl,
    });

    // Return updated server
    return this.serverRepository.findOne({
      where: { id: serverId },
    });
  }

  async removeServerAvatar(userId: string, serverId: string): Promise<Server> {
    // Check if user is server owner
    const server = await this.serverRepository.findOne({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    if (server.owner_id !== userId) {
      throw new ForbiddenException('Only server owner can remove avatar');
    }

    // Delete avatar file if exists
    if (server.icon_url) {
      const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
      const filePath = path.join(uploadPath, path.basename(server.icon_url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Update server to remove avatar URL
    await this.serverRepository.update(serverId, {
      icon_url: null,
    });

    // Return updated server
    return this.serverRepository.findOne({
      where: { id: serverId },
    });
  }
}
