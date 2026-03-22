import api from './axiosConfig';
import type { ApiResponse, PagedResult } from '../../types/api.types';
import type { Product, Category, CreateProductRequest } from '../../types/product.types';

export const productsApi = {
  // Admin
  getAll: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/admin/products', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<Product>>(`/admin/products/${id}`),

  create: (data: CreateProductRequest) =>
    api.post<ApiResponse<Product>>('/admin/products', data),

  // bulk import - wrapper object containing requests array
  importMultiple: (data: { requests: CreateProductRequest[] }) =>
    api.post<ApiResponse<Product[]>>('/admin/products/import', data, { timeout: 120000 }),

  update: (id: string, data: Partial<CreateProductRequest>) =>
    api.put<ApiResponse<Product>>(`/admin/products/${id}`, data),

  delete: (id: string) =>
    api.delete<ApiResponse<string>>(`/admin/products/${id}`),


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

  customerTopSelling: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Product[]>>('/customer/products/best-selling', { params }),

  customerCategories: () =>
    api.get<ApiResponse<Category[]>>('/categories'),

  customerSearch: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<PagedResult<Product>>>('/customer/products/search', { params }),

  customerGetFavorites: () =>
    api.get<ApiResponse<Product[]>>('/customer/products/favorites'),

  customerToggleFavorite: (id: string) =>
    api.post<ApiResponse<string>>(`/customer/products/${id}/favorite`),
};
