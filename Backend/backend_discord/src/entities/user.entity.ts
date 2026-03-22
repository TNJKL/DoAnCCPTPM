import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Server } from './server.entity';
import { Message } from './message.entity';
import { DirectMessage } from './direct-message.entity';
import { Friendship } from './friendship.entity';
import { FileUpload } from './file-upload.entity';
import { Notification } from './notification.entity';
import { ServerMember } from './server-member.entity';
import { UserRole } from './user-role.entity';
import { Reaction } from './reaction.entity';

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'nvarchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'nvarchar', length: 255 })
  @Exclude()
  password_hash: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  display_name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  avatar_url: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: UserStatus.OFFLINE,
    enum: UserStatus,
  })
  status: UserStatus;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  bio: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone_number: string;

  @Column({ type: 'bit', default: false })
  email_verified: boolean;

  @Column({ type: 'bit', default: false })
  two_factor_enabled: boolean;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  @Column({ type: 'datetime2', nullable: true })
  last_seen: Date;

  @Column({ type: 'bit', default: true })
  is_active: boolean;

  // Relations
  @OneToMany(() => Server, (server) => server.owner)
  owned_servers: Server[];

  @OneToMany(() => Message, (message) => message.user)
  messages: Message[];

  @OneToMany(() => DirectMessage, (dm) => dm.sender)
  sent_direct_messages: DirectMessage[];

  @OneToMany(() => DirectMessage, (dm) => dm.receiver)
  received_direct_messages: DirectMessage[];

  @OneToMany(() => Friendship, (friendship) => friendship.requester)
  sent_friend_requests: Friendship[];

  @OneToMany(() => Friendship, (friendship) => friendship.addressee)
  received_friend_requests: Friendship[];

  @OneToMany(() => FileUpload, (file) => file.user)
  uploaded_files: FileUpload[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => ServerMember, (member) => member.user)
  server_memberships: ServerMember[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  user_roles: UserRole[];

  @OneToMany(() => Reaction, (reaction) => reaction.user)
  reactions: Reaction[];
}
