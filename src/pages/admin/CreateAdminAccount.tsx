import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../services/api/authApi';

export default function CreateAdminAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
  });

  const createMut = useMutation({
    mutationFn: () => authApi.createAdminAccount(form),
    onSuccess: () => {
      toast.success('Admin created. Temporary credentials were sent to email.');
      queryClient.invalidateQueries({ queryKey: ['superadmin-admin-accounts'] });
      navigate('/admin/admin-accounts');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create admin account');
    },
  });

  const canSubmit = form.fullName.trim() && form.email.trim() && form.phoneNumber.trim();

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Admin Account</h1>
          <p className="text-sm text-slate-500 mt-1">
            Username will be the same as email. A temporary password will be sent to the admin email.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/admin-accounts')}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Administrator name"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="admin@company.com"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Username will be set to this email address.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone Number</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="+9477XXXXXXX"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/admin-accounts')}
            className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={createMut.isPending || !canSubmit}
            onClick={() => createMut.mutate()}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {createMut.isPending ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
