import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { ChatGateway } from './chat.gateway';
import { Message } from '../entities/message.entity';
import { Channel } from '../entities/channel.entity';
import { User } from '../entities/user.entity';
import { ServerMember } from '../entities/server-member.entity';
import { DirectMessage } from '../entities/direct-message.entity';
import { Reaction } from '../entities/reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Channel, User, ServerMember, DirectMessage, Reaction]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ChatGateway],
  exports: [ChatGateway, TypeOrmModule],
})
export class GatewayModule {}