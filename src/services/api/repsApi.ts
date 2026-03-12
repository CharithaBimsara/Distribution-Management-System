import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { RepPerformance, SalesTarget, Visit, Route, AdHocVisitRequest, RouteProgress } from '../../types/common.types';

export interface Rep {
  id: string;
  userId: string;
  fullName: string;
  employeeCode: string;
  hireDate: string;
  regionId?: string;
  regionName?: string;
  subRegionId?: string;
  subRegionName?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  assignedCustomersCount?: number;
  email?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
}

export const repsApi = {
  // Admin
  adminGetAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Rep>>>('/admin/reps', { params }),

  adminGetById: (id: string) =>
    api.get<ApiResponse<Rep>>(`/admin/reps/${id}`),

  adminCreate: (data: { username: string; email: string; password: string; fullName: string; phoneNumber?: string; employeeCode?: string; hireDate?: string; regionId?: string; subRegionId?: string; coordinatorId?: string }) =>
    api.post<ApiResponse<Rep>>('/admin/reps', data),

  adminUpdate: (id: string, data: { fullName?: string; phoneNumber?: string; regionId?: string; subRegionId?: string; coordinatorId?: string; isActive?: boolean }) =>
    api.put<ApiResponse<Rep>>(`/admin/reps/${id}`, data),

  adminGetPerformance: (id: string, params?: Record<string, unknown>) =>
    api.get<ApiResponse<RepPerformance>>(`/admin/reps/${id}/performance`, { params }),

  adminSetTarget: (repId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<SalesTarget>>(`/admin/reps/${repId}/targets`, data),

  adminGetTargets: (repId: string) =>
    api.get<ApiResponse<SalesTarget[]>>(`/admin/reps/${repId}/targets`),

  adminDeleteTarget: (targetId: string) =>
    api.delete<ApiResponse<string>>(`/admin/targets/${targetId}`),

  adminCreateRoute: (data: { name: string; description?: string; repId?: string; daysOfWeek?: string; estimatedDurationMinutes?: number }) =>
    api.post<ApiResponse<Route>>('/admin/routes', data),

  adminGetRouteProgress: () =>
    api.get<ApiResponse<RouteProgress[]>>('/admin/routes/progress/today'),

  // Rep self
  repGetProfile: () =>
    api.get<ApiResponse<unknown>>('/rep/profile'),

  repGetRoutes: () =>
    api.get<ApiResponse<Route[]>>('/rep/routes'),

  repGetRoute: (id: string) =>
    api.get<ApiResponse<Route>>(`/rep/routes/${id}`),

  repGetTodayVisits: () =>
    api.get<ApiResponse<Visit[]>>('/rep/visits/today'),

  repGetVisit: (id: string) =>
    api.get<ApiResponse<Visit>>(`/rep/visits/${id}`),

  repAddAdHocVisit: (data: AdHocVisitRequest) =>
    api.post<ApiResponse<Visit>>('/rep/visits/ad-hoc', data),

  repCheckIn: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Visit>>('/rep/visits/check-in', data),

  repCheckOut: (visitId: string, data: Record<string, unknown>) =>
    api.post<ApiResponse<Visit>>(`/rep/visits/${visitId}/check-out`, data),

  repCancelVisit: (visitId: string) =>
    api.delete<ApiResponse<string>>(`/rep/visits/${visitId}`),

  repGetPerformance: () =>
    api.get<ApiResponse<RepPerformance>>('/rep/performance'),

  repGetTargets: () =>
    api.get<ApiResponse<SalesTarget[]>>('/rep/targets'),
};
