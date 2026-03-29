import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Server } from './server.entity';
import { User } from './user.entity';

@Entity('Server_Members')
@Unique(['server_id', 'user_id'])
export class ServerMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'server_id', type: 'uniqueidentifier' })
  server_id: string;

  @Column({ name: 'user_id', type: 'uniqueidentifier' })
  user_id: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  nickname: string;

  @CreateDateColumn({ type: 'datetime2' })
  joined_at: Date;

  @Column({ type: 'bit', default: false })
  is_muted: boolean;

  @Column({ type: 'bit', default: false })
  is_deafened: boolean;

  // Relations
  @ManyToOne(() => Server, (server) => server.members)
  @JoinColumn({ name: 'server_id' })
  server: Server;

  @ManyToOne(() => User, (user) => user.server_memberships)
  @JoinColumn({ name: 'user_id' })
  user: User;
}