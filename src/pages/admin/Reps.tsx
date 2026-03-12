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
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRegionId, setFilterRegionId] = useState('');
  const [filterCoordinatorId, setFilterCoordinatorId] = useState('');
  const isDesktop = useIsDesktop();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const activeFilterCount = (filterStatus !== 'all' ? 1 : 0) + (filterRegionId ? 1 : 0) + (filterCoordinatorId ? 1 : 0);

  const [repForm, setRepForm] = useState({
    fullName: '',
    employeeCode: '',
    regionId: '',
    subRegionId: '',
    email: '',
    phoneNumber: '',
    username: '',
    password: '',
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
      setRepForm({ fullName: '', employeeCode: '', regionId: '', subRegionId: '', email: '', phoneNumber: '', username: '', password: '' });
      toast.success('Rep created');
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
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Sales Reps</h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Manage your sales team</p>
          </div>
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search reps..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-52 outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button onClick={() => exportReps('excel')} title="Export Excel" className="p-2 rounded-xl border border-slate-200 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition hidden lg:flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button onClick={() => exportReps('pdf')} title="Export PDF" className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition hidden lg:flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition relative ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <button
            onClick={() => isDesktop ? navigate('/admin/reps/new') : setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Rep</span>
          </button>
        </div>
        <div className="mt-2 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search reps..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`mt-2 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition relative ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {activeFilterCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full">{activeFilterCount}</span>}
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <div className="flex gap-1.5">
                {(['all', 'active', 'inactive'] as const).map(s => (
                  <button key={s} onClick={() => { setFilterStatus(s); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${filterStatus === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Region</label>
              <select value={filterRegionId} onChange={e => { setFilterRegionId(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none">
                <option value="">All regions</option>
                {regionList.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Coordinator</label>
              <select value={filterCoordinatorId} onChange={e => { setFilterCoordinatorId(e.target.value); setPage(1); }}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none">
                <option value="">All coordinators</option>
                {coordinatorList.map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-3 flex justify-end">
                <button onClick={() => { setFilterStatus('all'); setFilterRegionId(''); setFilterCoordinatorId(''); setPage(1); }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all filters</button>
              </div>
            )}
          </div>
        )}
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
                    <button
                      onClick={toggleAll}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}
                    >
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
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
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${selectedIds.has(r.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}
                      >
                        {selectedIds.has(r.id) && <Check className="w-3 h-3 text-white" />}
                      </button>
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
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(r.id); }}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${selectedIds.has(r.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                  >
                    {selectedIds.has(r.id) && <Check className="w-3 h-3 text-white" />}
                  </button>
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
              { label: 'Username', key: 'username', type: 'text' },
              { label: 'Password', key: 'password', type: 'password' },
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
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => createRepMut.mutate({ ...repForm })}
                disabled={createRepMut.isPending || !repForm.fullName || !repForm.username || !repForm.password}
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
