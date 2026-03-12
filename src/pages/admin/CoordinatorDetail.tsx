// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCoordinator, adminUpdateCoordinator, adminAssignRepToCoordinator } from '../../services/api/coordinatorApi';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { regionsApi } from '../../services/api/regionsApi';
import { formatDate } from '../../utils/formatters';
import {
  ArrowLeft, MapPin, Users, Phone, Mail, Calendar,
  ChevronRight, BarChart2, TrendingUp, Power, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';
import BottomSheet from '../../components/common/BottomSheet';

type Tab = 'overview' | 'reps' | 'customers';

export default function AdminCoordinatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [showAssignRep, setShowAssignRep] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', regionId: '' });
  const [selectedRepId, setSelectedRepId] = useState('');

  // Queries
  const { data: coordinator, isLoading } = useQuery({
    queryKey: ['admin-coordinator', id],
    queryFn: () => adminGetCoordinator(id!),
    enabled: !!id,
    onSuccess: (d: any) => {
      setEditForm({ fullName: d.fullName, phoneNumber: d.phoneNumber || '', regionId: d.regionId || '' });
    },
  });

  const { data: repsData } = useQuery({
    queryKey: ['admin-coordinator-reps', id],
    queryFn: () => repsApi.adminGetAll({ page: 1, pageSize: 200, coordinatorId: id }).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: customersData } = useQuery({
    queryKey: ['admin-coordinator-customers', id],
    queryFn: () => customersApi.adminGetAll({ page: 1, pageSize: 200, assignedCoordinatorId: id }).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.getAll().then(r => r.data || []),
  });

  const { data: allRepsData } = useQuery({
    queryKey: ['admin-reps-all'],
    queryFn: () => repsApi.adminGetAll({ page: 1, pageSize: 200 }).then(r => r.data.data),
    enabled: showAssignRep,
  });

  // Mutations
  const updateMut = useMutation({
    mutationFn: (data: any) => adminUpdateCoordinator(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinators'] });
      setShowEdit(false);
      toast.success('Coordinator updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: () => adminUpdateCoordinator(id!, { isActive: !coordinator?.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinators'] });
      toast.success(coordinator?.isActive ? 'Coordinator deactivated' : 'Coordinator activated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const assignRepMut = useMutation({
    mutationFn: () => adminAssignRepToCoordinator(id!, selectedRepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator-reps', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      setShowAssignRep(false);
      setSelectedRepId('');
      toast.success('Rep assigned to coordinator');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const reps = (repsData as any)?.items || [];
  const customers = (customersData as any)?.items || [];
  const regionList = Array.isArray(regionsData) ? regionsData : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!coordinator) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p>Coordinator not found.</p>
        <button onClick={() => navigate('/admin/coordinators')} className="mt-4 text-indigo-600 text-sm underline">
          Back to Coordinators
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'reps', label: 'Reps', icon: Users, count: coordinator.assignedRepsCount },
    { id: 'customers', label: 'Customers', icon: TrendingUp, count: coordinator.assignedCustomersCount },
  ];

  return (
    <div className="animate-fade-in pb-10">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm lg:-mx-8 lg:px-8 flex items-center gap-3">
        <button onClick={() => navigate('/admin/coordinators')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">{coordinator.fullName}</h1>
          <p className="text-[11px] text-slate-400">{coordinator.employeeCode}</p>
        </div>
        <button
          onClick={() => toggleActiveMut.mutate()}
          disabled={toggleActiveMut.isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition disabled:opacity-60 ${
            coordinator.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {toggleActiveMut.isPending ? '...' : (coordinator.isActive ? 'Active' : 'Inactive')}
        </button>
      </div>

      {/* ── Hero Profile Card ── */}
      <div className="mt-5 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-teal-200">
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 left-1/2 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-2xl font-extrabold shadow-inner">
            {coordinator.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{coordinator.fullName}</h2>
            <p className="text-teal-200 text-sm mt-0.5">{coordinator.employeeCode}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coordinator.email && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Mail className="w-3 h-3" /> {coordinator.email}
                </span>
              )}
              {coordinator.phoneNumber && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Phone className="w-3 h-3" /> {coordinator.phoneNumber}
                </span>
              )}
              {coordinator.hireDate && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Calendar className="w-3 h-3" /> Since {formatDate(coordinator.hireDate)}
                </span>
              )}
              {coordinator.regionName && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <MapPin className="w-3 h-3" /> {coordinator.regionName}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-2 border-t border-white/20 pt-4">
          <div className="text-center">
            <p className="text-xl font-bold">{coordinator.assignedRepsCount}</p>
            <p className="text-teal-200 text-[11px]">Sales Reps</p>
          </div>
          <div className="text-center border-l border-white/20">
            <p className="text-xl font-bold">{coordinator.assignedCustomersCount}</p>
            <p className="text-teal-200 text-[11px]">Customers</p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="mt-5 flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-teal-100 text-teal-600' : 'bg-slate-300 text-slate-600'}`}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="mt-4 space-y-4">
          {/* Profile Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Coordinator Details</h3>
            </div>
            {[
              { label: 'Full Name', value: coordinator.fullName },
              { label: 'Employee Code', value: coordinator.employeeCode },
              { label: 'Email', value: coordinator.email },
              { label: 'Phone', value: coordinator.phoneNumber },
              { label: 'Region', value: coordinator.regionName },
              { label: 'Hire Date', value: coordinator.hireDate ? formatDate(coordinator.hireDate) : undefined },
            ].filter(i => i.value).map((item, idx, arr) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 ${idx < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <span className="text-xs text-slate-400 font-medium w-32 flex-shrink-0">{item.label}</span>
                <span className="text-sm font-medium text-slate-800 text-right">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
            </div>
            {[
              { label: 'Edit Details', sublabel: 'Update name, phone, region', icon: BarChart2, color: 'bg-indigo-50 text-indigo-600', action: () => { setEditForm({ fullName: coordinator.fullName, phoneNumber: coordinator.phoneNumber || '', regionId: coordinator.regionId || '' }); setShowEdit(true); } },
              { label: 'Assign Rep', sublabel: 'Add a sales rep to this coordinator', icon: UserPlus, color: 'bg-teal-50 text-teal-600', action: () => setShowAssignRep(true) },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={item.action}
                  className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left ${idx === 0 ? 'border-b border-slate-50' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                      <p className="text-[11px] text-slate-400">{item.sublabel}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Reps Tab ── */}
      {activeTab === 'reps' && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowAssignRep(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-teal-300 rounded-2xl text-teal-600 text-sm font-semibold hover:bg-teal-50 transition"
          >
            <UserPlus className="w-4 h-4" /> Assign Rep
          </button>
          {reps.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No reps assigned</p>
            </div>
          ) : (
            reps.map((r: any) => (
              <button
                key={r.id}
                onClick={() => navigate(`/admin/reps/${r.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 flex-shrink-0">
                  {(r.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.fullName}</p>
                  <p className="text-xs text-slate-400">{r.employeeCode} · {r.regionName || 'No region'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Customers Tab ── */}
      {activeTab === 'customers' && (
        <div className="mt-4 space-y-2">
          {customers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No customers in this coordinator's region</p>
            </div>
          ) : (
            customers.map((c: any) => (
              <button
                key={c.id}
                onClick={() => navigate(`/admin/customers/${c.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-600 flex-shrink-0">
                  {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.shopName || c.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{c.email || '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Edit Coordinator Modal ── */}
      {showEdit && (
        <BottomSheet open={true} onClose={() => setShowEdit(false)} title="Edit Coordinator">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input value={editForm.phoneNumber} onChange={e => setEditForm(p => ({ ...p, phoneNumber: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Region</label>
              <select value={editForm.regionId} onChange={e => setEditForm(p => ({ ...p, regionId: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                <option value="">No region</option>
                {regionList.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => updateMut.mutate({ fullName: editForm.fullName, phoneNumber: editForm.phoneNumber, regionId: editForm.regionId || null })}
                disabled={updateMut.isPending || !editForm.fullName}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {updateMut.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── Assign Rep Modal ── */}
      {showAssignRep && (
        <BottomSheet open={true} onClose={() => setShowAssignRep(false)} title="Assign Sales Rep">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Sales Rep</label>
              <select value={selectedRepId} onChange={e => setSelectedRepId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none">
                <option value="">Choose a rep...</option>
                {((allRepsData as any)?.items || []).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.fullName} ({r.employeeCode})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssignRep(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => assignRepMut.mutate()}
                disabled={!selectedRepId || assignRepMut.isPending}
                className="flex-1 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {assignRepMut.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
