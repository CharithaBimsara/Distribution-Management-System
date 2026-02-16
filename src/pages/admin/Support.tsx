import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '../../services/api/supportApi';
import { formatDate, statusColor } from '../../utils/formatters';
import { MessageSquare, X, AlertCircle } from 'lucide-react';
import type { Complaint } from '../../types/common.types';
import toast from 'react-hot-toast';

export default function AdminSupport() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', page, statusFilter],
    queryFn: () => supportApi.adminGetComplaints({ page, pageSize: 20, status: statusFilter || undefined }).then(r => r.data.data),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => supportApi.adminUpdateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-complaints'] }); toast.success('Status updated'); setSelectedComplaint(null); },
    onError: () => toast.error('Failed to update status'),
  });

  const priorityColor = (p: string) => {
    switch (p?.toLowerCase()) {
      case 'high': case 'urgent': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support & Complaints</h1>
        <p className="text-slate-500 text-sm mt-1">Manage customer complaints and support tickets</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {['', 'Open', 'InProgress', 'Resolved', 'Closed'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        {isLoading ? <div className="p-8 text-center text-slate-500">Loading complaints...</div> : !data?.items?.length ? (
          <div className="p-8 text-center"><MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No complaints found</p></div>
        ) : (<>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-slate-50/80 border-b border-slate-200/80">
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Subject</th>
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
            <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Date</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Priority</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
            <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
          </tr></thead><tbody className="divide-y divide-slate-100">
            {data.items.map((c: Complaint) => (
              <tr key={c.id} className="hover:bg-slate-50/60 transition-all">
                <td className="px-5 py-3.5"><div><p className="font-medium text-slate-900">{c.subject}</p><p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{c.description}</p></div></td>
                <td className="px-5 py-3.5 text-slate-600">{c.customerName}</td>
                <td className="px-5 py-3.5 text-slate-600">{formatDate(c.createdAt)}</td>
                <td className="px-5 py-3.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor(c.priority)}`}>{c.priority}</span></td>
                <td className="px-5 py-3.5 text-center"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span></td>
                <td className="px-5 py-3.5 text-center">
                  <button onClick={() => setSelectedComplaint(c)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"><AlertCircle className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody></table></div>
          {data.totalPages > 1 && <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80"><p className="text-sm text-slate-500">Page {data.page} of {data.totalPages}</p><div className="flex gap-2"><button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition">Previous</button><button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="px-3.5 py-1.5 text-sm border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition">Next</button></div></div>}
        </>)}
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="fixed inset-0 bg-black/50" onClick={() => setSelectedComplaint(null)} /><div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Complaint Details</h2><button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button></div>
          <div className="space-y-4">
            <div><p className="text-xs text-slate-500 mb-1">Subject</p><p className="font-medium text-slate-900">{selectedComplaint.subject}</p></div>
            <div><p className="text-xs text-slate-500 mb-1">Description</p><p className="text-sm text-slate-700 leading-relaxed">{selectedComplaint.description}</p></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Customer</p><p className="font-medium mt-1">{selectedComplaint.customerName}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Date</p><p className="font-medium mt-1">{formatDate(selectedComplaint.createdAt)}</p></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Priority</p><span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${priorityColor(selectedComplaint.priority)}`}>{selectedComplaint.priority}</span></div>
              <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Status</p><span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${statusColor(selectedComplaint.status)}`}>{selectedComplaint.status}</span></div>
            </div>
            {selectedComplaint.resolvedAt && <div className="text-sm text-slate-500">Resolved: {formatDate(selectedComplaint.resolvedAt)}</div>}
            <div>
              <p className="text-xs text-slate-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['Open', 'InProgress', 'Resolved', 'Closed'].filter(s => s !== selectedComplaint.status).map(s => (
                  <button key={s} onClick={() => updateStatusMut.mutate({ id: selectedComplaint.id, status: s })} disabled={updateStatusMut.isPending} className={`px-4 py-2 text-sm font-medium rounded-xl transition ${s === 'Resolved' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : s === 'InProgress' ? 'bg-blue-600 text-white hover:bg-blue-700' : s === 'Closed' ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                    {s === 'InProgress' ? 'In Progress' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => setSelectedComplaint(null)} className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">Close</button>
        </div></div>
      )}
    </div>
  );
}
