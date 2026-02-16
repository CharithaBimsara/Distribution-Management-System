import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Complaint, CreateComplaintRequest } from '../../types/common.types';

export const supportApi = {
  // Customer
  customerCreateComplaint: (data: CreateComplaintRequest) =>
    api.post<ApiResponse<string>>('/customer/support/complaints', data),

  customerGetComplaints: () =>
    api.get<ApiResponse<Complaint[]>>('/customer/support/complaints'),

  // Admin
  adminGetComplaints: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Complaint>>>('/admin/support/complaints', { params }),

  adminUpdateStatus: (id: string, status: string) =>
    api.put<ApiResponse<string>>(`/admin/support/complaints/${id}/status`, status, {
      headers: { 'Content-Type': 'application/json' },
    }),
};
