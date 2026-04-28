// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { customerRegistrationApi } from '../../services/api/customerRegistrationApi';
import { regionsApi } from '../../services/api/regionsApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import * as XLSX from 'xlsx';
import {
  Users, Plus, Search, X, SlidersHorizontal, ArrowUpDown,
  FileSpreadsheet, FileText, Check, ChevronRight,
  Clock, CheckCircle, XCircle, Eye, ClipboardList,
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';

type SortField = 'shopName' | 'totalOrderValue' | 'createdAt';
type StatusFilter = '' | 'Approved' | 'PendingApproval' | 'Rejected';

export default function AdminCustomers() {
  const { user } = useAuth();
  const isCoordinatorView = user?.role === 'SalesCoordinator';
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const defaultTab = !isCoordinatorView && params.get('tab') === 'requests' ? 'requests' : 'customers';
  const [activeTab, setActiveTab] = useState<'customers' | 'requests'>(defaultTab);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [subRegionFilter, setSubRegionFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [toolbarPanel, setToolbarPanel] = useState<'filter' | 'sort' | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reqPage, setReqPage] = useState(1);

  const navigate = useNavigate();

  const togglePanel = (p: 'filter' | 'sort') =>
    setToolbarPanel(prev => (prev === p ? null : p));

  // Filter options
  const { data: filters } = useQuery({
    queryKey: [isCoordinatorView ? 'coordinator-customer-filters' : 'admin-customer-filters'],
    queryFn: () =>
      (isCoordinatorView
        ? customersApi.coordinatorGetFilterOptions()
        : customersApi.adminGetFilterOptions()
      ).then(r => r.data.data),
  });

  // Regions with sub-regions (admin view) — use a distinct key to avoid type collision with CustomerDetail
  const { data: regionsLookup } = useQuery<any[]>({
    queryKey: ['regions-list-for-customers-filter'],
    queryFn: () => regionsApi.getAll().then((r: any) => r.data || r),
    enabled: !isCoordinatorView,
  });

  const filteredSubRegions = useMemo(() => {
    if (!regionFilter) return [];
    if (isCoordinatorView) return filters?.subRegions || [];
    const region = (regionsLookup || []).find((r: any) => r.id === regionFilter);
    return region?.subRegions || [];
  }, [regionsLookup, filters, regionFilter, isCoordinatorView]);

  // Main customers query
  const { data, isLoading } = useQuery({
    queryKey: [
      isCoordinatorView ? 'coordinator-customers-admin-view' : 'admin-customers',
      page, search, sortBy, sortOrder,
      statusFilter, coordinatorFilter, regionFilter, subRegionFilter,
    ],
    queryFn: () =>
      (isCoordinatorView ? customersApi.coordinatorGetAll : customersApi.adminGetAll)({
        page, pageSize: 20,
        search: search || undefined,
        sortBy, sortOrder,
        approvalStatus: statusFilter || undefined,
        assignedCoordinatorId: coordinatorFilter || undefined,
        regionId: regionFilter || undefined,
        subRegionId: subRegionFilter || undefined,
      } as any).then(r => r.data.data),
  });
  const customers: any[] = data?.items || [];

  // Always-enabled pending count — fixes badge not showing when on Customers tab
  const { data: pendingCountData } = useQuery({
    queryKey: ['admin-registration-requests-count'],
    queryFn: () =>
      customerRegistrationApi.adminGetAll({ page: 1, pageSize: 1, status: 'Pending' })
        .then(r => r.data.data),
    enabled: !isCoordinatorView,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const pendingCount: number = pendingCountData?.totalCount ?? 0;

  // Registration requests (fetched only when on requests tab)
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['admin-registration-requests', reqPage],
    queryFn: () =>
      customerRegistrationApi.adminGetAll({ page: reqPage, pageSize: 20, status: 'Pending' })
        .then(r => r.data.data),
    enabled: !isCoordinatorView && activeTab === 'requests',
  });
  const reqItems: any[] = reqData?.items || [];

  const getCustomerTaxLabel = (c: any) => {
    const rawType = c?.customerType ?? c?.taxType;
    if (typeof rawType === 'string') {
      const n = rawType.trim().toLowerCase();
      if (n === 'tax') return 'Tax';
      if (n === 'nontax' || n === 'non tax' || n === 'non-tax') return 'Non Tax';
      return rawType;
    }
    if (typeof c?.isTaxCustomer === 'boolean') return c.isTaxCustomer ? 'Tax' : 'Non Tax';
    return 'Non Tax';
  };

  const clearFilters = () => {
    setSearch(''); setStatusFilter(''); setCoordinatorFilter('');
    setRegionFilter(''); setSubRegionFilter(''); setPage(1);
  };
  const activeFilterCount = [statusFilter, coordinatorFilter, regionFilter, subRegionFilter].filter(Boolean).length;

  const exportCustomers = async (format: 'excel' | 'pdf') => {
    if (!customers.length) return;
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const rows = customers.map((c: any) => ({
        'Shop Name': c.shopName,
        'Tax Type': getCustomerTaxLabel(c),
        'Region': c.regionName || '',
        'Sub-Region': c.subRegionName || '',
        'Coordinator': c.assignedCoordinatorName || '',
        'Assigned Rep': c.assignedRepName || '',
        'Total Orders': c.totalOrders || 0,
        'Total Order Value': c.totalOrderValue || 0,
        'Status': c.approvalStatus || (c.isActive ? 'Active' : 'Inactive'),
        'Created': c.createdAt ? formatDate(c.createdAt) : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      XLSX.writeFile(wb, 'customers-export.xlsx');
    } else {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['Shop Name', 'Tax Type', 'Region', 'Coordinator', 'Rep', 'Orders', 'Order Value', 'Status']],
        body: customers.map((c: any) => [
          c.shopName, getCustomerTaxLabel(c),
          c.regionName || '', c.assignedCoordinatorName || '',
          c.assignedRepName || '', c.totalOrders || 0,
          formatCurrency(c.totalOrderValue || 0),
          c.approvalStatus || (c.isActive ? 'Active' : 'Inactive'),
        ]),
        styles: { fontSize: 8 },
        startY: 20,
      });
      doc.save('customers-export.pdf');
    }
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isCoordinatorView
            ? 'View customer accounts in your assigned region'
            : 'Manage customer accounts and registration requests'}
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'customers'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Customers
          {data?.totalCount != null && (
            <span className="text-[10px] text-slate-400 font-normal">{data.totalCount}</span>
          )}
        </button>
        {!isCoordinatorView && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Registration Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ═══════════════════ CUSTOMERS TAB ═══════════════════ */}
      {activeTab === 'customers' && (
        <>
          {/* Sticky Toolbar */}
          <div className="sticky top-0 z-30">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Row 1: Search + Add */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search shop name, email…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
                  />
                  {search && (
                    <button
                      onClick={() => { setSearch(''); setPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {!isCoordinatorView && (
                  <button
                    onClick={() => navigate('/admin/customers/new')}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition shadow-sm shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Customer</span>
                  </button>
                )}
              </div>

              {/* Row 2: Filter / Sort / Export bar */}
              <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center">
                <button
                  onClick={() => togglePanel('filter')}
                  className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                    toolbarPanel === 'filter' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none px-1">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={() => togglePanel('sort')}
                  className={`flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                    toolbarPanel === 'sort' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
                  <span>Sort</span>
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={() => exportCustomers('excel')}
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span>Excel</span>
                </button>
                <div className="w-px h-5 bg-slate-200" />
                <button
                  onClick={() => exportCustomers('pdf')}
                  className="flex-1 inline-flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>PDF</span>
                </button>
              </div>

              {/* Filter Panel */}
              {toolbarPanel === 'filter' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-14 shrink-0">Status</span>
                    {(['', 'Approved', 'PendingApproval', 'Rejected'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          statusFilter === s
                            ? 'bg-black border-black text-white'
                            : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {statusFilter === s && <Check className="w-3 h-3" />}
                        {s === '' ? 'All' : s === 'PendingApproval' ? 'Pending' : s}
                      </button>
                    ))}
                  </div>
                  {!isCoordinatorView && (
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={regionFilter}
                        onChange={e => { setRegionFilter(e.target.value); setSubRegionFilter(''); setPage(1); }}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer"
                      >
                        <option value="">All Regions</option>
                        {(regionsLookup || []).map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      {regionFilter && filteredSubRegions.length > 0 && (
                        <select
                          value={subRegionFilter}
                          onChange={e => { setSubRegionFilter(e.target.value); setPage(1); }}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer"
                        >
                          <option value="">All Sub-regions</option>
                          {filteredSubRegions.map((sr: any) => (
                            <option key={sr.id} value={sr.id}>{sr.name}</option>
                          ))}
                        </select>
                      )}
                      <select
                        value={coordinatorFilter}
                        onChange={e => { setCoordinatorFilter(e.target.value); setPage(1); }}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer"
                      >
                        <option value="">All Coordinators</option>
                        {filters?.coordinators?.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Sort Panel */}
              {toolbarPanel === 'sort' && (
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-slate-100 bg-white">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setSortOrder(d => (d === 'asc' ? 'desc' : 'asc'))}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-white border-black text-slate-700 hover:bg-black hover:text-white transition-all"
                    >
                      {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-0.5" />
                    {([
                      { field: 'createdAt' as const, label: 'Date Created' },
                      { field: 'shopName' as const, label: 'Shop Name' },
                      { field: 'totalOrderValue' as const, label: 'Order Value' },
                    ]).map(({ field, label }) => (
                      <button
                        key={field}
                        onClick={() => {
                          if (sortBy === field) setSortOrder(d => (d === 'asc' ? 'desc' : 'asc'));
                          else setSortBy(field);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                          sortBy === field
                            ? 'bg-black border-black text-white'
                            : 'bg-white border-black text-slate-700 hover:bg-black hover:text-white'
                        }`}
                      >
                        {sortBy === field && <Check className="w-3 h-3" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customers table / cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading customers…</div>
            ) : !customers.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Users className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No customers found</p>
              </div>
            ) : (
              <>
                {/* Desktop table (≥ lg) */}
                <table className="hidden lg:table w-full text-[12px] border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Shop Name</th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Tax Type</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Region</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Sub-Region</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Coordinator</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Rep</th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Status</th>
                      <th className="px-4 py-3.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-200">Created</th>
                      <th className="px-4 py-3.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c: any) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3.5 border-r border-slate-200">
                          <p className="font-semibold text-slate-900 text-xs truncate max-w-[180px]" title={c.shopName}>
                            {c.shopName}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center border-r border-slate-200">
                          <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            getCustomerTaxLabel(c) === 'Tax' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {getCustomerTaxLabel(c)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 border-r border-slate-200 max-w-[110px] truncate">{c.regionName || '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 border-r border-slate-200 max-w-[110px] truncate">{c.subRegionName || '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 border-r border-slate-200 max-w-[120px] truncate">{c.assignedCoordinatorName || '—'}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 border-r border-slate-200 max-w-[110px] truncate">{c.assignedRepName || '—'}</td>
                        <td className="px-4 py-3.5 text-center border-r border-slate-200">
                          <StatusBadge status={c.approvalStatus || (c.isActive ? 'Active' : 'Inactive')} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400 border-r border-slate-200 whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => navigate(`/admin/customers/${c.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium transition"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {customers.map((c: any) => (
                    <div key={c.id} className="p-4">
                      <div
                        className="flex items-start justify-between gap-2 cursor-pointer"
                        onClick={() => setExpandedId(p => (p === c.id ? null : c.id))}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 text-sm truncate">{c.shopName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {c.regionName || 'No region'} · {getCustomerTaxLabel(c)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={c.approvalStatus || (c.isActive ? 'Active' : 'Inactive')} />
                          <ChevronRight
                            className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === c.id ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </div>
                      {expandedId === c.id && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-400">Coordinator</span><span className="font-medium">{c.assignedCoordinatorName || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Rep</span><span className="font-medium">{c.assignedRepName || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Sub-Region</span><span className="font-medium">{c.subRegionName || '—'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total Orders</span><span className="font-bold text-slate-900">{c.totalOrders ?? 0}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Order Value</span><span className="font-bold">{formatCurrency(c.totalOrderValue || 0)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Created</span><span>{c.createdAt ? formatDate(c.createdAt) : '—'}</span></div>
                          <button
                            onClick={() => navigate(`/admin/customers/${c.id}`)}
                            className="w-full mt-2 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {data.totalCount} total · page {data.page} of {data.totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════ REGISTRATION REQUESTS TAB ═══════════════ */}
      {!isCoordinatorView && activeTab === 'requests' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Pending registration requests awaiting review</p>
            <span className="text-xs text-slate-400">{reqData?.totalCount ?? pendingCount} pending</span>
          </div>
          {reqLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Loading requests…
            </div>
          ) : !reqItems.length ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center text-slate-400">
              <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No pending registration requests</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="text-left px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">Customer</th>
                      <th className="text-center px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">Type</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">Contact</th>
                      <th className="text-center px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">Status</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">Submitted</th>
                      <th className="text-center px-5 py-3.5 font-bold text-slate-700 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reqItems.map((r: any) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-all">
                        <td className="px-5 py-3.5 border-r border-slate-200">
                          <p className="font-semibold text-slate-900 text-xs">{r.customerName}</p>
                          <p className="text-[11px] text-slate-400">{r.businessName || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.customerType === 'Tax' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {r.customerType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 border-r border-slate-200">
                          <p className="text-xs text-slate-700">{r.email}</p>
                          <p className="text-[11px] text-slate-400">{r.telephone}</p>
                        </td>
                        <td className="px-5 py-3.5 text-center border-r border-slate-200">
                          {r.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {r.status === 'Approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {r.status === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-400 border-r border-slate-200">
                          {r.createdAt ? formatDate(r.createdAt) : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => navigate(`/admin/customer-registrations/${r.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reqData && reqData.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {reqData.totalCount} total · page {reqData.page} of {reqData.totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setReqPage(p => Math.max(1, p - 1))}
                      disabled={reqPage <= 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setReqPage(p => Math.min(reqData.totalPages, p + 1))}
                      disabled={reqPage >= reqData.totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

