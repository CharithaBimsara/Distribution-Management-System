// @ts-nocheck
import { Fragment, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { repGetQuotations } from '../../services/api/quotationApi';
import { customersApi } from '../../services/api/customersApi';
import { quickRequestApi } from '../../services/api/quickRequestApi';
import { formatCurrency, formatRelative, formatDate } from '../../utils/formatters';
import { taxCodeToRate } from '../../utils/calculations';
import { downloadQuotationPdf } from '../../utils/quotationPdf';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Download, X, FileSpreadsheet } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import PageHeader from '../../components/common/PageHeader';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import type { Quotation } from '../../types/quotation.types';
import { downloadQuickRequestPdf, downloadQuickRequestExcel, downloadImage } from '../../utils/quickRequestPdf';

const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Submitted', value: 'Submitted' },
  { label: 'Approved', value: 'Approved' },
  { label: 'Rejected', value: 'Rejected' },
  { label: 'Converted', value: 'ConvertedToOrder' },
];

export default function RepQuotations() {
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Quotation | null>(null);
  const [selectedQuick, setSelectedQuick] = useState<any>(null);
  const [quickLightbox, setQuickLightbox] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['rep-quotations', page, statusFilter],
    queryFn: () => repGetQuotations(page, 20, statusFilter || undefined),
  });

  const { data: customersData } = useQuery({
    queryKey: ['rep-quotation-customer-names'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 2000 }).then((r) => r.data.data.items),
  });

  const quotations = data?.items || [];
  const customerNameById = new Map((customersData || []).map((c) => [c.id, c.shopName]));
  const getIsTax = (q: Quotation) => {
    const cust = (customersData || []).find((c) => c.id === q.customerId);
    if (!cust) return undefined;
    return (cust.customerType || '').toLowerCase().replace(/[-\s]/g, '') !== 'nontax';
  };
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 0;

  const { data: quickData = [] } = useQuery({
    queryKey: ['rep-quick-quotations'],
    queryFn: () => quickRequestApi.repGetAll('Quotation').then(r => r.data.data),
  });

  const quickQuotationRows = useMemo(() => (quickData as any[]).map((r: any) => ({
    _isQuick: true, _quick: r,
    id: r.id, quotationNumber: r.requestNumber,
    customerName: r.customerName, createdAt: r.createdAt, status: r.status,
    items: [] as any[], totalAmount: 0,
  })), [quickData]);

  const allQuotations: any[] = useMemo(() => {
    const merged = [...quotations, ...quickQuotationRows];
    return merged.sort((a, b) => {
      const ad = a.createdAt || '';
      const bd = b.createdAt || '';
      return bd < ad ? -1 : bd > ad ? 1 : 0;
    });
  }, [quotations, quickQuotationRows]);

  const getCustomerDisplayName = (quotation: Quotation) => {
    const fromCustomerList = customerNameById.get(quotation.customerId);
    if (fromCustomerList) return fromCustomerList;
    if (quotation.shopName) return quotation.shopName;
    if (!quotation.customerName) return 'Customer';
    return quotation.customerName.includes('@') ? 'Customer' : quotation.customerName;
  };

  useEffect(() => {
    if (!selected) return;
    const updated = quotations.find((item) => item.id === selected.id) || null;
    setSelected(updated);
  }, [quotations, selected?.id]);

  const handleRowClick = (q: any) => {
    if (q._isQuick) { setSelectedQuick(q._quick); return; }
    setSelected((prev) => (prev?.id === q.id ? null : q));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quotations"
        subtitle={`${data?.totalCount || 0} quotations`}
        actions={[
          {
            label: 'New Quote',
            onClick: () => navigate('/rep/quotations/new'),
            icon: Plus,
            variant: 'primary' as const,
          },
        ]}
      />

      <div className="pb-6 space-y-4">
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {desktop ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading quotations</div>
            ) : allQuotations.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  icon={FileText}
                  title="No quotations yet"
                  description="Create a quote to get started"
                  action={{ label: 'New Quote', onClick: () => navigate('/rep/quotations/new') }}
                />
              </div>
            ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                  <col className="w-[16%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Quotation #</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {allQuotations.map((q: any) => {
                    if (q._isQuick) {
                      const qr = q._quick;
                      return (
                        <Fragment key={qr.id}>
                          <tr
                            onClick={() => handleRowClick(q)}
                            className="border-b border-slate-50 cursor-pointer transition-colors hover:bg-emerald-50/30"
                          >
                            <td className="px-4 py-3.5 font-semibold text-slate-900 truncate">
                              <div className="flex flex-col gap-0.5">
                                <span>{qr.requestNumber}</span>
                                <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Quick Quotation</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 truncate">{qr.customerName}</td>
                            <td className="px-3 py-3.5 text-center text-slate-400">—</td>
                            <td className="px-4 py-3.5 text-right text-slate-400">—</td>
                            <td className="px-4 py-3.5 text-center"><StatusBadge status={qr.status} type="quotations" /></td>
                            <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatRelative(qr.createdAt)}</td>
                          </tr>
                        </Fragment>
                      );
                    }
                    return (
                    <Fragment key={q.id}>
                      <tr
                        onClick={() => handleRowClick(q)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          selected?.id === q.id ? 'bg-emerald-50/50 border-emerald-100' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-900 truncate" title={q.quotationNumber}>
                          {q.quotationNumber}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 truncate" title={getCustomerDisplayName(q)}>
                          {getCustomerDisplayName(q)}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 font-medium">{q.items?.length || 0}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(q.totalAmount)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={q.status} type="quotations" />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatRelative(q.createdAt)}</td>
                      </tr>

                      {selected?.id === q.id && (
                        <tr className="border-b border-emerald-100">
                          <td colSpan={6} className="p-0">
                            <div className="bg-gradient-to-b from-emerald-50/70 to-slate-50/20 px-6 py-4" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                              {q.items?.length > 0 && (
                                <div className="rounded-xl overflow-x-auto border border-slate-200 mb-4">
                                  <table className="w-full text-[11px] min-w-[980px]">
                                    <thead>
                                      <tr className="bg-slate-50">
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase w-8">#</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item Code</th>
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item Description</th>
                                        <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Qty</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Rate</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc %</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc Amt</th>
                                        {getIsTax(q) !== false && <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>}
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Line Gross</th>
                                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Request Price</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {q.items.map((item: any, idx: number) => {
                                        const rate = item.unitPrice || 0;
                                        const qty = item.quantity || 0;
                                        const discPct = item.discountPercent || 0;
                                        const isTax = getIsTax(q);
                                        const lineTaxRate = taxCodeToRate(item.taxCode);
                                        const allIncRate = Math.round(rate * (1 + lineTaxRate) * 100) / 100;
                                        const displayRate = isTax === false ? allIncRate : rate;
                                        const lineGross = isTax === false ? allIncRate * qty : rate * qty;
                                        const discAmt = isTax === false ? (allIncRate * qty * discPct) / 100 : (rate * qty * discPct) / 100;
                                        return (
                                          <tr key={item.id}>
                                            <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                                            <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">{item.productSKU || '-'}</td>
                                            <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.productName || '-'}>
                                              {item.productName || '-'}
                                            </td>
                                            <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(displayRate)}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{discPct ? `${discPct}%` : '-'}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">{discAmt ? formatCurrency(discAmt) : '-'}</td>
                                            {isTax !== false && <td className="px-3 py-2.5 text-center text-slate-700">{item.taxCode || '—'}</td>}
                                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(lineGross)}</td>
                                            <td className="px-3 py-2.5 text-right text-slate-700">
                                              {item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {q.rejectionReason && (
                                <div className="bg-red-50 rounded-xl p-3 mb-3">
                                  <p className="text-sm text-red-600">
                                    <strong>Rejected:</strong> {q.rejectionReason}
                                  </p>
                                </div>
                              )}

                              <div className="flex justify-end mt-4">
                                <button
                                  onClick={() => downloadQuotationPdf(q, getIsTax(q))}
                                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center gap-2"
                                >
                                  <Download className="w-4 h-4" /> Download PDF
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {data && totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {data.totalCount} total • page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <MobileTileList
            data={allQuotations}
            isLoading={isLoading}
            keyExtractor={(q: any) => q.id}
            onTileClick={(q: any) => handleRowClick(q)}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            renderTile={(q: any) => {
              if (q._isQuick) {
                const qr = q._quick;
                return (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{qr.requestNumber}</p>
                          <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">Quick Quotation</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{qr.customerName}</p>
                          <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(qr.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <StatusBadge status={qr.status} type="quotations" />
                      </div>
                    </div>
                  </div>
                );
              }
              return (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{q.quotationNumber}</p>
                      <p className="text-[11px] text-slate-400">{getCustomerDisplayName(q)}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{formatRelative(q.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCurrency(q.totalAmount)}</p>
                    <StatusBadge status={q.status} type="quotations" />
                  </div>
                </div>
                {q.rejectionReason && (
                  <div className="mt-2 bg-red-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-red-600">
                      <span className="font-semibold">Rejected:</span> {q.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
              );
            }}
          />
        )}
      </div>

      {selectedQuick && createPortal(
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-end md:items-center justify-center p-4" onClick={() => setSelectedQuick(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-slate-900">{selectedQuick.requestNumber}</p>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">Quick Quotation</span>
              </div>
              <button onClick={() => setSelectedQuick(null)} className="p-2 rounded-full hover:bg-slate-100 transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Customer</p><p className="text-sm text-slate-800">{selectedQuick.customerName}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Date</p><p className="text-sm text-slate-800">{formatDate(selectedQuick.createdAt)}</p></div>
                <div><p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Status</p><StatusBadge status={selectedQuick.status} type="quotations" /></div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Quotation Details</p>
                <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans bg-slate-50 border border-slate-100 rounded-xl p-3">{selectedQuick.details}</pre>
              </div>
              {selectedQuick.adminNotes && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Admin Notes</p>
                  <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{selectedQuick.adminNotes}</p>
                </div>
              )}
              {selectedQuick.imageUrls?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Photos ({selectedQuick.imageUrls.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuick.imageUrls.map((url: string, i: number) => (
                      <div key={i} className="relative group w-20 h-20">
                        <img src={`${BASE}${url}`} alt={`Photo ${i+1}`}
                          onClick={() => setQuickLightbox(`${BASE}${url}`)}
                          className="w-20 h-20 rounded-xl object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition"
                          onError={e => { (e.target as any).style.display = 'none'; }}
                        />
                        <button
                          onClick={async e => { e.stopPropagation(); await downloadImage(`${BASE}${url}`, `photo-${i+1}`); }}
                          className="absolute bottom-1 right-1 w-6 h-6 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          title="Download photo"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex gap-2">
              <button onClick={() => downloadQuickRequestPdf(selectedQuick)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl text-red-600 hover:bg-red-50 border border-red-100 transition">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={() => downloadQuickRequestExcel(selectedQuick)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-xl text-emerald-600 hover:bg-emerald-50 border border-emerald-100 transition">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {quickLightbox && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center" onClick={() => setQuickLightbox(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2.5 hover:bg-white/25 transition" onClick={() => setQuickLightbox(null)}>
            <X className="w-5 h-5" />
          </button>
          <img src={quickLightbox} alt="Preview" className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
      )}

      <BottomSheet isOpen={!!selected && !desktop} onClose={() => setSelected(null)} title={selected?.quotationNumber || 'Quotation'}>
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{selected.quotationNumber}</p>
                <p className="text-sm text-slate-500">{getCustomerDisplayName(selected)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(selected.totalAmount)}</p>
                <StatusBadge status={selected.status} type="quotations" />
              </div>
            </div>
            {selected.items?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Items</p>
                <div className="rounded-xl overflow-x-auto border border-slate-200">
                  <table className="w-full text-[11px] min-w-[980px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase w-8">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase">Item Description</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Rate</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc %</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Disc Amt</th>
                        {getIsTax(selected) !== false && <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Tax</th>}
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Line Gross</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase">Request Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selected.items.map((item: any, idx: number) => {
                        const rate = item.unitPrice || 0;
                        const qty = item.quantity || 0;
                        const discPct = item.discountPercent || 0;
                        const isTax = getIsTax(selected);
                        const lineTaxRate = taxCodeToRate(item.taxCode);
                        const allIncRate = Math.round(rate * (1 + lineTaxRate) * 100) / 100;
                        const displayRate = isTax === false ? allIncRate : rate;
                        const lineGross = isTax === false ? allIncRate * qty : rate * qty;
                        const discAmt = isTax === false ? (allIncRate * qty * discPct) / 100 : (rate * qty * discPct) / 100;
                        return (
                          <tr key={item.id}>
                            <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2.5 text-slate-400 text-xs font-mono">{item.productSKU || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-800 max-w-[220px] truncate" title={item.productName || '-'}>
                              {item.productName || '-'}
                            </td>
                            <td className="px-3 py-2.5 text-center text-slate-600">{qty}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{formatCurrency(displayRate)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{discPct ? `${discPct}%` : '-'}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">{discAmt ? formatCurrency(discAmt) : '-'}</td>
                            {isTax !== false && <td className="px-3 py-2.5 text-center text-slate-700">{item.taxCode || '—'}</td>}
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(lineGross)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-700">
                              {item.expectedPrice != null ? formatCurrency(item.expectedPrice) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selected.rejectionReason && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-sm text-red-600">
                  <strong>Rejected:</strong> {selected.rejectionReason}
                </p>
              </div>
            )}

            <button
              onClick={() => downloadQuotationPdf(selected, getIsTax(selected))}
              className="w-full px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
