import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  
  @Entity('File_Uploads')
  export class FileUpload {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ name: 'user_id', type: 'uniqueidentifier' })
    user_id: string;
  
    @Column({ type: 'nvarchar', length: 255 })
    file_name: string;
  
    @Column({ type: 'nvarchar', length: 500 })
    file_url: string;
  
    @Column({ type: 'bigint' })
    file_size: number;
  
    @Column({ type: 'nvarchar', length: 100 })
    file_type: string;
  
    @Column({ type: 'nvarchar', length: 100, nullable: true })
    mime_type: string;
  
    @Column({ type: 'nvarchar', length: 500, nullable: true })
    upload_path: string;
  
    @Column({ type: 'bit', default: false })
    is_public: boolean;
  
    @CreateDateColumn({ type: 'datetime2' })
    created_at: Date;
  
    // Relations
    @ManyToOne(() => User, (user) => user.uploaded_files)
    @JoinColumn({ name: 'user_id' })
    user: User;
  }
  