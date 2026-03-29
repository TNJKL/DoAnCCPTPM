import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useVoiceStore } from '../../store/voiceStore';
import { useAuthStore } from '../../store/authStore';
import { useServerStore } from '../../store/serverStore';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #36393f;
`;


const Participants = styled.div`
  flex: 1;
  padding: 12px 16px;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
`;

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #2f3136;
  border: 1px solid #202225;
  border-radius: 8px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #5865f2;
`;

const Name = styled.div`
  color: #dcddde;
  font-weight: 600;
`;


const VoiceChannelPanel: React.FC<{ channelId: string }> = ({ channelId }) => {
  const { participants, joinedChannelId, speakingUsers } = useVoiceStore();
  const { user } = useAuthStore();

  return (
    <Panel>
      <Participants>
        {participants.map((id) => (
          <Card key={id}>
            <Avatar />
            <div>
              <Name>{id === user?.id ? '(Bạn)' : id}</Name>
            </div>
          </Card>
        ))}
        {participants.length === 0 && (
          <div style={{color:'#8e9297'}}>Đang chờ người khác tham gia...</div>
        )}
      </Participants>
    </Panel>
  );
};

export default VoiceChannelPanel;
