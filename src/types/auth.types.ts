export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  role: number;
  fullName?: string;
  shopName?: string;
  location?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: 'Admin' | 'SalesRep' | 'Customer';
  isActive: boolean;
  lastLoginAt?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
