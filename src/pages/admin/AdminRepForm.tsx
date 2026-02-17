import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import toast from 'react-hot-toast';

type Props = { rep?: { id?: string }; onSuccess?: () => void; onCancel?: () => void };

export default function AdminRepForm({ rep, onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ username: rep?.id ? '' : '', email: '', password: '', fullName: '', phoneNumber: '', territory: '', isActive: true });
  const createMut = useMutation({ mutationFn: (d: any) => repsApi.adminCreate(d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-reps'] }); toast.success('Rep created'); onSuccess?.(); }, onError: () => toast.error('Failed to create rep') });

  const handleCreate = () => {
    if (!form.username || !form.email || !form.password || !form.fullName) return toast.error('Username, email, password and full name are required');
    createMut.mutate({ username: form.username, email: form.email, password: form.password, fullName: form.fullName, phoneNumber: form.phoneNumber || undefined, territory: form.territory || undefined });
  };

  const cls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-emerald-500';

  return (
    <div className="space-y-3">
      <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Username*" className={cls} />
      <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email*" className={cls} />
      <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password*" className={cls} />
      <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Full name*" className={cls} />
      <div className="grid grid-cols-2 gap-2">
        <input value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))} placeholder="Phone" className={cls} />
        <input value={form.territory} onChange={e => setForm(f => ({ ...f, territory: e.target.value }))} placeholder="Territory" className={cls} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={onCancel} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
        <button disabled={createMut.isPending} onClick={handleCreate} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{createMut.isPending ? 'Creating...' : 'Create'}</button>
      </div>
    </div>
  );
}
