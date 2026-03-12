import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coordinatorGetQuotations, coordinatorApproveQuotation, coordinatorRejectQuotation } from '../../services/api/quotationApi';
import { formatCurrency, formatRelative } from '../../utils/formatters';
import { FileText, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import type { Quotation, QuotationStatus } from '../../types/quotation.types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Under Review', value: 'UnderReview' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
];

export default function CoordinatorQuotations() {
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-quotations', page, statusFilter],
    queryFn: () => coordinatorGetQuotations(page, 20, statusFilter || undefined),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => coordinatorApproveQuotation(id, { notes }),
    onSuccess: () => {
      toast.success('Quotation approved');
      setSelected(null); setApproveNotes('');
      queryClient.invalidateQueries({ queryKey: ['coordinator-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
    },
    onError: () => toast.error('Failed to approve quotation'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => coordinatorRejectQuotation(id, { reason }),
    onSuccess: () => {
      toast.success('Quotation rejected');
      setRejectTarget(null); setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['coordinator-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-dashboard'] });
    },
    onError: () => toast.error('Failed to reject quotation'),
  });

  const quotations = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;
  const isPendingStatus = (s: QuotationStatus) => s === 'Submitted' || s === 'UnderReview';
  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';

  const columns: Column<Quotation>[] = [
    {
      key: 'quotationNumber', header: 'Quotation',
      render: (q) => (
        <div>
          <p className="font-semibold text-slate-800">{q.quotationNumber}</p>
          <p className="text-xs text-slate-400">{formatRelative(q.createdAt)}</p>
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', render: (q) => q.customerName || q.shopName || '—' },
    { key: 'repName', header: 'Rep', render: (q) => q.repName || '—' },
    { key: 'totalAmount', header: 'Total', align: 'right' as const, render: (q) => <span className="font-semibold">{formatCurrency(q.totalAmount)}</span> },
    { key: 'items', header: 'Items', align: 'center' as const, render: (q) => q.items?.length || 0 },
    { key: 'status', header: 'Status', align: 'center' as const, render: (q) => <StatusBadge status={q.status} type="quotations" /> },
    {
      key: 'actions', header: 'Actions', align: 'center' as const,
      render: (q) => isPendingStatus(q.status) ? (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={(e) => { e.stopPropagation(); setSelected(q); setApproveNotes(''); }}
            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          <button onClick={(e) => { e.stopPropagation(); setRejectTarget(q); setRejectReason(''); }}
            className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Quotations" subtitle={`${data?.totalCount || 0} quotations`} />

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(1); }}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === f.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {isDesktop ? (
        <DataTable columns={columns} data={quotations} isLoading={isLoading} keyExtractor={(q) => q.id}
          onRowClick={(q) => setSelected(q)} emptyIcon={<FileText className="w-12 h-12 text-slate-300" />}
          emptyTitle="No quotations found" page={page} totalPages={totalPages} onPageChange={setPage} />
      ) : (
        <MobileTileList data={quotations} isLoading={isLoading} keyExtractor={(q) => q.id}
          onTileClick={(q) => setSelected(q)} page={page} totalPages={totalPages} onPageChange={setPage}
          renderTile={(q) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{q.quotationNumber}</p>
                    <p className="text-[11px] text-slate-400">{q.customerName || q.shopName}</p>
                    {q.repName && <p className="text-[11px] text-slate-400">Rep: {q.repName}</p>}
                    <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(q.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800">{formatCurrency(q.totalAmount)}</p>
                  <StatusBadge status={q.status} type="quotations" />
                </div>
              </div>
              {q.items?.length > 0 && (
                <div className="mt-3 bg-slate-50 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5">{q.items.length} item(s)</p>
                  {q.items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between text-[11px] text-slate-500 py-0.5">
                      <span className="truncate flex-1">{item.productName} x{item.quantity}</span>
                      <span className="ml-2 font-medium">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                  {q.items.length > 3 && <p className="text-[10px] text-slate-400 mt-1">+{q.items.length - 3} more</p>}
                </div>
              )}
              {isPendingStatus(q.status) && (
                <div className="flex gap-2 mt-3">
                  <button onClick={(e) => { e.stopPropagation(); setSelected(q); setApproveNotes(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl hover:bg-emerald-600 transition">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setRejectTarget(q); setRejectReason(''); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* Approve BottomSheet */}
      <BottomSheet isOpen={!!selected} onClose={() => { setSelected(null); setApproveNotes(''); }}
        title={selected ? `${selected.quotationNumber} — Details` : 'Quotation'}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{selected.quotationNumber}</p>
                <p className="text-sm text-slate-500">{selected.customerName || selected.shopName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(selected.totalAmount)}</p>
                <StatusBadge status={selected.status} type="quotations" />
              </div>
            </div>

            {selected.items?.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-slate-600 mb-2">Items</p>
                {selected.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600 py-1">
                    <span>{item.productName} x{item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            )}

            {isPendingStatus(selected.status) && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Notes (optional)</label>
                  <textarea value={approveNotes} onChange={e => setApproveNotes(e.target.value)} rows={2} placeholder="Add notes..." className={inputCls + ' resize-none'} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setRejectTarget(selected); setSelected(null); }}
                    className="flex-1 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button onClick={() => approveMut.mutate({ id: selected.id, notes: approveNotes || undefined })} disabled={approveMut.isPending}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {approveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Reject BottomSheet */}
      <BottomSheet isOpen={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }}
        title={`Reject ${rejectTarget?.quotationNumber || ''}`}>
        {rejectTarget && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason..." className={inputCls + ' resize-none'} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason })} disabled={rejectMut.isPending || !rejectReason.trim()}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {rejectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
