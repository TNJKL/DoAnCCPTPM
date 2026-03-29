import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

import { MessageType } from '../enums/message-type.enum';

@Entity('Direct_Messages')
export class DirectMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sender_id', type: 'uniqueidentifier' })
  sender_id: string;

  @Column({ name: 'receiver_id', type: 'uniqueidentifier' })
  receiver_id: string;

  @Column({ type: 'nvarchar', length: 4000, nullable: true })
  content: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: MessageType.TEXT,
    enum: MessageType,
  })
  message_type: MessageType;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  file_url: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true, insert: false, update: false, select: false })
  file_name: string;

  @Column({ type: 'bigint', nullable: true, insert: false, update: false, select: false })
  file_size: number;

  @Column({ type: 'bit', default: false })
  is_read: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.sent_direct_messages)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @ManyToOne(() => User, (user) => user.received_direct_messages)
  @JoinColumn({ name: 'receiver_id' })
  receiver: User;
}
