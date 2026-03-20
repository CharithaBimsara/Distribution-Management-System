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
  ChevronRight, BarChart2, TrendingUp, Power, UserPlus, User, UserMinus, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/common/StatusBadge';
import BottomSheet from '../../components/common/BottomSheet';

// ── Shared small components ────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title, icon, action,
}: { title: string; icon: React.ReactNode; action?: React.ReactNode }) {
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
}: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 p-4 rounded-xl ${accent ? 'bg-blue-600 text-white' : 'bg-slate-50'}`}>
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

function InputField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      >
        {children}
      </select>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type Tab = 'overview' | 'reps' | 'customers';

export default function AdminCoordinatorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [infoEditMode, setInfoEditMode] = useState(false);
  const [infoForm, setInfoForm] = useState({ fullName: '', employeeCode: '', phoneNumber: '', regionId: '', hireDate: '' });
  const [showAssignRep, setShowAssignRep] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState('');
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ shopName: '', email: '', phoneNumber: '' });

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: coordinator, isLoading } = useQuery({
    queryKey: ['admin-coordinator', id],
    queryFn: () => adminGetCoordinator(id!),
    enabled: !!id,
    onSuccess: (d: any) => {
      setInfoForm({
        fullName: d.fullName,
        employeeCode: d.employeeCode || '',
        phoneNumber: d.phoneNumber || '',
        regionId: d.regionId || '',
        hireDate: d.hireDate ? d.hireDate.split('T')[0] : '',
      });
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

  const { data: availableCustomersData } = useQuery({
    queryKey: ['admin-coordinator-available-customers', id],
    queryFn: () => customersApi.adminGetAll({ page: 1, pageSize: 200, regionId: coordinator?.regionId }).then(r => r.data.data),
    enabled: !!id && !!coordinator?.regionId,
  });

  const createCustomerMut = useMutation({
    mutationFn: (data: any) => customersApi.adminCreate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator-customers', id] });
      setShowCreateCustomer(false);
      setNewCustomerForm({ shopName: '', email: '', phoneNumber: '' });
      toast.success('Customer created');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create customer'),
  });

  const assignCustomerMut = useMutation({
    mutationFn: (customerId: string) => customersApi.adminUpdate(customerId, { assignedCoordinatorId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator-customers', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinator-available-customers', id] });
      toast.success('Customer assigned');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to assign customer'),
  });

  const unassignCustomerMut = useMutation({
    mutationFn: (customerId: string) => customersApi.adminUpdate(customerId, { clearAssignedCoordinator: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator-customers', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinator-available-customers', id] });
      toast.success('Customer unassigned');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to unassign customer'),
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

  // ── Mutations ─────────────────────────────────────────────────────────────

  const updateMut = useMutation({
    mutationFn: (data: any) => adminUpdateCoordinator(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinators'] });
      toast.success('Coordinator updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const updateInfoMut = useMutation({
    mutationFn: (data: any) => adminUpdateCoordinator(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinators'] });
      setInfoEditMode(false);
      toast.success('Coordinator information updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update'),
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

  const [unassigningRepId, setUnassigningRepId] = useState<string | null>(null);
  const unassignRepMut = useMutation({
    mutationFn: (repId: string) => repsApi.adminUnassignCoordinator(repId),
    onMutate: (repId: string) => setUnassigningRepId(repId),
    onSettled: () => setUnassigningRepId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coordinator-reps', id] });
      qc.invalidateQueries({ queryKey: ['admin-coordinator', id] });
      toast.success('Rep unassigned');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to unassign'),
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const reps = (repsData as any)?.items || [];
  const customers = (customersData as any)?.items || [];
  const regionList = Array.isArray(regionsData) ? regionsData : [];

  // ── Loading / Not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading coordinator details…</p>
        </div>
      </div>
    );
  }

  if (!coordinator) {
    return (
      <div className="text-center py-32 text-slate-400">
        <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="font-medium">Coordinator not found.</p>
        <button onClick={() => navigate('/admin/coordinators')} className="mt-4 text-blue-600 text-sm font-medium hover:underline">
          ← Back to Coordinators
        </button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'reps', label: 'Reps', icon: Users, count: coordinator.assignedRepsCount },
    { id: 'customers', label: 'Customers', icon: TrendingUp, count: coordinator.assignedCustomersCount },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-16 animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/coordinators')}
          className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">{coordinator.fullName}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              coordinator.isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}>
              {coordinator.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{coordinator.employeeCode} &nbsp;·&nbsp; Coordinator</p>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => toggleActiveMut.mutate()}
            disabled={toggleActiveMut.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition disabled:opacity-50 ${
              coordinator.isActive
                ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100'
                : 'border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {toggleActiveMut.isPending ? '…' : coordinator.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* ── Snapshot Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Sales Reps"
          value={coordinator.assignedRepsCount ?? reps.length}
          icon={<Users className="w-4 h-4" />}
          accent
        />
        <StatTile
          label="Customers"
          value={coordinator.assignedCustomersCount ?? customers.length}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatTile
          label="Region"
          value={coordinator.regionName || '—'}
          icon={<MapPin className="w-4 h-4" />}
        />
        <StatTile
          label="Status"
          value={coordinator.isActive ? 'Active' : 'Inactive'}
          icon={<Power className="w-4 h-4" />}
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
              onClick={() => setActiveTab(tab.id)}
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

          {/* Left – Coordinator info */}
          <div className="lg:col-span-3 space-y-5">
            <Card>
              <CardHeader
                title="Coordinator Information"
                icon={<User className="w-4 h-4" />}
                action={
                  infoEditMode ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setInfoEditMode(false);
                          if (coordinator) {
                            setInfoForm({
                              fullName: coordinator.fullName,
                              employeeCode: coordinator.employeeCode || '',
                              phoneNumber: coordinator.phoneNumber || '',
                              regionId: coordinator.regionId || '',
                              hireDate: coordinator.hireDate ? coordinator.hireDate.split('T')[0] : '',
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
                <div onDoubleClick={() => setInfoEditMode(true)} className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 gap-4">
                    <span className="text-xs text-slate-400 uppercase tracking-wider w-32 flex-shrink-0">Full Name</span>
                    {infoEditMode ? (
                      <input
                        value={infoForm.fullName}
                        onChange={e => setInfoForm(p => ({ ...p, fullName: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{coordinator.fullName}</span>
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
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{coordinator.employeeCode}</span>
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
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{coordinator.phoneNumber}</span>
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
                      <span className="text-sm font-medium text-slate-800 text-right truncate">{coordinator.hireDate ? formatDate(coordinator.hireDate) : '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Mobile-only actions */}
            <div className="lg:hidden flex gap-3">
              <button
                onClick={() => toggleActiveMut.mutate()}
                disabled={toggleActiveMut.isPending}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition disabled:opacity-50 ${
                  coordinator.isActive
                    ? 'border-red-200 text-red-600 bg-red-50'
                    : 'border-blue-200 text-blue-600 bg-blue-50'
                }`}
              >
                {coordinator.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>

          {/* Right – Reps + Customers preview */}
          <div className="lg:col-span-2 space-y-5">

            {/* Reps preview */}
            <Card>
              <CardHeader
                title="Sales Reps"
                icon={<Users className="w-4 h-4" />}
                action={
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAssignRep(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Assign
                    </button>
                    {reps.length > 4 && (
                      <button
                        onClick={() => setActiveTab('reps')}
                        className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                      >
                        View all <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                }
              />
              {reps.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  No reps assigned yet
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reps.slice(0, 4).map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/admin/reps/${r.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                        {(r.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.fullName}</p>
                        <p className="text-xs text-slate-400">{r.employeeCode}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (!confirm('Remove this rep from the coordinator?')) return;
                            unassignRepMut.mutate(r.id);
                          }}
                          disabled={unassigningRepId === r.id}
                          className="p-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Unassign rep"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition" />
                      </div>
                    </button>
                  ))}
                  {reps.length > 4 && (
                    <button
                      onClick={() => setActiveTab('reps')}
                      className="w-full py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition text-center"
                    >
                      +{reps.length - 4} more reps
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Customers preview */}
            <Card>
              <CardHeader
                title="Customers"
                icon={<TrendingUp className="w-4 h-4" />}
                action={
                  customers.length > 4 ? (
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null
                }
              />
              {customers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  No customers in this region
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {customers.slice(0, 4).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/admin/customers/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                        {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{c.shopName || c.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email || '—'}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition flex-shrink-0" />
                    </button>
                  ))}
                  {customers.length > 4 && (
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="w-full py-3 text-xs font-medium text-blue-600 hover:bg-blue-50 transition text-center"
                    >
                      +{customers.length - 4} more customers
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          REPS TAB
      ════════════════════════════════════════════ */}
      {activeTab === 'reps' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowAssignRep(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-blue-200
                       rounded-xl text-blue-600 text-sm font-semibold hover:bg-blue-50 hover:border-blue-300 transition"
          >
            <UserPlus className="w-4 h-4" />
            Assign Sales Rep
          </button>

          {reps.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">No reps assigned yet</p>
              <p className="text-sm mt-1">Use the button above to assign a sales rep.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{reps.length} rep{reps.length !== 1 ? 's' : ''} assigned</p>
              <Card>
                <div className="divide-y divide-slate-100">
                  {reps.map((r: any) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/admin/reps/${r.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm flex-shrink-0">
                        {(r.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.fullName}</p>
                        <p className="text-xs text-slate-400">{r.employeeCode} · {r.regionName || 'No region'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={r.isActive ? 'Active' : 'Inactive'} />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (!confirm('Remove this rep from the coordinator?')) return;
                            unassignRepMut.mutate(r.id);
                          }}
                          disabled={unassigningRepId === r.id}
                          className="p-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Unassign rep"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          CUSTOMERS TAB
      ════════════════════════════════════════════ */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {customers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium text-slate-500">No customers in this region</p>
              <p className="text-sm mt-1">Customers are associated via their assigned sales rep.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{customers.length} customer{customers.length !== 1 ? 's' : ''} in this coordinator's region</p>
                <button
                  onClick={() => setShowCreateCustomer(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add Customer
                </button>
              </div>
              <Card>
                <div className="divide-y divide-slate-100">
                  {customers.map((c: any) => (
                    <div
                      key={c.id}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left"
                    >
                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                          {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.shopName || c.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{c.email || '—'}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} />
                        <button
                          onClick={() => {
                            if (!confirm('Remove this customer from the coordinator?')) return;
                            unassignCustomerMut.mutate(c.id);
                          }}
                          disabled={unassignCustomerMut.isPending}
                          className="p-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Unassign customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Edit Coordinator Bottom Sheet ── */}

      {/* ── Assign Rep Bottom Sheet ── */}
      {showAssignRep && (
        <BottomSheet open={true} onClose={() => setShowAssignRep(false)} title="Assign Sales Rep">
          <div className="p-5 space-y-4">
            <SelectField
              label="Select Sales Rep"
              value={selectedRepId}
              onChange={setSelectedRepId}
            >
              <option value="">Choose a rep…</option>
              {((allRepsData as any)?.items || []).map((r: any) => (
                <option key={r.id} value={r.id}>{r.fullName} ({r.employeeCode})</option>
              ))}
            </SelectField>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAssignRep(false)}
                className="flex-1 py-2.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => assignRepMut.mutate()}
                disabled={!selectedRepId || assignRepMut.isPending}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold
                           hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {assignRepMut.isPending ? 'Assigning…' : 'Assign Rep'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {showCreateCustomer && (
        <BottomSheet open={true} onClose={() => setShowCreateCustomer(false)} title="Add Customer">
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-500">
              Select an existing customer in this region to assign to this coordinator.
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {((availableCustomersData as any)?.items || [])
                .filter((c: any) => !c.assignedCoordinatorId)
                .map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => assignCustomerMut.mutate(c.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm flex-shrink-0">
                        {(c.shopName || c.fullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.shopName || c.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">{c.email || '—'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">Assign</span>
                  </button>
                ))}
              {((availableCustomersData as any)?.items || []).filter((c: any) => !c.assignedCoordinatorId).length === 0 && (
                <div className="text-sm text-slate-500">No available customers in this region.</div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCreateCustomer(false)}
                className="flex-1 py-2.5 bg-slate-100 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}