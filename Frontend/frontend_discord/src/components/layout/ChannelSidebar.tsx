import React, { useEffect, useMemo, useState } from 'react';
import UserSelfPanel from './UserSelfPanel';
import styled from 'styled-components';
import { Channel } from '../../types';
import { useVoiceStore } from '../../store/voiceStore';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { useTextChannelUnreadStore } from '../../store/textChannelUnreadStore';
import { apiService } from '../../services/api.service';
import ChannelSettingsModal from '../modals/ChannelSettingsModal';

const SidebarContainer = styled.div`
  width: 240px;
  background-color: #2f3136;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #202225;
  font-weight: bold;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
`;

const ChannelList = styled.div`
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
`;

const BottomDock = styled.div`
  position: sticky;
  bottom: 0;
`;

const UnreadBadge = styled.div`
  background: #ed4245;
  color: white;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
  margin-left: auto;
`;

const VoiceConnectionHeader = styled.div`
  padding: 12px 16px;
  background: #2f3136;
  border-bottom: 1px solid #202225;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusIcon = styled.div<{ $connected: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.$connected ? '#3ba55d' : '#ed4245'};
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$connected ? '#3ba55d' : '#ed4245'};
    animation: ${p => p.$connected ? 'pulse 2s infinite' : 'none'};
  }
  
  @keyframes pulse {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.5; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
`;

const StatusText = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
`;

const VoiceChannelName = styled.div`
  font-size: 12px;
  color: #b9bbbe;
  margin-top: 2px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DownArrow = styled.span`
  color: #b9bbbe;
  font-size: 25px;
`;

const WaveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
`;

const WaveBar = styled.div<{ $active: boolean; $delay: number }>`
  width: 3px;
  height: ${p => p.$active ? '16px' : '4px'};
  background: ${p => p.$active ? '#3ba55d' : '#4f545c'};
  border-radius: 2px;
  animation: ${p => p.$active ? `wave 1.5s ease-in-out ${p.$delay}ms infinite` : 'none'};
  
  @keyframes wave {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }
`;

const LeaveButton = styled.button`
  background: #ed4245;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  
  &:hover {
    background: #c73e1d;
  }
`;


const ChannelGroup = styled.div`
  margin-bottom: 24px;
`;

const ChannelGroupHeader = styled.div`
  padding: 0 16px 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #8e9297;
  text-transform: uppercase;
`;

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const ChannelItem = styled.div<{ $isSelected?: boolean }>`
  padding: 6px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: ${props => props.$isSelected ? '#fff' : '#8e9297'};
  background-color: ${props => props.$isSelected ? '#393c43' : 'transparent'};
  font-size: 16px;

  &:hover {
    background-color: #393c43;
    color: #dcddde;
  }
`;

const ChannelIcon = styled.span`
  margin-right: 6px;
  font-size: 20px;
`;

const ChannelName = styled.span`
  flex: 1;
`;

const AddChannelButton = styled.button`
  background: none;
  border: none;
  color: #8e9297;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
  margin-left: 8px;

  &:hover {
    color: #dcddde;
  }
