import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DirectMessage } from '../entities/direct-message.entity';
import { User } from '../entities/user.entity';
import { DmService } from './dm.service';
import { DmController } from './dm.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DirectMessage, User])],
  providers: [DmService],
  controllers: [DmController],
  exports: [DmService],
})
export class DmModule {}


