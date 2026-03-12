// @ts-nocheck
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowLeft, MapPin, Users, Target, TrendingUp, Phone, Mail,
  Calendar, Trash2, Plus, BarChart2, ChevronRight, Power,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';
import BottomSheet from '../../components/common/BottomSheet';
import ConfirmModal from '../../components/common/ConfirmModal';

type Tab = 'overview' | 'targets' | 'customers';

export default function AdminRepDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Modals
  const [showSetTarget, setShowSetTarget] = useState(false);
  const [showChangeCoord, setShowChangeCoord] = useState(false);
  const [showChangeRegion, setShowChangeRegion] = useState(false);
  const [showChangeSubRegion, setShowChangeSubRegion] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Forms
  const [targetForm, setTargetForm] = useState({
    targetPeriod: 'Monthly',
    startDate: '',
    endDate: '',
    targetAmount: '',
  });
  const [selectedCoordId, setSelectedCoordId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedSubRegionId, setSelectedSubRegionId] = useState('');

  // Queries
  const { data: rep, isLoading: repLoading } = useQuery({
    queryKey: ['admin-rep', id],
    queryFn: () => repsApi.adminGetById(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: performance } = useQuery({
    queryKey: ['admin-rep-performance', id],
    queryFn: () =>
      repsApi.adminGetPerformance(id!, {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        to: new Date().toISOString(),
      }).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: targets } = useQuery({
    queryKey: ['admin-rep-targets', id],
    queryFn: () => repsApi.adminGetTargets(id!).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: customersData } = useQuery({
    queryKey: ['admin-rep-customers', id],
    queryFn: () =>
      customersApi.adminGetAll({ page: 1, pageSize: 200, assignedRepId: id }).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => regionsApi.getAll().then(r => r.data || []),
  });

  const { data: subRegions } = useQuery({
    queryKey: ['sub-regions', selectedRegionId || rep?.regionId],
    queryFn: () =>
      regionsApi
        .getSubRegions(selectedRegionId || rep?.regionId)
        .then(r => r.data || []),
    enabled: !!(selectedRegionId || rep?.regionId),
  });

  const { data: coordinatorsData } = useQuery({
    queryKey: ['coordinators-list'],
    queryFn: () => adminGetAllCoordinators(1, 100).then(r => r.items || []),
  });

  // Mutations
  const updateMut = useMutation({
    mutationFn: (data: any) => repsApi.adminUpdate(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep', id] });
      qc.invalidateQueries({ queryKey: ['admin-reps'] });
      setShowChangeCoord(false);
      setShowChangeRegion(false);
      setShowChangeSubRegion(false);
      toast.success('Updated successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: () =>
      repsApi.adminUpdate(id!, { isActive: !rep?.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep', id] });
      qc.invalidateQueries({ queryKey: ['admin-reps'] });
      toast.success(rep?.isActive ? 'Rep deactivated' : 'Rep activated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const setTargetMut = useMutation({
    mutationFn: (data: any) => repsApi.adminSetTarget(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep-targets', id] });
      setShowSetTarget(false);
      setTargetForm({ targetPeriod: 'Monthly', startDate: '', endDate: '', targetAmount: '' });
      toast.success('Target set');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteTargetMut = useMutation({
    mutationFn: (targetId: string) => repsApi.adminDeleteTarget(targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep-targets', id] });
      setDeleteTargetId(null);
      toast.success('Target deleted');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const customers = customersData?.items || [];
  const coordinators = coordinatorsData || [];
  const regionList = Array.isArray(regions) ? regions : [];

  if (repLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="text-center py-24 text-slate-400">
        <p>Rep not found.</p>
        <button onClick={() => navigate('/admin/reps')} className="mt-4 text-indigo-600 text-sm underline">
          Back to Reps
        </button>
      </div>
    );
  }

  const achievementPct = performance
    ? Math.min(Math.round((performance.achievedAmount / (performance.targetAmount || 1)) * 100), 100)
    : 0;

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'targets', label: 'Targets', icon: Target, count: targets?.length ?? 0 },
    { id: 'customers', label: 'Customers', icon: Users, count: rep?.assignedCustomersCount ?? customers.length },
  ];

  return (
    <div className="animate-fade-in pb-10">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm lg:-mx-8 lg:px-8 flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/reps')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate leading-tight">{rep.fullName}</h1>
          <p className="text-[11px] text-slate-400">{rep.employeeCode}</p>
        </div>
        <button
          onClick={() => toggleActiveMut.mutate()}
          disabled={toggleActiveMut.isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition disabled:opacity-60 ${
            rep.isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {toggleActiveMut.isPending ? '...' : (rep.isActive ? 'Active' : 'Inactive')}
        </button>
      </div>

      {/* ── Hero Profile Card ── */}
      <div className="mt-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-indigo-200">
        <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="absolute bottom-0 left-1/2 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-2xl font-extrabold shadow-inner">
            {rep.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{rep.fullName}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{rep.employeeCode}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {rep.email && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Mail className="w-3 h-3" /> {rep.email}
                </span>
              )}
              {rep.phoneNumber && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Phone className="w-3 h-3" /> {rep.phoneNumber}
                </span>
              )}
              {rep.hireDate && (
                <span className="inline-flex items-center gap-1.5 bg-white/15 rounded-full px-2.5 py-1 text-[11px]">
                  <Calendar className="w-3 h-3" /> Since {formatDate(rep.hireDate)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
          <div className="text-center">
            <p className="text-xl font-bold">{rep.assignedCustomersCount ?? customers.length}</p>
            <p className="text-indigo-200 text-[11px]">Customers</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-xl font-bold">{targets?.length ?? 0}</p>
            <p className="text-indigo-200 text-[11px]">Targets</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{achievementPct}%</p>
            <p className="text-indigo-200 text-[11px]">Achievement</p>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="mt-5 flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-300 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="mt-4 space-y-4">
          {/* Assignment */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" /> Assignment
              </h3>
            </div>
            {[
              { label: 'Region', value: rep.regionName, action: () => setShowChangeRegion(true), color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Sub-Region', value: rep.subRegionName, action: () => setShowChangeSubRegion(true), color: 'bg-purple-50 text-purple-600' },
              { label: 'Coordinator', value: rep.coordinatorName, action: () => setShowChangeCoord(true), color: 'bg-teal-50 text-teal-600' },
            ].map((item, idx) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition text-left ${idx < 2 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold ${item.color}`}>
                    {item.label[0]}
                  </span>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium">{item.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{item.value || <span className="text-slate-400 italic font-normal">Not assigned</span>}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[10px]">{item.value ? 'Change' : 'Assign'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          {/* Performance */}
          {performance && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> This Month
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Total Sales', value: formatCurrency(performance.totalSales), color: 'from-emerald-400 to-teal-500' },
                  { label: 'Orders', value: performance.totalOrders, color: 'from-blue-400 to-indigo-500' },
                  { label: 'Visited', value: performance.customersVisited, color: 'from-violet-400 to-purple-500' },
                  { label: 'Collected', value: formatCurrency(performance.collectedPayments), color: 'from-amber-400 to-orange-500' },
                ].map(stat => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 text-white`}>
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-[11px] text-white/80 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              {performance.targetAmount > 0 && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Target Progress</span>
                    <span className="text-xs font-semibold text-slate-700">{achievementPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700"
                      style={{ width: `${achievementPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] text-slate-400">{formatCurrency(performance.achievedAmount)} achieved</span>
                    <span className="text-[11px] text-slate-400">Target: {formatCurrency(performance.targetAmount)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Targets Tab ── */}
      {activeTab === 'targets' && (
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowSetTarget(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-amber-300 rounded-2xl text-amber-600 text-sm font-semibold hover:bg-amber-50 transition"
          >
            <Plus className="w-4 h-4" /> Add New Target
          </button>
          {!targets || targets.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No targets set yet</p>
            </div>
          ) : (
            targets.map((t: any) => {
              const pct = t.targetAmount > 0
                ? Math.min(Math.round((t.achievedAmount / t.targetAmount) * 100), 100)
                : 0;
              const isAchieved = t.status === 'Achieved';
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-sm font-bold text-slate-900">{t.targetPeriod}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(t.startDate)} – {formatDate(t.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isAchieved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                      <button
                        onClick={() => setDeleteTargetId(t.id)}
                        className="p-1.5 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isAchieved ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-500">
                      {formatCurrency(t.achievedAmount)} <span className="text-slate-300">/</span> {formatCurrency(t.targetAmount)}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{pct}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Customers Tab ── */}
      {activeTab === 'customers' && (
        <div className="mt-4 space-y-2">
          {customers.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No customers assigned</p>
            </div>
          ) : (
            customers.map((c: any) => (
              <button
                key={c.id}
                onClick={() => navigate(`/admin/customers/${c.id}`)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 flex-shrink-0">
                  {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.shopName || c.fullName}</p>
                  <p className="text-xs text-slate-400 truncate">{c.email}</p>
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

      {/* === Set Target Modal === */}
      {showSetTarget && (
        <BottomSheet open={true} onClose={() => setShowSetTarget(false)} title="Set Sales Target">
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Period</label>
              <select
                value={targetForm.targetPeriod}
                onChange={e => setTargetForm(p => ({ ...p, targetPeriod: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
              >
                <option>Monthly</option><option>Quarterly</option><option>Yearly</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={targetForm.startDate}
                  onChange={e => setTargetForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={targetForm.endDate}
                  onChange={e => setTargetForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Amount (LKR)</label>
              <input
                type="number"
                value={targetForm.targetAmount}
                onChange={e => setTargetForm(p => ({ ...p, targetAmount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowSetTarget(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => setTargetMut.mutate({
                  targetPeriod: targetForm.targetPeriod,
                  startDate: targetForm.startDate,
                  endDate: targetForm.endDate,
                  targetAmount: Number(targetForm.targetAmount),
                })}
                disabled={setTargetMut.isPending || !targetForm.startDate || !targetForm.endDate || !targetForm.targetAmount}
                className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {setTargetMut.isPending ? 'Saving...' : 'Set Target'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* === Change Coordinator Modal === */}
      {showChangeCoord && (
        <BottomSheet open={true} onClose={() => setShowChangeCoord(false)} title="Change Coordinator">
          <div className="p-5 space-y-4">
            <select
              value={selectedCoordId}
              onChange={e => setSelectedCoordId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
            >
              <option value="">Select coordinator...</option>
              {coordinators.map((c: any) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowChangeCoord(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => updateMut.mutate({ coordinatorId: selectedCoordId })}
                disabled={updateMut.isPending || !selectedCoordId}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {updateMut.isPending ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* === Change Region Modal === */}
      {showChangeRegion && (
        <BottomSheet open={true} onClose={() => setShowChangeRegion(false)} title="Change Region">
          <div className="p-5 space-y-4">
            <select
              value={selectedRegionId}
              onChange={e => setSelectedRegionId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
            >
              <option value="">Select region...</option>
              {regionList.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowChangeRegion(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => updateMut.mutate({ regionId: selectedRegionId, subRegionId: null })}
                disabled={updateMut.isPending || !selectedRegionId}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {updateMut.isPending ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* === Change Sub-Region Modal === */}
      {showChangeSubRegion && (
        <BottomSheet open={true} onClose={() => setShowChangeSubRegion(false)} title="Change Sub-Region">
          <div className="p-5 space-y-4">
            {!rep.regionId && !selectedRegionId && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                Please change the region first, or a region must be assigned.
              </p>
            )}
            <select
              value={selectedSubRegionId}
              onChange={e => setSelectedSubRegionId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
            >
              <option value="">Select sub-region...</option>
              {(subRegions || []).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowChangeSubRegion(false)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600">Cancel</button>
              <button
                onClick={() => updateMut.mutate({ subRegionId: selectedSubRegionId })}
                disabled={updateMut.isPending || !selectedSubRegionId}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {updateMut.isPending ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Delete Target Confirm */}
      <ConfirmModal
        open={!!deleteTargetId}
        title="Delete Target"
        description="Are you sure you want to delete this sales target? The rep will be notified."
        confirmLabel="Delete"
        confirmVariant="orange"
        onConfirm={() => { if (deleteTargetId) deleteTargetMut.mutate(deleteTargetId); }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
