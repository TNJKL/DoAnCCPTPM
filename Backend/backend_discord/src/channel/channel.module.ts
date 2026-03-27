import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';
import { Channel } from '../entities/channel.entity';
import { ServerMember } from '../entities/server-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Channel, ServerMember])],
  controllers: [ChannelController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
