import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useFriendshipStore } from '../../store/friendshipStore';
import AddFriendModal from '../modals/AddFriendModal';
import { useDirectMessagesStore } from '../../store/directMessagesStore';
import UserProfilePopover from '../common/UserProfilePopover';

const SidebarContainer = styled.div`
  width: 240px;
  background-color: #2f3136;
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

const Header = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #202225;
  font-weight: bold;
  font-size: 16px;
  color: #fff;
  background-color: #2f3136;
`;

const SearchContainer = styled.div`
  padding: 16px;
  border-bottom: 1px solid #202225;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  background-color: #40444b;
  border: 1px solid #202225;
  border-radius: 3px;
  color: #dcddde;
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: #5865f2;
  }

  &::placeholder {
    color: #72767d;
  }
`;

const AddFriendButton = styled.button`
  width: 100%;
  padding: 8px 12px;
  background-color: #5865f2;
  color: #fff;
  border: none;
  border-radius: 3px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #4752c4;
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const TabButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  padding: 8px 16px;
  background-color: ${props => props.$active ? '#393c43' : 'transparent'};
  border: none;
  color: ${props => props.$active ? '#fff' : '#8e9297'};
  text-align: left;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #393c43;
    color: #dcddde;
  }
`;

const UserList = styled.div`
  padding: 8px 0;
`;

const UserItem = styled.div`
  padding: 8px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #393c43;
  }
`;

