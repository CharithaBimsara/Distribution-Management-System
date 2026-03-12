import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Customer } from '../../types/customer.types';
import type {
  Coordinator,
  CreateCoordinatorRequest,
  UpdateCoordinatorRequest,
  CoordinatorDashboard,
  ApproveCustomerRequest,
  RejectCustomerRequest,
} from '../../types/coordinator.types';

// ===== Admin endpoints =====

export const adminGetAllCoordinators = async (page = 1, pageSize = 20, search?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  const { data } = await api.get<ApiResponse<PagedResult<Coordinator>>>(`/admin/coordinators?${params}`);
  return data.data;
};

export const adminGetCoordinator = async (id: string) => {
  const { data } = await api.get<ApiResponse<Coordinator>>(`/admin/coordinators/${id}`);
  return data.data;
};

export const adminCreateCoordinator = async (req: CreateCoordinatorRequest) => {
  const { data } = await api.post<ApiResponse<Coordinator>>('/admin/coordinators', req);
  return data.data;
};

export const adminUpdateCoordinator = async (id: string, req: UpdateCoordinatorRequest) => {
  const { data } = await api.put<ApiResponse<Coordinator>>(`/admin/coordinators/${id}`, req);
  return data.data;
};

export const adminAssignRepToCoordinator = async (coordinatorId: string, repId: string) => {
  const { data } = await api.post<ApiResponse<string>>(`/admin/coordinators/${coordinatorId}/assign-rep`, { repId });
  return data.data;
};

// ===== Coordinator own endpoints =====

export const coordinatorGetProfile = async () => {
  const { data } = await api.get<ApiResponse<Coordinator>>('/coordinator/profile');
  return data.data;
};

export const coordinatorGetDashboard = async () => {
  const { data } = await api.get<ApiResponse<CoordinatorDashboard>>('/coordinator/dashboard');
  return data.data;
};

export const coordinatorGetReps = async () => {
  const { data } = await api.get<ApiResponse<{ id: string; fullName: string; employeeCode: string; regionId?: string; regionName?: string; email?: string; phoneNumber?: string; isActive: boolean }[]>>('/coordinator/reps');
  return data.data;
};

export const coordinatorGetCustomers = async (page = 1, pageSize = 20, search?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  const { data } = await api.get<ApiResponse<PagedResult<Customer>>>(`/coordinator/customers?${params}`);
  return data.data;
};

export const coordinatorGetPendingApprovals = async (page = 1, pageSize = 20) => {
  const { data } = await api.get<ApiResponse<PagedResult<Customer>>>(`/coordinator/customers/pending?page=${page}&pageSize=${pageSize}`);
  return data.data;
};

export const coordinatorApproveCustomer = async (customerId: string, req: ApproveCustomerRequest) => {
  const { data } = await api.post<ApiResponse<Customer>>(`/coordinator/customers/${customerId}/approve`, req);
  return data.data;
};

export const coordinatorRejectCustomer = async (customerId: string, req: RejectCustomerRequest) => {
  const { data } = await api.post<ApiResponse<string>>(`/coordinator/customers/${customerId}/reject`, req);
  return data.data;
};
