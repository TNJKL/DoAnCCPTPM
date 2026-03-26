import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

@Entity('Friendships')
@Unique(['requester_id', 'addressee_id'])
export class Friendship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_id', type: 'uniqueidentifier' })
  requester_id: string;

  @Column({ name: 'addressee_id', type: 'uniqueidentifier' })
  addressee_id: string;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: FriendshipStatus.PENDING,
    enum: FriendshipStatus,
  })
  status: FriendshipStatus;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.sent_friend_requests)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @ManyToOne(() => User, (user) => user.received_friend_requests)
  @JoinColumn({ name: 'addressee_id' })
  addressee: User;
}
