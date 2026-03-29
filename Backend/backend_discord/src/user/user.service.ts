import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { User, UserStatus } from '../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is already taken by another user
    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUser = await this.findByUsername(updateUserDto.username);
      if (existingUser) {
        throw new BadRequestException('Username already taken');
      }
    }

    // Check if email is already taken by another user
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new BadRequestException('Email already taken');
      }
    }

    await this.userRepository.update(id, {
      ...updateUserDto,
      updated_at: new Date(),
    });

    return this.findById(id);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    await this.userRepository.update(id, {
      status,
      last_seen: new Date(),
      updated_at: new Date(),
    });

    return this.findById(id);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.update(id, { password_hash: newHash, updated_at: new Date() });
  }

  async searchUsers(query: string): Promise<User[]> {if (!query || query.length < 2) {
      return [];
    }

    const users = await this.userRepository.find({
      where: [
        { username: Like(`%${query}%`) },
        { display_name: Like(`%${query}%`) },
      ],
      take: 10,
    });

    // Remove password from response
    return users.map(user => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  async getOnlineUsers(): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { status: UserStatus.ONLINE },
      order: { last_seen: 'DESC' },
    });

    // Remove password from response
    return users.map(user => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  async deactivateUser(id: string): Promise<void> {
    await this.userRepository.update(id, {
      is_active: false,
      status: UserStatus.OFFLINE,
      updated_at: new Date(),
    });
  }

  async activateUser(id: string): Promise<void> {
    await this.userRepository.update(id, {
      is_active: true,
      updated_at: new Date(),
    });
  }
}
