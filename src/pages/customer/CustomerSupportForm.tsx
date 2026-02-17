import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../../services/api/supportApi';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Props = { onSuccess?: () => void; onCancel?: () => void };

export default function CustomerSupportForm({ onSuccess, onCancel }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ subject: '', description: '', priority: 'Medium', orderId: '' });

  const createMut = useMutation({
    mutationFn: () => supportApi.customerCreateComplaint({
      subject: form.subject,
      description: form.description,
      priority: form.priority,
      orderId: form.orderId || undefined,
    }),
    onSuccess: () => {
      toast.success('Complaint submitted');
      queryClient.invalidateQueries({ queryKey: ['customer-complaints'] });
      setForm({ subject: '', description: '', priority: 'Medium', orderId: '' });
      onSuccess?.();
    },
    onError: () => toast.error('Failed to submit complaint'),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
        <input value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} placeholder="Brief description of the issue" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Provide details about the issue..." rows={4} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none resize-none transition" />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
        <div className="flex gap-2">
          {['Low', 'Medium', 'High'].map(p => (
            <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${form.priority === p ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Order ID <span className="text-slate-400 font-normal">(optional)</span></label>
        <input value={form.orderId} onChange={e => setForm(prev => ({ ...prev, orderId: e.target.value }))} placeholder="Related order ID" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={onCancel} className="w-full py-2.5 bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
        <button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.subject || !form.description} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-orange-500/25 disabled:opacity-60 hover:shadow-xl">
          {createMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Complaint'}
        </button>
      </div>
    </div>
  );
}
