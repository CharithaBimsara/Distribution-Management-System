// @ts-nocheck
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { repsApi } from '../../services/api/repsApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import { Users, Plus, Search, Eye, FileSpreadsheet, FileText, Check, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';

export default function AdminReps() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRegionId, setFilterRegionId] = useState('');
  const [filterCoordinatorId, setFilterCoordinatorId] = useState('');
  const isDesktop = useIsDesktop();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const hasActiveFilters = !!(search || filterStatus !== 'all' || filterRegionId || filterCoordinatorId);

  const [repForm, setRepForm] = useState({
    fullName: '',
    employeeCode: '',
    regionId: '',
    subRegionId: '',
    coordinatorId: '',
    email: '',
    phoneNumber: '',
    hireDate: '',
  });

  const { data: repsData, isLoading: repsLoading } = useQuery({
    queryKey: ['admin-reps', page, search, filterStatus, filterRegionId, filterCoordinatorId],
    queryFn: () =>
      repsApi
        .adminGetAll({
          page, pageSize: 20,
          search: search || undefined,
          isActive: filterStatus === 'active' ? true : filterStatus === 'inactive' ? false : undefined,
          regionId: filterRegionId || undefined,
          coordinatorId: filterCoordinatorId || undefined,
        })
        .then(r => r.data.data),
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.getAll().then(r => r.data || []),
  });

  const { data: coordinatorsData } = useQuery({
    queryKey: ['coordinators-list'],
    queryFn: () => adminGetAllCoordinators(1, 100).then(r => r.items || []),
  });

  const regionList = Array.isArray(regionsData) ? regionsData : [];
  const coordinatorList = coordinatorsData || [];

  const createRepMut = useMutation({
    mutationFn: (d: any) => repsApi.adminCreate(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reps'] });
      setShowCreate(false);
      setRepForm({ fullName: '', employeeCode: '', regionId: '', subRegionId: '', coordinatorId: '', email: '', phoneNumber: '', hireDate: '' });
      toast.success('Rep created! Credentials have been sent by email.');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const reps = (repsData as any)?.items || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === reps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reps.map((r: any) => r.id)));
    }
  };

  const exportReps = async (format: 'excel' | 'pdf', onlySelected?: boolean) => {
    const list = (onlySelected
      ? reps.filter((r: any) => selectedIds.has(r.id))
      : reps) as any[];

    if (format === 'excel') {
      const rows = list.map((r) => ({
        'Full Name': r.fullName,
        'Employee Code': r.employeeCode || '',
        Region: r.regionName || '',
        'Sub-Region': r.subRegionName || '',
        Coordinator: r.coordinatorName || '',
        Customers: r.assignedCustomersCount || 0,
        Status: r.isActive ? 'Active' : 'Inactive',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reps');
      XLSX.writeFile(wb, `reps-${Date.now()}.xlsx`);
    } else {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Sales Reps', 14, 16);
      autoTable(doc, {
        startY: 24,
        head: [['Full Name', 'Code', 'Region', 'Sub-Region', 'Coordinator', 'Customers', 'Status']],
        body: list.map((r) => [
          r.fullName,
          r.employeeCode || '',
          r.regionName || '',
          r.subRegionName || '',
          r.coordinatorName || '',
          r.assignedCustomersCount || 0,
          r.isActive ? 'Active' : 'Inactive',
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
      doc.save(`reps-${Date.now()}.pdf`);
    }
  };

  const allSelected = reps.length > 0 && selectedIds.size === reps.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="animate-fade-in flex flex-col gap-4 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sales Reps</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your sales team</p>
      </div>

      <div className="sticky top-0 z-30">
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-2xl shadow-[0_2px_16px_-4px_rgba(0,0,0,0.10)] px-4 py-3 space-y-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[200px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search reps..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden sm:block h-7 w-px bg-slate-200" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => isDesktop ? navigate('/admin/reps/new') : setShowCreate(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Rep</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wide">Filters</span>
            </div>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select value={filterRegionId} onChange={e => { setFilterRegionId(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Regions</option>
              {regionList.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={filterCoordinatorId} onChange={e => { setFilterCoordinatorId(e.target.value); setPage(1); }} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition cursor-pointer">
              <option value="">All Coordinators</option>
              {coordinatorList.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterRegionId(''); setFilterCoordinatorId(''); setPage(1); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      {isDesktop ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          {repsLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : reps.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reps found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="shrink-0"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sub-Region</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Coordinator</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Customers</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reps.map((r: any) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${selectedIds.has(r.id) ? 'bg-indigo-50/40' : ''}`}
                    onClick={() => navigate(`/admin/reps/${r.id}`)}
                  >
                    <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={e => { e.stopPropagation(); toggleSelect(r.id); }}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0"
                    />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 text-sm">{r.fullName}</p>
                      <p className="text-xs text-slate-400">{r.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{r.regionName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{r.subRegionName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{r.coordinatorName || '—'}</td>
                    <td className="px-4 py-3 text-center font-medium text-sm">{r.assignedCustomersCount || 0}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={r.isActive ? 'Active' : 'Inactive'} /></td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/admin/reps/${r.id}`); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(repsData as any)?.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
              <span className="text-xs text-slate-500">Page {(repsData as any)?.page} of {(repsData as any)?.totalPages}</span>
              <div className="flex gap-1">
                {Array.from({ length: (repsData as any).totalPages }, (_: any, i: number) => i + 1).map((p: number) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList
          data={reps}
          keyExtractor={r => r.id}
          isLoading={repsLoading}
          emptyMessage="No reps found"
          emptyIcon={<Users className="w-10 h-10" />}
          page={repsData?.page}
          totalPages={repsData?.totalPages}
          onPageChange={setPage}
          renderTile={(r: any) => (
            <div className="p-4" onClick={() => navigate(`/admin/reps/${r.id}`)}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={e => { e.stopPropagation(); toggleSelect(r.id); }}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{r.fullName}</p>
                    <p className="text-xs text-slate-400">{r.employeeCode} · {r.regionName || 'No region'}</p>
                  </div>
                </div>
                <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 ml-8">
                <span>{r.coordinatorName || 'No coordinator'}</span>
                <span>{r.assignedCustomersCount || 0} customers</span>
              </div>
              <div className="ml-8">
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/admin/reps/${r.id}`); }}
                  className="w-full py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
              </div>
            </div>
          )}
        />
      )}

      {/* Create Rep */}
      {showCreate && (
        <BottomSheet open={true} onClose={() => setShowCreate(false)} title="Create Sales Rep">
          <div className="p-5 space-y-4">
            {[
              { label: 'Full Name', key: 'fullName', type: 'text' },
              { label: 'Employee Code', key: 'employeeCode', type: 'text' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'Phone', key: 'phoneNumber', type: 'tel' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={(repForm as any)[f.key]}
                  onChange={e => setRepForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Hire Date</label>
                <input
                  type="date"
                  value={repForm.hireDate}
                  onChange={e => setRepForm(p => ({ ...p, hireDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Region</label>
                <select
                  value={repForm.regionId}
                  onChange={e => setRepForm(p => ({ ...p, regionId: e.target.value, subRegionId: '', coordinatorId: '' }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select region…</option>
                  {regionList.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-region</label>
                <select
                  value={repForm.subRegionId}
                  onChange={e => setRepForm(p => ({ ...p, subRegionId: e.target.value }))}
                  disabled={!repForm.regionId}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">Select sub-region…</option>
                  {regionList
                    .find((r: any) => r.id === repForm.regionId)
                    ?.subRegions?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Coordinator</label>
                <select
                  value={repForm.coordinatorId}
                  onChange={e => setRepForm(p => ({ ...p, coordinatorId: e.target.value }))}
                  disabled={!repForm.regionId}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                >
                  <option value="">Select coordinator…</option>
                  {coordinatorList
                    .filter((c: any) => !repForm.regionId || c.regionId === repForm.regionId)
                    .map((c: any) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => createRepMut.mutate({ ...repForm })}
                disabled={createRepMut.isPending || !repForm.fullName || !repForm.email}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {createRepMut.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Selection bar portal */}
      {someSelected && createPortal(
        <div style={{ animation: 'slideDown 0.2s ease-out' }} className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4">
          <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl">
            <span className="text-sm font-medium">{selectedIds.size} rep{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => exportReps('excel', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium transition">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={() => exportReps('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium transition">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
