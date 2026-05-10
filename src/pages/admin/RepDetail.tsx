// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import { authApi } from '../../services/api/authApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowLeft, MapPin, Users, User, Target, TrendingUp,
  Calendar, Trash2, Plus, BarChart2, ChevronRight, Power,
  ShoppingBag, DollarSign, Eye, Package, KeyRound, Copy
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
    setSelectedRegionIds(rep.regionIds || []);
    setSelectedSubRegionIds(rep.subRegionIds || []);
    setSelectedCoordIds(rep.coordinatorIds || []);
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
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string>('');
  const [selectedCoordIds, setSelectedCoordIds] = useState<string[]>([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([]);
  const [selectedSubRegionIds, setSelectedSubRegionIds] = useState<string[]>([]);

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

  // Keep edit form in sync with the loaded rep values
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

  const resetTempPasswordMut = useMutation({
    mutationFn: () => authApi.adminResetUserTempPassword(rep.userId),
    onSuccess: (res) => {
      const temp = res.data.data.temporaryPassword;
      setGeneratedTempPassword(temp);
      qc.invalidateQueries({ queryKey: ['admin-rep', id] });
      toast.success('New password generated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to generate password'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const customers = customersData?.items || [];
  const coordinators = coordinatorsData || [];
  const regionList = Array.isArray(regions) ? regions : [];

  useEffect(() => {
    if (!rep) return;
    setSelectedRegionIds(rep.regionIds || []);
    setSelectedSubRegionIds(rep.subRegionIds || []);
    setSelectedCoordIds(rep.coordinatorIds || []);
  }, [rep]);

  const allSubRegions = useMemo(() => {
    return regionList.flatMap((r: any) => (r.subRegions || []).map((s: any) => ({ ...s, regionName: r.name })));
  }, [regionList]);

  const assignmentChanged =
    JSON.stringify([...selectedRegionIds].sort()) !== JSON.stringify([...(rep?.regionIds || [])].sort()) ||
    JSON.stringify([...selectedSubRegionIds].sort()) !== JSON.stringify([...(rep?.subRegionIds || [])].sort()) ||
    JSON.stringify([...selectedCoordIds].sort()) !== JSON.stringify([...(rep?.coordinatorIds || [])].sort());

  const handleUpdateAssignment = () => {
    updateMut.mutate({
      regionIds: selectedRegionIds,
      subRegionIds: selectedSubRegionIds,
      coordinatorIds: selectedCoordIds,
    });
  };

  const achievementPct = performance
    ? Math.min(Math.round((performance.achievedAmount / (performance.targetAmount || 1)) * 100), 100)
    : 0;
  const visibleTempPassword = generatedTempPassword || rep?.temporaryPassword || '';

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

            {/* Credentials Card (New Layout) */}
            <Card>
              <CardHeader title="Credentials" icon={<KeyRound className="w-4 h-4" />} />
              <div className="p-5 flex flex-col">
                
                {/* Username Row */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Username</span>
                  
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg w-fit">
                    <span className="text-sm text-slate-700 font-medium select-all">
                      {rep.employeeCode || rep.username || '-'}
                    </span>
                    <button
                      onClick={() => {
                        const text = rep.employeeCode || rep.username || '';
                        if (text && text !== '-') {
                          navigator.clipboard.writeText(text);
                          toast.success('Username copied!');
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors ml-1"
                      title="Copy Username"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Password Row */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-3">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Current Password</span>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-lg w-fit">
                      <span className="text-sm text-slate-700 font-medium select-all">
                        {visibleTempPassword || '-'}
                      </span>
                      <button
                        onClick={() => {
                          if (visibleTempPassword && visibleTempPassword !== '-') {
                            navigator.clipboard.writeText(visibleTempPassword);
                            toast.success('Password copied!');
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors ml-1"
                        title="Copy Password"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => resetTempPasswordMut.mutate()}
                      disabled={resetTempPasswordMut.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 transition-all disabled:opacity-50 shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {resetTempPasswordMut.isPending ? 'Generating…' : 'Generate New'}
                    </button>
                  </div>
                </div>
                
              </div>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader
                title="Territory Assignment"
                icon={<MapPin className="w-4 h-4" />}
                action={
                  assignmentChanged && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200 animate-pulse">
                      Unsaved changes
                    </span>
                  )
                }
              />
              <div className="p-5 space-y-5">

                {/* Current summary chips */}
                {(rep.regionIds?.length > 0 || rep.subRegionIds?.length > 0 || rep.coordinatorIds?.length > 0) && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Currently Assigned</p>
                    {rep.regionIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider w-20 pt-1">Regions</span>
                        {rep.regionNames?.map((name: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                            <MapPin className="w-2.5 h-2.5" />{name}
                          </span>
                        ))}
                      </div>
                    )}
                    {rep.subRegionIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider w-20 pt-1">Sub-Reg.</span>
                        {rep.subRegionNames?.map((name: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                    {rep.coordinatorIds?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider w-20 pt-1">Coord.</span>
                        {rep.coordinatorNames?.map((name: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-full border border-violet-200">
                            <User className="w-2.5 h-2.5" />{name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox panels */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Regions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Regions</label>
                      {selectedRegionIds.length > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">{selectedRegionIds.length}</span>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {regionList.length === 0 ? (
                        <p className="text-xs text-slate-400 p-3">None available</p>
                      ) : regionList.map((r: any) => (
                        <label key={r.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                          selectedRegionIds.includes(r.id) ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedRegionIds.includes(r.id)}
                            onChange={() => setSelectedRegionIds(prev =>
                              prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id]
                            )}
                            className="accent-blue-600 w-3.5 h-3.5"
                          />
                          <span className={`text-sm ${selectedRegionIds.includes(r.id) ? 'text-blue-700 font-medium' : 'text-slate-700'}`}>
                            {r.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Regions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Sub-Regions</label>
                      {selectedSubRegionIds.length > 0 && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">{selectedSubRegionIds.length}</span>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {allSubRegions.length === 0 ? (
                        <p className="text-xs text-slate-400 p-3">None available</p>
                      ) : allSubRegions.map((s: any) => (
                        <label key={s.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                          selectedSubRegionIds.includes(s.id) ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedSubRegionIds.includes(s.id)}
                            onChange={() => setSelectedSubRegionIds(prev =>
                              prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                            )}
                            className="accent-indigo-600 w-3.5 h-3.5"
                          />
                          <span className={`text-sm ${selectedSubRegionIds.includes(s.id) ? 'text-indigo-700 font-medium' : 'text-slate-700'}`}>
                            {s.name}
                            <span className="text-slate-400 text-[11px] ml-1">({s.regionName})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Coordinators */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-violet-600 uppercase tracking-wider">Coordinators</label>
                      {selectedCoordIds.length > 0 && (
                        <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full">{selectedCoordIds.length}</span>
                      )}
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {coordinators.length === 0 ? (
                        <p className="text-xs text-slate-400 p-3">None available</p>
                      ) : coordinators.map((c: any) => (
                        <label key={c.id} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                          selectedCoordIds.includes(c.id) ? 'bg-violet-50 border-l-2 border-violet-500' : 'hover:bg-slate-50 border-l-2 border-transparent'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCoordIds.includes(c.id)}
                            onChange={() => setSelectedCoordIds(prev =>
                              prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                            )}
                            className="accent-violet-600 w-3.5 h-3.5"
                          />
                          <span className={`text-sm ${selectedCoordIds.includes(c.id) ? 'text-violet-700 font-medium' : 'text-slate-700'}`}>
                            {c.fullName}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    onClick={resetAssignmentFields}
                    className="text-xs text-slate-400 hover:text-slate-600 font-medium transition"
                  >
                    Reset changes
                  </button>
                  <button
                    onClick={handleUpdateAssignment}
                    disabled={!assignmentChanged || updateMut.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold
                               hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    {updateMut.isPending ? 'Saving…' : 'Save Assignment'}
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