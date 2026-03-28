import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  MESSAGE = 'message',
  MENTION = 'mention',
  FRIEND_REQUEST = 'friend_request',
  SERVER_INVITE = 'server_invite',
  VOICE_CALL = 'voice_call',
  VIDEO_CALL = 'video_call',
}

@Entity('Notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  user_id: string;

  @Column({ type: 'nvarchar', length: 255 })
  title: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  content: string;

  @Column({
    type: 'nvarchar',
    length: 50,
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  data: string; // JSON data

  @Column({ type: 'bit', default: false })
  is_read: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
