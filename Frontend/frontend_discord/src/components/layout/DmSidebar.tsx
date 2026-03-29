import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useDirectMessagesStore } from '../../store/directMessagesStore';

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

const SectionTitle = styled.div`
  padding: 8px 16px;
  font-weight: 600;
  color: #8e9297;
  background: #2b2d31;
`;

const List = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
`;

const Item = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  &:hover { background: #393c43; }
`;

const Avatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #5865f2;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const Name = styled.div`
  color: #fff;
  font-size: 14px;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Small = styled.div`
  color: #8e9297;
  font-size: 12px;
`;

const Badge = styled.div`
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ed4245;
  color: #fff;
  border-radius: 8px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Empty = styled.div`
  color: #8e9297;
  padding: 16px;
`;

const DmSidebar: React.FC = () => {
  const { recent, loadRecent, unread, selectUser, selectedUserId } = useDirectMessagesStore() as any;

  useEffect(() => { loadRecent(); }, [loadRecent]);

  // Bỏ auto-select: chỉ chọn khi người dùng click một liên hệ

  return (
    <SidebarContainer>
      <Header>Direct Messages</Header>
      <SectionTitle>Recent ({recent.length})</SectionTitle>
      <List>
        {recent.length === 0 ? (
          <Empty>Chưa có cuộc trò chuyện nào</Empty>
        ) : (
          recent.map((r: any) => (
            <Item key={r.user.id} onClick={() => r.user?.id && selectUser(r.user)}>
              <Avatar style={{backgroundImage: r.user.avatar_url ? `url(${r.user.avatar_url})` : 'none', backgroundSize:'cover', backgroundPosition:'center'}}>
                {!r.user.avatar_url && (r.user.display_name || r.user.username || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <div style={{display:'flex', flexDirection:'column', minWidth:0}}>
                <Name>{r.user.display_name || r.user.username}</Name>
                <Small>{new Date(r.lastMessageAt).toLocaleString()}</Small>
              </div>
              {(unread[r.user.id] || 0) > 0 && <Badge>{unread[r.user.id]}</Badge>}
            </Item>
          ))
        )}
      </List>
    </SidebarContainer>
  );
};

export default DmSidebar;


