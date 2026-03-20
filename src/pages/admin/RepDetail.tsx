// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowLeft, MapPin, Users, User, Target, TrendingUp,
  Calendar, Trash2, Plus, BarChart2, ChevronRight, Power,
  ShoppingBag, DollarSign, Eye, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmModal from '../../components/common/ConfirmModal';

// ── Shared small components ────────────────────────────────────────────────

function SelectField({
  label, value, onChange, disabled = false, children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {children}
      </select>
    </div>
  );
}

function InputField({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, icon, action }: { title: string; icon: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-2.5">
        <span className="text-blue-500">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function StatTile({
  label, value, icon, accent = false,
}: {
  label: string; value: string | number; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl shadow-sm ${accent ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-white/20' : 'bg-blue-100'}`}>
        <span className={accent ? 'text-white' : 'text-blue-600'}>{icon}</span>
      </div>
      <div>
        <p className={`text-xl font-bold leading-none ${accent ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        <p className={`text-[11px] mt-1 ${accent ? 'text-blue-100' : 'text-slate-500'}`}>{label}</p>
      </div>
    </div>
  );
}

type Tab = 'overview' | 'targets' | 'customers';

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminRepDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [infoEditMode, setInfoEditMode] = useState(false);
  const [infoForm, setInfoForm] = useState({
    fullName: '',
    employeeCode: '',
    phoneNumber: '',
    hireDate: '',
  });

  const resetAssignmentFields = () => {
    if (!rep) return;
    setSelectedRegionId(rep.regionId || '');
    setSelectedSubRegionId(rep.subRegionId || '');
    setSelectedCoordId(rep.coordinatorId || '');
  };

  const handleTabChange = (tab: Tab) => {
    if (activeTab === 'overview' && tab !== 'overview') {
      resetAssignmentFields();
    }
    setActiveTab(tab);
  };
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [targetForm, setTargetForm] = useState({
    targetPeriod: 'Monthly',
    startDate: '',
    endDate: '',
    targetAmount: '',
  });
  const [selectedCoordId, setSelectedCoordId] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedSubRegionId, setSelectedSubRegionId] = useState('');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: rep, isLoading: repLoading } = useQuery({
    queryKey: ['admin-rep', id],
    queryFn: () => repsApi.adminGetById(id!).then(r => r.data.data),
    enabled: !!id,
    onSuccess: (rep) => {
      setInfoForm({
        fullName: rep.fullName || '',
        employeeCode: rep.employeeCode || '',
        phoneNumber: rep.phoneNumber || '',
        hireDate: rep.hireDate ? rep.hireDate.split('T')[0] : '',
      });
    },
  });

  // Keep edit form in sync with the loaded rep values (so edit mode always starts with current data)
  useEffect(() => {
    if (!rep) return;
    setInfoForm({
      fullName: rep.fullName || '',
      employeeCode: rep.employeeCode || '',
      phoneNumber: rep.phoneNumber || '',
      hireDate: rep.hireDate ? rep.hireDate.split('T')[0] : '',
    });
  }, [rep]);

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
      regionsApi.getSubRegions(selectedRegionId || rep?.regionId).then(r => r.data || []),
    enabled: !!(selectedRegionId || rep?.regionId),
  });

  const { data: coordinatorsData } = useQuery({
    queryKey: ['coordinators-list'],
    queryFn: () => adminGetAllCoordinators(1, 100).then(r => r.items || []),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateMut = useMutation({
    mutationFn: (data: any) => repsApi.adminUpdate(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep', id] });
      qc.invalidateQueries({ queryKey: ['admin-reps'] });
      toast.success('Updated successfully');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const updateInfoMut = useMutation({
    mutationFn: (data: any) => repsApi.adminUpdate(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-rep', id] });
      qc.invalidateQueries({ queryKey: ['admin-reps'] });
      setInfoEditMode(false);
      toast.success('Representative information updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update'),
  });

  const toggleActiveMut = useMutation({
    mutationFn: () => repsApi.adminUpdate(id!, { isActive: !rep?.isActive }),
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const customers = customersData?.items || [];
  const coordinators = coordinatorsData || [];
  const regionList = Array.isArray(regions) ? regions : [];

  useEffect(() => {
    if (!rep) return;
    setSelectedRegionId(rep.regionId || '');
    setSelectedSubRegionId(rep.subRegionId || '');
    setSelectedCoordId(rep.coordinatorId || '');
  }, [rep]);

  const filteredCoordinators = useMemo(() => {
    if (!selectedRegionId) return coordinators;
    return coordinators.filter((c: any) => c.regionId === selectedRegionId);
  }, [coordinators, selectedRegionId]);

  const regionChanged = (selectedRegionId || '') !== (rep?.regionId || '');

  const assignmentChanged =
    regionChanged ||
    (selectedSubRegionId || '') !== (rep?.subRegionId || '') ||
    (selectedCoordId || '') !== (rep?.coordinatorId || '');

  const handleUpdateAssignment = () => {
    updateMut.mutate({
      regionId: selectedRegionId || null,
      subRegionId: selectedSubRegionId || null,
      coordinatorId: selectedCoordId || null,
    });
  };

  const achievementPct = performance
    ? Math.min(Math.round((performance.achievedAmount / (performance.targetAmount || 1)) * 100), 100)
    : 0;

  // ── Loading / Not found ───────────────────────────────────────────────────

  if (repLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading rep details…</p>
        </div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="text-center py-32 text-slate-400">
        <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">Rep not found.</p>
        <button onClick={() => navigate('/admin/reps')} className="mt-4 text-blue-600 text-sm font-medium hover:underline">
          ← Back to Reps
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'targets', label: 'Targets', icon: Target, count: targets?.length ?? 0 },
    { id: 'customers', label: 'Customers', icon: Users, count: rep?.assignedCustomersCount ?? customers.length },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-16 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/reps')}
          className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">{rep.fullName}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              rep.isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {rep.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{rep.employeeCode} &nbsp;·&nbsp; Sales Representative</p>
        </div>

        <button
          onClick={() => toggleActiveMut.mutate()}
          disabled={toggleActiveMut.isPending}
          className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
            rep.isActive
              ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
              : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
          } disabled:opacity-50`}
        >
          <Power className="w-4 h-4" />
          {toggleActiveMut.isPending ? '…' : rep.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>

      {/* ── Snapshot Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Assigned Customers"
          value={rep.assignedCustomersCount ?? customers.length}
          icon={<Users className="w-4 h-4" />}
        />
        <StatTile
          label="Active Targets"
          value={targets?.length ?? 0}
          icon={<Target className="w-4 h-4" />}
        />
        <StatTile
          label="This Month Sales"
          value={performance ? formatCurrency(performance.totalSales) : '—'}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatTile
          label="Target Achievement"
          value={`${achievementPct}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════
          OVERVIEW TAB
      ════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Left column – Rep info + Assignment */}
          <div className="lg:col-span-3 space-y-5">

            {/* Rep Info */}
            <Card>
              <CardHeader
                title="Representative Information"
                icon={<User className="w-4 h-4" />}
                action={
                  infoEditMode ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setInfoEditMode(false);
                          if (rep) {
                            setInfoForm({
                              fullName: rep.fullName || '',
                              employeeCode: rep.employeeCode || '',
                              phoneNumber: rep.phoneNumber || '',
                              hireDate: rep.hireDate ? rep.hireDate.split('T')[0] : '',
                            });
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateInfoMut.mutate({
                          fullName: infoForm.fullName,
                          employeeCode: infoForm.employeeCode,
                          phoneNumber: infoForm.phoneNumber,
                          hireDate: infoForm.hireDate || null,
                        })}
                        disabled={updateInfoMut.isPending}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updateInfoMut.isPending ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setInfoEditMode(true)}
                      className="px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                    >
                      Edit
                    </button>
                  )
                }
              />
              <div className="p-5 divide-y divide-slate-100">
                <div
                  onDoubleClick={() => setInfoEditMode(true)}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Full Name</span>
                    {infoEditMode ? (
                      <input
                        value={infoForm.fullName}
                        onChange={e => setInfoForm(p => ({ ...p, fullName: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{rep.fullName}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Employee Code</span>
                    {infoEditMode ? (
                      <input
                        value={infoForm.employeeCode}
                        onChange={e => setInfoForm(p => ({ ...p, employeeCode: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{rep.employeeCode}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Phone</span>
                    {infoEditMode ? (
                      <input
                        value={infoForm.phoneNumber}
                        onChange={e => setInfoForm(p => ({ ...p, phoneNumber: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{rep.phoneNumber}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Hire Date</span>
                    {infoEditMode ? (
                      <input
                        type="date"
                        value={infoForm.hireDate}
                        onChange={e => setInfoForm(p => ({ ...p, hireDate: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{rep.hireDate ? formatDate(rep.hireDate) : '—'}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Email</span>
                    <span className="text-sm font-medium text-slate-800 text-right truncate">{rep.email}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Assignment – editable dropdowns */}
            <Card>
              <CardHeader title="Assignment" icon={<MapPin className="w-4 h-4" />} />
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <SelectField
                    label="Region"
                    value={selectedRegionId}
                    onChange={v => { setSelectedRegionId(v); setSelectedSubRegionId(''); setSelectedCoordId(''); }}
                  >
                    <option value="">Select region…</option>
                    {regionList.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Sub-Region"
                    value={selectedSubRegionId}
                    onChange={setSelectedSubRegionId}
                    disabled={!regionChanged}
                  >
                    <option value="">Select sub-region…</option>
                    {(subRegions || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="Coordinator"
                    value={selectedCoordId}
                    onChange={setSelectedCoordId}
                    disabled={!regionChanged}
                  >
                    <option value="">Select coordinator…</option>
                    {filteredCoordinators.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </SelectField>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleUpdateAssignment}
                    disabled={!assignmentChanged || updateMut.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
                               hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {updateMut.isPending ? 'Updating…' : 'Update Assignment'}
                  </button>
                </div>
              </div>
            </Card>

          </div>

          {/* Right column – Performance + Customers preview */}
          <div className="lg:col-span-2 space-y-5">

            {/* This Month */}
            <Card>
              <CardHeader title="This Month" icon={<TrendingUp className="w-4 h-4" />} />
              {performance ? (
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Sales', value: formatCurrency(performance.totalSales), icon: <DollarSign className="w-3.5 h-3.5" /> },
                      { label: 'Orders', value: performance.totalOrders, icon: <Package className="w-3.5 h-3.5" /> },
                      { label: 'Customers Visited', value: performance.customersVisited, icon: <Eye className="w-3.5 h-3.5" /> },
                      { label: 'Collected', value: formatCurrency(performance.collectedPayments), icon: <DollarSign className="w-3.5 h-3.5" /> },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-blue-500">{s.icon}</span>
                          <span className="text-[11px] text-slate-500">{s.label}</span>
                        </div>
                        <p className="text-base font-bold text-slate-900">{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {performance.targetAmount > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-medium">Target Progress</span>
                        <span className="text-xs font-bold text-blue-700">{achievementPct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all duration-700"
                          style={{ width: `${achievementPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[11px] text-slate-400">{formatCurrency(performance.achievedAmount)} achieved</span>
                        <span className="text-[11px] text-slate-400">of {formatCurrency(performance.targetAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">No performance data yet</div>
              )}
            </Card>

            {/* Customers preview */}
            <Card>
              <CardHeader
                title="Assigned Customers"
                icon={<Users className="w-4 h-4" />}
                action={
                  <button
                    onClick={() => handleTabChange('customers')}
                    className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                }
              />
              {customers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  No customers assigned
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customers.slice(0, 5).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                        {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-slate-800 truncate">{c.shopName || c.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email || 'No email'}</p>
                      </button>
                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="text-slate-300 hover:text-slate-500 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {customers.length > 5 && (
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="w-full py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition text-center"
                    >
                      +{customers.length - 5} more customers
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TARGETS TAB
      ════════════════════════════════════════════ */}
      {activeTab === 'targets' && (
        <div className="space-y-5">

          {/* Add Target form */}
          <Card>
            <CardHeader title="New Target" icon={<Plus className="w-4 h-4" />} />
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SelectField
                  label="Period"
                  value={targetForm.targetPeriod}
                  onChange={v => setTargetForm(p => ({ ...p, targetPeriod: v }))}
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                </SelectField>
                <InputField
                  label="Start Date"
                  type="date"
                  value={targetForm.startDate}
                  onChange={v => setTargetForm(p => ({ ...p, startDate: v }))}
                />
                <InputField
                  label="End Date"
                  type="date"
                  value={targetForm.endDate}
                  onChange={v => setTargetForm(p => ({ ...p, endDate: v }))}
                />
                <InputField
                  label="Amount (LKR)"
                  type="number"
                  placeholder="0"
                  value={targetForm.targetAmount}
                  onChange={v => setTargetForm(p => ({ ...p, targetAmount: v }))}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setTargetMut.mutate({
                    targetPeriod: targetForm.targetPeriod,
                    startDate: targetForm.startDate,
                    endDate: targetForm.endDate,
                    targetAmount: Number(targetForm.targetAmount),
                  })}
                  disabled={setTargetMut.isPending || !targetForm.startDate || !targetForm.endDate || !targetForm.targetAmount}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold
                             hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Plus className="w-4 h-4" />
                  {setTargetMut.isPending ? 'Saving…' : 'Add Target'}
                </button>
              </div>
            </div>
          </Card>

          {/* Targets list */}
          {!targets || targets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">No targets set yet</p>
              <p className="text-sm mt-1">Add a target using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targets.map((t: any) => {
                const pct = t.targetAmount > 0
                  ? Math.min(Math.round((t.achievedAmount / t.targetAmount) * 100), 100)
                  : 0;
                const isAchieved = t.status === 'Achieved';
                return (
                  <Card key={t.id}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-900">{t.targetPeriod}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isAchieved
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(t.startDate)} – {formatDate(t.endDate)}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeleteTargetId(t.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">Progress</span>
                        <span className="text-sm font-bold text-slate-900">{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isAchieved ? 'bg-blue-600' : 'bg-blue-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">{formatCurrency(t.achievedAmount)}</span>
                        <span className="text-xs text-slate-400">of {formatCurrency(t.targetAmount)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          CUSTOMERS TAB
      ════════════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">{customers.length} customer{customers.length !== 1 ? 's' : ''} assigned</p>
          </div>

          {customers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">No customers assigned</p>
              <p className="text-sm mt-1">Customers become visible to reps through route assignment.</p>
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-slate-100">
                {customers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition group">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                      {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                    </div>

                    <button
                      onClick={() => navigate(`/admin/customers/${c.id}`)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.shopName || c.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">{c.email || 'No email'}</p>
                    </button>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />

                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="text-slate-300 hover:text-slate-500 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        open={!!deleteTargetId}
        title="Delete Target"
        description="Are you sure you want to delete this sales target? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="orange"
        onConfirm={() => { if (deleteTargetId) deleteTargetMut.mutate(deleteTargetId); }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}