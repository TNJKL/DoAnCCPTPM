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
import { User } from './user.entity';
import { Channel } from './channel.entity';
import { ServerMember } from './server-member.entity';
import { Role } from './role.entity';

export enum VerificationLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('Servers')
export class Server {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'nvarchar', length: 100 })
  name: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  icon_url: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  banner_url: string;

  @Column({ name: 'owner_id', type: 'uniqueidentifier' })
  owner_id: string;

  @Column({ type: 'nvarchar', length: 20, unique: true, nullable: true })
  invite_code: string;

  @Column({ type: 'int', default: 0 })
  member_count: number;

  @Column({ type: 'int', default: 500 })
  max_members: number;

  @Column({ type: 'bit', default: true })
  is_public: boolean;

  @Column({
    type: 'nvarchar',
    length: 20,
    default: VerificationLevel.NONE,
    enum: VerificationLevel,
  })
  verification_level: VerificationLevel;

  @CreateDateColumn({ type: 'datetime2' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetime2' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.owned_servers)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Channel, (channel) => channel.server)
  channels: Channel[];

  @OneToMany(() => ServerMember, (member) => member.server)
  members: ServerMember[];

  @OneToMany(() => Role, (role) => role.server)
  roles: Role[];
}