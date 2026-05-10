import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApproveQuotation, adminGetQuotations, adminRejectQuotation } from '../../services/api/quotationApi';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { taxCodeToRate } from '../../utils/calculations';
import { downloadQuotationPdf, downloadQuotationsExcel, downloadQuotationsPdf } from '../../utils/quotationPdf';
import type { Quotation } from '../../types/quotation.types';
import { QUOTATION_STATUSES } from '../../types/quotation.types';
import {
  FileText, Search, X, SlidersHorizontal, ArrowUpDown, Zap,
  Check, ChevronRight, FileSpreadsheet, CheckCircle, XCircle
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import toast from 'react-hot-toast';

export default function AdminQuotations() {
  // Filter state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [repIdFilter, setRepIdFilter] = useState('');
  const [customerIdFilter, setCustomerIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkExportInline, setShowBulkExportInline] = useState(false);

  // Detail / modal state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Toolbar state
  const [selectionMode, setSelectionMode] = useState(false);
  const [toolbarPanel, setToolbarPanel] = useState<'filter' | 'sort' | 'action' | null>(null);
  const [filterSubPanel, setFilterSubPanel] = useState<'status' | 'rep' | 'customer' | 'date' | null>(null);
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const togglePanel = (panel: 'filter' | 'sort' | 'action') => {
    setToolbarPanel(p => p === panel ? null : panel);
    if (panel !== 'filter') setFilterSubPanel(null);
  };
  const toggleFilterSub = (sub: 'status' | 'rep' | 'customer' | 'date') => {
    setFilterSubPanel(p => p === sub ? null : sub);
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [page, statusFilter, fromDate, toDate, repIdFilter, customerIdFilter]);

  useEffect(() => {
    if (!selectionMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectionMode(false); setSelectedIds(new Set()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectionMode]);

  const { data: repsData } = useQuery({
    queryKey: ['reps-all'],
    queryFn: () => repsApi.adminGetAll({ pageSize: 500 }).then((r) => r.data.data?.items || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-all'],
    queryFn: () => customersApi.adminGetAll({ pageSize: 500 }).then((r) => r.data.data?.items || []),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quotations', page, statusFilter],
    queryFn: () => adminGetQuotations(page, 20, statusFilter || undefined),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => adminApproveQuotation(id, {}),
    onSuccess: () => {
      toast.success('Quotation approved');
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Failed to approve quotation'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminRejectQuotation(id, { reason }),
    onSuccess: () => {
      toast.success('Quotation rejected');
      setRejectTarget(null);
      setRejectReason('');
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-quotations'] });
    },
    onError: () => toast.error('Failed to reject quotation'),
  });

  const allItems: Quotation[] = (data as any)?.items || [];

  const customerTaxMap = useMemo(() => new Map<string, boolean>(
    (customersData || []).map((c: any) => [
      c.id,
      (c.customerType || '').toLowerCase().replace(/[-\s]/g, '') !== 'nontax',
    ])
  ), [customersData]);

  const getIsTax = (q: Quotation) => {
    const val = customerTaxMap.get(q.customerId);
    return val === undefined ? true : val;
  };

  const filteredItems = useMemo(() => {
    return allItems.filter(q => {
      if (search) {
        const s = search.toLowerCase();
        if (!q.quotationNumber.toLowerCase().includes(s) && !q.customerName.toLowerCase().includes(s)) return false;
      }
      if (repIdFilter && q.repId !== repIdFilter) return false;
      if (customerIdFilter && q.customerId !== customerIdFilter) return false;
      if (fromDate && q.createdAt < fromDate) return false;
      if (toDate && q.createdAt > toDate + 'T23:59:59') return false;
      return true;
    });
  }, [allItems, search, repIdFilter, customerIdFilter, fromDate, toDate]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let av: any, bv: any;
      switch (sortField) {
        case 'quotationNumber': av = a.quotationNumber;   bv = b.quotationNumber;   break;
        case 'customerName':    av = a.customerName;      bv = b.customerName;      break;
        case 'repName':         av = a.repName ?? '';     bv = b.repName ?? '';     break;
        case 'status':          av = a.status;            bv = b.status;            break;
        case 'validUntil':      av = a.validUntil ?? '';  bv = b.validUntil ?? '';  break;
        default:                av = a.createdAt || '';   bv = b.createdAt || '';   break;
      }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDir]);

  const activeFilterCount = (statusFilter ? 1 : 0) + (repIdFilter ? 1 : 0) + (customerIdFilter ? 1 : 0) + ((fromDate || toDate) ? 1 : 0);

  const reps: { id: string; fullName: string }[] = repsData || [];
  const customers: { id: string; shopName: string; customerType?: string }[] = customersData || [];

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === sortedItems.length && sortedItems.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedItems.map(q => q.id)));
  };

  const exportQuotations = async (format: 'excel' | 'pdf', onlySelected = false, single?: Quotation) => {
    const items = single
      ? [single]
      : onlySelected
      ? sortedItems.filter(q => selectedIds.has(q.id))
      : sortedItems;
    if (!items.length) { toast.error('No quotations to export'); return; }
    try {
      if (format === 'excel') {
        downloadQuotationsExcel(items, customerTaxMap);
        toast.success('Excel exported');
      } else {
        await downloadQuotationsPdf(items, customerTaxMap);
        toast.success('PDF exported');
      }
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
        <p className="text-slate-500 text-sm mt-1">Manage and track customer quotations</p>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* Row 1: Search + count */}
          <div className="px-4 pt-3 pb-3 flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search quotation # or customer…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="hidden sm:block h-7 w-px bg-slate-200" />
            {data && (
              <span className="hidden sm:inline text-xs text-slate-400 select-none">
                {sortedItems.length} quotation{sortedItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Row 2: Control bar */}
          <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center">
            <button
              onClick={() => togglePanel('filter')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'filter' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none px-1">{activeFilterCount}</span>
              )}
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => togglePanel('sort')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'sort' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Sort</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              onClick={() => togglePanel('action')}
              className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${toolbarPanel === 'action' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:inline">Action</span>
              {selectedIds.size > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none px-1">{selectedIds.size}</span>
              )}
            </button>
          </div>

          {/* ── Filter Panel ──────────────────────────────────────────────── */}
          {toolbarPanel === 'filter' && (
            <div className="border-t border-slate-100 bg-slate-50/60">
              <div className="flex border-b border-slate-100">
                {([
                  { key: 'status',   label: 'Status',   short: 'Status', count: statusFilter ? 1 : 0 },
                  { key: 'rep',      label: 'Rep',      short: 'Rep',    count: repIdFilter ? 1 : 0 },
                  { key: 'customer', label: 'Customer', short: 'Cust.',  count: customerIdFilter ? 1 : 0 },
                  { key: 'date',     label: 'Date',     short: 'Date',   count: (fromDate || toDate) ? 1 : 0 },
                ] as { key: 'status'|'rep'|'customer'|'date'; label: string; short: string; count: number }[]).map(({ key, label, short, count }) => (
                  <button
                    key={key}
                    onClick={() => toggleFilterSub(key)}
                    className={`flex-1 inline-flex items-center justify-center gap-1 py-2 text-[11px] sm:text-xs font-medium border-b-2 transition-all ${
                      filterSubPanel === key ? 'border-indigo-500 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60'
                    }`}
                  >
                    <span className="sm:hidden">{short}</span>
                    <span className="hidden sm:inline">{label}</span>
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] sm:min-w-[16px] sm:h-4 rounded-full bg-indigo-600 text-white text-[8px] sm:text-[9px] font-bold leading-none px-0.5 sm:px-1">{count}</span>
                    )}
                  </button>
                ))}
              </div>

              {filterSubPanel === 'status' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {QUOTATION_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(prev => prev === s ? '' : s); setPage(1); }}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${
                          statusFilter === s ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {statusFilter === s && <Check className="w-3 h-3" />}
                        {s.replace(/([a-z])([A-Z])/g, '$1 $2')}
                      </button>
                    ))}
                    {statusFilter && <button onClick={() => { setStatusFilter(''); setPage(1); }} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">clear</button>}
                  </div>
                </div>
              )}

              {filterSubPanel === 'rep' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {reps.length === 0 && <span className="text-xs text-slate-400 italic">No reps loaded</span>}
                    {reps.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { setRepIdFilter(prev => prev === r.id ? '' : r.id); setPage(1); }}
                        className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${
                          repIdFilter === r.id ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {repIdFilter === r.id && <Check className="w-3 h-3" />}{r.fullName}
                      </button>
                    ))}
                    {repIdFilter && <button onClick={() => { setRepIdFilter(''); setPage(1); }} className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium">clear</button>}
                  </div>
                </div>
              )}

              {filterSubPanel === 'customer' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex items-center gap-2">
                    <select
                      value={customerIdFilter}
                      onChange={e => { setCustomerIdFilter(e.target.value); setPage(1); }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                    >
                      <option value="">All Customers</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.shopName}</option>)}
                    </select>
                    {customerIdFilter && (
                      <button onClick={() => { setCustomerIdFilter(''); setPage(1); }} className="p-1 text-red-400 hover:text-red-600 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {filterSubPanel === 'date' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="text-xs font-medium text-slate-500">Date range</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                      />
                      <span className="text-slate-300 text-xs shrink-0">–</span>
                      <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                      />
                      {(fromDate || toDate) && (
                        <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="shrink-0 p-1 text-red-400 hover:text-red-600 transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Sort Panel ──────────────────────────────────────────────────── */}
          {toolbarPanel === 'sort' && (
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-white border-black text-slate-700 hover:bg-black hover:text-white transition-all"
                >
                  {sortDir === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5" />
                {[
                  { field: 'createdAt',       label: 'Date' },
                  { field: 'quotationNumber', label: 'Quotation #' },
                  { field: 'customerName',    label: 'Customer' },
                  { field: 'repName',         label: 'Rep' },
                  { field: 'status',          label: 'Status' },
                  { field: 'validUntil',      label: 'Valid Until' },
                ].map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else setSortField(field); }}
                    className={`inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium border transition-all ${sortField === field ? 'bg-black border-black text-white' : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'}`}
                  >
                    {sortField === field && <Check className="w-3 h-3" />}{label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Action Panel ─────────────────────────────────────────────────── */}
          {toolbarPanel === 'action' && (
            <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {selectionMode && selectedIds.size > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">{selectedIds.size}</span>
                    selected
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 italic">No rows selected — double-click a row to select</span>
                )}
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowBulkExportInline(p => !p)}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${showBulkExportInline ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export
                  </button>
                )}
                {selectionMode && (
                  <button
                    onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); setToolbarPanel(null); setShowBulkExportInline(false); }}
                    className="ml-auto flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium hover:bg-slate-200 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel selection
                  </button>
                )}
              </div>
              {showBulkExportInline && selectedIds.size > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Export {selectedIds.size} quotation(s) as:</span>
                  <button onClick={() => { exportQuotations('pdf', true); setShowBulkExportInline(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={() => { exportQuotations('excel', true); setShowBulkExportInline(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Mobile card list (< lg) ──────────────────────────────────────── */}
      <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading quotations…</div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No quotations found</p>
          </div>
        ) : (
          <>
            {sortedItems.map(q => (
              <div key={q.id}>
                <div
                  onDoubleClick={() => { if (!selectionMode) { setSelectionMode(true); setSelectedIds(new Set([q.id])); } }}
                  onClick={() => { if (selectionMode) toggleSelection(q.id); else setExpandedId(p => p === q.id ? null : q.id); }}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors cursor-default select-none ${
                    selectionMode && selectedIds.has(q.id) ? 'bg-indigo-50' : expandedId === q.id ? 'bg-blue-50/40' : 'bg-white active:bg-slate-50'
                  }`}
                >
                  {selectionMode ? (
                    <div className={`shrink-0 w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${selectedIds.has(q.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                      {selectedIds.has(q.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  ) : (
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-snug">{q.quotationNumber}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{customers.find(c => c.id === q.customerId)?.shopName || q.customerName}</p>
                  </div>
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    <StatusBadge status={q.status} />
                    <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(q.totalAmount)}</p>
                  </div>
                  <ChevronRight className={`shrink-0 w-4 h-4 text-slate-300 transition-transform duration-200 ${expandedId === q.id && !selectionMode ? 'rotate-90 text-blue-400' : ''}`} />
                </div>
                {expandedId === q.id && !selectionMode && (() => {
                  const isTaxM = getIsTax(q);
                  let mSubtotal = 0, mTax = 0, mDiscount = 0;
                  (q.items || []).forEach(item => {
                    const r = item.unitPrice || 0, qt = item.quantity || 0, dp = item.discountPercent || 0;
                    const ltr = taxCodeToRate(item.taxCode);
                    const allIncR = Math.round(r * (1 + ltr) * 100) / 100;
                    const base = r * qt, net = base - base * dp / 100;
                    mSubtotal += isTaxM !== false ? base : allIncR * qt;
                    mTax += isTaxM !== false ? net * ltr : 0;
                    mDiscount += isTaxM !== false ? base * dp / 100 : allIncR * qt * dp / 100;
                  });
                  const mTotal = mSubtotal + mTax - mDiscount;
                  return (
                  <div className="bg-blue-50/30 px-4 py-3 border-b border-blue-100 space-y-2.5">
                    {q.items?.map(item => {
                      const rate = item.unitPrice || 0;
                      const qty = item.quantity || 0;
                      const lineTaxRate = taxCodeToRate(item.taxCode);
                      const allIncRate = Math.round(rate * (1 + lineTaxRate) * 100) / 100;
                      const lineGross = isTaxM === false ? allIncRate * qty : rate * qty;
                      return (
                        <div key={item.id} className="flex justify-between text-xs bg-white rounded-lg p-2.5 shadow-sm">
                          <div><span className="font-medium text-slate-800">{item.productName}</span><span className="text-slate-400 ml-2">×{item.quantity}</span></div>
                          <span className="font-semibold">{formatCurrency(lineGross)}</span>
                        </div>
                      );
                    })}
                    <div className="text-xs space-y-1 bg-white border border-slate-100 rounded-xl p-3">
                      <div className="flex justify-between text-slate-500"><span>Gross Amount</span><span>{formatCurrency(mSubtotal)}</span></div>
                      <div className="flex justify-between text-orange-500 pb-1 border-b border-slate-100"><span>Discount Amount</span><span>-{formatCurrency(mDiscount)}</span></div>
                      {isTaxM !== false && (
                        <>
                          <div className="flex justify-between text-slate-500"><span>Net Amount</span><span>{formatCurrency(mSubtotal - mDiscount)}</span></div>
                          <div className="flex justify-between text-slate-500 pb-1 border-b border-slate-100"><span>Total Tax Amount</span><span>{formatCurrency(mTax)}</span></div>
                        </>
                      )}
                      <div className="flex justify-between font-bold text-orange-600 pt-1"><span>Total Invoice Value</span><span>{formatCurrency(mTotal)}</span></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={e => { e.stopPropagation(); exportQuotations('pdf', false, q); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95">
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={e => { e.stopPropagation(); exportQuotations('excel', false, q); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 active:scale-95">
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                      </button>
                    </div>
                    {(q.status === 'Submitted' || q.status === 'UnderReview') && (
                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setRejectTarget(q); setRejectReason(''); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200">
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button onClick={() => approveMut.mutate(q.id)} disabled={approveMut.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 disabled:opacity-50">
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            ))}
            {!selectionMode && (
              <p className="text-center text-[11px] text-slate-400 py-3 italic select-none">Double-tap a row to enter selection mode</p>
            )}
            {selectionMode && (
              <p className="text-center text-[11px] text-indigo-500 py-3 font-medium select-none">
                {selectedIds.size} selected &mdash;{' '}
                <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }} className="underline underline-offset-2">Exit (Esc)</button>
              </p>
            )}
          </>
        )}
        {(data as any)?.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">{(data as any).totalCount} total</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
              <button onClick={() => setPage(p => Math.min((data as any).totalPages, p + 1))} disabled={page >= (data as any).totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop table (≥ lg) ──────────────────────────────────────────── */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading quotations…</div>
        ) : sortedItems.length === 0 ? (
          <div className="p-14 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No quotations found</p>
          </div>
        ) : (
          <table className="w-full text-[12px] border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                {selectionMode && (
                  <th className="px-3 py-3.5 w-10 border-r border-slate-200 text-center">
                    <input type="checkbox" checked={selectedIds.size === sortedItems.length && sortedItems.length > 0} onChange={toggleAll} />
                  </th>
                )}
                <th className="px-3 py-3.5 w-8 border-r border-slate-200" />
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Quotation</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Shop</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Rep</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Items</th>
                <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Total</th>
                <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Valid Until</th>
                <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(q => {
                const isTax = getIsTax(q);
                let calcSubtotal = 0, calcTotalTax = 0, calcTotalDiscount = 0;
                (q.items || []).forEach(item => {
                  const r = item.unitPrice || 0, qt = item.quantity || 0, dp = item.discountPercent || 0;
                  const ltr = taxCodeToRate(item.taxCode);
                  const allIncR = Math.round(r * (1 + ltr) * 100) / 100;
                  const base = r * qt, net = base - base * dp / 100;
                  calcSubtotal += isTax !== false ? base : allIncR * qt;
                  calcTotalTax += isTax !== false ? net * ltr : 0;
                  calcTotalDiscount += isTax !== false ? base * dp / 100 : allIncR * qt * dp / 100;
                });
                const calcGrandTotal = calcSubtotal + calcTotalTax - calcTotalDiscount;
                return (
                  <Fragment key={q.id}>
                    <tr
                      onDoubleClick={() => { if (!selectionMode) { setSelectionMode(true); setSelectedIds(new Set([q.id])); } }}
                      onClick={() => { if (selectionMode) toggleSelection(q.id); else setExpandedId(p => p === q.id ? null : q.id); }}
                      className={`border-b border-slate-100 cursor-pointer transition-colors select-none ${
                        selectionMode && selectedIds.has(q.id)
                          ? 'bg-indigo-50/60'
                          : expandedId === q.id
                          ? 'bg-blue-50/50 border-blue-100'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {selectionMode && (
                        <td className="px-3 py-3.5 border border-slate-200" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelection(q.id)} className="shrink-0" />
                        </td>
                      )}
                      <td className="px-3 py-3.5 w-8 border border-slate-200">
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${expandedId === q.id ? 'rotate-90 text-blue-500' : ''}`} />
                      </td>
                      <td className="px-4 py-3.5 border border-slate-200">
                        <span className="font-semibold text-slate-900 text-xs">{q.quotationNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 border border-slate-200">{customers.find(c => c.id === q.customerId)?.shopName || (q as any).shopName || q.customerName || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 border border-slate-200">{q.repName || '—'}</td>
                      <td className="px-4 py-3.5 text-center text-xs text-slate-500 border border-slate-200">{q.items?.length || 0}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-900 border border-slate-200">{formatCurrency(q.totalAmount)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 border border-slate-200">{q.validUntil ? formatDate(q.validUntil) : '—'}</td>
                      <td className="px-4 py-3.5 text-center border border-slate-200"><StatusBadge status={q.status} /></td>
                    </tr>

                    {expandedId === q.id && (
                      <tr className="border-b border-blue-100">
                        <td colSpan={99} className="p-0">
                          <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-8 py-5" style={{ animation: 'fadeIn 0.18s ease-out both' }}>
                            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="font-semibold text-slate-700">{q.quotationNumber}</span>
                                <span className="text-slate-400">·</span>
                                <span className="text-slate-500">{customers.find(c => c.id === q.customerId)?.shopName || q.customerName || '—'}</span>
                                {q.notes && (
                                  <><span className="text-slate-400">·</span><span className="text-xs text-slate-400 italic truncate max-w-[300px]">{q.notes}</span></>
                                )}
                                {q.validUntil && (
                                  <><span className="text-slate-400">·</span><span className="text-xs text-slate-400">Valid until {formatDate(q.validUntil)}</span></>
                                )}
                              </div>
                              <div className="flex flex-col gap-2.5 items-end">
                                {(q.status === 'Submitted' || q.status === 'UnderReview') && (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => { setRejectTarget(q); setRejectReason(''); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white hover:border-red-600 transition"
                                    >
                                      <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                    <button
                                      onClick={() => approveMut.mutate(q.id)}
                                      disabled={approveMut.isPending}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                                    </button>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-400 font-medium">Export:</span>
                                  <button onClick={e => { e.stopPropagation(); downloadQuotationPdf(q, isTax); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition">
                                    <FileText className="w-3.5 h-3.5" /> PDF
                                  </button>
                                  <button onClick={e => { e.stopPropagation(); downloadQuotationsExcel([q], customerTaxMap); toast.success('Excel exported'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition">
                                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                                  </button>
                                </div>
                              </div>
                            </div>

                            {q.items && q.items.length > 0 && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 mb-4">
                                <table className="w-full text-sm border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/80">
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">No</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Item Code</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Item Description</th>
                                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Qty</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Rate</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Disc %</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Disc Amt</th>
                                      {isTax !== false && <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Tax</th>}
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Line Gross</th>
                                      <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide border border-slate-200">Req. Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {q.items.map((item, i) => {
                                      const rate = item.unitPrice || 0;
                                      const qty = item.quantity || 0;
                                      const discPct = item.discountPercent || 0;
                                      const lineTaxRate = taxCodeToRate(item.taxCode);
                                      const allIncRate = Math.round(rate * (1 + lineTaxRate) * 100) / 100;
                                      const displayRate = isTax === false ? allIncRate : rate;
                                      const lineGross = isTax === false ? allIncRate * qty : rate * qty;
                                      const discAmt = isTax === false ? allIncRate * qty * discPct / 100 : rate * qty * discPct / 100;
                                      return (
                                        <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                          <td className="px-4 py-2.5 text-center text-xs text-slate-400 font-medium border border-slate-200">{i + 1}</td>
                                          <td className="px-4 py-2.5 text-slate-400 text-xs border border-slate-200">{item.productSKU || '—'}</td>
                                          <td className="px-4 py-2.5 font-medium text-slate-900 border border-slate-200">{item.productName}</td>
                                          <td className="px-4 py-2.5 text-center text-slate-700 border border-slate-200">{qty}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-600 border border-slate-200">{formatCurrency(displayRate)}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 border border-slate-200">{discPct ? `${discPct}%` : <span className="text-slate-300">—</span>}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 border border-slate-200">{discAmt ? formatCurrency(discAmt) : <span className="text-slate-300">—</span>}</td>
                                          {isTax !== false && <td className="px-4 py-2.5 text-center text-slate-500 border border-slate-200">{item.taxCode || <span className="text-slate-300">—</span>}</td>}
                                          <td className="px-4 py-2.5 text-right font-semibold text-slate-900 border border-slate-200">{formatCurrency(lineGross)}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 border border-slate-200">{item.expectedPrice != null ? formatCurrency(item.expectedPrice) : <span className="text-slate-300">—</span>}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <div className="w-full max-w-md space-y-2 text-sm bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <div className="flex items-center justify-between gap-8 font-medium text-slate-500"><span>Gross Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(calcSubtotal)}</span></div>
                                <div className="flex items-center justify-between gap-8 font-medium text-orange-500 pb-3 border-b border-slate-100"><span>Discount Amount</span><span className="whitespace-nowrap tabular-nums">-{formatCurrency(calcTotalDiscount)}</span></div>
                                {isTax !== false && (
                                  <>
                                    <div className="flex items-center justify-between gap-8 font-medium text-slate-500"><span>Net Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(calcSubtotal - calcTotalDiscount)}</span></div>
                                    <div className="flex items-center justify-between gap-8 font-medium text-slate-500 pb-3 border-b border-slate-100"><span>Total Tax Amount</span><span className="whitespace-nowrap tabular-nums">{formatCurrency(calcTotalTax)}</span></div>
                                  </>
                                )}
                                <div className="flex items-center justify-between gap-8 font-bold pt-1"><span className="text-slate-800 uppercase tracking-wider text-sm">Total Invoice Value</span><span className="text-xl font-black text-orange-600 whitespace-nowrap tabular-nums">{formatCurrency(calcGrandTotal)}</span></div>
                              </div>
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
        {(data as any)?.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">{(data as any).totalCount} total · page {(data as any).page} of {(data as any).totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
              <button onClick={() => setPage(p => Math.min((data as any).totalPages, p + 1))} disabled={page >= (data as any).totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Reject modal ─────────────────────────────────────────────────── */}
      {rejectTarget && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col items-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => { setRejectTarget(null); setRejectReason(''); }} />
          <div className="relative mt-16 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200" style={{ animation: 'slideDown 0.25s ease-out both' }}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900">Reject Quotation</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rejectTarget.quotationNumber}</p>
              </div>
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for rejection</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Provide a reason..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-red-500/15 focus:border-red-300 transition"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition">Cancel</button>
                <button
                  disabled={!rejectReason.trim() || rejectMut.isPending}
                  onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason })}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {rejectMut.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
