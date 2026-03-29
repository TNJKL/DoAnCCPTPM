import { create } from 'zustand';
import { Message, Channel, Reaction } from '../types';
import { apiService } from '../services/api.service';
import { webSocketService } from '../services/websocket.service';

interface ChatState {
  currentChannel: Channel | null;
  messages: Message[];
  typingUsers: { [channelId: string]: string[] };
  isLoading: boolean;
  hasMoreMessages: boolean;
  currentPage: number;
}

interface ChatActions {
  setCurrentChannel: (channel: Channel | null) => void;
  loadMessages: (channelId: string, page?: number) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string, messageType?: string, fileData?: any) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  addReaction: (messageId: string, reaction: Reaction) => void;
  removeReaction: (messageId: string, emoji: string, userId: string) => void;
  startTyping: () => void;
  stopTyping: () => void;
  addTypingUser: (channelId: string, userId: string) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  clearTypingUsers: (channelId: string) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
  deduplicateMessages: () => void;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  currentChannel: null,
  messages: [],
  typingUsers: {},
  isLoading: false,
  hasMoreMessages: true,
  currentPage: 1,

  // Actions
  setCurrentChannel: (channel: Channel | null) => {
    const { currentChannel } = get();
    
    // Leave previous channel
    if (currentChannel) {
      webSocketService.leaveChannel(currentChannel.id);
    }
    
    // Join new channel
    if (channel) {
      webSocketService.joinChannel(channel.id);
    }
    
    set({
      currentChannel: channel,
      messages: [],
      typingUsers: {},
      hasMoreMessages: true,
      currentPage: 1,
    });

    // Lưu currentChannelId để các component khác có thể biết đang ở channel nào
    if (channel) {
      try {
        localStorage.setItem('currentChannelId', channel.id);
        sessionStorage.setItem('currentChannelId', channel.id);
        sessionStorage.setItem('channelActiveFlag', '1');
        
        // Clear unread count khi vào channel
        const { useTextChannelUnreadStore } = require('./textChannelUnreadStore');
        useTextChannelUnreadStore.getState().clearUnread(channel.id);
      } catch (error) {
        console.warn('Could not save currentChannelId to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('currentChannelId');
        sessionStorage.removeItem('currentChannelId');
        sessionStorage.removeItem('channelActiveFlag');
      } catch (error) {
        console.warn('Could not remove currentChannelId from localStorage:', error);
      }
    }
    
    // Load messages for new channel
    if (channel) {
      get().loadMessages(channel.id);
    }
  },

  loadMessages: async (channelId: string, page: number = 1) => {
    try {
      set({ isLoading: true });
      
      const response = await apiService.getMessages(channelId, page, 50);
      
      // Backend returns { messages: [...], pagination: {...} }
      const messages = response.messages || [];
      
      set((state) => ({
        messages: page === 1 ? messages : [...messages, ...state.messages],
        hasMoreMessages: messages.length === 50,
        currentPage: page,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ isLoading: false });
    }
  },

  loadMoreMessages: async () => {
    const { currentChannel, currentPage, hasMoreMessages } = get();
    
    if (!currentChannel || !hasMoreMessages) return;
    
    await get().loadMessages(currentChannel.id, currentPage + 1);
  },

  sendMessage: async (content: string, messageType: string = 'text', fileData?: any) => {
    const { currentChannel } = get();
    
    console.log('📝 ChatStore sendMessage called:', { content, messageType, currentChannel });
    
    if (!currentChannel) {
      console.error('❌ No current channel selected');
      return;
    }
    
    try {
      const messageData: any = {
        content,
        message_type: messageType,
      };
      
      if (fileData) {
        messageData.file_url = fileData.url;
        messageData.file_name = fileData.name;
        messageData.file_size = fileData.size;
      }
      
      console.log('📤 Sending message data:', messageData);
      
      // Send via WebSocket for real-time delivery
      webSocketService.sendMessage({
        channelId: currentChannel.id,
        ...messageData,
      });
      
      console.log('✅ Message sent via WebSocket');
      
      // Note: Message will be added to store via WebSocket 'new_message' event
      // No need to call API here as WebSocket handles the backend call
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      const updatedMessage = await apiService.editMessage(messageId, content);
      
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId ? updatedMessage : msg
        ),
      }));
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await apiService.deleteMessage(messageId);
      
      set((state) => ({
        messages: state.messages.filter((msg) => msg.id !== messageId),
      }));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  },

  addMessage: (message: Message) => {
    console.log('📨 Adding message to store:', message.id);
    
    set((state) => {
      // Check if message already exists to prevent duplicates
      const messageExists = state.messages.some(msg => msg.id === message.id);
      
      if (messageExists) {
        console.log('⚠️ Message already exists, skipping:', message.id);
        return state;
      }
      
      console.log('✅ Adding new message:', message.id);
      return {
        messages: [...state.messages, message],
      };
    });
  },

  updateMessage: (messageId: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      ),
    }));
  },

  removeMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== messageId),
    }));
  },

  startTyping: () => {
    const { currentChannel } = get();
    if (currentChannel) {
      webSocketService.startTyping(currentChannel.id);
    }
  },

  stopTyping: () => {
    const { currentChannel } = get();
    if (currentChannel) {
      webSocketService.stopTyping(currentChannel.id);
    }
  },

  addTypingUser: (channelId: string, userId: string) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: [...(state.typingUsers[channelId] || []), userId],
      },
    }));
  },

  removeTypingUser: (channelId: string, userId: string) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: (state.typingUsers[channelId] || []).filter((id) => id !== userId),
      },
    }));
  },

  clearTypingUsers: (channelId: string) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [channelId]: [],
      },
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  reset: () => {
    set({
      currentChannel: null,
      messages: [],
      typingUsers: {},
      isLoading: false,
      hasMoreMessages: true,
      currentPage: 1,
    });
  },

  // Helper function to deduplicate messages
  deduplicateMessages: () => {
    set((state) => {
      const uniqueMessages = state.messages.filter((message, index, self) => 
        index === self.findIndex(m => m.id === message.id)
      );
      
      if (uniqueMessages.length !== state.messages.length) {
        console.log(`🧹 Deduplicated messages: ${state.messages.length} → ${uniqueMessages.length}`);
        return {
          ...state,
          messages: uniqueMessages,
        };
      }
      
      return state;
    });
  },

  addReaction: (messageId: string, reaction: Reaction) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          // Check if reaction already exists
          const reactionExists = existingReactions.some(r => 
            r.id === reaction.id || (r.emoji === reaction.emoji && r.user_id === reaction.user_id)
          );
          
          if (!reactionExists) {
            return {
              ...msg,
              reactions: [...existingReactions, reaction],
            };
          }
        }
        return msg;
      }),
    }));
  },

  removeReaction: (messageId: string, emoji: string, userId: string) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          return {
            ...msg,
            reactions: existingReactions.filter(r => 
              !(r.emoji === emoji && r.user_id === userId)
            ),
          };
        }
        return msg;
      }),
    }));
  },
}));
