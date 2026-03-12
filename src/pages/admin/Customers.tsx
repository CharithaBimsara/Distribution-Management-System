// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { customerRegistrationApi } from '../../services/api/customerRegistrationApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import * as XLSX from 'xlsx';
import { Users, Plus, Search, X, Sliders, SlidersHorizontal, FileSpreadsheet, FileText, Check, ChevronUp, ChevronDown, Clock, CheckCircle, XCircle, Eye, UserCheck, ClipboardList } from 'lucide-react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import DataTable, { type Column } from '../../components/common/DataTable';
import toast from 'react-hot-toast';

type SortField = 'shopName' | 'totalOrderValue' | 'createdAt';

export default function AdminCustomers() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const defaultTab = params.get('tab') === 'requests' ? 'requests' : 'customers';
  const [activeTab, setActiveTab] = useState<'customers' | 'requests'>(defaultTab);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [repFilter, setRepFilter] = useState('');
  const [coordinatorFilter, setCoordinatorFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [subRegionFilter, setSubRegionFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Registration requests state
  const [reqPage, setReqPage] = useState(1);

  const isDesktop = useIsDesktop();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: filters } = useQuery({ queryKey: ['admin-customer-filters'], queryFn: () => customersApi.adminGetFilterOptions().then(r => r.data.data) });

  // always load regions so filter dropdown works
  const { data: regionsLookup } = useQuery({ queryKey: ['regions-all'], queryFn: () => regionsApi.getAll().then((r: any) => r.data), enabled: true });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-customers', page, search, sortBy, sortOrder, statusFilter, repFilter, coordinatorFilter, regionFilter, subRegionFilter],
    queryFn: () => customersApi.adminGetAll({
        page, pageSize: 20,
        search: search || undefined,
        sortBy, sortOrder,
        approvalStatus: statusFilter || undefined,
        assignedRepId: repFilter || undefined,
        assignedCoordinatorId: coordinatorFilter || undefined,
        regionId: regionFilter || undefined,
        subRegionId: subRegionFilter || undefined,
      } as any).then(r => r.data.data),
  });

  // Registration requests queries
  const { data: reqData, isLoading: reqLoading } = useQuery({
    queryKey: ['admin-registration-requests', reqPage],
    queryFn: () => customerRegistrationApi.adminGetAll({ page: reqPage, pageSize: 20, status: 'Pending' }).then(r => r.data.data),
    enabled: activeTab === 'requests',
  });

  const reqItems: any[] = reqData?.items || [];

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };

  // compute subregions for selected region filter
  const filteredSubRegions = useMemo(() => {
    if (!regionsLookup || !regionFilter) return [];
    const region = (regionsLookup as any[]).find((r: any) => r.id === regionFilter);
    return region?.subRegions || [];
  }, [regionsLookup, regionFilter]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const customers: any[] = data?.items || []; // explicit any for TS server

  const handleRowClick = (e: React.MouseEvent, c: any): void => {
    // if user clicked a checkbox, toggle selection instead
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      toggleSelect(c.id);
      return;
    }
    if (isDesktop) navigate(`/admin/customers/${c.id}`);
    else setSelectedCustomer(c);
  };

  // mobile tiles can't provide event, so just open detail
  const handleTileClick = (c: any) => {
    setSelectedCustomer(c);
  };


  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const exportCustomers = async (format: 'excel' | 'pdf', onlySelected = false) => {
    const items = onlySelected && selectedIds.size > 0 ? customers.filter((c: any) => selectedIds.has(c.id)) : customers;
    if (!items.length) return;
    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      const rows = items.map((c: any) => ({
        'Shop Name': c.shopName,
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
        head: [['Shop Name', 'Region', 'Sub-Region', 'Coordinator', 'Rep', 'Orders', 'Order Value', 'Status']],
        body: items.map((c: any) => [c.shopName, c.regionName || '', c.subRegionName || '', c.assignedCoordinatorName || '', c.assignedRepName || '', c.totalOrders || 0, formatCurrency(c.totalOrderValue || 0), c.approvalStatus || (c.isActive ? 'Active' : 'Inactive')]),
        styles: { fontSize: 8 },
        startY: 20,
      });
      doc.save('customers-export.pdf');
    }
  };

  const hasActiveFilters = !!(statusFilter || search || repFilter || coordinatorFilter || regionFilter || subRegionFilter);

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">Manage customer accounts and registration requests</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'customers' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Customers
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'requests' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Registration Requests
          {reqData && reqData.items?.filter((r: any) => r.status === 'Pending').length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {reqData.items.filter((r: any) => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════
          CUSTOMERS TAB
          ════════════════════════════════════════════════════════ */}
      {activeTab === 'customers' && (<>

      {/* Sticky modern toolbar */}
      <div className="sticky top-0 z-30">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">
          {/* Row 1: search + add customer button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search shop name, email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
            </div>
            <div className="hidden sm:block h-7 w-px bg-slate-200" />
            <button
              onClick={() => navigate('/admin/customers/new')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Customer</span>
            </button>
          </div>

          {/* Row 2: filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Status</option>
              <option value="Approved">Approved</option>
              <option value="PendingApproval">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setSubRegionFilter(''); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Regions</option>
              {filters?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={subRegionFilter} onChange={e => { setSubRegionFilter(e.target.value); setPage(1); }} disabled={!regionFilter} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Sub-regions</option>
              {filteredSubRegions.map(sr => <option key={sr.id} value={sr.id}>{sr.name}</option>)}
            </select>
            <select value={coordinatorFilter} onChange={e => { setCoordinatorFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Coordinators</option>
              {filters?.coordinators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={repFilter} onChange={e => { setRepFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Reps</option>
              {filters?.assignedReps.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      {isDesktop ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Loading customers...</div>
          ) : !customers.length ? (
            <div className="p-12 text-center"><Users className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No customers found</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="px-5 py-3.5 w-10">
                      <input type="checkbox" checked={customers.length > 0 && selectedIds.size === customers.length} onChange={() => { if (selectedIds.size === customers.length) setSelectedIds(new Set()); else setSelectedIds(new Set(customers.map((c: any) => c.id))); }} className="shrink-0" />
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('shopName')}>
                      <span className="flex items-center gap-1">Shop Name <SortIcon field="shopName" /></span>
                    </th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Region</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Sub-Region</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Coordinator</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Assigned Rep</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Orders</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('totalOrderValue')}>
                      <span className="flex items-center justify-end gap-1">Order Value <SortIcon field="totalOrderValue" /></span>
                    </th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                      <span className="flex items-center gap-1">Created <SortIcon field="createdAt" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c: any) => (
                    <tr
                      key={c.id}
                      onClick={(e) => handleRowClick(e, c)}
                      className={`hover:bg-slate-50/60 transition-all cursor-pointer ${selectedIds.has(c.id) ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td className="px-5 py-3.5" onClick={e => {
                          e.stopPropagation();
                          if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                            toggleSelect(c.id);
                          }
                        }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{c.shopName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{c.regionName || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{c.subRegionName || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{c.assignedCoordinatorName || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{c.assignedRepName || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">{c.totalOrders || 0}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-900">{formatCurrency(c.totalOrderValue || 0)}</td>
                      <td className="px-5 py-3.5 text-center"><StatusBadge status={c.approvalStatus || (c.isActive ? 'Active' : 'Inactive')} /></td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">{data.totalCount} total · page {data.page} of {data.totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList data={customers} keyExtractor={c => c.id} onTileClick={handleTileClick} isLoading={isLoading} emptyMessage="No customers found" emptyIcon={<Users className="w-10 h-10" />} page={data?.page} totalPages={data?.totalPages} onPageChange={setPage}
          renderTile={(c: any) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={e => { e.stopPropagation(); toggleSelect(c.id); }} onClick={e => e.stopPropagation()} className="mt-1 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">{c.shopName}</p>
                  <p className="text-xs text-slate-400">{c.assignedRepName || 'No rep assigned'}</p>
                </div>
                <StatusBadge status={c.approvalStatus || (c.isActive ? 'Active' : 'Inactive')} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                {c.regionName && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{c.regionName}</span>}
                {c.createdAt && <span>{formatDate(c.createdAt)}</span>}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                <div><p className="text-xs text-slate-400">Orders</p><p className="font-bold text-slate-900">{c.totalOrders || 0}</p></div>
                <div className="text-right"><p className="text-xs text-slate-400">Order Value</p><p className="font-medium text-slate-600">{formatCurrency(c.totalOrderValue || 0)}</p></div>
              </div>
            </div>
          )}
        />
      )}

      {/* Mobile: Customer Detail Bottom Sheet */}
      {!isDesktop && selectedCustomer && (
        <BottomSheet open={true} onClose={() => setSelectedCustomer(null)} title={selectedCustomer.shopName}>
          <div className="p-5 space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={selectedCustomer.approvalStatus || (selectedCustomer.isActive ? 'Active' : 'Inactive')} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Region</span><span className="font-medium">{selectedCustomer.regionName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Sub-Region</span><span className="font-medium">{selectedCustomer.subRegionName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Coordinator</span><span>{selectedCustomer.assignedCoordinatorName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Assigned Rep</span><span>{selectedCustomer.assignedRepName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Total Orders</span><span className="font-bold">{selectedCustomer.totalOrders || 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Order Value</span><span>{formatCurrency(selectedCustomer.totalOrderValue || 0)}</span></div>

            </div>
            <button onClick={() => { navigate(`/admin/customers/${selectedCustomer.id}`); setSelectedCustomer(null); }} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium">View Full Details</button>
          </div>
        </BottomSheet>
      )}

      {/* Mobile filter sheet */}
      {!isDesktop && showFilterSheet && (
        <BottomSheet open={true} onClose={() => setShowFilterSheet(false)} title="Filters">
          <div className="p-5 space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"><option value="">All</option><option value="Approved">Approved</option><option value="PendingApproval">Pending</option><option value="Rejected">Rejected</option></select></div>
            <div className="flex gap-3">
              <button onClick={() => { setStatusFilter(''); setPage(1); setShowFilterSheet(false); }} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Clear</button>
              <button onClick={() => setShowFilterSheet(false)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium">Apply</button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Sticky selection bar */}
      {selectedIds.size > 0 && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap justify-center px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 mx-4" style={{ animation: 'slideDown 0.2s ease-out both' }}>
            <span className="text-sm font-semibold text-slate-200">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-slate-600" />
            <button onClick={() => exportCustomers('excel', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</button>
            <button onClick={() => exportCustomers('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition"><FileText className="w-3.5 h-3.5" /> PDF</button>
            <button onClick={() => { setSelectedIds(new Set()); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium transition"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </div>,
        document.body
      )}

      </>) /* end customers tab */}

      {/* ════════════════════════════════════════════════════════
          REGISTRATION REQUESTS TAB
          ════════════════════════════════════════════════════════ */}
      {activeTab === 'requests' && (
        <div className="flex flex-col gap-4">
          {/* Requests toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing pending registration requests awaiting review</p>
            <span className="text-xs text-slate-400">{reqData?.totalCount ?? 0} pending</span>
          </div>

          {/* Requests list */}
          {reqLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">Loading requests…</div>
          ) : !reqItems.length ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No registration requests found</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80">
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Contact</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Submitted</th>
                      <th className="text-center px-5 py-3.5 font-semibold text-slate-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reqItems.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-all">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{r.customerName}</p>
                          <p className="text-xs text-slate-400">{r.businessName || '—'}</p>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.customerType === 'Tax' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            {r.customerType}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-slate-700">{r.email}</p>
                          <p className="text-xs text-slate-400">{r.telephone}</p>
                        </td>
                        <td className="px-5 py-3.5 text-center">
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
                        <td className="px-5 py-3.5 text-xs text-slate-500">{r.createdAt ? formatDate(r.createdAt) : '—'}</td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => navigate(`/admin/customer-registrations/${r.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reqData && reqData.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{reqData.totalCount} total · page {reqData.page} of {reqData.totalPages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setReqPage(p => Math.max(1, p - 1))} disabled={reqPage <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Prev</button>
                    <button onClick={() => setReqPage(p => Math.min(reqData.totalPages, p + 1))} disabled={reqPage >= reqData.totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Request Detail / Review Panel — navigation now handled by RegistrationRequestDetail page */}
        </div>
      )}
    </div>
  );
}

