import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

import { FileUpload } from '../entities/file-upload.entity';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileUpload)
    private fileUploadRepository: Repository<FileUpload>,
    private configService: ConfigService,
  ) {}

  async uploadFile(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
    
    // Create upload directory if it doesn't exist
    const uploadPath = this.configService.get<string>('UPLOAD_PATH') || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Save file to disk
    const filePath = path.join(uploadPath, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Save file info to database
    const fileUpload = this.fileUploadRepository.create({
      user_id: userId,
      file_name: file.originalname,
      file_url: `/uploads/${fileName}`,
      file_size: file.size,
      file_type: file.mimetype,
      mime_type: file.mimetype,
      upload_path: filePath,
    });

    return this.fileUploadRepository.save(fileUpload);
  }

  async getFileInfo(id: string) {
    const file = await this.fileUploadRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async deleteFile(userId: string, id: string) {
    const file = await this.fileUploadRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own files');
    }

    // Delete file from disk
    if (fs.existsSync(file.upload_path)) {
      fs.unlinkSync(file.upload_path);
    }

    // Delete from database
    await this.fileUploadRepository.delete(id);

    return { message: 'File deleted successfully' };
  }

  async getUserFiles(userId: string) {
    return this.fileUploadRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
