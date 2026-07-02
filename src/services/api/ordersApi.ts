import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Order, OrderFilterRequest, CreateOrderRequest, UpdateOrderStatusRequest, RateOrderRequest } from '../../types/order.types';

export const ordersApi = {
  // Admin
  adminGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/admin/orders', { params }),

  adminGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/admin/orders/${id}`),

  adminApprove: (id: string) =>
    api.post<ApiResponse<Order>>(`/admin/orders/${id}/approve`),

  adminReject: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/admin/orders/${id}/reject`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  adminUpdateStatus: (id: string, data: UpdateOrderStatusRequest) =>
    api.put<ApiResponse<Order>>(`/admin/orders/${id}/status`, data),

  adminDelete: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/orders/${id}`),

  adminGetTrash: (page = 1, pageSize = 20) =>
    api.get<ApiResponse<PagedResult<Order>>>('/admin/orders/trash', { params: { page, pageSize } }),

  adminRestore: (id: string) =>
    api.post<ApiResponse<string>>(`/admin/orders/${id}/restore`),

  // Rep
  repCreate: (data: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>('/rep/orders', data),

  repGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/rep/orders', { params }),

  repGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/rep/orders/${id}`),

  repDelete: (id: string) =>
    api.delete<ApiResponse<void>>(`/rep/orders/${id}`),

  repGetTrash: (page = 1, pageSize = 20) =>
    api.get<ApiResponse<PagedResult<Order>>>('/rep/orders/trash', { params: { page, pageSize } }),

  repRestore: (id: string) =>
    api.post<ApiResponse<string>>(`/rep/orders/${id}/restore`),

  repCancel: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/rep/orders/${id}/cancel`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Coordinator
  coordinatorGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/coordinator/orders', { params }),

  coordinatorGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/coordinator/orders/${id}`),

  coordinatorApprove: (id: string) =>
    api.post<ApiResponse<Order>>(`/coordinator/orders/${id}/approve`),

  coordinatorReject: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/coordinator/orders/${id}/reject`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  coordinatorUpdateStatus: (id: string, data: UpdateOrderStatusRequest) =>
    api.put<ApiResponse<Order>>(`/coordinator/orders/${id}/status`, data),

  coordinatorDelete: (id: string) =>
    api.delete<ApiResponse<void>>(`/coordinator/orders/${id}`),

  coordinatorGetTrash: (page = 1, pageSize = 20) =>
    api.get<ApiResponse<PagedResult<Order>>>('/coordinator/orders/trash', { params: { page, pageSize } }),

  coordinatorRestore: (id: string) =>
    api.post<ApiResponse<string>>(`/coordinator/orders/${id}/restore`),

  // Customer
  customerCreate: (data: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>('/customer/orders', data),

  customerGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/customer/orders', { params }),

  customerGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/customer/orders/${id}`),

  customerTrack: (id: string) =>
    api.get<ApiResponse<unknown>>(`/customer/orders/${id}/track`),

  customerDelete: (id: string) =>
    api.delete<ApiResponse<void>>(`/customer/orders/${id}`),

  customerGetTrash: (page = 1, pageSize = 20) =>
    api.get<ApiResponse<PagedResult<Order>>>('/customer/orders/trash', { params: { page, pageSize } }),

  customerRestore: (id: string) =>
    api.post<ApiResponse<string>>(`/customer/orders/${id}/restore`),

  customerCancel: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/customer/orders/${id}/cancel`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  customerRate: (id: string, data: RateOrderRequest) =>
    api.post<ApiResponse<string>>(`/customer/orders/${id}/rate`, data),

  customerReorder: (id: string) =>
    api.post<ApiResponse<Order>>(`/customer/orders/${id}/reorder`),
};
