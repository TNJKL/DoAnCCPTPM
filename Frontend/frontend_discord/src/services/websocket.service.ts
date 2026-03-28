import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  // Persistent listeners so subscribers can register before socket connects
  private textNotificationListeners: Set<(data: any) => void> = new Set();
  private dmListeners: Set<(dm: any) => void> = new Set();
  private newMessageListeners: Set<(message: Message) => void> = new Set();
  private pendingTextNotifications: any[] = [];

  connect(token: string): void {
    console.log('🔌 Attempting WebSocket connection...');
    
    // Prevent creating multiple socket instances
    if (this.socket) {
      if (this.socket.connected) {
        console.log('✅ WebSocket already connected');
        return;
      }
      // Reuse existing socket instance if it was created but not connected yet
      try {
        (this.socket as any).auth = { token };
        this.socket.connect();
        console.log('♻️ Reusing existing socket instance and reconnecting');
        return;
      } catch {}
    }

    // Validate JWT token format before connecting
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!payload.sub || !uuidRegex.test(payload.sub)) {
          console.warn('❌ Invalid UUID in JWT token, not connecting WebSocket');
          return;
        }
        console.log('✅ JWT token validated');
      } else {
        console.warn('❌ Invalid JWT format, not connecting WebSocket');
        return;
      }
    } catch (error) {
      console.warn('❌ Error validating JWT token, not connecting WebSocket:', error);
      return;
    }

    const wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3000';
    console.log('🌐 Connecting to WebSocket URL:', wsUrl);
    
    this.socket = io(wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      // Explicitly ask backend to ensure we are in all server rooms
      try { this.socket?.emit('join_all_servers'); } catch {}
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
    });

    // Add debug listener for all events
    this.socket.onAny((event, ...args) => {
      console.log(`🔍 WebSocket event received: ${event}`, args);
    });

    this.socket.on('rooms_info', (data) => {
      console.log('🧩 Rooms info:', data);
    });

    // Bridge server events to persistent listener sets
    this.socket.on('new_message', (message: Message) => {
      try {
        this.newMessageListeners.forEach((cb) => cb(message));
        console.log('📨 Received new_message event:', message);
      } catch (e) {
        console.error('Error dispatching new_message:', e);
      }
    });

    this.socket.on('text_message_notification', (data) => {
      try {
        if (this.textNotificationListeners.size === 0) {
          // Buffer if no listeners yet
          this.pendingTextNotifications.push(data);
        } else {
          this.textNotificationListeners.forEach((cb) => cb(data));
        }
      } catch (e) {
        console.error('Error dispatching text_message_notification:', e);
      }
    });

    this.socket.on('new_dm', (dm) => {
      try {
        this.dmListeners.forEach((cb) => cb(dm));
      } catch (e) {
        console.error('Error dispatching new_dm:', e);
      }
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Channel events
  joinChannel(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_channel', { channelId });
    }
  }

  leaveChannel(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_channel', { channelId });
    }
  }

  // Message events
  sendMessage(data: {
    channelId: string;
    content: string;
    messageType?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
  }): void {
    console.log('📤 Sending message via WebSocket:', data);
    
    if (!this.socket) {
      console.error('❌ Socket not initialized');
      return;
    }
    
    if (!this.isConnected) {
      console.error('❌ WebSocket not connected, cannot send message');
      console.log('🔍 Connection status:', {
        socket: !!this.socket,
        connected: this.isConnected,
        socketConnected: this.socket?.connected
      });
      return;
    }
    
    try {
      this.socket.emit('send_message', data);
      console.log('✅ Message sent via WebSocket');
    } catch (error) {
      console.error('❌ Error sending message via WebSocket:', error);
    }
  }

  // Direct messages
  sendDirectMessage(data: { receiverId: string; content: string }): void {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit('send_direct_message', data);
  }

  onNewDirectMessage(callback: (dm: any) => void): void {
    this.dmListeners.add(callback);
    // If socket already exists, no-op because setupEventListeners bridges events
  }

  offNewDirectMessage(callback: (dm: any) => void): void {
    this.dmListeners.delete(callback);
  }

  onNewMessage(callback: (message: Message) => void): void {
    this.newMessageListeners.add(callback);
  }

  offNewMessage(callback: (message: Message) => void): void {
    this.newMessageListeners.delete(callback);
  }

  // Text message notifications
  onTextMessageNotification(callback: (data: {
    channelId: string;
    channelName: string;
    senderId: string;
    senderUsername: string;
    content: string;
    serverId: string;
    serverName: string;
    messageId: string;
  }) => void): void {
    console.log('🎧 Registering text_message_notification callback');
    this.textNotificationListeners.add(callback);
    // Flush any pending notifications for late subscribers
    if (this.pendingTextNotifications.length > 0) {
      const queued = [...this.pendingTextNotifications];
      this.pendingTextNotifications = [];
      queued.forEach((d) => {
        try { callback(d); } catch {}
      });
    }
  }

  offTextMessageNotification(callback: (data: {
    channelId: string;
    channelName: string;
    senderId: string;
    senderUsername: string;
    content: string;
    serverId: string;
    serverName: string;
    messageId: string;
  }) => void): void {
    console.log('🔇 Unregistering text_message_notification callback');
    this.textNotificationListeners.delete(callback);
  }

  // User status update listeners
  onUserStatusUpdate(callback: (data: { userId: string; status: string }) => void): void {
    console.log('🎧 Setting up user_status_update listener');
    if (this.socket) {
      this.socket.on('user_status_update', (data) => {
        console.log('👤 Received user_status_update event:', data);
        callback(data);
      });
    } else {
      console.error('❌ Socket not available for user_status_update listener');
    }
  }

  offUserStatusUpdate(callback: (data: { userId: string; status: string }) => void): void {
    console.log('🔇 Removing user_status_update listener');
    if (this.socket) {
      this.socket.off('user_status_update', callback);
    }
  }

  // Typing events
  startTyping(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { channelId });
    }
  }

  stopTyping(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { channelId });
    }
  }

  onUserTyping(callback: (data: { userId: string; username: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  offUserTyping(callback: (data: { userId: string; username: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  onUserStopTyping(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_stop_typing', callback);
    }
  }

  offUserStopTyping(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.off('user_stop_typing', callback);
    }
  }

  // Voice events
  joinVoice(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_voice', { channelId });
    }
  }

  leaveVoice(channelId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_voice', { channelId });
    }
  }

  sendVoiceSignal(channelId: string, targetUserId: string, payload: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_signal', { channelId, targetUserId, payload });
    }
  }

  onVoiceSignal(callback: (data: { fromUserId: string; channelId: string; payload: any }) => void): void {
    if (this.socket) this.socket.on('voice_signal', callback);
  }

  offVoiceSignal(callback: (data: { fromUserId: string; channelId: string; payload: any }) => void): void {
    if (this.socket) this.socket.off('voice_signal', callback);
  }

  onVoiceParticipants(callback: (data: { channelId: string; participants: string[] }) => void): void {
    if (this.socket) this.socket.on('voice_participants', callback);
  }

  offVoiceParticipants(callback: (data: { channelId: string; participants: string[] }) => void): void {
    if (this.socket) this.socket.off('voice_participants', callback);
  }

  onUserJoinedVoice(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_joined_voice', callback);
    }
  }

  offUserJoinedVoice(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.off('user_joined_voice', callback);
    }
  }

  onUserLeftVoice(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.on('user_left_voice', callback);
    }
  }

  offUserLeftVoice(callback: (data: { userId: string; channelId: string }) => void): void {
    if (this.socket) {
      this.socket.off('user_left_voice', callback);
    }
  }

  onVoiceParticipantsUpdated(callback: (data: { channelId: string; participants: string[] }) => void): void {
    if (this.socket) {
      this.socket.on('voice_participants_updated', callback);
    }
  }

  offVoiceParticipantsUpdated(callback: (data: { channelId: string; participants: string[] }) => void): void {
    if (this.socket) {
      this.socket.off('voice_participants_updated', callback);
    }
  }

  // Voice mute/deafen broadcast
  sendVoiceMute(channelId: string, muted: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_mute', { channelId, muted });
    }
  }

  onVoiceMute(callback: (data: { userId: string; channelId: string; muted: boolean }) => void): void {
    if (this.socket) this.socket.on('voice_mute', callback);
  }

  offVoiceMute(callback: (data: { userId: string; channelId: string; muted: boolean }) => void): void {
    if (this.socket) this.socket.off('voice_mute', callback);
  }

  sendVoiceDeafen(channelId: string, deafened: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_deafen', { channelId, deafened });
    }
  }
  onVoiceDeafen(callback: (data: { userId: string; channelId: string; deafened: boolean }) => void): void {
    if (this.socket) this.socket.on('voice_deafen', callback);
  }
  offVoiceDeafen(callback: (data: { userId: string; channelId: string; deafened: boolean }) => void): void {
    if (this.socket) this.socket.off('voice_deafen', callback);
  }

  sendVoiceCamera(channelId: string, cameraOn: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_camera', { channelId, cameraOn });
    }
  }
  onVoiceCamera(callback: (data: { userId: string; channelId: string; cameraOn: boolean }) => void): void {
    if (this.socket) this.socket.on('voice_camera', callback);
  }
  offVoiceCamera(callback: (data: { userId: string; channelId: string; cameraOn: boolean }) => void): void {
    if (this.socket) this.socket.off('voice_camera', callback);
  }

  // Voice streaming (screen share) broadcast
  sendVoiceStreaming(channelId: string, streaming: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('voice_streaming', { channelId, streaming });
    }
  }
  onVoiceStreaming(callback: (data: { userId: string; channelId: string; streaming: boolean }) => void): void {
    if (this.socket) this.socket.on('voice_streaming', callback);
  }
  offVoiceStreaming(callback: (data: { userId: string; channelId: string; streaming: boolean }) => void): void {
    if (this.socket) this.socket.off('voice_streaming', callback);
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Generic event listeners
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Reaction events
  addReaction(messageId: string, emoji: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('add_reaction', { messageId, emoji });
    }
  }

  removeReaction(messageId: string, emoji: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('remove_reaction', { messageId, emoji });
    }
  }

  onReactionAdded(callback: (data: { messageId: string; reaction: any }) => void): void {
    if (this.socket) {
      this.socket.on('reaction_added', callback);
    }
  }

  onReactionRemoved(callback: (data: { messageId: string; emoji: string; userId: string }) => void): void {
    if (this.socket) {
      this.socket.on('reaction_removed', callback);
    }
  }

  offReactionAdded(callback: (data: { messageId: string; reaction: any }) => void): void {
    if (this.socket) {
      this.socket.off('reaction_added', callback);
    }
  }

  offReactionRemoved(callback: (data: { messageId: string; emoji: string; userId: string }) => void): void {
    if (this.socket) {
      this.socket.off('reaction_removed', callback);
    }
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
