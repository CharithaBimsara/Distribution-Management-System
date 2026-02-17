import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Customer, CustomerFilterOptions, CustomerSummary } from '../../types/customer.types';

export const customersApi = {
  // Admin
  adminGetAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Customer>>>('/admin/customers', { params }),

  adminGetFilterOptions: () =>
    api.get<ApiResponse<CustomerFilterOptions>>('/admin/customers/filters'),

  adminGetById: (id: string) =>
    api.get<ApiResponse<Customer>>(`/admin/customers/${id}`),

  adminGetSummary: (id: string) =>
    api.get<ApiResponse<CustomerSummary>>(`/admin/customers/${id}/summary`),

  adminCreate: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Customer>>('/admin/customers', data),

  adminUpdate: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Customer>>(`/admin/customers/${id}`, data),

  adminSetCreditLimit: (id: string, creditLimit: number) =>
    api.put<ApiResponse<string>>(`/admin/customers/${id}/credit-limit`, { creditLimit }),

  adminToggleStatus: (id: string, isActive: boolean) =>
    api.put<ApiResponse<string>>(`/admin/customers/${id}/status`, isActive, {
      headers: { 'Content-Type': 'application/json' },
    }),

  // Rep
  repGetCustomers: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Customer>>>('/rep/customers', { params }),

  repGetById: (id: string) =>
    api.get<ApiResponse<Customer>>(`/rep/customers/${id}`),

  repGetSummary: (id: string) =>
    api.get<ApiResponse<CustomerSummary>>(`/rep/customers/${id}/summary`),

  // Rep create customer
  repCreate: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Customer>>('/rep/customers', data),

  // Customer
  customerGetProfile: () =>
    api.get<ApiResponse<Customer>>('/customer/profile'),

  customerUpdateProfile: (data: Record<string, unknown>) =>
    api.put<ApiResponse<Customer>>('/customer/profile', data),

  customerGetLedger: () =>
    api.get<ApiResponse<CustomerSummary>>('/customer/ledger'),
};
