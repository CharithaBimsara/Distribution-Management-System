import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type {
  Quotation,
  CreateQuotationRequest,
  ApproveQuotationRequest,
  RejectQuotationRequest,
  ConvertQuotationToOrderRequest,
} from '../../types/quotation.types';

// ===== Customer endpoints =====

export const customerCreateQuotation = async (req: CreateQuotationRequest) => {
  const { data } = await api.post<ApiResponse<Quotation>>('/customer/quotations', req);
  return data.data;
};

export const customerGetQuotations = async (page = 1, pageSize = 20, status?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  const { data } = await api.get<ApiResponse<PagedResult<Quotation>>>(`/customer/quotations?${params}`);
  return data.data;
};

export const customerGetQuotation = async (id: string) => {
  const { data } = await api.get<ApiResponse<Quotation>>(`/customer/quotations/${id}`);
  return data.data;
};

export const customerConvertQuotation = async (id: string, req: ConvertQuotationToOrderRequest) => {
  const { data } = await api.post<ApiResponse<{ orderId: string }>>(`/customer/quotations/${id}/convert`, req);
  return data.data;
};

// ===== Rep endpoints =====

export const repCreateQuotation = async (req: CreateQuotationRequest) => {
  const { data } = await api.post<ApiResponse<Quotation>>('/rep/quotations', req);
  return data.data;
};

export const repGetQuotations = async (page = 1, pageSize = 20, status?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  const { data } = await api.get<ApiResponse<PagedResult<Quotation>>>(`/rep/quotations?${params}`);
  return data.data;
};

export const repGetQuotation = async (id: string) => {
  const { data } = await api.get<ApiResponse<Quotation>>(`/rep/quotations/${id}`);
  return data.data;
};

// ===== Coordinator endpoints =====

export const coordinatorGetQuotations = async (page = 1, pageSize = 20, status?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  const { data } = await api.get<ApiResponse<PagedResult<Quotation>>>(`/coordinator/quotations?${params}`);
  return data.data;
};

export const coordinatorGetQuotation = async (id: string) => {
  const { data } = await api.get<ApiResponse<Quotation>>(`/coordinator/quotations/${id}`);
  return data.data;
};

export const coordinatorApproveQuotation = async (id: string, req: ApproveQuotationRequest) => {
  const { data } = await api.post<ApiResponse<Quotation>>(`/coordinator/quotations/${id}/approve`, req);
  return data.data;
};

export const coordinatorRejectQuotation = async (id: string, req: RejectQuotationRequest) => {
  const { data } = await api.post<ApiResponse<string>>(`/coordinator/quotations/${id}/reject`, req);
  return data.data;
};

// ===== Admin endpoints =====

export const adminGetQuotations = async (page = 1, pageSize = 20, status?: string, search?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const { data } = await api.get<ApiResponse<PagedResult<Quotation>>>(`/admin/quotations?${params}`);
  return data.data;
};

export const adminGetQuotation = async (id: string) => {
  const { data } = await api.get<ApiResponse<Quotation>>(`/admin/quotations/${id}`);
  return data.data;
};