const UserAvatar = styled.div<{ $status?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #5865f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  flex-shrink: 0;
  font-weight: bold;
  color: #fff;
  font-size: 14px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => {
      switch (props.$status) {
        case 'online': return '#3ba55c';
        case 'away': return '#faa61a';
        case 'busy': return '#ed4245';
        case 'offline': return '#747f8d';
        default: return '#747f8d';
      }
    }};
    border: 2px solid #2f3136;
  }
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const Username = styled.div`
  font-weight: 500;
  color: #fff;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const UserStatus = styled.div`
  font-size: 12px;
  color: #8e9297;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  outline: none;
  transition: background-color 0.2s ease;
  margin-left: 4px;

  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background-color: #5865f2;
          color: #fff;
          &:hover { background-color: #4752c4; }
        `;
      case 'danger':
        return `
          background-color: #ed4245;
          color: #fff;
          &:hover { background-color: #c03e3e; }
        `;
      default:
        return `
          background-color: #4f545c;
          color: #fff;
          &:hover { background-color: #5d6269; }
        `;
    }
  }}
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: #8e9297;
  font-size: 14px;
`;

const BackButton = styled.button`
  width: 100%;
  padding: 8px 16px;
  background-color: transparent;
  border: none;
  color: #8e9297;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.2s ease;
  border-bottom: 1px solid #202225;

  &:hover {
    color: #dcddde;
  }
`;

type TabType = 'recent' | 'friends' | 'pending' | 'sent' | 'blocked';

interface DirectMessagesSidebarProps {
  onBack: () => void;
}

const DirectMessagesSidebar: React.FC<DirectMessagesSidebarProps> = ({ onBack }) => {
  const {
    friends,
    pendingRequests,
    sentRequests,
    blockedUsers,
    isLoading,
    loadFriends,
    loadPendingRequests,
    loadSentRequests,
    loadBlockedUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
  } = useFriendshipStore();

  const { recent, loadRecent, selectUser } = useDirectMessagesStore();
  const [profileUser, setProfileUser] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecent();
    loadFriends();
    loadPendingRequests();
    loadSentRequests();
    loadBlockedUsers();
  }, [loadRecent, loadFriends, loadPendingRequests, loadSentRequests, loadBlockedUsers]);

  const handleSendFriendRequest = async (username: string) => {
    await sendFriendRequest(username);
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    await acceptFriendRequest(friendshipId);
  };

  const handleRejectRequest = async (friendshipId: string) => {
    await rejectFriendRequest(friendshipId);
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    await removeFriend(friendshipId);
  };

  const handleBlockUser = async (username: string) => {
    await blockUser(username);
  };

  const handleUnblockUser = async (friendshipId: string) => {
    await unblockUser(friendshipId);
  };

  const renderContent = () => {
    if (isLoading) {
      return <EmptyState>Loading...</EmptyState>;
    }

    switch (activeTab) {
      case 'recent':
        return (
          <UserList>
            {recent.length > 0 ? (
              recent.map((r) => (
                <UserItem key={r.user.id} onClick={() => selectUser(r.user.id)}>
                  <UserAvatar $status={r.user.status}>
                    {r.user.display_name?.charAt(0).toUpperCase() || r.user.username?.charAt(0).toUpperCase() || 'U'}
                  </UserAvatar>
                  <UserInfo>
                    <Username>{r.user.display_name || r.user.username}</Username>
                    <UserStatus>{new Date(r.lastMessageAt).toLocaleString()}</UserStatus>
                  </UserInfo>
                </UserItem>
              ))
            ) : (
              <EmptyState>Chưa có tin nhắn trực tiếp</EmptyState>
            )}
          </UserList>
        );
      case 'friends':
        return (
          <UserList>
            {friends.length > 0 ? (
              friends.map((friendData) => (
                <UserItem key={friendData.friendshipId}>
                  <UserAvatar $status={friendData.user.status}>
                    {friendData.user.display_name?.charAt(0).toUpperCase() || 
                     friendData.user.username?.charAt(0).toUpperCase() || 'U'}
                  </UserAvatar>
                  <UserInfo>
                    <Username>{friendData.user.display_name || friendData.user.username}</Username>
                    <UserStatus>{friendData.user.status}</UserStatus>
                  </UserInfo>
                  <ActionButton $variant="danger" onClick={() => handleRemoveFriend(friendData.friendshipId)}>
                    Remove
                  </ActionButton>
                </UserItem>
              ))
            ) : (
              <EmptyState>No friends yet</EmptyState>
            )}
          </UserList>
        );

      case 'pending':
        return (
          <UserList>
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <UserItem key={request.id}>
                  <UserAvatar $status={request.requester?.status}>
                    {request.requester?.display_name?.charAt(0).toUpperCase() || 
                     request.requester?.username?.charAt(0).toUpperCase() || 'U'}
                  </UserAvatar>
                  <UserInfo>
                    <Username>{request.requester?.display_name || request.requester?.username}</Username>
                    <UserStatus>Wants to be your friend</UserStatus>
                  </UserInfo>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <ActionButton $variant="primary" onClick={() => handleAcceptRequest(request.id)}>
                      Accept
                    </ActionButton>
                    <ActionButton $variant="secondary" onClick={() => handleRejectRequest(request.id)}>
                      Reject
                    </ActionButton>
                  </div>
                </UserItem>
              ))
            ) : (
              <EmptyState>No pending requests</EmptyState>
            )}
          </UserList>
        );

      case 'sent':
        return (
          <UserList>
            {sentRequests.length > 0 ? (
              sentRequests.map((request) => (
                <UserItem key={request.id}>
                  <UserAvatar $status={request.addressee?.status}>
                    {request.addressee?.display_name?.charAt(0).toUpperCase() || 
                     request.addressee?.username?.charAt(0).toUpperCase() || 'U'}
                  </UserAvatar>
                  <UserInfo>
                    <Username>{request.addressee?.display_name || request.addressee?.username}</Username>
                    <UserStatus>Pending</UserStatus>
                  </UserInfo>
                </UserItem>
              ))
            ) : (
              <EmptyState>No sent requests</EmptyState>
            )}
          </UserList>
        );

      case 'blocked':
        return (
          <UserList>
            {blockedUsers.length > 0 ? (
              blockedUsers.map((user) => (
                <UserItem key={user.id}>
                  <UserAvatar $status="offline">
                    {user.display_name?.charAt(0).toUpperCase() || 
                     user.username?.charAt(0).toUpperCase() || 'U'}
                  </UserAvatar>
                  <UserInfo>
                    <Username>{user.display_name || user.username}</Username>
                    <UserStatus>Blocked</UserStatus>
                  </UserInfo>
                  <ActionButton $variant="secondary" onClick={() => handleUnblockUser(user.id)}>
                    Unblock
                  </ActionButton>
                </UserItem>
              ))
            ) : (
              <EmptyState>No blocked users</EmptyState>
            )}
          </UserList>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarContainer>
      <BackButton onClick={onBack}>
        ← Back to Dashboard
      </BackButton>
      
      <Header>Direct Messages</Header>
      
      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <AddFriendButton onClick={() => setShowAddFriendModal(true)}>
          Add Friend
        </AddFriendButton>
      </SearchContainer>

      <Content>
        <TabButton $active={activeTab === 'recent'} onClick={() => setActiveTab('recent')}>
          Recent ({recent.length})
        </TabButton>
        <TabButton $active={activeTab === 'friends'} onClick={() => setActiveTab('friends')}>
          All ({friends.length})
        </TabButton>
        <TabButton $active={activeTab === 'pending'} onClick={() => setActiveTab('pending')}>
          Pending ({pendingRequests.length})
        </TabButton>
        <TabButton $active={activeTab === 'sent'} onClick={() => setActiveTab('sent')}>
          Sent ({sentRequests.length})
        </TabButton>
        <TabButton $active={activeTab === 'blocked'} onClick={() => setActiveTab('blocked')}>
          Blocked ({blockedUsers.length})
        </TabButton>
        
        {renderContent()}
      </Content>

      {showAddFriendModal && (
        <AddFriendModal
          onClose={() => setShowAddFriendModal(false)}
          onSendRequest={handleSendFriendRequest}
        />
      )}

      {profileUser && (
        <UserProfilePopover user={profileUser} onClose={() => setProfileUser(null)} />
      )}
    </SidebarContainer>
  );
};

export default DirectMessagesSidebar;
