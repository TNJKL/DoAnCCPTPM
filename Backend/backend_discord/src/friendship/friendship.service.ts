import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Friendship, FriendshipStatus } from '../entities/friendship.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class FriendshipService {
  constructor(
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async sendFriendRequest(requesterId: string, username: string): Promise<Friendship> {
    // Find user by username
    const addressee = await this.userRepository.findOne({
      where: { username },
    });

    if (!addressee) {
      throw new NotFoundException('User not found');
    }

    if (addressee.id === requesterId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: requesterId, addressee_id: addressee.id },
        { requester_id: addressee.id, addressee_id: requesterId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends with this user');
      } else if (existingFriendship.status === FriendshipStatus.PENDING) {
        throw new BadRequestException('Friend request already pending');
      } else if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('This user is blocked');
      }
    }

    // Create friend request
    const friendship = this.friendshipRepository.create({
      requester_id: requesterId,
      addressee_id: addressee.id,
      status: FriendshipStatus.PENDING,
    });

    return this.friendshipRepository.save(friendship);
  }

  async acceptFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, addressee_id: userId },
      relations: ['requester', 'addressee'],
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Friend request is not pending');
    }

    friendship.status = FriendshipStatus.ACCEPTED;
    return this.friendshipRepository.save(friendship);
  }

  async rejectFriendRequest(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, addressee_id: userId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    await this.friendshipRepository.remove(friendship);
  }

  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: [
        { id: friendshipId, requester_id: userId },
        { id: friendshipId, addressee_id: userId },
      ],
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.friendshipRepository.remove(friendship);
  }

  async blockUser(userId: string, username: string): Promise<Friendship> {
    // Find user by username
    const userToBlock = await this.userRepository.findOne({
      where: { username },
    });

    if (!userToBlock) {
      throw new NotFoundException('User not found');
    }

    if (userToBlock.id === userId) {
      throw new BadRequestException('You cannot block yourself');
    }

    // Check if friendship already exists
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { requester_id: userId, addressee_id: userToBlock.id },
        { requester_id: userToBlock.id, addressee_id: userId },
      ],
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new BadRequestException('User is already blocked');
      }
      
      // Update existing friendship to blocked
      existingFriendship.status = FriendshipStatus.BLOCKED;
      return this.friendshipRepository.save(existingFriendship);
    }

    // Create new blocked friendship
    const friendship = this.friendshipRepository.create({
      requester_id: userId,
      addressee_id: userToBlock.id,
      status: FriendshipStatus.BLOCKED,
    });

    return this.friendshipRepository.save(friendship);
  }

  async unblockUser(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.friendshipRepository.findOne({
      where: { id: friendshipId, requester_id: userId, status: FriendshipStatus.BLOCKED },
    });

    if (!friendship) {
      throw new NotFoundException('Blocked user not found');
    }

    await this.friendshipRepository.remove(friendship);
  }

  async getFriends(userId: string): Promise<Array<{ friendshipId: string; user: User }>> {
    const friendships = await this.friendshipRepository.find({
      where: [
        { requester_id: userId, status: FriendshipStatus.ACCEPTED },
        { addressee_id: userId, status: FriendshipStatus.ACCEPTED },
      ],
      relations: ['requester', 'addressee'],
    });

    return friendships.map(friendship => ({
      friendshipId: friendship.id,
      user: friendship.requester_id === userId ? friendship.addressee : friendship.requester
    }));
  }

  async getPendingRequests(userId: string): Promise<Friendship[]> {
    return this.friendshipRepository.find({
      where: { addressee_id: userId, status: FriendshipStatus.PENDING },
      relations: ['requester'],
    });
  }

  async getSentRequests(userId: string): Promise<Friendship[]> {
    return this.friendshipRepository.find({
      where: { requester_id: userId, status: FriendshipStatus.PENDING },
      relations: ['addressee'],
    });
  }

  async getBlockedUsers(userId: string): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      where: { requester_id: userId, status: FriendshipStatus.BLOCKED },
      relations: ['addressee'],
    });

    return friendships.map(friendship => friendship.addressee);
  }

  async searchUsers(query: string, userId: string): Promise<User[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId })
      .andWhere('(user.username LIKE :query OR user.display_name LIKE :query)', {
        query: `%${query}%`,
      })
      .take(10)
      .getMany();

    // Remove password from response
    return users.map(user => {
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }
}
