import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../../services/api/supportApi';
import { formatDate } from '../../utils/formatters';
import { MessageCircle, Plus, X, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { Complaint } from '../../types/common.types';
import toast from 'react-hot-toast';

export default function CustomerSupport() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '', priority: 'Medium', orderId: '' });

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['customer-complaints'],
    queryFn: () => supportApi.customerGetComplaints().then(r => r.data.data),
  });

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
      setShowForm(false);
      setForm({ subject: '', description: '', priority: 'Medium', orderId: '' });
    },
    onError: () => toast.error('Failed to submit complaint'),
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'Resolved': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'InProgress': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-50 text-emerald-700';
      case 'InProgress': return 'bg-blue-50 text-blue-700';
      default: return 'bg-amber-50 text-amber-700';
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-50 text-red-600';
      case 'Low': return 'bg-slate-100 text-slate-500';
      default: return 'bg-orange-50 text-orange-600';
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white px-5 pt-5 pb-10">
        <h1 className="text-xl font-bold">Support</h1>
        <p className="text-orange-100 text-sm mt-0.5">Submit and track your complaints</p>
      </div>

      <div className="px-4 -mt-5 relative z-10 pb-6 space-y-4">
        {/* New Complaint Button */}
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:bg-orange-50 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" /> New Complaint
        </button>

        {/* Complaints List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="h-4 bg-slate-100 rounded-full w-3/4 skeleton mb-2" />
                <div className="h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
              </div>
            ))}
          </div>
        ) : !complaints?.length ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <MessageCircle className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No complaints</p>
            <p className="text-xs text-slate-400 mt-1">Need help? Submit a complaint above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c: Complaint) => (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(c.status)}
                    <h3 className="text-sm font-semibold text-slate-900">{c.subject}</h3>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityColor(c.priority)}`}>
                    {c.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${statusBg(c.status)}`}>
                    {c.status}
                  </span>
                </div>
                {c.resolvedAt && (
                  <p className="text-[10px] text-emerald-500 mt-2">Resolved on {formatDate(c.resolvedAt)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Complaint Bottom Sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up pb-safe">
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">New Complaint</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of the issue"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide details about the issue..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none resize-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        form.priority === p
                          ? p === 'High' ? 'bg-red-500 text-white' : p === 'Low' ? 'bg-slate-700 text-white' : 'bg-orange-500 text-white'
                          : 'bg-slate-50 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Order ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  value={form.orderId}
                  onChange={(e) => setForm(prev => ({ ...prev, orderId: e.target.value }))}
                  placeholder="Related order ID"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                />
              </div>
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.subject || !form.description}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {createMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
