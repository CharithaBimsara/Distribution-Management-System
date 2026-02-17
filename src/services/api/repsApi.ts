import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { RepPerformance, SalesTarget, Visit, Route } from '../../types/common.types';

export interface Rep {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  territory?: string;
  isActive: boolean;
  createdAt: string;
}

export const repsApi = {
  // Admin
  adminGetAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Rep>>>('/admin/reps', { params }),

  adminGetById: (id: string) =>
    api.get<ApiResponse<Rep>>(`/admin/reps/${id}`),

  adminCreate: (data: { username: string; email: string; password: string; fullName: string; phoneNumber?: string; territory?: string }) =>
    api.post<ApiResponse<Rep>>('/admin/reps', data),

  adminUpdate: (id: string, data: { fullName?: string; phoneNumber?: string; territory?: string; isActive?: boolean }) =>
    api.put<ApiResponse<Rep>>(`/admin/reps/${id}`, data),

  adminGetPerformance: (id: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<RepPerformance>>(`/admin/reps/${id}/performance`, { params }),

  adminGetLeaderboard: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<RepPerformance[]>>('/admin/reps/leaderboard', { params }),

  adminSetTarget: (repId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<SalesTarget>>(`/admin/reps/${repId}/targets`, data),

  adminGetRoutes: () =>
    api.get<ApiResponse<Route[]>>('/admin/routes'),

  adminCreateRoute: (data: { name: string; description?: string; repId: string; daysOfWeek: string; estimatedDurationMinutes: number }) =>
    api.post<ApiResponse<Route>>('/admin/routes', data),

  adminAddCustomerToRoute: (routeId: string, data: { customerId: string; visitOrder: number; visitFrequency?: string }) =>
    api.post<ApiResponse<string>>(`/admin/routes/${routeId}/customers`, data),

  adminAssignRoute: (routeId: string, data: { repId: string }) =>
    api.post<ApiResponse<string>>(`/admin/routes/${routeId}/assign`, data),

  adminDeleteRoute: (routeId: string) =>
    api.delete<ApiResponse<string>>(`/admin/routes/${routeId}`),

  // Rep self
  repGetProfile: () =>
    api.get<ApiResponse<unknown>>('/rep/profile'),

  repGetRoutes: () =>
    api.get<ApiResponse<Route[]>>('/rep/routes'),

  repGetTodayVisits: () =>
    api.get<ApiResponse<Visit[]>>('/rep/visits/today'),

  repCheckIn: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Visit>>('/rep/visits/check-in', data),

  repCheckOut: (visitId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<Visit>>(`/rep/visits/${visitId}/check-out`, data),

  repGetPerformance: () =>
    api.get<ApiResponse<RepPerformance>>('/rep/performance'),

  repGetTargets: () =>
    api.get<ApiResponse<SalesTarget[]>>('/rep/targets'),

  repGetLeaderboard: () =>
    api.get<ApiResponse<RepPerformance[]>>('/rep/leaderboard'),
};
