import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

import { FriendshipService } from './friendship.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;
}

export class AcceptFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  friendshipId: string;
}

export class RejectFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  friendshipId: string;
}

export class RemoveFriendDto {
  @IsString()
  @IsNotEmpty()
  friendshipId: string;
}

export class BlockUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  username: string;
}

export class UnblockUserDto {
  @IsString()
  @IsNotEmpty()
  friendshipId: string;
}

export class SearchUsersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  query: string;
}

@ApiTags('Friendship')
@Controller('friendship')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  @Post('send-request')
  @ApiOperation({ summary: 'Send friend request by username' })
  @ApiResponse({ status: 201, description: 'Friend request sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async sendFriendRequest(@Request() req, @Body() sendFriendRequestDto: SendFriendRequestDto) {
    return this.friendshipService.sendFriendRequest(req.user.id, sendFriendRequestDto.username);
  }

  @Post('accept-request')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiResponse({ status: 200, description: 'Friend request accepted successfully' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptFriendRequest(@Request() req, @Body() acceptFriendRequestDto: AcceptFriendRequestDto) {
    return this.friendshipService.acceptFriendRequest(req.user.id, acceptFriendRequestDto.friendshipId);
  }

  @Post('reject-request')
  @ApiOperation({ summary: 'Reject friend request' })
  @ApiResponse({ status: 200, description: 'Friend request rejected successfully' })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async rejectFriendRequest(@Request() req, @Body() rejectFriendRequestDto: RejectFriendRequestDto) {
    return this.friendshipService.rejectFriendRequest(req.user.id, rejectFriendRequestDto.friendshipId);
  }

  @Post('remove-friend')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({ status: 200, description: 'Friend removed successfully' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async removeFriend(@Request() req, @Body() removeFriendDto: RemoveFriendDto) {
    return this.friendshipService.removeFriend(req.user.id, removeFriendDto.friendshipId);
  }

  @Post('block-user')
  @ApiOperation({ summary: 'Block user by username' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async blockUser(@Request() req, @Body() blockUserDto: BlockUserDto) {
    return this.friendshipService.blockUser(req.user.id, blockUserDto.username);
  }

  @Post('unblock-user')
  @ApiOperation({ summary: 'Unblock user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Blocked user not found' })
  async unblockUser(@Request() req, @Body() unblockUserDto: UnblockUserDto) {
    return this.friendshipService.unblockUser(req.user.id, unblockUserDto.friendshipId);
  }

  @Get('friends')
  @ApiOperation({ summary: 'Get friends list' })
  @ApiResponse({ status: 200, description: 'Friends list retrieved successfully' })
  async getFriends(@Request() req) {
    return this.friendshipService.getFriends(req.user.id);
  }

  @Get('pending-requests')
  @ApiOperation({ summary: 'Get pending friend requests' })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved successfully' })
  async getPendingRequests(@Request() req) {
    return this.friendshipService.getPendingRequests(req.user.id);
  }

  @Get('sent-requests')
  @ApiOperation({ summary: 'Get sent friend requests' })
  @ApiResponse({ status: 200, description: 'Sent requests retrieved successfully' })
  async getSentRequests(@Request() req) {
    return this.friendshipService.getSentRequests(req.user.id);
  }

  @Get('blocked-users')
  @ApiOperation({ summary: 'Get blocked users' })
  @ApiResponse({ status: 200, description: 'Blocked users retrieved successfully' })
  async getBlockedUsers(@Request() req) {
    return this.friendshipService.getBlockedUsers(req.user.id);
  }

  @Get('search-users')
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiResponse({ status: 200, description: 'Users found successfully' })
  async searchUsers(@Request() req, @Body() searchUsersDto: SearchUsersDto) {
    return this.friendshipService.searchUsers(searchUsersDto.query, req.user.id);
  }
}
