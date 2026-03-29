import { create } from 'zustand';
import { webSocketService } from '../services/websocket.service';
import { useAuthStore } from './authStore';

interface VoiceState {
  joinedChannelId: string | null;
  participants: string[];
  muted: boolean;
  deafened: boolean;
  speakingUsers: string[];
  globalVoiceParticipants: Record<string, string[]>; // channelId -> participants
  cameraEnabled: boolean;
  streaming: boolean;
  videoStream: MediaStream | null;
  videoParticipants: Record<string, boolean>; // userId -> hasVideo
  remoteMute: Record<string, boolean>; // userId -> muted
  remoteDeafen: Record<string, boolean>; // userId -> deafened
  streamingParticipants: Record<string, boolean>; // userId -> isStreaming
}

interface VoiceActions {
  joinVoice: (channelId: string) => Promise<void>;
  leaveVoice: () => Promise<void>;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCamera: () => void;
  toggleStream: () => void;
}

type PeerInfo = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

type PeerMap = Map<string, PeerInfo>;

type Monitor = { stop: () => void };

let isTransitioning = false;

export const useVoiceStore = create<VoiceState & VoiceActions>((set, get) => {
  let localStream: MediaStream | null = null;
  let localVideoStream: MediaStream | null = null;
  const peers: PeerMap = new Map();
  const monitors = new Map<string, Monitor>();
  let audioCtx: AudioContext | null = null;
  const streamingUsers = new Set<string>();

  // ĐĂNG KÝ LISTENER TOÀN CỤC NGAY KHI STORE KHỞI TẠO
  // Điều này giúp mọi người dùng (kể cả chưa join voice) vẫn nhận được cập nhật
  // voice_participants_updated để hiển thị ai đang ở kênh nào ngay lập tức
  const globalVoiceParticipantsHandler = (data: { channelId: string; participants: string[] }) => {
    console.log('🌍 Global voice participants updated for channel:', data.channelId, data.participants);
    set((s) => ({
      globalVoiceParticipants: {
        ...s.globalVoiceParticipants,
        [data.channelId]: data.participants,
      },
    }));
  };

  if (typeof window !== 'undefined') {
    // Tránh đăng ký trùng lặp nếu hot-reload
    (window as any).__voice_global_listener__ = (window as any).__voice_global_listener__ || false;
    if (!(window as any).__voice_global_listener__) {
      (window as any).__voice_global_listener__ = true;
      webSocketService.onVoiceParticipantsUpdated(globalVoiceParticipantsHandler);
    }
  }

  const isStable = (pc: RTCPeerConnection) => pc.signalingState === 'stable';

  const setSpeaking = (userId: string, speaking: boolean) => {
    set((s) => {
      const setArr = new Set(s.speakingUsers);
      if (speaking) setArr.add(userId); else setArr.delete(userId);
      return { speakingUsers: Array.from(setArr) } as Partial<VoiceState> as any;
    });
  };

  const monitorStream = (userId: string, stream: MediaStream) => {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length) / 255; // 0..1
      setSpeaking(userId, rms > 0.08);
      setTimeout(tick, 200);
    };
    tick();
    monitors.set(userId, { stop: () => { stopped = true; try { source.disconnect(); } catch {} } });
  };

  const stopMonitor = (userId: string) => {
    const m = monitors.get(userId);
    if (m) { m.stop(); monitors.delete(userId); }
    setSpeaking(userId, false);
  };

  const stopAllMonitors = () => {
    monitors.forEach((m, id) => { try { m.stop(); } catch {}; setSpeaking(id, false); });
    monitors.clear();
    if (audioCtx) { try { audioCtx.close(); } catch {}; audioCtx = null; }
  };

  const getOrCreatePeer = (userId: string): PeerInfo => {
    const me = useAuthStore.getState().user?.id || '';
    let info = peers.get(userId);
    if (info) {
      console.log('♻️ Reusing existing peer connection for:', userId);
      return info;
    }

    console.log('🆕 Creating new peer connection for:', userId);
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    // Chỉ add video transceiver khi thực sự cần (khi có video stream)
    // pc.addTransceiver('video', { direction: 'sendrecv' });

    const polite = me < userId;
    info = { pc, makingOffer: false, ignoreOffer: false, polite };
    peers.set(userId, info);
    
    // Thêm connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state for', userId, ':', pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.warn('❌ Connection failed for', userId, '- attempting to reconnect');
        // Có thể thêm logic reconnect ở đây
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE connection state for', userId, ':', pc.iceConnectionState);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && get().joinedChannelId) {
        webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, { candidate: e.candidate });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (!isStable(pc)) return;
        ensureLocalTracks(pc);
        info!.makingOffer = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (get().joinedChannelId) {
          webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
        }
      } catch (err) {
        console.warn('onnegotiationneeded failed:', err);
      } finally {
        info!.makingOffer = false;
      }
    };

    pc.ontrack = (e) => {
      console.log('📺 Received track from:', userId, 'kind:', e.track.kind);
      
      if (e.track.kind === 'audio') {
        console.log('🎵 Received audio track from:', userId);
        const audioId = `voice-audio-${userId}`;
        let el = document.getElementById(audioId) as HTMLAudioElement | null;
        if (!el) {
          el = document.createElement('audio');
          el.id = audioId;
          el.autoplay = true;
          el.setAttribute('playsinline', 'true');
          el.muted = false;
          el.volume = 1;
          document.body.appendChild(el);
        }
        el.srcObject = e.streams[0];
        
        // Đảm bảo audio được phát ngay lập tức với retry mechanism
        const playAudio = async (retryCount = 0) => {
          try {
            await el!.play();
            console.log('✅ Audio playing for:', userId);
          } catch (err) {
            console.warn('❌ Audio play failed for', userId, 'retry:', retryCount, err);
            if (retryCount < 5) {
              // Retry với exponential backoff
              setTimeout(() => {
                playAudio(retryCount + 1);
              }, 200 * Math.pow(2, retryCount));
            }
          }
        };
        playAudio();
        
        monitorStream(userId, e.streams[0]);
      } else if (e.track.kind === 'video') {
        console.log('📹 Received video track from:', userId);
        const videoId = `voice-video-${userId}`;
        let el = document.getElementById(videoId) as HTMLVideoElement | null;
        if (!el) {
          el = document.createElement('video');
          el.id = videoId;
          el.autoplay = true;
          el.setAttribute('playsinline', 'true');
          el.style.display = 'none'; // Hidden, only used for streaming
          // Đặt trong pool cố định để dễ quan sát
          let pool = document.getElementById('voice-video-pool');
          if (!pool) {
            pool = document.createElement('div');
            pool.id = 'voice-video-pool';
            pool.style.position = 'fixed';
            pool.style.bottom = '0';
            pool.style.right = '0';
            pool.style.width = '0';
            pool.style.height = '0';
            pool.style.overflow = 'hidden';
            document.body.appendChild(pool);
          }
          pool.appendChild(el);
          console.log('📹 Created video element:', videoId);
        }
        // Một số trình duyệt fire ontrack với e.streams = [] trong lần đầu/renegotiation
        const stream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
        el.srcObject = stream;
        console.log('📹 Set video srcObject for:', userId, 'stream:', stream);

        // Fallback nhận diện stream màn hình qua track label (screen/window/display)
        try {
          const label = (e.track as MediaStreamTrack).label?.toLowerCase?.() || '';
          const looksLikeScreen = label.includes('screen') || label.includes('display') || label.includes('window');
          if (looksLikeScreen) {
            set((s) => ({
              streamingParticipants: { ...s.streamingParticipants, [userId]: true },
              videoParticipants: { ...s.videoParticipants, [userId]: true }
            }));
          }
        } catch {}

        // Cleanup khi track kết thúc
        try {
          e.track.onended = () => {
            const v = document.getElementById(videoId);
            if (v) v.parentElement?.removeChild(v);
            set((s) => ({
              videoParticipants: { ...s.videoParticipants, [userId]: false },
              streamingParticipants: { ...s.streamingParticipants, [userId]: false },
            }));
            console.log('📹 Video track ended for:', userId);
          };
        } catch {}

        // Update video participants state - chỉ khi thực sự có video track
        const videoTracks = stream.getVideoTracks ? stream.getVideoTracks() : [];
        if (videoTracks.length > 0) {
          set((s) => ({
            videoParticipants: {
              ...s.videoParticipants,
              [userId]: true
            }
          }));
          console.log('📹 Video track received from:', userId, 'videoParticipants updated');
        } else {
          console.log('📹 No video tracks in stream from:', userId);
        }
      }
    };

    ensureLocalTracks(pc);

    return info;
  };

  const ensureLocalTracks = (pc: RTCPeerConnection) => {
    // Add audio tracks
    if (localStream) {
      const hasAudioSender = pc.getSenders().some((s) => s.track && s.track.kind === 'audio');
      if (!hasAudioSender) {
        console.log('🎤 Adding local audio tracks to peer connection');
        localStream.getAudioTracks().forEach((t) => {
          try {
            pc.addTrack(t, localStream!);
            console.log('✅ Local audio track added successfully');
          } catch (err) {
            console.warn('❌ Failed to add audio track:', err);
          }
        });
      }
    }
    
    // Add video tracks
    if (localVideoStream) {
      const hasVideoSender = pc.getSenders().some((s) => s.track && s.track.kind === 'video');
      if (!hasVideoSender) {
        console.log('📹 Adding local video tracks to peer connection');
        
        // Thêm video transceiver nếu chưa có
        const hasVideoTransceiver = pc.getTransceivers().some(t => t.sender.track?.kind === 'video');
        if (!hasVideoTransceiver) {
          pc.addTransceiver('video', { direction: 'sendrecv' });
        }
        
        localVideoStream.getVideoTracks().forEach((t) => {
          try {
            pc.addTrack(t, localVideoStream!);
            console.log('✅ Local video track added successfully');
          } catch (err) {
            console.warn('❌ Failed to add video track:', err);
          }
        });
      }
    }
  };

  const handleSignal = async (data: { fromUserId: string; channelId: string; payload: any }) => {
    const state = get();
    if (state.joinedChannelId !== data.channelId) return;
    const from = data.fromUserId;
    console.log('📨 Received signal from:', from, 'type:', data.payload.type || 'candidate');
    
    const info = getOrCreatePeer(from);
    const pc = info.pc;

    try {
      if (data.payload.type === 'streaming_state') {
        const isStreaming = !!data.payload.streaming;
        set((s) => ({
          streamingParticipants: { ...s.streamingParticipants, [from]: isStreaming },
          videoParticipants: isStreaming ? { ...s.videoParticipants, [from]: true } : s.videoParticipants
        }));
        return;
      } else if (data.payload.type === 'offer') {
        console.log('📥 Processing offer from:', from);
        const offerCollision = info.makingOffer || !isStable(pc);
        info.ignoreOffer = !info.polite && offerCollision;
        if (info.ignoreOffer) {
          console.log('⚠️ Ignoring offer from:', from, 'due to collision');
          return;
        }

        if (offerCollision) {
          console.log('🔄 Rolling back due to offer collision');
          try { await pc.setLocalDescription({ type: 'rollback' } as any); } catch {}
        }
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
        ensureLocalTracks(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('📤 Sending answer to:', from);
        webSocketService.sendVoiceSignal(state.joinedChannelId!, from, answer);
      } else if (data.payload.type === 'answer') {
        console.log('📥 Processing answer from:', from);
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
      } else if (data.payload.candidate) {
        if (info.ignoreOffer) return;
        console.log('📥 Adding ICE candidate from:', from);
        try { await pc.addIceCandidate(new RTCIceCandidate(data.payload)); } catch {}
      }
    } catch (err) {
      console.warn('❌ Voice signaling error from', from, ':', err);
    }
  };

  const broadcastStreamingState = (isOn: boolean) => {
    const chId = get().joinedChannelId;
    if (!chId) return;
    // Gửi nhiều lần trong vài giây đầu để đảm bảo đến nơi
    const attempts = [0, 400, 1200];
    attempts.forEach((delay) => {
      setTimeout(() => {
        peers.forEach((info, userId) => {
          try { webSocketService.sendVoiceSignal(chId, userId, { type: 'streaming_state', streaming: isOn }); } catch {}
        });
      }, delay);
    });
  };

  const callAll = async (others: string[]) => {
    for (const userId of others) {
      try {
        console.log('🔗 Creating peer connection for:', userId);
        const { pc } = getOrCreatePeer(userId);
        if (!isStable(pc)) {
          console.log('⚠️ Peer connection not stable for:', userId);
          continue;
        }
        
        ensureLocalTracks(pc);
        
        // Đợi lâu hơn để local tracks hoàn toàn sẵn sàng
        await new Promise(r => setTimeout(r, 200));
        
        console.log('📡 Creating offer for:', userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (get().joinedChannelId) {
          console.log('📤 Sending offer to:', userId);
          webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
        }
      } catch (err) {
        console.warn('❌ createOffer/sendOffer failed for', userId, ':', err);
      }
    }
  };

  const applyMuteState = () => {
    if (!localStream) return;
    const { muted, deafened } = get();
    localStream.getAudioTracks().forEach((t) => (t.enabled = !muted && !deafened));
  };

  const cleanup = () => {
    peers.forEach(({ pc }) => pc.close());
    peers.clear();
    stopAllMonitors();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    if (localVideoStream) {
      localVideoStream.getTracks().forEach((t) => t.stop());
      localVideoStream = null;
    }
    document.querySelectorAll('audio[id^="voice-audio-"]').forEach((el) => el.parentElement?.removeChild(el));
    document.querySelectorAll('video[id^="voice-video-"]').forEach((el) => el.parentElement?.removeChild(el));
    cleanupGlobalState();
    // Reset streaming flags
    set((s) => ({ streamingParticipants: {} }));
  };

  const onParticipants = (data: { channelId: string; participants: string[] }) => {
    if (get().joinedChannelId !== data.channelId) return;
    console.log('👥 Voice participants received:', data.participants);
    set({ participants: data.participants });
    const me = useAuthStore.getState().user?.id;
    if (localStream && me) monitorStream(me, localStream);
    const others = data.participants.filter((p) => p !== me);
    
    // Đợi lâu hơn để local stream hoàn toàn sẵn sàng
    setTimeout(() => {
      console.log('📞 Calling all participants:', others);
      callAll(others);
    }, 300);
  };

  // Lắng nghe trạng thái mute/deafen từ người khác
  if (typeof window !== 'undefined') {
    try {
      webSocketService.onVoiceMute((data: { userId: string; channelId: string; muted: boolean }) => {
        if (get().joinedChannelId !== data.channelId) return;
        set((s) => ({ remoteMute: { ...s.remoteMute, [data.userId]: data.muted } }));
      });
      webSocketService.onVoiceDeafen((data: { userId: string; channelId: string; deafened: boolean }) => {
        if (get().joinedChannelId !== data.channelId) return;
        set((s) => ({ remoteDeafen: { ...s.remoteDeafen, [data.userId]: data.deafened } }));
      });
      webSocketService.onVoiceCamera((data: { userId: string; channelId: string; cameraOn: boolean }) => {
        if (get().joinedChannelId !== data.channelId) return;
        set((s) => ({
          videoParticipants: { ...s.videoParticipants, [data.userId]: data.cameraOn }
        }));
      });
      webSocketService.onVoiceStreaming((data: { userId: string; channelId: string; streaming: boolean }) => {
        if (get().joinedChannelId !== data.channelId) return;
        if (data.streaming) streamingUsers.add(data.userId); else streamingUsers.delete(data.userId);
        // Nếu đang stream, đảm bảo videoParticipants true để cho phép click xem
        set((s) => ({
          videoParticipants: { ...s.videoParticipants, [data.userId]: data.streaming || s.videoParticipants[data.userId] },
          streamingParticipants: { ...s.streamingParticipants, [data.userId]: data.streaming }
        }));
      });
    } catch {}
  }

  const onJoined = (data: { userId: string; channelId: string }) => {
    if (get().joinedChannelId !== data.channelId) return;
    console.log('👤 User joined voice:', data.userId);
    set((s) => ({ participants: Array.from(new Set([...s.participants, data.userId])) }));
    const me = useAuthStore.getState().user?.id;
    if (data.userId !== me) {
      // Đợi lâu hơn để local stream hoàn toàn sẵn sàng
      setTimeout(() => {
        console.log('📞 Calling new participant:', data.userId);
        callAll([data.userId]);
      }, 300);
    }
  };

  const onLeft = (data: { userId: string; channelId: string }) => {
    if (get().joinedChannelId !== data.channelId) return;
    set((s) => ({ participants: s.participants.filter((p) => p !== data.userId) }));
    const info = peers.get(data.userId);
    if (info) info.pc.close();
    peers.delete(data.userId);
    stopMonitor(data.userId);
    const el = document.getElementById(`voice-audio-${data.userId}`);
    if (el) el.parentElement?.removeChild(el);
    const videoEl = document.getElementById(`voice-video-${data.userId}`);
    if (videoEl) videoEl.parentElement?.removeChild(videoEl);
    
    // Remove from video participants
    set((s) => ({
      videoParticipants: {
        ...s.videoParticipants,
        [data.userId]: false
      }
    }));
    // Remove streaming flag for this user
    set((s) => ({
      streamingParticipants: {
        ...s.streamingParticipants,
        [data.userId]: false
      }
    }));
    
    console.log('📹 User left, removed from video participants:', data.userId);
  };

  // Local handler cho voice participants (chỉ dùng khi đang join voice)
  const onVoiceParticipantsUpdated = (data: { channelId: string; participants: string[] }) => {
    console.log('🎯 Local voice participants updated for channel:', data.channelId, data.participants);
    // Chỉ cập nhật nếu đang join voice channel này
    if (get().joinedChannelId === data.channelId) {
      set((s) => ({
        globalVoiceParticipants: {
          ...s.globalVoiceParticipants,
          [data.channelId]: data.participants
        }
      }));
    }
  };

  const cleanupGlobalState = () => {
    // KHÔNG xóa global voice participants khi cleanup
    // Giữ nguyên để users vẫn thấy được voice participants
    console.log('🧹 Cleanup called but preserving global voice participants');
  };

  return {
    joinedChannelId: null,
    participants: [],
    muted: false,
    deafened: false,
    speakingUsers: [],
    globalVoiceParticipants: {},
    cameraEnabled: false,
    streaming: false,
    videoStream: null,
    videoParticipants: {},
    remoteMute: {},
    remoteDeafen: {},
    streamingParticipants: {},

    joinVoice: async (channelId: string) => {
      if (isTransitioning) return; // tránh chồng lấn join
      const current = get().joinedChannelId;
      if (current === channelId) return;
      isTransitioning = true;

      // Rời kênh cũ hoàn toàn (nếu có)
      if (current) {
        try { webSocketService.leaveVoice(current); } catch {}
        webSocketService.offVoiceParticipants(onParticipants);
        webSocketService.offUserJoinedVoice(onJoined);
        webSocketService.offUserLeftVoice(onLeft);
        webSocketService.offVoiceSignal(handleSignal);
        webSocketService.offVoiceParticipantsUpdated(onVoiceParticipantsUpdated);
        // KHÔNG xóa globalVoiceParticipants khi chuyển channel
        // Reset camera state khi chuyển channel
        set({ 
          joinedChannelId: null, 
          participants: [], 
          speakingUsers: [],
          cameraEnabled: false,
          videoStream: null,
          videoParticipants: {}
        });
        cleanup();
        // Đợi lâu hơn để cleanup hoàn tất
        await new Promise(r => setTimeout(r, 300));
      }

      // Thiết lập kênh mới
      try {
        console.log('🎤 Getting user media...');
        localStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('✅ User media obtained');
        
        applyMuteState();
        set({ joinedChannelId: channelId, participants: [], speakingUsers: [] });

        // Setup listeners TRƯỚC khi join voice
        webSocketService.onVoiceParticipants(onParticipants);
        webSocketService.onUserJoinedVoice(onJoined);
        webSocketService.onUserLeftVoice(onLeft);
        webSocketService.onVoiceSignal(handleSignal);
        webSocketService.onVoiceParticipantsUpdated(onVoiceParticipantsUpdated);

        console.log('🔗 Joining voice channel:', channelId);
        webSocketService.joinVoice(channelId);
        
        // Đợi lâu hơn để WebSocket events được xử lý
        await new Promise(r => setTimeout(r, 500));
        console.log('✅ Voice channel joined successfully');
        
        // Force broadcast lại voice participants sau khi join
        setTimeout(() => {
          console.log('🔄 Force broadcasting current voice participants...');
          // Trigger một event để đảm bảo tất cả users nhận được update
          webSocketService.emit('request_voice_participants', { channelId });
        }, 1000);
      } catch (error) {
        console.error('❌ Failed to join voice channel:', error);
        cleanup();
        set({ joinedChannelId: null, participants: [], speakingUsers: [] });
      } finally {
        isTransitioning = false;
      }
    },

    leaveVoice: async () => {
      const ch = get().joinedChannelId;
      if (!ch) return;
      webSocketService.leaveVoice(ch);
      webSocketService.offVoiceParticipants(onParticipants);
      webSocketService.offUserJoinedVoice(onJoined);
      webSocketService.offUserLeftVoice(onLeft);
      webSocketService.offVoiceSignal(handleSignal);
      webSocketService.offVoiceParticipantsUpdated(onVoiceParticipantsUpdated);
      // KHÔNG xóa globalVoiceParticipants khi leave voice
      // Reset camera state khi leave voice
      set({ 
        joinedChannelId: null, 
        participants: [], 
        speakingUsers: [],
        cameraEnabled: false,
        videoStream: null,
        videoParticipants: {}
      });
      cleanup();
    },

    toggleMute: () => {
      set((s) => {
        const muted = !s.muted;
        const next = { muted } as Partial<VoiceState>;
        set(next as any);
        applyMuteState();
        // Broadcast mute to others
        const ch = get().joinedChannelId;
        if (ch) {
          try { webSocketService.sendVoiceMute(ch, muted); } catch {}
        }
        return { muted } as any;
      });
    },

    toggleDeafen: () => {
      set((s) => {
        const deafened = !s.deafened;
        const next = { deafened } as Partial<VoiceState>;
        set(next as any);
        applyMuteState();
        const ch = get().joinedChannelId;
        if (ch) {
          try { webSocketService.sendVoiceDeafen(ch, deafened); } catch {}
        }
        return { deafened } as any;
      });
    },

    toggleCamera: async () => {
      const state = get();
      const newCameraEnabled = !state.cameraEnabled;
      
      if (newCameraEnabled) {
        try {
          console.log('📹 Starting camera...');
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 }
            } 
          });
          localVideoStream = stream;
        // Đánh dấu chính mình có video
        const meId = useAuthStore.getState().user?.id;
        set((s) => ({ 
          cameraEnabled: true, 
          videoStream: stream,
          videoParticipants: meId ? { ...s.videoParticipants, [meId]: true } : s.videoParticipants
        }));
        const ch = get().joinedChannelId;
        if (ch && meId) {
          try { webSocketService.sendVoiceCamera(ch, true); } catch {}
        }
        
        // Add video track to all existing peer connections
        peers.forEach((info, userId) => {
          ensureLocalTracks(info.pc);
        });
        
        // Broadcast camera status to other users
        const me = useAuthStore.getState().user?.id;
        if (me && get().joinedChannelId) {
          // Đợi một chút để video track được thêm vào
          setTimeout(() => {
            // Trigger renegotiation để gửi video track
            peers.forEach((info, userId) => {
              if (info.pc.signalingState === 'stable') {
                info.pc.createOffer().then(offer => {
                  info.pc.setLocalDescription(offer);
                  webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
                }).catch(console.error);
              }
            });
          }, 500);
        }
          
          console.log('✅ Camera started successfully');
        } catch (error) {
          console.error('❌ Failed to start camera:', error);
        }
      } else {
        console.log('📹 Stopping camera...');
        if (localVideoStream) {
          localVideoStream.getTracks().forEach(track => track.stop());
          localVideoStream = null;
        }
        // Xóa trạng thái tự mình có video NGAY LẬP TỨC để không delay UI
        const meId = useAuthStore.getState().user?.id;
        set((s) => ({ 
          cameraEnabled: false, 
          videoStream: null,
          videoParticipants: meId ? { ...s.videoParticipants, [meId]: false } : s.videoParticipants
        }));
        const ch2 = get().joinedChannelId;
        if (ch2 && meId) {
          try { webSocketService.sendVoiceCamera(ch2, false); } catch {}
        }
        
        // Remove video tracks from all peer connections
        peers.forEach((info, userId) => {
          const senders = info.pc.getSenders();
          senders.forEach(sender => {
            if (sender.track && sender.track.kind === 'video') {
              info.pc.removeTrack(sender);
            }
          });
        });
        
        // Broadcast camera off status to other users
        const me = useAuthStore.getState().user?.id;
        if (me && get().joinedChannelId) {
          // Trigger renegotiation ngay để remove video track
          peers.forEach((info, userId) => {
            if (info.pc.signalingState === 'stable') {
              info.pc.createOffer().then(offer => {
                info.pc.setLocalDescription(offer);
                webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
              }).catch(console.error);
            }
          });
        }
        
        console.log('✅ Camera stopped');
      }
    },

    toggleStream: async () => {
      const state = get();
      const newStreaming = !state.streaming;
      const meId = useAuthStore.getState().user?.id;
      const channelId = state.joinedChannelId;

      if (newStreaming) {
        try {
          console.log('🖥️ Starting screen share...');
          const stream = await (navigator.mediaDevices as any).getDisplayMedia({
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 }
            },
            audio: false
          });

          // Khi người dùng dừng share trên UI của trình duyệt
          const [videoTrack] = stream.getVideoTracks();
          if (videoTrack) {
            videoTrack.onended = () => {
              // Tự động tắt stream khi user dừng share
              get().toggleStream();
            };
          }

          // Gán như video stream hiện tại (dùng chung cơ chế với camera)
          localVideoStream = stream;
          set((s) => ({
            streaming: true,
            // KHÔNG bật cameraEnabled khi đang share screen
            cameraEnabled: s.cameraEnabled,
            videoStream: stream,
            videoParticipants: meId ? { ...s.videoParticipants, [meId]: true } : s.videoParticipants,
            streamingParticipants: meId ? { ...s.streamingParticipants, [meId]: true } : s.streamingParticipants
          }));

          if (channelId && meId) {
            try { webSocketService.sendVoiceStreaming(channelId, true); } catch {}
          }

          // Add video track to existing peers và renegotiate
          peers.forEach((info) => {
            ensureLocalTracks(info.pc);
          });
          setTimeout(() => {
            peers.forEach((info, userId) => {
              if (info.pc.signalingState === 'stable') {
                info.pc.createOffer().then((offer) => {
                  info.pc.setLocalDescription(offer);
                  if (get().joinedChannelId) {
                    webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
                  }
                }).catch(console.error);
              }
            });
            // Phát trạng thái streaming (gửi lặp vài lần)
            broadcastStreamingState(true);
          }, 300);

          console.log('✅ Screen share started');
        } catch (err) {
          console.error('❌ Failed to start screen share:', err);
          set({ streaming: false });
        }
      } else {
        console.log('🖥️ Stopping screen share...');
        if (localVideoStream) {
          try { localVideoStream.getTracks().forEach((t) => t.stop()); } catch {}
          localVideoStream = null;
        }
        set((s) => ({
          streaming: false,
          // KHÔNG tắt cameraEnabled nếu user đang bật camera riêng
          cameraEnabled: s.cameraEnabled,
          videoStream: s.cameraEnabled ? s.videoStream : null,
          videoParticipants: meId ? { ...s.videoParticipants, [meId]: s.cameraEnabled } : s.videoParticipants,
          streamingParticipants: meId ? { ...s.streamingParticipants, [meId]: false } : s.streamingParticipants
        }));
        if (channelId && meId) {
          try { webSocketService.sendVoiceStreaming(channelId, false); } catch {}
        }

        // Loại video tracks khỏi peer connections và renegotiate
        peers.forEach((info) => {
          const senders = info.pc.getSenders();
          senders.forEach((sender) => {
            if (sender.track && sender.track.kind === 'video') {
              try { info.pc.removeTrack(sender); } catch {}
            }
          });
        });
        peers.forEach((info, userId) => {
          if (info.pc.signalingState === 'stable') {
            info.pc.createOffer().then((offer) => {
              info.pc.setLocalDescription(offer);
              if (get().joinedChannelId) {
                webSocketService.sendVoiceSignal(get().joinedChannelId!, userId, offer);
              }
            }).catch(console.error);
          }
        });
        broadcastStreamingState(false);
        console.log('✅ Screen share stopped');
      }
    },
  };
});
