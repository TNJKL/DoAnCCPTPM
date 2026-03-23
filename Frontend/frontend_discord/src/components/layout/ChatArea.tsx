import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Message, Reaction } from '../../types';
import UserProfilePopover from '../common/UserProfilePopover';
import EmojiPicker from '../common/EmojiPicker';
import { apiService } from '../../services/api.service';
import { webSocketService } from '../../services/websocket.service';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  background-color: #36393f;
`;

const ChatHeader = styled.div`
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #202225;
  box-shadow: 0 1px 0 rgba(4, 4, 5, 0.2), 0 1.5px 0 rgba(6, 6, 7, 0.05), 0 2px 0 rgba(4, 4, 5, 0.05);
`;

const ChannelName = styled.div`
  font-weight: bold;
  font-size: 16px;
  color: #fff;
`;

const ChannelDescription = styled.div`
  font-size: 14px;
  color: #8e9297;
  margin-left: 8px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const MessageActions = styled.div`
  position: absolute;
  right: 8px;
  top: 6px;
  display: none;
  gap: 6px;
  background: rgba(32,34,37,0.9);
  border: 1px solid #202225;
  border-radius: 6px;
  padding: 4px;
  z-index: 5;
`;

const MessageActionBtn = styled.button`
  background: transparent;
  border: none;
  color: #b9bbbe;
  cursor: pointer;
  width: 28px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  &:hover { background:#3a3f45; color:#fff; }
`;

const ReactionsRow = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
`;

const ReactionChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 12px;
  border: 1px solid ${p => p.$active ? '#5865f2' : '#4f545c'};
  background: ${p => p.$active ? 'rgba(88,101,242,0.15)' : '#2f3136'};
  color: #dcddde;
  cursor: pointer;
`;

const MessageItem = styled.div<{ $highlight?: boolean; $system?: boolean }>`
  margin-bottom: 16px;
  display: flex;
  position: relative;
  ${p => p.$highlight ? 'background: rgba(250, 166, 26, 0.12); border-radius: 8px; padding: 6px 8px;' : ''}
  ${p => p.$system ? 'background: rgba(88,101,242,0.12); border-left: 3px solid #5865f2; border-radius: 6px; padding: 6px 8px;' : ''}
  &:hover ${MessageActions} { display: inline-flex; }
`;

const Avatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #5865f2;
  background-image: ${p => p.$src ? `url(${p.$src})` : 'none'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
  font-weight: bold;
  color: #fff;
`;

const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const MessageHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
`;

const ReplyPreview = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-left: 3px solid #5865f2;
  background: rgba(88,101,242,0.08);
  border-radius: 4px;
  margin-bottom: 6px;
  color: #b9bbbe;
  cursor: pointer;
`;

const ReplyBar = styled.div`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 88px;
  background: #2f3136;
  border: 1px solid #202225;
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #b9bbbe;
`;

const Username = styled.span`
  font-weight: bold;
  color: #fff;
  margin-right: 8px;
  cursor: pointer;
`;

const Timestamp = styled.span`
  font-size: 12px;
  color: #8e9297;
`;

const MessageText = styled.div`
  color: #dcddde;
  font-size: 16px;
  line-height: 1.375;
  word-wrap: break-word;
`;

const Mention = styled.span`
  background: rgba(250, 166, 26, 0.35);
  color: #fff;
  padding: 0 3px;
  border-radius: 3px;
`;

const InputContainer = styled.div`
  padding: 16px;
  background-color: #40444b;
  position: relative;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  background-color: #40444b;
  border-radius: 8px;
  padding: 0 16px;
`;

const MentionList = styled.div`
  position: absolute;
  bottom: 56px;
  left: 16px;
  background: #2f3136;
  border: 1px solid #202225;
  border-radius: 8px;
  min-width: 260px;
  max-height: 240px;
  overflow: auto;
  z-index: 30;
`;

const MentionItem = styled.div<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  cursor: pointer;
  color: #dcddde;
  ${p => p.$active ? 'background:#3a3f45;' : 'background:transparent;'}
  &:hover { background:#3a3f45; }
`;

const MessageInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #dcddde;
  font-size: 16px;
  padding: 12px 0;
  
  &::placeholder {
    color: #72767d;
  }
`;

const TypingIndicator = styled.div`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 60px;
  color: #8e9297;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SendButton = styled.button`
  background: none;
  border: none;
  color: #8e9297;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  
  &:hover {
    color: #dcddde;
    background-color: #4f545c;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmojiBtn = styled.button`
  background: none;
  border: none;
  color: #8e9297;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  font-size: 18px;
  &:hover { color: #dcddde; background-color: #4f545c; }
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

const VoiceBtn = styled.button`
  background: none;
  border: none;
  color: #8e9297;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  font-size: 18px;
  &:hover { color: #dcddde; background-color: #4f545c; }
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

interface ChatAreaProps {
  channelId: string;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onToggleMembers: () => void;
  membersVisible: boolean;
  channelName?: string;
  channelTopic?: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  channelId,
  messages,
  onSendMessage,
  onToggleMembers,
  membersVisible,
  channelName,
  channelTopic
}) => {
  const { user: me } = useAuthStore();
  const { selectedServer } = useServerStore();
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profileUser, setProfileUser] = useState<any | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [serverMembers, setServerMembers] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);

  // voice record
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);

  // typing indicator
  const [typingUsers, setTypingUsers] = useState<Record<string, { username: string; until: number }>>({});
  const typingIdleTimerRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll đến tin nhắn có mention mới nhất
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevCountRef = useRef<number>(0);
  const lastScrolledMentionRef = useRef<string | null>(null);

  useEffect(() => {
    const username = me?.username?.trim();
    if (!username) {
      prevCountRef.current = messages.length;
      return;
    }
    // Chỉ xử lý khi có tin nhắn mới
    if (messages.length <= prevCountRef.current) {
      prevCountRef.current = messages.length;
      return;
    }

    // Tìm tin nhắn mới nhất có mention
    const mentionRegex = new RegExp(`(^|\\s)@${username}(\\b|\\s|$)`, 'i');
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (typeof m.content === 'string' && mentionRegex.test(m.content)) {
        if (lastScrolledMentionRef.current === m.id) break;
        const el = messageRefs.current[m.id];
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          lastScrolledMentionRef.current = m.id;
        }
        break;
      }
    }
    prevCountRef.current = messages.length;
  }, [messages, me?.username]);

  // Khi có tin nhắn mới là reply tới tin của chính mình -> flash highlight CHÍNH TIN NHẮN PHẢN HỒI (góc nhìn người bị phản hồi)
  useEffect(() => {
    if (!me?.id) return;
    if (messages.length <= prevCountRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || typeof last.content !== 'string') { prevCountRef.current = messages.length; return; }
    const { replyId } = parseReply(String(last.content));
    if (!replyId) { prevCountRef.current = messages.length; return; }
    const replied = findMessageById(replyId);
    if (replied && (replied.user?.id === me.id) && (last.user?.id !== me.id)) {
      flashHighlight(last.id);
    }
    prevCountRef.current = messages.length;
  }, [messages, me?.id]);

  const flashHighlight = (id: string) => {
    setFlashIds((prev) => new Set([...Array.from(prev), id]));
    setTimeout(() => {
      setFlashIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }, 1500);
  };

  // Load server members for mention
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!selectedServer) { setServerMembers([]); return; }
        const members = await apiService.getServerMembers(selectedServer);
        if (!mounted) return;
        const users = members.map((m: any) => m.user || m).filter((u: any) => !!u?.id);
        setServerMembers(users);
      } catch {
        setServerMembers([]);
      }
    })();
    return () => { mounted = false; };
  }, [selectedServer]);

  const handleSendMessage = async () => {
    try {
      if (pendingAttachment) {
        const uploaded = await apiService.uploadFile(pendingAttachment.file);
        if (uploaded?.file_url) {
          onSendMessage(uploaded.file_url);
        }
        if (pendingAttachment.preview) URL.revokeObjectURL(pendingAttachment.preview);
        if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
        setPendingAudioUrl(null);
        setPendingAttachment(null);
      }
    } catch (e) { console.error('Send file failed:', e); }
    if (messageText.trim()) {
      const prefix = replyTo ? `[@reply:${replyTo.id}] ` : '';
      onSendMessage((prefix + messageText.trim()));
      setMessageText('');
      setShowEmoji(false);
      setReplyTo(null);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      // Only call API - WebSocket will be handled by backend
      await apiService.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
    setReactionPickerFor(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i)=> Math.min(i+1, filteredMentions.length-1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i)=> Math.max(i-1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(filteredMentions[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const onInputChange = (val: string) => {
    setMessageText(val);
    // emit typing start with throttle (1.5s)
    try {
      const now = Date.now();
      if (channelId && val.trim().length > 0 && now - lastTypingSentRef.current > 1500) {
        webSocketService.startTyping(channelId);
        lastTypingSentRef.current = now;
      }
      // stop typing after 2s idle
      if (typingIdleTimerRef.current) window.clearTimeout(typingIdleTimerRef.current);
      typingIdleTimerRef.current = window.setTimeout(() => {
        if (channelId) webSocketService.stopTyping(channelId);
      }, 2000);
    } catch {}
    // Cho phép gợi ý theo tên hiển thị có dấu/khoảng trắng
    const m = val.match(/(^|\s)@([^@\n]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQuery((m[2] || '').trim());
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionQuery('');
    }
  };

  const filteredMentions = serverMembers
    .filter((u: any) => u.id !== me?.id)
    .filter((u: any) => !mentionQuery || (u.display_name || u.username || '').toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 20);

  const applyMention = (user: any) => {
    if (!user) return;
    const val = messageText;
    const m = val.match(/(^|\s)@([^@\n]*)$/);
    if (!m) { setMentionOpen(false); return; }
    const startAt = val.lastIndexOf('@');
    const before = val.slice(0, startAt);
    const replaced = before + '@' + (user.display_name || user.username) + ' ';
    setMessageText(replaced);
    setMentionOpen(false);
    setMentionQuery('');
  };

  // Listen to typing events for this channel
  useEffect(() => {
    const handleUserTyping = (data: { userId: string; username: string; channelId: string }) => {
      if (!channelId || data.channelId !== channelId) return;
      if (me?.id === data.userId) return;
      setTypingUsers((prev) => ({
        ...prev,
        [data.userId]: { username: data.username, until: Date.now() + 2500 },
      }));
    };
    const handleUserStopTyping = (data: { userId: string; channelId: string }) => {
      if (!channelId || data.channelId !== channelId) return;
      setTypingUsers((prev) => {
        const clone = { ...prev } as any;
        delete clone[data.userId];
        return clone;
      });
    };
    webSocketService.onUserTyping(handleUserTyping);
    webSocketService.onUserStopTyping(handleUserStopTyping);
    const sweep = window.setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const clone: Record<string, { username: string; until: number }> = {};
        Object.entries(prev).forEach(([k, v]) => { if (v.until > now) clone[k] = v; });
        return clone;
      });
    }, 1000);
    return () => {
      webSocketService.offUserTyping(handleUserTyping);
      webSocketService.offUserStopTyping(handleUserStopTyping);
      window.clearInterval(sweep);
    };
  }, [channelId, me?.id]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const buildPreviewIfImage = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) return URL.createObjectURL(file);
    return undefined;
  };

  const handlePickFile = () => { fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = buildPreviewIfImage(file);
    setPendingAttachment({ file, preview });
    e.target.value = '';
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
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
  };

  const renderWithMentions = (text: string) => {
    if (!text) return text;
    const tokensSet = new Set<string>();
    serverMembers.forEach((u: any) => {
      const disp = (u.display_name || u.username || '').trim();
      const user = (u.username || '').trim();
      if (disp) tokensSet.add(disp);
      if (user) tokensSet.add(user);
    });
    const tokens = Array.from(tokensSet);
    if (tokens.length === 0) return text;
    tokens.sort((a, b) => b.length - a.length);
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const alternation = escaped.join('|');
    // match: (preWhitespace or start) + @ + token + lookahead boundary
    const re = new RegExp(`(^|\\s)@(${alternation})(?=($|\\s|[.,!?:;]))`, 'gi');

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const full = match[0];
      const pre = match[1] || '';
      const atToken = '@' + match[2];

      // push text before match
      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start));
      }
      // push pre space if any
      if (pre) nodes.push(pre);
      // push highlighted token
      nodes.push(<Mention key={`m-${start}`}>{atToken}</Mention>);
      lastIndex = start + full.length;
    }
    // remainder
    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }
    return nodes.length ? nodes : text;
  };

  const parseReply = (text: string): { replyId?: string; body: string } => {
    if (typeof text !== 'string') return { body: String(text) } as any;
    const m = text.match(/^\[@reply:([0-9a-fA-F-]{8,})\]\s*/);
    if (!m) return { body: text };
    return { replyId: m[1], body: text.slice(m[0].length) };
  };

  const findMessageById = (id?: string) => {
    if (!id) return undefined;
    return messages.find((mm) => mm.id === id);
  };

  const cancelPending = () => {
    if (pendingAttachment?.preview) URL.revokeObjectURL(pendingAttachment.preview);
    if (pendingAudioUrl) URL.revokeObjectURL(pendingAudioUrl);
    setPendingAudioUrl(null);
    setPendingAttachment(null);
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


  // Helper function to get reaction counts
  const getReactionCounts = (message: Message) => {
    if (!message.reactions) return {};
    
    const counts: Record<string, { count: number; mine: boolean }> = {};
    message.reactions.forEach(reaction => {
      if (!counts[reaction.emoji]) {
        counts[reaction.emoji] = { count: 0, mine: false };
      }
      counts[reaction.emoji].count++;
      if (reaction.user_id === me?.id) {
        counts[reaction.emoji].mine = true;
      }
    });
    
    return counts;
  };

  return (
    <>
    <ChatContainer>
      <ChatHeader>
        <div style={{display:'flex', alignItems:'center', gap:8}}>
          <ChannelName># {channelName || 'general'}</ChannelName>
          {channelTopic && <ChannelDescription>{channelTopic}</ChannelDescription>}
        </div>
        <button
          onClick={onToggleMembers}
          style={{
            background: membersVisible ? '#5865f2' : '#4f545c',
            color: '#fff',
            border: 'none',
            borderRadius: 16,
            padding: '6px 10px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title={membersVisible ? 'Ẩn danh sách thành viên' : 'Hiện danh sách thành viên'}
        >
          👥 {membersVisible ? 'Ẩn' : 'Hiện'}
        </button>
      </ChatHeader>

      <MessagesContainer>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#72767d',
            fontSize: '16px'
          }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isImage = typeof message.content === 'string' && /\.(png|jpg|jpeg|gif|webp)$/i.test(message.content);
            const resolved = typeof message.content === 'string' ? toAbsoluteUrl(message.content) : '';
            const isFromUploads = /\/uploads\//i.test(resolved);
            const isRecordedVoice = typeof message.content === 'string' && isFromUploads && /\.(webm)$/i.test(message.content);
            const isFileLink = typeof message.content === 'string' && !isImage && !isRecordedVoice && isFromUploads;
            const safe = (s: string) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const mentionedMe = !!(me && typeof message.content === 'string' && (
              (me.username && new RegExp(`(^|\\s)@${safe(me.username)}(\\b|\\s|$)`, 'i').test(message.content)) ||
              (me.display_name && new RegExp(`(^|\\s)@${safe(me.display_name)}(\\b|\\s|$)`, 'i').test(message.content))
            ));
            const { replyId, body } = parseReply(String(message.content));
            const replied = findMessageById(replyId);
            const isFlash = flashIds.has(message.id);
            const isReplyToMe = !!(me && replied && replied.user?.id === me.id && message.user?.id !== me.id);
            const isSystemJoinLeave = typeof message.content === 'string' && (
              /Chào mừng .+ đến với server /i.test(message.content) || /đã rời server /i.test(message.content)
            );
            return (
            <MessageItem key={message.id} $highlight={!!mentionedMe || isFlash || isReplyToMe} $system={isSystemJoinLeave} ref={(el) => { messageRefs.current[message.id] = el; }}>
              <Avatar $src={message.user?.avatar_url}>
                {!message.user?.avatar_url && (message.user?.display_name?.charAt(0).toUpperCase() || message.user?.username?.charAt(0).toUpperCase() || 'U')}
              </Avatar>
              <MessageContent>
                <MessageActions>
                  <MessageActionBtn title="Phản hồi" onClick={() => setReplyTo(message)}>↩</MessageActionBtn>
                  <MessageActionBtn title="Thả cảm xúc" onClick={()=> setReactionPickerFor((id)=> id===message.id? null : message.id)}>😊</MessageActionBtn>
                </MessageActions>
                <MessageHeader>
                  <Username onClick={() => message.user && setProfileUser(message.user)} onDoubleClick={() => setReplyTo(message)} title="Nhấp đúp để phản hồi">
                    {message.user?.display_name || message.user?.username || 'Unknown User'}
                  </Username>
                  <Timestamp>{formatTimestamp(message.created_at)}</Timestamp>
                </MessageHeader>
                {replied && (
                  <ReplyPreview onClick={() => {
                    const el = messageRefs.current[replied.id];
                    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                  }}>
                    <span style={{opacity:.8}}>Phản hồi</span>
                    <span style={{fontWeight:600, color:'#fff'}}>{replied.user?.display_name || replied.user?.username}</span>
                    <span style={{opacity:.9, maxWidth:280, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                      {typeof replied.content === 'string' ? replied.content.replace(/^\[@reply:[^\]]+\]\s*/, '') : ''}
                    </span>
                  </ReplyPreview>
                )}
                {isImage ? (
                  <img src={toAbsoluteUrl(body as string)} alt="image" style={{maxWidth:'360px', borderRadius:8}} />
                ) : isRecordedVoice ? (
                  <VoiceAttachment url={body as string} />
                ) : isFileLink ? (
                  <FileAttachment url={body as string} />
                ) : (
                  <MessageText>{renderWithMentions(String(body))}</MessageText>
                )}
            {(() => {
              const reactionCounts = getReactionCounts(message);
              const hasReactions = Object.entries(reactionCounts).filter(([,v]) => v.count > 0).length > 0;
              
              return hasReactions && (
                <ReactionsRow>
                  {Object.entries(reactionCounts).map(([emo, info]) => (
                    info.count > 0 ? (
                      <ReactionChip key={emo} $active={info.mine} onClick={() => toggleReaction(message.id, emo)}>
                        <span>{emo}</span>
                        <span style={{fontSize:12, color:'#b9bbbe'}}>{info.count}</span>
                      </ReactionChip>
                    ) : null
                  ))}
                </ReactionsRow>
              );
            })()}
              </MessageContent>
          {reactionPickerFor === message.id && (
            <div style={{position:'absolute', right:40, top:6, zIndex:6}}>
              <EmojiPicker onSelect={(e:string)=> toggleReaction(message.id, e)} />
            </div>
          )}
            </MessageItem>
          );})
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        {Object.keys(typingUsers).length > 0 && (
          <TypingIndicator>
            {(() => {
              const names = Object.values(typingUsers).map((t) => t.username).slice(0, 3);
              const more = Object.keys(typingUsers).length - names.length;
              const label = names.join(', ') + (more > 0 ? ` và ${more} người khác` : '');
              return <span>{label} đang nhập...</span>;
            })()}
          </TypingIndicator>
        )}
        <InputWrapper>
          <EmojiBtn onClick={() => setShowEmoji(s=>!s)}>😊</EmojiBtn>
          <EmojiBtn onClick={handlePickFile}>📎</EmojiBtn>
          <VoiceBtn onClick={() => { isRecording ? stopRecording() : startRecording(); }} title={isRecording ? 'Dừng ghi' : 'Ghi âm'}>{isRecording ? '■' : '🎙️'}</VoiceBtn>
          <input ref={fileInputRef} type="file" style={{display:'none'}} onChange={handleFileChange} />
          <MessageInput
            type="text"
            placeholder={`Message #${channelName || 'general'}`}
            value={messageText}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
          />
          <SendButton 
            onClick={handleSendMessage}
            disabled={!messageText.trim() && !pendingAttachment}
          >
            ➤
          </SendButton>
        </InputWrapper>
        {replyTo && (
          <ReplyBar>
            <div>
              Đang phản hồi <span style={{color:'#fff', fontWeight:600}}>{replyTo.user?.display_name || replyTo.user?.username}</span> ·
              <span style={{marginLeft:6, opacity:.9}}>{typeof replyTo.content === 'string' ? replyTo.content.replace(/^\[@reply:[^\]]+\]\s*/, '') : ''}</span>
            </div>
            <button onClick={() => setReplyTo(null)} style={{background:'transparent', border:'none', color:'#b9bbbe', cursor:'pointer'}}>✖</button>
          </ReplyBar>
        )}
        {showEmoji && (
          <EmojiPicker onSelect={(e)=> setMessageText(t=>t+e)} />
        )}
        {mentionOpen && filteredMentions.length > 0 && (
          <MentionList>
            {filteredMentions.map((u: any, i: number) => (
              <MentionItem key={u.id} $active={i===mentionIndex} onMouseDown={(e)=>{ e.preventDefault(); applyMention(u); }}>
                <div style={{width:28, height:28, borderRadius:14, background:'#5865f2', backgroundImage: u.avatar_url ? `url(${u.avatar_url})` as any : 'none', backgroundSize:'cover', backgroundPosition:'center', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>
                  {!u.avatar_url && (u.display_name || u.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                  <div style={{fontWeight:600}}>{u.display_name || u.username}</div>
                  <div style={{fontSize:12, color:'#8e9297'}}>@{u.username}</div>
                </div>
              </MentionItem>
            ))}
          </MentionList>
        )}
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
      </InputContainer>
    </ChatContainer>
    {profileUser && (
      <UserProfilePopover user={profileUser} onClose={() => setProfileUser(null)} />
    )}
    </>
  );
};

export default ChatArea;
