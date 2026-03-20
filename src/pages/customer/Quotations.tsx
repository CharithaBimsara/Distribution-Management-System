import { Fragment, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { customerGetQuotations, customerConvertQuotation, customerCancelQuotation } from '../../services/api/quotationApi';
import { formatCurrency, formatRelative } from '../../utils/formatters';
import { downloadQuotationPdf } from '../../utils/quotationPdf';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import MobileTileList from '../../components/common/MobileTileList';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import BottomSheet from '../../components/common/BottomSheet';
import { FileText, Plus, Loader2, ShoppingCart, ArrowRight, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Quotation, QuotationStatus } from '../../types/quotation.types';

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Converted', value: 'ConvertedToOrder' },
];

export default function CustomerQuotations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const desktop = useIsDesktop();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [convertQuotation, setConvertQuotation] = useState<Quotation | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-quotations', page, statusFilter],
    queryFn: () => customerGetQuotations(page, 20, statusFilter || undefined),
  });

  const convertMut = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      customerConvertQuotation(id, {
        deliveryAddress: deliveryAddress || undefined,
        deliveryNotes: deliveryNotes || undefined,
      }),
    onSuccess: () => {
      toast.success('Quotation converted to order!');
      setConvertQuotation(null);
      queryClient.invalidateQueries({ queryKey: ['customer-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
    onError: () => toast.error('Failed to convert quotation'),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id }: { id: string }) => customerCancelQuotation(id, 'Cancelled by customer'),
    onSuccess: () => {
      toast.success('Quotation cancelled');
      queryClient.invalidateQueries({ queryKey: ['customer-quotations'] });
      setSelectedQuotation(null);
    },
    onError: () => toast.error('Failed to cancel quotation'),
  });

  const quotations = data?.items || [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  useEffect(() => {
    if (!selectedQuotation) return;
    const updated = quotations.find((item) => item.id === selectedQuotation.id) || null;
    setSelectedQuotation(updated);
  }, [quotations, selectedQuotation?.id]);

  useEffect(() => {
    if (!convertQuotation) return;
    const updated = quotations.find((item) => item.id === convertQuotation.id) || null;
    setConvertQuotation(updated);
  }, [quotations, convertQuotation?.id]);

  const handleRowClick = (q: Quotation) => {
    setSelectedQuotation((prev) => (prev?.id === q.id ? null : q));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My Quotations"
        subtitle={`${data?.totalCount || 0} quotations`}
        actions={[{ label: 'Request Quote', icon: Plus, onClick: () => navigate('/shop/quotations/new') }]}
      />

      <div className="px-4 lg:px-6 pb-6 space-y-4">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.value
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Data */}
        {desktop ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading quotations</div>
            ) : quotations.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={FileText}
                  title="No quotations yet"
                  description="Request a quote to get started"
                  action={{ label: 'Request Quote', onClick: () => navigate('/shop/quotations/new') }}
                />
              </div>
            ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[36%]" />
                  <col className="w-[12%]" />
                  <col className="w-[20%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Quotation #</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <Fragment key={q.id}>
                      <tr
                        onClick={() => handleRowClick(q)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          selectedQuotation?.id === q.id ? 'bg-orange-50/60 border-orange-100' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-900 truncate" title={q.quotationNumber}>{q.quotationNumber}</td>
                        <td className="px-3 py-3.5 text-center text-slate-600 font-medium">{q.items?.length || 0}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(q.totalAmount)}</td>
                        <td className="px-4 py-3.5 text-center"><StatusBadge status={q.status} /></td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatRelative(q.createdAt)}</td>
                      </tr>

                      {selectedQuotation?.id === q.id && (
                        <tr className="border-b border-orange-100">
                          <td colSpan={5} className="p-0">
                            <div className="bg-gradient-to-b from-orange-50/80 to-slate-50/20 px-6 py-4" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                              {q.items?.length > 0 && (
                                <div className="rounded-xl border border-slate-200 overflow-x-auto mb-4">
                                  {(() => {
                                    const withTax = (q.items || []).some((item: any) => (item.taxAmount || 0) > 0 || !!item.taxCode);
                                    return (
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
                                        {withTax && <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>}
                                        {withTax && <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax Amt</th>}
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
                                          <tr key={item.id || item.productId}>
                                            <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.productName || '-'}>{item.productName || '-'}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{item.productSKU || '-'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(rate)}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(item.mrp ?? rate)}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{discPct}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(discAmt)}</td>
                                            {withTax && <td className="px-3 py-2.5 text-right text-slate-700">{item.taxCode || '-'}</td>}
                                            {withTax && <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(taxAmt)}</td>}
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(amount)}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                    );
                                  })()}
                                </div>
                              )}

                              {q.notes && (
                                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                                  <p className="text-xs text-slate-400 font-medium mb-1">Notes</p>
                                  <p className="text-sm text-slate-700">{q.notes}</p>
                                </div>
                              )}

                              {q.rejectionReason && (
                                <div className="bg-red-50 rounded-xl p-3 mb-3">
                                  <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                                  <p className="text-sm text-red-600">{q.rejectionReason}</p>
                                </div>
                              )}

                              {q.status === 'Approved' && !q.convertedOrderId && (
                                <div className="flex justify-end">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => downloadQuotationPdf(q)}
                                      className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-2"
                                    >
                                      <Download className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button
                                      onClick={() => setConvertQuotation(q)}
                                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2"
                                    >
                                      <ShoppingCart className="w-4 h-4" /> Convert to Order
                                    </button>
                                  </div>
                                </div>
                              )}

                              {(q.status === 'Submitted' || q.status === 'UnderReview') && (
                                <div className="flex justify-end">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => downloadQuotationPdf(q)}
                                      className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-2"
                                    >
                                      <Download className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button
                                      onClick={() => cancelMut.mutate({ id: q.id })}
                                      disabled={cancelMut.isPending}
                                      className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50"
                                    >
                                      Cancel Quotation
                                    </button>
                                  </div>
                                </div>
                              )}

                              {q.status !== 'Approved' && q.status !== 'Submitted' && q.status !== 'UnderReview' && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => downloadQuotationPdf(q)}
                                    className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" /> Download PDF
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}

            {data && totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">{data.totalCount} total • page {data.page} of {totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <MobileTileList
            data={quotations}
            keyField="id"
            isLoading={isLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onTileClick={handleRowClick}
            emptyState={
              <EmptyState
                icon={FileText}
                title="No quotations yet"
                description="Request a quote to get started"
                action={{ label: 'Request Quote', onClick: () => navigate('/shop/quotations/new') }}
              />
            }
            renderTile={(q) => (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{q.quotationNumber}</p>
                      <p className="text-[11px] text-slate-400">{q.items?.length || 0} items</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(q.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(q.totalAmount)}</p>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
                {q.rejectionReason && (
                  <div className="mt-2 bg-red-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Rejected:</span> {q.rejectionReason}
                    </p>
                  </div>
                )}
                {q.status === 'Approved' && !q.convertedOrderId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvertQuotation(q);
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Convert to Order <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          />
        )}
      </div>

      {/* Mobile Bottom Sheet — Quotation Detail */}
      <BottomSheet open={!!selectedQuotation && !desktop} onClose={() => setSelectedQuotation(null)} title={selectedQuotation?.quotationNumber || 'Quotation'}>
        {selectedQuotation && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedQuotation.status} />
              <span className="text-lg font-bold text-orange-600">{formatCurrency(selectedQuotation.totalAmount)}</span>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">Items</h3>
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
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
                    {selectedQuotation.items?.map((item: any) => {
                      const rate = item.unitPrice || 0;
                      const qty = item.quantity || 0;
                      const discPct = item.discountPercent || 0;
                      const discAmt = (rate * qty * discPct) / 100;
                      const taxAmt = item.taxAmount || 0;
                      const amount = item.lineTotal ?? ((rate * qty) - discAmt + taxAmt);
                      return (
                        <tr key={item.id || item.productId}>
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

            {selectedQuotation.notes && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-medium mb-1">Notes</p>
                <p className="text-sm text-slate-700">{selectedQuotation.notes}</p>
              </div>
            )}

            {selectedQuotation.rejectionReason && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-400 font-medium mb-1">Rejection Reason</p>
                <p className="text-sm text-red-600">{selectedQuotation.rejectionReason}</p>
              </div>
            )}

            {selectedQuotation.status === 'Approved' && !selectedQuotation.convertedOrderId && (
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQuotationPdf(selectedQuotation)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  onClick={() => {
                    setConvertQuotation(selectedQuotation);
                    setSelectedQuotation(null);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 transition"
                >
                  <ShoppingCart className="w-4 h-4" /> Convert to Order
                </button>
              </div>
            )}

            {(selectedQuotation.status === 'Submitted' || selectedQuotation.status === 'UnderReview') && (
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQuotationPdf(selectedQuotation)}
                  className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button
                  onClick={() => cancelMut.mutate({ id: selectedQuotation.id })}
                  disabled={cancelMut.isPending}
                  className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition"
                >
                  Cancel Quotation
                </button>
              </div>
            )}

            {selectedQuotation.status !== 'Approved' && selectedQuotation.status !== 'Submitted' && selectedQuotation.status !== 'UnderReview' && (
              <button
                onClick={() => downloadQuotationPdf(selectedQuotation)}
                className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Convert to Order Bottom Sheet / Modal */}
      <BottomSheet open={!!convertQuotation} onClose={() => setConvertQuotation(null)} title="Convert to Order">
        {convertQuotation && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {convertQuotation.quotationNumber} — {formatCurrency(convertQuotation.totalAmount)}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Address (optional)</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Notes (optional)</label>
              <textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConvertQuotation(null)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={() => convertMut.mutate({ id: convertQuotation.id })}
                disabled={convertMut.isPending}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
              >
                {convertMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />} Convert
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
