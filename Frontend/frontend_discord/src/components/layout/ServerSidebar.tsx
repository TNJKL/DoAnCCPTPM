import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Server } from '../../types';
// DM previews removed per requirement - keep only servers and entry points
import { soundService } from '../../services/sound.service';
import { useDirectMessagesStore } from '../../store/directMessagesStore';
import { useTextChannelUnreadStore } from '../../store/textChannelUnreadStore';

const SidebarContainer = styled.div`
  width: 72px;
  background-color: #202225;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
`;

const ServerIcon = styled.div<{ $active?: boolean; $src?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #36393f;
  background-image: ${p => p.$src ? `url(${p.$src})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-radius: 16px;
    background-color: ${p => p.$src ? 'rgba(88, 101, 242, 0.8)' : '#5865f2'};
  }

  &::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: ${props => props.$active ? '32px' : '0'};
    background-color: #fff;
    border-radius: 0 2px 2px 0;
    transition: height 0.2s ease;
  }
`;

const DmPing = new Audio('/sounds/dm.mp3');

const DmBadge = styled.div`
  position: absolute;
  right: -2px;
  bottom: -2px;
  background: #ed4245;
  color: #fff;
  min-width: 16px;
  height: 16px;
  font-size: 10px;
  padding: 0 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// (badge removed for simplified sidebar)

const ServerInitial = styled.span`
  color: #fff;
  font-weight: bold;
  font-size: 16px;
`;

const AddServerButton = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #36393f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #3ba55c;

  &:hover {
    background-color: #3ba55c;
    color: #fff;
    border-radius: 16px;
  }
`;

const InviteServerButton = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #36393f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #5865f2;

  &:hover {
    background-color: #5865f2;
    color: #fff;
    border-radius: 16px;
  }
`;

const JoinServerButton = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #36393f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #faa61a;

  &:hover {
    background-color: #faa61a;
    color: #fff;
    border-radius: 16px;
  }
`;

const FriendsButton = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #36393f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #3ba55c;

  &:hover {
    background-color: #3ba55c;
    color: #fff;
    border-radius: 16px;
  }
`;

const PlusIcon = styled.span`
  font-size: 24px;
  font-weight: bold;
`;

const InviteIcon = styled.span`
  font-size: 20px;
  font-weight: bold;
`;

const JoinIcon = styled.span`
  font-size: 20px;
  font-weight: bold;
`;

const FriendsIcon = styled.span`
  font-size: 20px;
  font-weight: bold;
`;

interface ServerSidebarProps {
  servers: Server[];
  selectedServer?: string;
  onServerSelect: (serverId: string) => void;
  onCreateServer: () => void;
  onInviteServer: () => void;
  onJoinServer: () => void;
  onOpenFriends: () => void;
  onOpenDM: () => void;
  isDmActive?: boolean;
  onOpenServerSettings?: (serverId: string) => void;
}

const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  selectedServer,
  onServerSelect,
  onCreateServer,
  onInviteServer,
  onJoinServer,
  onOpenFriends,
  onOpenDM,
  isDmActive = false,
  onOpenServerSettings
}) => {
  const { unread } = useDirectMessagesStore() as any;
  // Subscribe to serverUnread map so component re-renders on updates
  const serverUnread = useTextChannelUnreadStore((s: any) => s.serverUnread);
  const totalUnread = Object.values(unread || {}).reduce((a: number, b: any) => a + (b || 0), 0);

  useEffect(() => {
    // Play notification when new DM arrives (lightweight listener)
    const dmHandler = (dm: any) => {
      try {
        const meStr = localStorage.getItem('user');
        const me = meStr ? JSON.parse(meStr) : null;
        if (!me) return;
        // Chỉ ping nếu tôi là người nhận
        if (dm.receiver_id === me.id) {
          soundService.playDm();
        }
      } catch {}
    };

    // Lazy import to avoid circular
    const { webSocketService } = require('../../services/websocket.service');
    
    webSocketService.onNewDirectMessage(dmHandler);
    
    return () => {
      webSocketService.offNewDirectMessage(dmHandler);
    };
  }, []);

  return (
    <SidebarContainer>
      {/* Home/Direct Messages */}
      <ServerIcon 
        $active={isDmActive}
        onClick={() => { onOpenDM(); }}
        title="Direct Messages"
      >
        <ServerInitial>DM</ServerInitial>
        {totalUnread > 0 && <DmBadge>{totalUnread}</DmBadge>}
      </ServerIcon>

      {/* Divider */}
      <div style={{ 
        width: '32px', 
        height: '2px', 
        backgroundColor: '#36393f',
        borderRadius: '1px',
        margin: '4px 0'
      }} />

      {/* Server List */}
      {servers.map((server) => {
        const unreadCount = serverUnread?.[server.id] || 0;
        const avatarUrl = server.icon_url ? `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}${server.icon_url}` : null;
        return (
          <ServerIcon
            key={server.id}
            $active={!isDmActive && selectedServer === server.id}
            $src={avatarUrl || undefined}
            onClick={(e) => {
              if (e.ctrlKey && onOpenServerSettings) {
                // Ctrl+Click to open server settings (update/delete)
                onOpenServerSettings(server.id);
              } else {
                onServerSelect(server.id);
              }
            }}
            title={`${server.name}${onOpenServerSettings ? ' (Ctrl+Click: Cài đặt server)' : ''}`}
          >
            {!avatarUrl && (
              <ServerInitial>
                {server.name.charAt(0).toUpperCase()}
              </ServerInitial>
            )}
            {unreadCount > 0 && <DmBadge>{unreadCount > 99 ? '99+' : unreadCount}</DmBadge>}
          </ServerIcon>
        );
      })}

      {/* Action Buttons */}
      <AddServerButton onClick={onCreateServer} title="Add a Server">
        <PlusIcon>+</PlusIcon>
      </AddServerButton>
      
      <InviteServerButton onClick={onInviteServer} title="Invite People">
        <InviteIcon>📤</InviteIcon>
      </InviteServerButton>
      
      <JoinServerButton onClick={onJoinServer} title="Join a Server">
        <JoinIcon>🔗</JoinIcon>
      </JoinServerButton>
      
      <FriendsButton onClick={onOpenFriends} title="Friends">
        <FriendsIcon>👥</FriendsIcon>
      </FriendsButton>
    </SidebarContainer>
  );
};

export default ServerSidebar;
