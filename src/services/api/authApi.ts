import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { LoginRequest, AuthResponse, RegisterRequest, ChangePasswordRequest } from '../../types/auth.types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data),

  refreshToken: (refreshToken: string, accessToken: string) =>
    api.post<ApiResponse<AuthResponse>>('/auth/refresh-token', { accessToken, refreshToken }),

  changePassword: (data: ChangePasswordRequest) =>
    api.post<ApiResponse<string>>('/auth/change-password', data),

  logout: () =>
    api.post<ApiResponse<string>>('/auth/logout'),
};
