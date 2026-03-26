import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useFriendshipStore } from '../../store/friendshipStore';
import AddFriendModal from '../../components/modals/AddFriendModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #36393f;
  color: #dcddde;
`;

const Sidebar = styled.div`
  width: 240px;
  background-color: #2f3136;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #202225;
  font-weight: bold;
  font-size: 16px;
  color: #fff;
`;

const SidebarContent = styled.div`
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
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

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const MainHeader = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #202225;
  font-weight: bold;
  font-size: 20px;
  color: #fff;
`;

const MainContentArea = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
`;

const AddFriendButton = styled.button`
  background-color: #5865f2;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #4752c4;
  }
`;

const UserList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const UserItem = styled.div`
  padding: 12px;
  background-color: #40444b;
  border-radius: 8px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #393c43;
  }
`;

const UserAvatar = styled.div<{ $status?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #5865f2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
  font-weight: bold;
  color: #fff;
  font-size: 16px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
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
`;

const Username = styled.div`
  font-weight: 500;
  color: #fff;
  font-size: 16px;
`;

const UserStatus = styled.div`
  font-size: 14px;
  color: #8e9297;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'secondary' }>`
  padding: 6px 12px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  outline: none;
  transition: background-color 0.2s ease;

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
  text-align: center;
  color: #8e9297;
  font-size: 16px;
  margin-top: 50px;
`;

type TabType = 'friends' | 'pending' | 'sent' | 'blocked';

const FriendsPage: React.FC = () => {
  const {
    friends,
    pendingRequests,
    sentRequests,
    blockedUsers,
    isLoading,
    error,
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

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
    loadSentRequests();
    loadBlockedUsers();
  }, [loadFriends, loadPendingRequests, loadSentRequests, loadBlockedUsers]);

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
      return <LoadingSpinner />;
    }

    switch (activeTab) {
      case 'friends':
        return (
          <>
            <AddFriendButton onClick={() => setShowAddFriendModal(true)}>
              Add Friend
            </AddFriendButton>
            {friends.length > 0 ? (
              <UserList>
                {friends.map((friendData) => (
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
                ))}
              </UserList>
            ) : (
              <EmptyState>No friends yet. Add some friends to get started!</EmptyState>
            )}
          </>
        );

      case 'pending':
        return (
          <>
            {pendingRequests.length > 0 ? (
              <UserList>
                {pendingRequests.map((request) => (
                  <UserItem key={request.id}>
                    <UserAvatar $status={request.requester?.status}>
                      {request.requester?.display_name?.charAt(0).toUpperCase() || 
                       request.requester?.username?.charAt(0).toUpperCase() || 'U'}
                    </UserAvatar>
                    <UserInfo>
                      <Username>{request.requester?.display_name || request.requester?.username}</Username>
                      <UserStatus>Wants to be your friend</UserStatus>
                    </UserInfo>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <ActionButton $variant="primary" onClick={() => handleAcceptRequest(request.id)}>
                        Accept
                      </ActionButton>
                      <ActionButton $variant="secondary" onClick={() => handleRejectRequest(request.id)}>
                        Reject
                      </ActionButton>
                    </div>
                  </UserItem>
                ))}
              </UserList>
            ) : (
              <EmptyState>No pending friend requests.</EmptyState>
            )}
          </>
        );

      case 'sent':
        return (
          <>
            {sentRequests.length > 0 ? (
              <UserList>
                {sentRequests.map((request) => (
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
                ))}
              </UserList>
            ) : (
              <EmptyState>No sent friend requests.</EmptyState>
            )}
          </>
        );

      case 'blocked':
        return (
          <>
            {blockedUsers.length > 0 ? (
              <UserList>
                {blockedUsers.map((user) => (
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
                ))}
              </UserList>
            ) : (
              <EmptyState>No blocked users.</EmptyState>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <PageContainer>
      <Sidebar>
        <SidebarHeader>Friends</SidebarHeader>
        <SidebarContent>
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
        </SidebarContent>
      </Sidebar>

      <MainContent>
        <MainHeader>
          {activeTab === 'friends' && 'All Friends'}
          {activeTab === 'pending' && 'Pending Requests'}
          {activeTab === 'sent' && 'Sent Requests'}
          {activeTab === 'blocked' && 'Blocked Users'}
        </MainHeader>
        <MainContentArea>
          {renderContent()}
        </MainContentArea>
      </MainContent>

      {showAddFriendModal && (
        <AddFriendModal
          onClose={() => setShowAddFriendModal(false)}
          onSendRequest={handleSendFriendRequest}
        />
      )}
    </PageContainer>
  );
};

export default FriendsPage;
