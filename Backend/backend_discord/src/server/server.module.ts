import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { ServerController } from './server.controller';
import { ServerService } from './server.service';
import { Server } from '../entities/server.entity';
import { ServerMember } from '../entities/server-member.entity';
import { Channel } from '../entities/channel.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { ChatGateway } from '../gateway/chat.gateway';
import { DirectMessage } from '../entities/direct-message.entity';
import { Reaction } from '../entities/reaction.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Server, ServerMember, Channel, Role, UserRole, Message, User, DirectMessage, Reaction]),
    ConfigModule,
    GatewayModule,
  ],
  controllers: [ServerController],
  providers: [ServerService],
  exports: [ServerService],
})
export class ServerModule {}