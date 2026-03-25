import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useDirectMessagesStore } from '../../store/directMessagesStore';
import { useAuthStore } from '../../store/authStore';
import EmojiPicker from '../common/EmojiPicker';
import { apiService } from '../../services/api.service';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #36393f;
`;

const Header = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #202225;
  color: #fff;
  gap: 10px;
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const Row = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #5865f2;
  background-image: ${p => p.$src ? `url(${p.$src})` : 'none'};
  background-size: cover;
  background-position: center;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
`;

const MessageBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.div`
  color: #fff;
  font-weight: 600;
`;

const Line = styled.div`
  color: #dcddde;
`;

const Time = styled.div`
  color: #8e9297;
  font-size: 12px;
`;

const InputBar = styled.div`
  padding: 16px;
  background: #40444b;
  display: flex;
  gap: 8px;
  position: relative;
`;

const Input = styled.input`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #dcddde;
  font-size: 16px;
`;

const Send = styled.button`
  background: #5865f2;
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
`;

const EmojiBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: #3a3d43;
  color: #fff;
  cursor: pointer;
`;

const VoiceBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: #3a3d43;
  color: #fff;
  cursor: pointer;
`;

const VoiceWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #2f3136;
  border: 1px solid #202225;
  padding: 8px 10px;
  border-radius: 8px;
`;

const PlayBtn = styled.button`
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #5865f2;
  color: #fff;
  cursor: pointer;
`;

const Bars = styled.div<{ $active: boolean }>`
  width: 24px;
  height: 16px;
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  div { width: 3px; background:#b9bbbe; height: 4px; }
  ${p => p.$active ? `
    div:nth-child(1){ animation: bar 0.9s infinite ease-in-out; }
    div:nth-child(2){ animation: bar 0.9s infinite ease-in-out 0.15s; }
    div:nth-child(3){ animation: bar 0.9s infinite ease-in-out 0.3s; }
  ` : ''}
  @keyframes bar { 0%,100%{ height: 4px } 50%{ height: 16px } }
`;

const FileTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #2f3136;
  border: 1px solid #202225;
  color: #dcddde;
  padding: 8px 10px;
  border-radius: 8px;
`;

const Pre = styled.pre`
  background: #2f3136;
  border: 1px solid #202225;
  color: #dcddde;
  padding: 10px;
  border-radius: 8px;
  max-width: 560px;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
`;

function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function getFileNameFromUrl(url: string): string {
  try {
    const u = new URL(toAbsoluteUrl(url));
    return decodeURIComponent(u.pathname.split('/').pop() || 'tệp');
  } catch {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'tệp';
  }
}

const FileAttachment: React.FC<{ url: string }> = ({ url }) => {
  const abs = toAbsoluteUrl(url);
  const lower = abs.toLowerCase();
  const isPdf = lower.endsWith('.pdf') || lower.includes('application/pdf');
  const isTxt = lower.endsWith('.txt') || lower.includes('text/plain');
  const [textContent, setTextContent] = useState<string>('');
  const [textLoaded, setTextLoaded] = useState(false);
  const filename = getFileNameFromUrl(url);

  useEffect(() => {
    let cancelled = false;
    if (isTxt) {
      fetch(abs).then(r => r.text()).then(t => {
        if (!cancelled) { setTextContent(t); setTextLoaded(true); }
      }).catch(() => setTextLoaded(true));
    }
    return () => { cancelled = true; };
  }, [abs]);

  if (isPdf) {
    return (
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        <iframe title={filename} src={abs} style={{width: '560px', height: '360px', border: '1px solid #202225', borderRadius: 8}} />
        <a href={abs} target="_blank" rel="noreferrer" style={{color:'#00aff4'}}>Tải xuống PDF</a>
      </div>
    );
  }
  if (isTxt) {
    return (
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        <Pre>{textLoaded ? textContent : 'Đang tải nội dung...'}</Pre>
        <a href={abs} target="_blank" rel="noreferrer" style={{color:'#00aff4'}}>Tải xuống {filename}</a>
      </div>
    );
  }
  return (
    <FileTag>
      <span>📎 {filename}</span>
      <a href={abs} target="_blank" rel="noreferrer" style={{color:'#00aff4'}}>Tải xuống</a>
    </FileTag>
  );
};

const VoiceAttachment: React.FC<{ url: string }> = ({ url }) => {
  const abs = toAbsoluteUrl(url);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); } else { a.play(); }
  };
  useEffect(()=>{
    const a = audioRef.current; if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('ended', onEnd); };
  },[]);
  return (
    <VoiceWrap>
      <PlayBtn onClick={toggle}>{playing ? '⏸️' : '▶️'}</PlayBtn>
      <Bars $active={playing}><div></div><div></div><div></div></Bars>
      <audio ref={audioRef} src={abs} preload="none" />
    </VoiceWrap>
  );
};

