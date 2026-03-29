import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectMessage } from '../entities/direct-message.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class DmService {
  constructor(
    @InjectRepository(DirectMessage)
    private dmRepository: Repository<DirectMessage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async sendDirectMessage(senderId: string, receiverId: string, content: string): Promise<DirectMessage> {
    const receiver = await this.userRepository.findOne({ where: { id: receiverId } });
    if (!receiver) throw new NotFoundException('Receiver not found');
    const saved = await this.dmRepository.save({ sender_id: senderId, receiver_id: receiverId, content, message_type: 'text' as any });
    return this.dmRepository.findOne({ where: { id: saved.id }, relations: ['sender', 'receiver'] });
  }

  async getConversation(userId: string, otherUserId: string, take = 50, skip = 0): Promise<DirectMessage[]> {
    // Lấy các tin nhắn mới nhất trước (DESC) để trang luôn có tin gần đây sau F5,
    // sau đó đảo mảng để hiển thị theo thứ tự tăng dần như UI mong muốn
    const messages = await this.dmRepository.find({
      where: [
        { sender_id: userId, receiver_id: otherUserId },
        { sender_id: otherUserId, receiver_id: userId },
      ],
      order: { created_at: 'DESC' },
      relations: ['sender', 'receiver'],
      take,
      skip,
    });
    return messages.reverse();
  }

  async getRecentContacts(userId: string, take = 25): Promise<{ user: User; lastMessageAt: Date }[]> {
    const qb = this.dmRepository.createQueryBuilder('dm')
      .select('CASE WHEN dm.sender_id = :uid THEN dm.receiver_id ELSE dm.sender_id END', 'otherId')
      .addSelect('MAX(dm.created_at)', 'lastMessageAt')
      .where('dm.sender_id = :uid OR dm.receiver_id = :uid', { uid: userId })
      .groupBy('CASE WHEN dm.sender_id = :uid THEN dm.receiver_id ELSE dm.sender_id END')
      .orderBy('lastMessageAt', 'DESC')
      .limit(take);
    const rows = await qb.getRawMany<{ otherId: string; lastMessageAt: Date }>();
    if (rows.length === 0) return [];
    const users = await this.userRepository.findByIds(rows.map(r => r.otherId));
    const map = new Map(users.map(u => [u.id, u]));
    return rows.map(r => ({ user: map.get(r.otherId)!, lastMessageAt: r.lastMessageAt }));
  }
}


