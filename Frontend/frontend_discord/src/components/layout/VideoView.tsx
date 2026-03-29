import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useAuthStore } from '../../store/authStore';
import { useVoiceStore } from '../../store/voiceStore';

const VideoContainer = styled.div`
  width: 100%;
  height: 100%;
  background: #2f3136;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const VideoArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #1e1f22;
`;

const MainVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain; /* giữ tỷ lệ, không crop */
  background: #000;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const VideoInfo = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
`;

const Controls = styled.div`
  height: 60px;
  background: #2f3136;
  border-top: 1px solid #202225;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px;
`;

const ControlButton = styled.button<{ $active?: boolean; $danger?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${props => {
    if (props.$danger) return props.$active ? '#ed4245' : '#4f545c';
    return props.$active ? '#3ba55d' : '#4f545c';
  }};
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => {
      if (props.$danger) return props.$active ? '#ed4245' : '#5d6269';
      return props.$active ? '#3ba55d' : '#5d6269';
    }};
  }
`;

const LeaveButton = styled.button`
  background: #ed4245;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s ease;

  &:hover {
    background: #c73e1d;
  }
`;

interface VideoViewProps {
  userId: string;
  onClose: () => void;
}

const VideoView: React.FC<VideoViewProps> = ({ userId, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuthStore();
  const { muted, deafened, streaming, toggleMute, toggleDeafen, toggleStream, leaveVoice, videoStream } = useVoiceStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    console.log('🎬 VideoView mounted for userId:', userId);

    const tryAttach = async (attempt = 0) => {
      if (cancelled) return;

      console.log(`🎬 VideoView tryAttach attempt ${attempt} for userId:`, userId);

      // Nếu là chính mình và đã bật camera, dùng trực tiếp videoStream trong store
      const meId = useAuthStore.getState().user?.id;
      if (meId && meId === userId && videoStream && videoRef.current) {
        console.log('🎬 Using own video stream');
        videoRef.current.srcObject = videoStream;
        setIsLoading(false);
        setError(null);
        return;
      }

      const videoElement = document.getElementById(`voice-video-${userId}`) as HTMLVideoElement | null;
      console.log(`🔍 VideoView attempt ${attempt}: Looking for video element voice-video-${userId}`, videoElement);
      
      if (videoElement && videoRef.current) {
        console.log('🔍 Video element found, checking srcObject:', videoElement.srcObject);
        
        // Kiểm tra cả srcObject và videoTracks
        const hasVideo = videoElement.srcObject && 
          (videoElement.srcObject as MediaStream).getVideoTracks().length > 0;
        
        console.log('🔍 Has video tracks:', hasVideo, 'tracks count:', 
          videoElement.srcObject ? (videoElement.srcObject as MediaStream).getVideoTracks().length : 0);
        
        if (hasVideo) {
          videoRef.current.srcObject = videoElement.srcObject;
          setIsLoading(false);
          setError(null);
          console.log('✅ Video stream attached successfully');
          return;
        }
      } else {
        console.log('🔍 Video element not found or videoRef not ready');
      }

      if (attempt < 20) {
        // Retry với backoff nhẹ vì video track có thể đến chậm sau khi bật cam
        setTimeout(() => tryAttach(attempt + 1), 500);
      } else {
        setIsLoading(false);
        setError('Không tìm thấy video stream từ user này');
      }
    };

    setIsLoading(true);
    setError(null);
    tryAttach();

    // Quan sát DOM để bắt được thời điểm video element ẩn được tạo ra bởi voiceStore
    const observer = new MutationObserver(() => {
      const el = document.getElementById(`voice-video-${userId}`) as HTMLVideoElement | null;
      if (el && videoRef.current && (el as any).srcObject) {
        (videoRef.current as any).srcObject = (el as any).srcObject;
        setIsLoading(false);
        setError(null);
        observer.disconnect();
      }
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true });
    } catch {}

    return () => { cancelled = true; };
  }, [userId, videoStream]);

  const handleLeave = () => {
    leaveVoice();
    onClose();
  };

  // Tự động play() khi đã gắn srcObject (khắc phục autoplay policy)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const tryPlay = async (attempt = 0) => {
      try {
        await el.play();
      } catch (e) {
        if (attempt < 5) setTimeout(() => tryPlay(attempt + 1), 300);
      }
    };
    tryPlay();
  }, [videoRef.current]);

  return (
    <VideoContainer>
      <VideoArea>
        {/* Luôn render thẻ video để ref sẵn sàng */}
        <MainVideo
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
        />
        <VideoInfo>
          {user?.display_name || user?.username || 'User'}
        </VideoInfo>

        {(isLoading || error) && (
          <Overlay>
            <div style={{ color: error ? '#ed4245' : '#b9bbbe', fontSize: '16px', textAlign: 'center' }}>
              {error ? error : 'Đang tải video...'}
            </div>
          </Overlay>
        )}
      </VideoArea>

      <Controls>
        <ControlButton $active={!muted} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? '🔇' : '🎤'}
        </ControlButton>
        
        <ControlButton $active={!deafened} onClick={toggleDeafen} title={deafened ? 'Undeafen' : 'Deafen'}>
          {deafened ? '🔇' : '🎧'}
        </ControlButton>
        
        <ControlButton $active={streaming} onClick={toggleStream} title={streaming ? 'Tắt Live Stream' : 'Bật Live Stream'}>
          🖥️
        </ControlButton>
        
        <LeaveButton onClick={handleLeave}>
          Rời khỏi
        </LeaveButton>
      </Controls>
    </VideoContainer>
  );
};

export default VideoView;
