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

  // Rep
  repCreate: (data: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>('/rep/orders', data),

  repGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/rep/orders', { params }),

  repGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/rep/orders/${id}`),

  repCancel: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/rep/orders/${id}/cancel`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Customer
  customerCreate: (data: CreateOrderRequest) =>
    api.post<ApiResponse<Order>>('/customer/orders', data),

  customerGetAll: (params?: OrderFilterRequest) =>
    api.get<ApiResponse<PagedResult<Order>>>('/customer/orders', { params }),

  customerGetById: (id: string) =>
    api.get<ApiResponse<Order>>(`/customer/orders/${id}`),

  customerTrack: (id: string) =>
    api.get<ApiResponse<unknown>>(`/customer/orders/${id}/track`),

  customerCancel: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/customer/orders/${id}/cancel`, reason || '', {
      headers: { 'Content-Type': 'application/json' },
    }),

  customerRate: (id: string, data: RateOrderRequest) =>
    api.post<ApiResponse<string>>(`/customer/orders/${id}/rate`, data),

  customerReorder: (id: string) =>
    api.post<ApiResponse<Order>>(`/customer/orders/${id}/reorder`),
};