`;

const VoiceMembers = styled.div`
  padding: 4px 8px 8px 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const VoiceMember = styled.div<{ $speaking?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #b9bbbe;
`;

const AvatarSm = styled.div<{ $img?: string; $speaking?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #5865f2;
  background-image: ${p => p.$img ? `url(${p.$img})` : 'none'};
  background-size: cover;
  background-position: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 11px;
  box-shadow: ${p => p.$speaking ? '0 0 0 2px #3ba55d' : 'none'};
  position: relative;
`;

const RightIcons = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8e9297;
  font-size: 12px;
`;

const SmallBadge = styled.span<{ $bg?: string }>`
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${p => p.$bg || '#2f3136'};
  color: #fff;
  font-size: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #2f3136;
`;

interface ChannelSidebarProps {
  channels: Channel[];
  selectedChannel?: string;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  serverId: string;
  serverName?: string;
  onVideoView?: (userId: string) => void;
}

const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannel,
  onChannelSelect,
  onCreateChannel,
  serverId,
  serverName,
  onVideoView
}) => {
  const textChannels = channels.filter(ch => ch.type === 'text');
  const voiceChannels = channels.filter(ch => ch.type === 'voice');
  const { joinedChannelId, participants, speakingUsers, leaveVoice, globalVoiceParticipants, videoParticipants, remoteMute, remoteDeafen, muted, deafened, streaming, streamingParticipants } = useVoiceStore();
  const { user } = useAuthStore();
  const { getUnreadCount } = useTextChannelUnreadStore();
  const [isConnected, setIsConnected] = useState(true);
  const [waveActive, setWaveActive] = useState(false);
  const [openTextSettings, setOpenTextSettings] = useState(false);
  const [openVoiceSettings, setOpenVoiceSettings] = useState(false);
  const { loadChannels } = useServerStore();

  // Map userId -> user info (username, display_name, avatar_url)
  const [memberMap, setMemberMap] = useState<Record<string, any>>({});
  
  // Tìm tên channel hiện tại
  const currentChannel = channels.find(c => c.id === joinedChannelId);

  // Simulate connection status và wave animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(!!joinedChannelId);
      setWaveActive(Math.random() > 0.3); // Random wave activity
    }, 1000);

    return () => clearInterval(interval);
  }, [joinedChannelId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const members = await apiService.getServerMembers(serverId);
        if (!mounted) return;
        const map: Record<string, any> = {};
        members.forEach((m: any) => {
          const u = m.user || m; // tùy API trả về user trực tiếp hay trong field user
          if (u?.id) map[u.id] = u;
        });
        setMemberMap(map);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [serverId]);

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'text': return '#';
      case 'voice': return '🔊';
      case 'announcement': return '📢';
      default: return '#';
    }
  };

  const renderVoiceMembers = (channelId: string) => {
    // Hiển thị participants cho tất cả users, không chỉ người join
    const channelParticipants = globalVoiceParticipants[channelId] || [];
    if (channelParticipants.length === 0) return null;
    
    return (
      <VoiceMembers>
        {channelParticipants.map((id) => {
          const isMe = id === user?.id;
          const u = isMe ? user : memberMap[id];
          const display = u?.display_name || u?.username || id;
          const img = u?.avatar_url as string | undefined;
          const initial = (display || 'U').charAt(0).toUpperCase();
          const speaking = speakingUsers.includes(id);
          const hasVideo = !!videoParticipants[id];
          return (
            <VoiceMember 
              key={id} 
              $speaking={speaking}
              onClick={() => hasVideo && onVideoView?.(id)}
              style={{ cursor: hasVideo ? 'pointer' : 'default' }}
            >
              <AvatarSm $img={img} $speaking={speaking}>
                {!img && initial}
              </AvatarSm>
              <span style={{
                color:'#dcddde',
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>{display}</span>
              <RightIcons>
                {streamingParticipants[id] ? (
                  <span title="TRỰC TIẾP" style={{
                    background:'#ed4245',
                    color:'#fff',
                    fontWeight:700,
                    fontSize:'8px',
                    padding:'0 4px',
                    borderRadius:'10px',
                    lineHeight: 1
                  }}>TRỰC TIẾP</span>
                ) : hasVideo ? (
                  <span title="Camera on">📹</span>
                ) : null}
                {(isMe ? muted : remoteMute[id]) && (
                  <span title="Muted">🔇</span>
                )}
                {(isMe ? deafened : remoteDeafen[id]) && (
                  <span title="Deafened">🎧</span>
                )}
              </RightIcons>
            </VoiceMember>
          );
        })}
      </VoiceMembers>
    );
  };

  return (
    <SidebarContainer>
      <Header onClick={() => { try { (window as any).__toggle_server_menu__?.(); } catch {} }} style={{userSelect:'none'}} title="Nhấp để mở menu server">
        <span>{serverName || 'Server'}</span>
        <DownArrow>▾</DownArrow>
      </Header>
      
      <ChannelList>
        {/* Text Channels */}
        {textChannels.length > 0 && (
          <ChannelGroup>
            <ChannelGroupHeader>
              <span>Text Channels</span>
              <HeaderActions>
                <button onClick={onCreateChannel} title="Create Channel" style={{background:'none', border:'none', color:'#8e9297', cursor:'pointer', fontSize:16}}>+
                </button>
                <button onClick={() => setOpenTextSettings(true)} title="Channel settings" style={{background:'none', border:'none', color:'#8e9297', cursor:'pointer', fontSize:16}}>⚙️</button>
              </HeaderActions>
            </ChannelGroupHeader>
            {textChannels.map((channel) => {
              const unreadCount = getUnreadCount(channel.id);
              return (
                <ChannelItem
                  key={channel.id}
                  $isSelected={selectedChannel === channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <ChannelIcon>{getChannelIcon(channel.type)}</ChannelIcon>
                  <ChannelName>{channel.name}</ChannelName>
                  {unreadCount > 0 && <UnreadBadge>{unreadCount > 99 ? '99+' : unreadCount}</UnreadBadge>}
                </ChannelItem>
              );
            })}
          </ChannelGroup>
        )}

        {/* Voice Channels */}
        {voiceChannels.length > 0 && (
          <ChannelGroup>
            <ChannelGroupHeader>
              <span>Voice Channels</span>
              <HeaderActions>
                <button onClick={() => setOpenVoiceSettings(true)} title="Channel settings" style={{background:'none', border:'none', color:'#8e9297', cursor:'pointer', fontSize:16}}>⚙️</button>
              </HeaderActions>
            </ChannelGroupHeader>
            {voiceChannels.map((channel) => (
              <React.Fragment key={channel.id}>
                <ChannelItem
                  $isSelected={selectedChannel === channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <ChannelIcon>{getChannelIcon(channel.type)}</ChannelIcon>
                  <ChannelName>{channel.name}</ChannelName>
                </ChannelItem>
                {renderVoiceMembers(channel.id)}
              </React.Fragment>
            ))}
          </ChannelGroup>
        )}

        {channels.length === 0 && (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center', 
            color: '#8e9297',
            fontSize: '14px'
          }}>
            No channels yet.
            <br />
            <button 
              onClick={onCreateChannel}
              style={{
                background: 'none',
                border: 'none',
                color: '#5865f2',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginTop: '8px'
              }}
            >
              Create one!
            </button>
          </div>
        )}
      </ChannelList>
      <BottomDock>
        {joinedChannelId && (
          <VoiceConnectionHeader>
            <ConnectionStatus>
              <StatusIcon $connected={isConnected} />
              <div>
                <StatusText>Đã Kết Nối Giọng Nói</StatusText>
                <VoiceChannelName>{currentChannel?.name || 'Voice Channel'}</VoiceChannelName>
              </div>
            </ConnectionStatus>
            
            <HeaderRight>
              <WaveIndicator>
                {Array.from({ length: 5 }, (_, i) => (
                  <WaveBar 
                    key={i} 
                    $active={waveActive} 
                    $delay={i * 100}
                  />
                ))}
              </WaveIndicator>
              <LeaveButton onClick={leaveVoice}>
                Rời khỏi
              </LeaveButton>
            </HeaderRight>
          </VoiceConnectionHeader>
        )}
        <UserSelfPanel />
      </BottomDock>
      {openTextSettings && (
        <ChannelSettingsModal
          channels={channels}
          type="text"
          onClose={() => setOpenTextSettings(false)}
          onChanged={async () => { await loadChannels(serverId); }}
        />
      )}
      {openVoiceSettings && (
        <ChannelSettingsModal
          channels={channels}
          type="voice"
          onClose={() => setOpenVoiceSettings(false)}
          onChanged={async () => { await loadChannels(serverId); }}
        />
      )}
    </SidebarContainer>
  );
};

export default ChannelSidebar;
