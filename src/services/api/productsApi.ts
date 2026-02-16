import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Product, Category, CreateProductRequest, StockAlert } from '../../types/product.types';

export const productsApi = {
  // Admin
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/admin/products', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Product>>(`/admin/products/${id}`),

  create: (data: CreateProductRequest) =>
    api.post<ApiResponse<Product>>('/admin/products', data),

  update: (id: string, data: Partial<CreateProductRequest>) =>
    api.put<ApiResponse<Product>>(`/admin/products/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<string>>(`/admin/products/${id}`),

  updatePrice: (id: string, data: { sellingPrice: number; costPrice?: number }) =>
    api.put<ApiResponse<Product>>(`/admin/products/${id}/price`, data),

  adjustStock: (id: string, data: { quantityChange: number; reason: string }) =>
    api.post<ApiResponse<string>>(`/admin/products/${id}/adjust-stock`, data),

  updateAvailability: (id: string, data: { availability: string }) =>
    api.put<ApiResponse<string>>(`/admin/products/${id}/availability`, data),

  getStockAlerts: () =>
    api.get<ApiResponse<StockAlert[]>>('/admin/products/stock-alerts'),

  getCategories: () =>
    api.get<ApiResponse<Category[]>>('/categories'),

  createCategory: (data: { name: string; description?: string; parentCategoryId?: string; sortOrder?: number }) =>
    api.post<ApiResponse<Category>>('/admin/categories', data),

  // Rep catalog
  repCatalog: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/rep/products/catalog', { params }),

  // Customer catalog
  customerCatalog: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/customer/products', { params }),

  customerGetById: (id: string) =>
    api.get<ApiResponse<Product>>(`/customer/products/${id}`),

  customerCategories: () =>
    api.get<ApiResponse<Category[]>>('/categories'),

  customerSearch: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/customer/products/search', { params }),

  customerGetFavorites: () =>
    api.get<ApiResponse<Product[]>>('/customer/products/favorites'),

  customerToggleFavorite: (id: string) =>
    api.post<ApiResponse<string>>(`/customer/products/${id}/favorite`),
};
