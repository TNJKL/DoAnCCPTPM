import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api.service';
import { webSocketService } from '../services/websocket.service';
import toast from 'react-hot-toast';
import { useServerMembersStore } from './serverMembersStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiService.login(credentials);
          
          // Store token and user data
          apiService.setAuthToken(response.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // Connect to WebSocket
          webSocketService.connect(response.access_token);

          // Đăng ký listener đồng bộ trạng thái người dùng (tránh đăng ký trùng khi HMR)
          try {
            if (typeof window !== 'undefined') {
              (window as any).__presence_listener__ = (window as any).__presence_listener__ || false;
              if (!(window as any).__presence_listener__) {
                (window as any).__presence_listener__ = true;
                webSocketService.onUserStatusUpdate(({ userId, status }) => {
                  const current = useAuthStore.getState().user;
                  // Cập nhật userSelfPanel nếu là chính mình
                  if (current && current.id === userId) {
                    useAuthStore.setState({ user: { ...current, status: status as any } });
                    try { localStorage.setItem('user', JSON.stringify({ ...current, status })); } catch {}
                  }
                  // Cập nhật UserSidebar
                  try { useServerMembersStore.getState().updateMemberStatus(userId, status as any); } catch {}
                });
              }
            }
          } catch {}
          
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          toast.success('Đăng nhập thành công!');
        } catch (error: any) {
          const status = error?.response?.status;
          const backendMessage = error?.response?.data?.message;
          const normalized401 = 'Tài khoản hoặc mật khẩu không chính xác';
          const errorMessage = status === 401
            ? normalized401
            : (backendMessage || 'Đăng nhập thất bại');
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (userData: RegisterRequest) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await apiService.register(userData);
          
          // Store token and user data
          apiService.setAuthToken(response.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));
          
          // Connect to WebSocket
          webSocketService.connect(response.access_token);
          
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: false, // Don't authenticate until email is verified
            isLoading: false,
            error: null,
          });
          
          toast.success('Đăng ký thành công! Vui lòng xác thực email để tiếp tục.');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Đăng ký thất bại';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: async () => {
        try {
          // Disconnect WebSocket
          webSocketService.disconnect();
          
          // Call logout API
          await apiService.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear local storage and state
          apiService.removeAuthToken();
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          toast.success('Đăng xuất thành công!');
        }
      },

      refreshToken: async () => {
        try {
          const response = await apiService.refreshToken();
          
          apiService.setAuthToken(response.access_token);
          
          set({
            token: response.access_token,
          });
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
        }
      },

      updateProfile: async (userData: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });
          
          const updatedUser = await apiService.updateProfile(userData);
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          toast.success('Cập nhật profile thành công!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Cập nhật profile thất bại';
          set({
            isLoading: false,
            error: errorMessage,
          });
          toast.error(errorMessage);
          throw error;
        }
      },

      updateStatus: async (status: string) => {
        try {
          const current = get().user;
          if (!current) throw new Error('Not authenticated');
          const updatedUser = await apiService.updateStatus(current.id, status);
          
          set({
            user: updatedUser,
          });
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));

          // Đồng bộ ngay với UserSidebar để hiển thị tức thời
          try { useServerMembersStore.getState().updateMemberStatus(updatedUser.id, updatedUser.status as any); } catch {}
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || 'Cập nhật status thất bại';
          toast.error(errorMessage);
          throw error;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state from localStorage
export const initializeAuth = () => {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      // Validate JWT token format
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if payload.sub is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (payload.sub && uuidRegex.test(payload.sub)) {
          const user = JSON.parse(userStr);
          useAuthStore.setState({
            user,
            token,
            isAuthenticated: user.email_verified || false, // Only authenticate if email is verified
          });
          
          // Connect to WebSocket
          webSocketService.connect(token);
        } else {
          console.warn('Invalid UUID in JWT token, clearing auth data');
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          localStorage.removeItem('auth-storage');
        }
      } else {
        console.warn('Invalid JWT format, clearing auth data');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
    }
  }
};
