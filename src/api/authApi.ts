import { apiClient } from './client';
import { ApiResponse, AuthResponse, GoogleLoginPayload, LoginPayload, RegisterPayload, RegisterResponse } from '@/types/api';

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<ApiResponse<RegisterResponse>>('/auth/register', payload);
    return data.data;
  },
  login: async (payload: LoginPayload) => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    return data.data;
  },
  googleLogin: async (payload: GoogleLoginPayload) => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/google', payload);
    return data.data;
  },
  refresh: async (refreshToken: string) => {
    const { data } = await apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string; expiresAt: string }>>('/auth/refresh', {
      refreshToken,
    });
    return data.data;
  },
  forgotPassword: async (email: string) => {
    await apiClient.post('/auth/forgot-password', { email });
  },
  resetPassword: async (email: string, token: string, newPassword: string) => {
    await apiClient.post('/auth/reset-password', { email, token, newPassword });
  },
  verifyEmail: async (email: string, code: string) => {
    await apiClient.post('/auth/verify-email', { email, code });
  },
  resendVerification: async (email: string) => {
    await apiClient.post('/auth/resend-verification', { email });
  },
  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
  },
  deleteAccount: async () => {
    await apiClient.delete('/user/me');
  },
};
