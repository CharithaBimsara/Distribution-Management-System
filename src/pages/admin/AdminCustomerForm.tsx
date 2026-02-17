import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import toast from 'react-hot-toast';

type Props = { assignedRepId?: string; hideAssignedRepField?: boolean; onSuccess?: (created?: any) => void; onCancel?: () => void };

export default function AdminCustomerForm({ assignedRepId, hideAssignedRepField, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ shopName: '', phoneNumber: '', email: '', city: '', street: '', assignedRepId: assignedRepId || '', customerSegment: '', creditLimit: '' });

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => customersApi.adminCreate(d),
    onSuccess: (res: any) => {
      const created = res?.data?.data;
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Customer created');
      setForm({ shopName: '', phoneNumber: '', email: '', city: '', street: '', assignedRepId: assignedRepId || '', customerSegment: '', creditLimit: '' });
      onSuccess?.(created);
    },
    onError: () => toast.error('Failed to create customer'),
  });

  const handleCreate = () => {
    if (!form.shopName) return toast.error('Shop name is required');
    const payload: Record<string, unknown> = {
      shopName: form.shopName,
      phoneNumber: form.phoneNumber || undefined,
      email: form.email || undefined,
      street: form.street || undefined,
      city: form.city || undefined,
      assignedRepId: form.assignedRepId || undefined,
      customerSegment: form.customerSegment || undefined,
      creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : 0,
    };
    createMut.mutate(payload);
  };

  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-emerald-500';

  return (
    <div className="space-y-3">
      <input value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))} placeholder="Shop name*" className={cls} />

      <div className="grid grid-cols-2 gap-2">
        <input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="Phone" className={cls} />
        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className={cls} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className={cls} />
        <input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Street" className={cls} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input value={form.customerSegment} onChange={e => setForm(f => ({ ...f, customerSegment: e.target.value }))} placeholder="Segment (optional)" className={cls} />
        {!hideAssignedRepField ? (
          <input value={form.assignedRepId} onChange={e => setForm(f => ({ ...f, assignedRepId: e.target.value }))} placeholder="Assigned rep id (optional)" className={cls} />
        ) : (
          <input type="hidden" value={form.assignedRepId} />
        )}
      </div>

      <input value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))} placeholder="Credit limit (optional)" className={cls} />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
        <button disabled={createMut.isPending} onClick={handleCreate} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? 'Creating...' : 'Create'}</button>
      </div>
    </div>
  );
}
