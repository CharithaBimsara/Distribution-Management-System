import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { adminGetAllCoordinators, adminCreateCoordinator } from '../../services/api/coordinatorApi';
import { Users, Plus, Search, Eye, FileSpreadsheet, FileText, Check, X, MapPin, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import MobileTileList from '../../components/common/MobileTileList';
import BottomSheet from '../../components/common/BottomSheet';
import StatusBadge from '../../components/common/StatusBadge';

export default function AdminCoordinators() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ fullName: '', employeeCode: '', email: '', phoneNumber: '', username: '', password: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isDesktop = useIsDesktop();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coordinators', page, search],
    queryFn: () => adminGetAllCoordinators(page, 20, search || undefined),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => adminCreateCoordinator(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinators'] });
      setShowCreate(false);
      setForm({ fullName: '', employeeCode: '', email: '', phoneNumber: '', username: '', password: '' });
      toast.success('Coordinator created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create'),
  });

  const coordinators = ((data as any)?.items || []).filter((c: any) =>
    search ? (c.fullName + ' ' + (c.regionName || '') + ' ' + c.employeeCode).toLowerCase().includes(search.toLowerCase()) : true
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === coordinators.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(coordinators.map((c: any) => c.id)));
  };

  const exportCoordinators = async (format: 'excel' | 'pdf', onlySelected?: boolean) => {
    const list = (onlySelected ? coordinators.filter((c: any) => selectedIds.has(c.id)) : coordinators) as any[];
    if (format === 'excel') {
      const rows = list.map((c) => ({
        'Full Name': c.fullName,
        'Employee Code': c.employeeCode || '',
        Region: c.regionName || '',
        Email: c.email || '',
        'Total Reps': c.assignedRepsCount || 0,
        'Total Customers': c.assignedCustomersCount || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Coordinators');
      XLSX.writeFile(wb, `coordinators-${Date.now()}.xlsx`);
    } else {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Coordinators', 14, 16);
      autoTable(doc, {
        startY: 24,
        head: [['Full Name', 'Code', 'Region', 'Email', 'Reps', 'Customers']],
        body: list.map((c) => [c.fullName, c.employeeCode || '', c.regionName || '', c.email || '', c.assignedRepsCount || 0, c.assignedCustomersCount || 0]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [99, 102, 241] },
      });
      doc.save(`coordinators-${Date.now()}.pdf`);
    }
  };

  const allSelected = coordinators.length > 0 && selectedIds.size === coordinators.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Coordinators</h1>
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Manage sales coordinators</p>
          </div>
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search coordinators..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-52 outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <button onClick={() => exportCoordinators('excel')} title="Export Excel" className="p-2 rounded-xl border border-slate-200 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition hidden lg:flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          <button onClick={() => exportCoordinators('pdf')} title="Export PDF" className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition hidden lg:flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Coordinator</span>
          </button>
        </div>
        <div className="mt-2 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search coordinators..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      {isDesktop ? (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : coordinators.length === 0 ? (
            <div className="py-12 text-center text-slate-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-40" /><p className="text-sm">No coordinators found</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="w-10 px-4 py-3">
                    <button onClick={toggleAll} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${allSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}>
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reps</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {coordinators.map((c: any) => (
                  <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors cursor-pointer ${selectedIds.has(c.id) ? 'bg-indigo-50/40' : ''}`} onClick={() => navigate(`/admin/coordinators/${c.id}`)}>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); toggleSelect(c.id); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${selectedIds.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'}`}>
                        {selectedIds.has(c.id) && <Check className="w-3 h-3 text-white" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 text-sm">{c.fullName}</p>
                      <p className="text-xs text-slate-400">{c.employeeCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      {c.regionName ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {c.regionName}
                        </span>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        <Users className="w-3 h-3" /> {c.assignedRepsCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                        <TrendingUp className="w-3 h-3" /> {c.assignedCustomersCount || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/admin/coordinators/${c.id}`); }}
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
          {(data as any)?.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/40">
              <span className="text-xs text-slate-500">Page {(data as any)?.page} of {(data as any)?.totalPages}</span>
              <div className="flex gap-1">
                {Array.from({ length: (data as any).totalPages }, (_: any, i: number) => i + 1).map((p: number) => (
                  <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-lg text-xs font-medium transition ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <MobileTileList data={coordinators} keyExtractor={c => c.id} isLoading={isLoading} emptyMessage="No coordinators found" emptyIcon={<Users className="w-10 h-10" />} page={(data as any)?.page} totalPages={(data as any)?.totalPages} onPageChange={setPage}
          renderTile={(c: any) => (
            <div className="p-4" onClick={() => navigate(`/admin/coordinators/${c.id}`)}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <button onClick={e => { e.stopPropagation(); toggleSelect(c.id); }} className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition ${selectedIds.has(c.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                    {selectedIds.has(c.id) && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div>
                    <p className="font-semibold text-slate-900">{c.fullName}</p>
                    <p className="text-xs text-slate-400">{c.employeeCode}</p>
                  </div>
                </div>
                <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />
              </div>
              <div className="flex items-center gap-3 text-xs mb-3">
                {c.regionName && <span className="flex items-center gap-1 text-slate-500"><MapPin className="w-3 h-3" /> {c.regionName}</span>}
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium"><Users className="w-3 h-3" /> {c.assignedRepsCount || 0} reps</span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium"><TrendingUp className="w-3 h-3" /> {c.assignedCustomersCount || 0}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/admin/coordinators/${c.id}`); }}
                className="w-full py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> View Details
              </button>
            </div>
          )}
        />
      )}

      {/* Create Coordinator */}
      {showCreate && (
        <BottomSheet open={true} onClose={() => setShowCreate(false)} title="Create Coordinator">
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
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.fullName || !form.username || !form.password} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">{createMut.isPending ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Selection bar portal */}
      {someSelected && createPortal(
        <div style={{ animation: 'slideDown 0.2s ease-out' }} className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4">
          <div className="bg-slate-900 text-white rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl">
            <span className="text-sm font-medium">{selectedIds.size} coordinator{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => exportCoordinators('excel', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium transition">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button onClick={() => exportCoordinators('pdf', true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium transition">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <div className="w-px h-4 bg-white/20" />
            <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium transition">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
