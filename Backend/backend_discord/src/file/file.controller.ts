import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
  
  import { FileService } from './file.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @ApiTags('Files')
  @Controller('files')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class FileController {
    constructor(private readonly fileService: FileService) {}
  
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload file' })
    @ApiResponse({ status: 201, description: 'File uploaded successfully' })
    async uploadFile(
      @Request() req,
      @UploadedFile() file: Express.Multer.File,
    ) {
      return this.fileService.uploadFile(req.user.id, file);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get file info' })
    @ApiResponse({ status: 200, description: 'File info retrieved successfully' })
    async getFileInfo(@Param('id') id: string) {
      return this.fileService.getFileInfo(id);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete file' })
    @ApiResponse({ status: 200, description: 'File deleted successfully' })
    async deleteFile(@Request() req, @Param('id') id: string) {
      return this.fileService.deleteFile(req.user.id, id);
    }
  
    @Get('user/:userId')
    @ApiOperation({ summary: 'Get user files' })
    @ApiResponse({ status: 200, description: 'User files retrieved successfully' })
    async getUserFiles(@Param('userId') userId: string) {
      return this.fileService.getUserFiles(userId);
    }
  }
  