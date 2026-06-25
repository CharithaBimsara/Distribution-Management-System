import api from './axiosConfig';

export interface QuickRequestDto {
  id: string;
  requestNumber: string;
  type: 'Order' | 'Quotation';
  customerName: string;
  details: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  adminNotes?: string | null;
  repId: string;
  repName: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateQuickRequestDto {
  type: 'Order' | 'Quotation';
  customerName: string;
  details: string;
}

export interface UpdateQuickRequestStatusDto {
  status: string;
  adminNotes?: string;
}

export const quickRequestApi = {
  // Rep
  create: (dto: CreateQuickRequestDto) =>
    api.post<{ data: QuickRequestDto }>('/rep/quick-requests', dto),

  uploadImages: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('images', f));
    return api.post<{ data: QuickRequestDto }>(`/rep/quick-requests/${id}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  repGetAll: (type?: string) =>
    api.get<{ data: QuickRequestDto[] }>('/rep/quick-requests', { params: type ? { type } : undefined }),

  repGetById: (id: string) =>
    api.get<{ data: QuickRequestDto }>(`/rep/quick-requests/${id}`),

  // Admin
  adminGetAll: (type?: string, status?: string) =>
    api.get<{ data: QuickRequestDto[] }>('/admin/quick-requests', {
      params: { ...(type && { type }), ...(status && { status }) },
    }),

  adminGetById: (id: string) =>
    api.get<{ data: QuickRequestDto }>(`/admin/quick-requests/${id}`),

  adminUpdateStatus: (id: string, dto: UpdateQuickRequestStatusDto) =>
    api.put<{ data: QuickRequestDto }>(`/admin/quick-requests/${id}/status`, dto),

  adminDelete: (id: string) =>
    api.delete<{ data: string }>(`/admin/quick-requests/${id}`),
};
