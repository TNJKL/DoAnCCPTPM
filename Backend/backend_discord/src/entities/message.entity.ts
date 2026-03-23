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
import { Channel } from './channel.entity';
import { User } from './user.entity';
import { Reaction } from './reaction.entity';

import { MessageType } from '../enums/message-type.enum';

// Re-export for backward compatibility
export { MessageType };

@Entity('Messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'uniqueidentifier' })
  channel_id: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  user_id: string;

  @Column({ type: 'nvarchar', length: 4000, nullable: true })
  content: string;

  @Column({
    name: 'message_type',
    type: 'nvarchar',
    length: 20,
    default: MessageType.TEXT,
    enum: MessageType,
  })
  message_type: MessageType;

  @Column({ name: 'file_url', type: 'nvarchar', length: 500, nullable: true })
  file_url: string;

  @Column({ name: 'file_name', type: 'nvarchar', length: 255, nullable: true })
  file_name: string;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  file_size: number;

  @Column({ name: 'reply_to_id', type: 'uniqueidentifier', nullable: true })
  reply_to_id: string;

  @Column({ name: 'thread_id', type: 'uniqueidentifier', nullable: true })
  thread_id: string;

  @Column({ name: 'is_pinned', type: 'bit', default: false })
  is_pinned: boolean;

  @Column({ name: 'is_edited', type: 'bit', default: false })
  is_edited: boolean;

  @Column({ name: 'edited_at', type: 'datetime2', nullable: true })
  edited_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime2' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Channel, (channel) => channel.messages)
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Message, (message) => message.replies)
  @JoinColumn({ name: 'reply_to_id' })
  reply_to: Message;

  @OneToMany(() => Message, (message) => message.reply_to)
  replies: Message[];

  @OneToMany(() => Reaction, (reaction) => reaction.message)
  reactions: Reaction[];
}