const DmChatArea: React.FC = () => {
  const { selectedUserId, selectedUser, conversations, sendDm, receiveDm, loadConversation } = useDirectMessagesStore() as any;
  const { user: me } = useAuthStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Voice recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedUserId, conversations[selectedUserId || '']]);

  // After refresh, if a user is selected but conversation cache is empty -> load from API
  useEffect(() => {
    if (selectedUserId && !conversations[selectedUserId]) {
      loadConversation(selectedUserId);
    }
  }, [selectedUserId]);

  if (!selectedUserId || !selectedUser) {
    return (
      <Container>
        <Header>Direct Messages</Header>
        <div style={{color:'#8e9297', padding:16}}>Chọn một người để bắt đầu nhắn tin</div>
      </Container>
    );
  }

  const msgs = conversations[selectedUserId] || [];

  const handleSend = async () => {
    // Gửi text nếu có
    if (text.trim()) {
      await sendDm(selectedUserId, text.trim());
      setText('');
      setShowEmoji(false);
    }
  };

  const handleSelectEmoji = (e: string) => {
    setText((t) => t + e);
  };

  const buildPreviewIfImage = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    try {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const preview = buildPreviewIfImage(file);
          setPendingAttachment({ file, preview });
          return;
        }
      }
    } catch (err) {
      console.error('Paste file failed:', err);
    }
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = buildPreviewIfImage(file);
    setPendingAttachment({ file, preview });
    e.target.value = '';
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setPendingAttachment({ file });
        setPendingAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Không thể truy cập micro:', err);
    }
  };

  const stopRecording = () => {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const cancelPending = () => {
    if (pendingAttachment?.preview) URL.revokeObjectURL(pendingAttachment.preview);
    if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    setPendingAudioUrl(null);
    setPendingAttachment(null);
  };

  const sendPendingIfAny = async () => {
    if (!pendingAttachment) return;
    try {
      const uploaded = await apiService.uploadFile(pendingAttachment.file);
      if (uploaded?.file_url) {
        await sendDm(selectedUserId, uploaded.file_url);
      }
    } catch (err) {
      console.error('Upload/send file failed:', err);
    } finally {
      cancelPending();
    }
  };

  return (
    <Container>
      <Header>
        <div style={{width:32, height:32, borderRadius:16, background:'#5865f2', backgroundImage: selectedUser.avatar_url ? `url(${selectedUser.avatar_url})` as any : 'none', backgroundSize:'cover', backgroundPosition:'center', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>
          {!selectedUser.avatar_url && (selectedUser.display_name || selectedUser.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={{display:'flex', flexDirection:'column'}}>
          <div>{selectedUser.display_name || selectedUser.username}</div>
          <div style={{fontSize:12, color:'#8e9297'}}>@{selectedUser.username}</div>
        </div>
      </Header>
      <Messages>
        {msgs.map((m: any) => {
          const createdAt = new Date(m.created_at);
          const mine = m.sender_id === me?.id;
          const avatarSrc = mine ? me?.avatar_url : selectedUser.avatar_url;
          const placeholder = (mine ? (me?.display_name || me?.username) : (selectedUser.display_name || selectedUser.username) || 'U').charAt(0).toUpperCase();
          const name = mine ? (me?.display_name || me?.username) : (selectedUser.display_name || selectedUser.username);
          const isImage = typeof m.content === 'string' && /\.(png|jpg|jpeg|gif|webp)$/i.test(m.content);
          // Chỉ coi là file đính kèm nếu thuộc đường dẫn upload của hệ thống
          const resolvedUrl = typeof m.content === 'string' ? toAbsoluteUrl(m.content) : '';
          const isFromUploads = /\/uploads\//i.test(resolvedUrl);
          // Chỉ hiển thị player voice cho file ghi âm từ web (đuôi .webm)
          const isRecordedVoice = typeof m.content === 'string' && isFromUploads && /\.(webm)$/i.test(m.content);
          const isFileLink = typeof m.content === 'string' && !isImage && !isRecordedVoice && isFromUploads;
          return (
            <Row key={m.id}>
              <Avatar $src={avatarSrc}>{!avatarSrc && placeholder}</Avatar>
              <MessageBlock>
                <Name>{name}</Name>
                {isImage ? (
                  <img src={toAbsoluteUrl(m.content)} alt="image" style={{maxWidth:'360px', borderRadius:8}} />
                ) : isRecordedVoice ? (
                  <VoiceAttachment url={m.content} />
                ) : isFileLink ? (
                  <FileAttachment url={m.content} />
                ) : (
                  <Line>{m.content}</Line>
                )}
                <Time>{createdAt.toLocaleString()}</Time>
              </MessageBlock>
            </Row>
          );
        })}
        <div ref={endRef} />
      </Messages>
      <InputBar>
        <EmojiBtn onClick={() => setShowEmoji((s)=>!s)}>😊</EmojiBtn>
        <EmojiBtn onClick={handlePickFile}>📎</EmojiBtn>
        <VoiceBtn onClick={() => { isRecording ? stopRecording() : startRecording(); }} title={isRecording ? 'Dừng ghi' : 'Ghi âm'}>{isRecording ? '■' : '🎙️'}</VoiceBtn>
        <input ref={fileInputRef} type="file" style={{display:'none'}} onChange={handleFileChange} />
        <Input placeholder="Nhập tin nhắn" value={text} onChange={e=>setText(e.target.value)} onPaste={handlePaste} onKeyDown={async e=>{if(e.key==='Enter'){e.preventDefault(); await sendPendingIfAny(); await handleSend();}}}/>
        <Send onClick={async () => { await sendPendingIfAny(); await handleSend(); }}>Gửi</Send>
        {showEmoji && <EmojiPicker onSelect={handleSelectEmoji} />}
        {pendingAttachment && (
          <div style={{position:'absolute', bottom:56, left:16, background:'#2f3136', border:'1px solid #202225', borderRadius:8, padding:8}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              {pendingAudioUrl ? (
                <audio src={pendingAudioUrl} controls style={{maxWidth:260}} />
              ) : pendingAttachment.preview ? (
                <img src={pendingAttachment.preview} alt="preview" style={{maxWidth:260, maxHeight:160, borderRadius:6}} />
              ) : (
                <FileTag>
                  <span>📎 {pendingAttachment.file.name}</span>
                  <span style={{color:'#8e9297', fontSize:12}}>{(pendingAttachment.file.size/1024).toFixed(1)} KB</span>
                </FileTag>
              )}
              <button onClick={cancelPending} style={{background:'#ed4245', color:'#fff', border:'none', padding:'6px 8px', borderRadius:6, cursor:'pointer'}}>Hủy</button>
            </div>
          </div>
        )}
      </InputBar>
    </Container>
  );
};

export default DmChatArea;


