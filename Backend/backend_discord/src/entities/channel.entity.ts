import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Server } from './server.entity';
import { Message } from './message.entity';
import { VoiceSession } from './voice-session.entity';

export enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  VIDEO = 'video',
  ANNOUNCEMENT = 'announcement',
}

@Entity('Channels')
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'server_id', type: 'uniqueidentifier' })
  server_id: string;

  @Column({ type: 'nvarchar', length: 100 })
  name: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    enum: ChannelType,
  })
  type: ChannelType;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'bit', default: false })
  is_nsfw: boolean;

  @Column({ type: 'int', default: 0 })
  slowmode_seconds: number;

  @Column({ name: 'parent_id', type: 'uniqueidentifier', nullable: true })
  parent_id: string;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Server, (server) => server.channels)
  @JoinColumn({ name: 'server_id' })
  server: Server;

  @ManyToOne(() => Channel, (channel) => channel.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Channel;

  @OneToMany(() => Channel, (channel) => channel.parent)
  children: Channel[];

  @OneToMany(() => Message, (message) => message.channel)
  messages: Message[];

  @OneToMany(() => VoiceSession, (session) => session.channel)
  voice_sessions: VoiceSession[];
}
