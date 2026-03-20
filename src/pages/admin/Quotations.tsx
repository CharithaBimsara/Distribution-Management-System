import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApproveQuotation, adminGetQuotations, adminRejectQuotation } from '../../services/api/quotationApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { downloadQuotationPdf, downloadQuotationsExcel, downloadQuotationsPdf } from '../../utils/quotationPdf';
import { Check, Download, FileSpreadsheet, FileText, Search, X } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import toast from 'react-hot-toast';

const statuses = ['', 'Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected', 'ConvertedToOrder', 'Expired'] as const;

export default function AdminQuotations() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const isDesktop = useIsDesktop();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quotations', page, statusFilter, search],
    queryFn: () => adminGetQuotations(page, 20, statusFilter || undefined, search || undefined),
  });

  const quotations = (data as any)?.items || [];

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, search]);

  useEffect(() => {
    if (!selectedQuotation) return;
    const updated = quotations.find((item: any) => item.id === selectedQuotation.id);
    if (!updated) {
      setSelectedQuotation(null);
      return;
    }
    setSelectedQuotation(updated);
  }, [quotations, selectedQuotation]);

  const approveMut = useMutation({
    mutationFn: (id: string) => adminApproveQuotation(id, {}),
    onSuccess: () => {
      toast.success('Quotation approved and moved to orders');
      setSelectedQuotation(null);
      queryClient.invalidateQueries({ queryKey: ['admin-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['coordinator-orders'] });
      queryClient.invalidateQueries({ queryKey: ['rep-orders'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
    onError: () => toast.error('Failed to approve quotation'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminRejectQuotation(id, { reason }),
    onSuccess: () => {
      toast.success('Quotation rejected');
      setRejectTarget(null);
      setRejectReason('');
      setSelectedQuotation(null);
      queryClient.invalidateQueries({ queryKey: ['admin-quotations'] });
    },
    onError: () => toast.error('Failed to reject quotation'),
  });

  const handleRowClick = (q: any) => {
    setSelectedQuotation((prev: any) => (prev?.id === q.id ? null : q));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === quotations.length && quotations.length > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(quotations.map((q: any) => q.id)));
  };

  const exportQuotationsExcel = () => {
    const selected = quotations.filter((q: any) => selectedIds.has(q.id));
    if (!selected.length) {
      toast.error('No quotations selected');
      return;
    }

    downloadQuotationsExcel(selected);
    toast.success('Excel exported (sheet by sheet)');
  };

  const downloadSelectedPdfs = async () => {
    const selected = quotations.filter((q: any) => selectedIds.has(q.id));
    if (!selected.length) {
      toast.error('No quotations selected');
      return;
    }
    await downloadQuotationsPdf(selected);
    toast.success('PDF exported (one quotation per page)');
  };

  const allSelected = quotations.length > 0 && selectedIds.size === quotations.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Quotations" subtitle="View all quotations" />

      {/* Search + Status Filter */}
      <div className="space-y-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search quotation #, customer..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {statuses.map(s => (
            <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${statusFilter === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s ? s.replace(/([A-Z])/g, ' $1').trim() : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isDesktop ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading quotations</div>
          ) : quotations.length === 0 ? (
            <div className="p-14 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No quotations found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Rep</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Valid Until</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q: any) => (
                  <Fragment key={q.id}>
                    <tr
                      onClick={() => handleRowClick(q)}
                      className={`border-b border-slate-50 cursor-pointer transition-colors ${
                        selectedQuotation?.id === q.id
                          ? 'bg-blue-50/50 border-blue-100'
                          : selectedIds.has(q.id)
                          ? 'bg-indigo-50/40'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td
                        className="px-4 py-3.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(q.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelection(q.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{q.quotationNumber}</td>
                      <td className="px-4 py-3.5 text-slate-700">{q.customerName || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500">{q.repName || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">{formatCurrency(q.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={q.status} /></td>
                    </tr>

                    {selectedQuotation?.id === q.id && (
                      <tr className="border-b border-blue-100">
                        <td colSpan={7} className="p-0">
                          <div className="bg-gradient-to-b from-blue-50/70 to-slate-50/20 px-6 py-4" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                            {q.items?.length > 0 && (
                              <div className="rounded-xl overflow-x-auto border border-slate-200 mb-4">
                                <table className="w-full text-[11px] min-w-[980px]">
                                  <thead>
                                    <tr className="bg-slate-50">
                                      <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Description</th>
                                      <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item</th>
                                      <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Qty</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Rate</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">MRP</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc %</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc Amt</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax Amt</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Amount</th>
                                      <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Request Price</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {q.items.map((item: any) => {
                                      const rate = item.unitPrice || 0;
                                      const qty = item.quantity || 0;
                                      const discPct = item.discountPercent || 0;
                                      const discAmt = (rate * qty * discPct) / 100;
                                      const taxAmt = item.taxAmount || 0;
                                      const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);
                                      return (
                                        <tr key={item.id}>
                                          <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.productName || '-'}>{item.productName || '-'}</td>
                                          <td className="px-3 py-2.5 text-slate-600">{item.productSKU || '-'}</td>
                                          <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(rate)}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(item.mrp ?? rate)}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{discPct}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(discAmt)}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{item.taxCode || '-'}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(taxAmt)}</td>
                                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(amount)}</td>
                                          <td className="px-3 py-2.5 text-right text-slate-700">{item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-'}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="space-y-1.5 text-sm mb-4">
                              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(q.subTotal || 0)}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(q.taxAmount || 0)}</span></div>
                              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100"><span>Total</span><span>{formatCurrency(q.totalAmount)}</span></div>
                            </div>

                            {q.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3 mb-4">{q.notes}</p>}

                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => downloadQuotationPdf(q)}
                                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" /> Download PDF
                              </button>

                              {(q.status === 'Submitted' || q.status === 'UnderReview') && (
                                <>
                                  <button
                                    onClick={() => { setRejectTarget(q); setRejectReason(''); }}
                                    className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => approveMut.mutate(q.id)}
                                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                                  >
                                    Approve
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}

          {data && data.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">{data.totalCount} total • page {data.page} of {data.totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList data={quotations} keyExtractor={q => q.id} onTileClick={handleRowClick} isLoading={isLoading} emptyMessage="No quotations found" emptyIcon={<FileText className="w-10 h-10" />} page={data?.page} totalPages={data?.totalPages} onPageChange={setPage}
          renderTile={(q: any) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{q.quotationNumber}</p>
                  <p className="text-sm text-slate-500 truncate">{q.customerName || '—'}</p>
                </div>
                <StatusBadge status={q.status} />
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span>Rep: {q.repName || '—'}</span>
                {q.validUntil && <span>Valid: {formatDate(q.validUntil)}</span>}
              </div>
              <div className="pt-3 border-t border-slate-50">
                <p className="font-bold text-slate-900">{formatCurrency(q.totalAmount)}</p>
              </div>
            </div>
          )}
        />
      )}

      {/* Quotation Detail */}
      {selectedQuotation && !isDesktop && (
        <BottomSheet open={true} onClose={() => setSelectedQuotation(null)} title={`Quotation ${selectedQuotation.quotationNumber}`}>
          <div className="p-5 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Customer</span><span className="font-medium">{selectedQuotation.customerName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Rep</span><span>{selectedQuotation.repName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={selectedQuotation.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Valid Until</span><span>{selectedQuotation.validUntil ? formatDate(selectedQuotation.validUntil) : '—'}</span></div>
            </div>
            <hr className="border-slate-100" />
            {selectedQuotation.items?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Items</h4>
                <div className="rounded-xl overflow-x-auto border border-slate-200">
                  <table className="w-full text-[11px] min-w-[980px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Rate</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">MRP</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc %</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc Amt</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax Amt</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Amount</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Request Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedQuotation.items.map((item: any) => {
                        const rate = item.unitPrice || 0;
                        const qty = item.quantity || 0;
                        const discPct = item.discountPercent || 0;
                        const discAmt = (rate * qty * discPct) / 100;
                        const taxAmt = item.taxAmount || 0;
                        const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.productName || '-'}>{item.productName || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-600">{item.productSKU || '-'}</td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(rate)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(item.mrp ?? rate)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{discPct}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(discAmt)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{item.taxCode || '-'}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(taxAmt)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(amount)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <hr className="border-slate-100" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(selectedQuotation.subTotal || 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(selectedQuotation.taxAmount || 0)}</span></div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100"><span>Total</span><span>{formatCurrency(selectedQuotation.totalAmount)}</span></div>
            </div>
            {selectedQuotation.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">{selectedQuotation.notes}</p>}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => downloadQuotationPdf(selectedQuotation)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>

              {(selectedQuotation.status === 'Submitted' || selectedQuotation.status === 'UnderReview') && (
                <>
                  <button
                    onClick={() => { setRejectTarget(selectedQuotation); setRejectReason(''); }}
                    className="flex-1 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveMut.mutate(selectedQuotation.id)}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      <BottomSheet open={!!rejectTarget} onClose={() => { setRejectTarget(null); setRejectReason(''); }} title={`Reject ${rejectTarget?.quotationNumber || ''}`}>
        {rejectTarget && (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for rejection</label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Provide a reason..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason })} disabled={!rejectReason.trim() || rejectMut.isPending} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        )}
      </BottomSheet>

      {isDesktop && someSelected && createPortal(
        <div style={{ animation: 'slideDown 0.2s ease-out' }} className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4">
          <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl">
            <span className="text-sm font-medium">{selectedIds.size} quotation{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <button
              onClick={exportQuotationsExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={downloadSelectedPdfs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
