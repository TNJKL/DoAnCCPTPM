import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { Channel } from './channel.entity';
  import { User } from './user.entity';
  
  export enum SessionType {
    VOICE = 'voice',
    VIDEO = 'video',
    SCREEN_SHARE = 'screen_share',
  }
  
  @Entity('Voice_Sessions')
  export class VoiceSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'channel_id', type: 'uniqueidentifier' })
    channel_id: string;
  
    @Column({ name: 'user_id', type: 'uniqueidentifier' })
    user_id: string;
  
    @Column({
      type: 'nvarchar',
      length: 20,
      default: SessionType.VOICE,
      enum: SessionType,
    })
    session_type: SessionType;
  
    @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
    participants: string; // JSON array of user IDs
  
    @Column({ type: 'datetime2', default: () => 'GETDATE()' })
    joined_at: Date;
  
    @Column({ type: 'datetime2', nullable: true })
    left_at: Date;
  
    @Column({ type: 'bit', default: true })
    is_active: boolean;
  
    // Relations
    @ManyToOne(() => Channel, (channel) => channel.voice_sessions)
    @JoinColumn({ name: 'channel_id' })
    channel: Channel;
  
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
  }
  