import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Message } from '../entities/message.entity';
import { Channel } from '../entities/channel.entity';
import { User } from '../entities/user.entity';
import { Reaction } from '../entities/reaction.entity';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Channel, User, Reaction]),
    forwardRef(() => GatewayModule),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}