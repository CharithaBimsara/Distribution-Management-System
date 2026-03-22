import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { regionsApi } from '../../services/api/regionsApi';
import { adminGetAllCoordinators } from '../../services/api/coordinatorApi';
import { authApi } from '../../services/api/authApi';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ArrowLeft, Store, MapPin, User, Calendar, TrendingUp,
  ShoppingBag, DollarSign, ToggleLeft, ToggleRight,
  UserCheck, Building2, Phone, Mail, Package, FileText as FileTextIcon, KeyRound, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

// ── Shared small components (same as RegistrationRequestDetail) ──────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 uppercase tracking-wider flex-shrink-0 w-36">{label}</span>
      <span className="text-sm text-slate-800 text-right break-words min-w-0 font-medium">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="text-slate-500">{icon}</span>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AdminCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCoordinatorView = user?.role === 'SalesCoordinator';
  const customersBasePath = isCoordinatorView ? '/coordinator/customers' : '/admin/customers';

  // Assignment edit state
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedSubRegionId, setSelectedSubRegionId] = useState('');
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState('');
  const [generatedTempPassword, setGeneratedTempPassword] = useState('');

  const { data: summary, isLoading } = useQuery({
    queryKey: [isCoordinatorView ? 'coordinator-customer-summary' : 'admin-customer-summary', id],
    queryFn: () => (isCoordinatorView ? customersApi.coordinatorGetSummary(id!) : customersApi.adminGetSummary(id!)).then(r => r.data.data),
    enabled: !!id,
  });

  const customer = summary?.customer;

  // Populate fields when customer loads
  useEffect(() => {
    if (customer) {
      setSelectedRegionId(customer.regionId || '');
      setSelectedSubRegionId(customer.subRegionId || '');
      setSelectedCoordinatorId(customer.assignedCoordinatorId || '');
    }
  }, [customer]);

  // Fetch lookups for assignment editing
  const { data: regions } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => regionsApi.getAll().then((r: any) => r.data),
    enabled: editingAssignment,
  });

  const { data: allCoordinators } = useQuery({
    queryKey: ['admin-all-coordinators'],
    queryFn: () => adminGetAllCoordinators(1, 200),
    enabled: editingAssignment,
  });

  // Cascading filters
  const filteredSubRegions = useMemo(() => {
    if (!regions || !selectedRegionId) return [];
    const region = (regions as any[]).find((reg: any) => reg.id === selectedRegionId);
    return region?.subRegions || [];
  }, [regions, selectedRegionId]);

  const filteredCoordinators = useMemo(() => {
    if (!allCoordinators?.items) return [];
    if (!selectedRegionId) return allCoordinators.items;
    return allCoordinators.items.filter((c: any) => c.regionId === selectedRegionId);
  }, [allCoordinators, selectedRegionId]);

  const handleRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId);
    setSelectedSubRegionId('');
    setSelectedCoordinatorId('');
  };

  const toggleStatusMut = useMutation({
    mutationFn: (isActive: boolean) => customersApi.adminToggleStatus(id!, isActive),
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success(`Customer ${isActive ? 'activated' : 'deactivated'} successfully`);
    },
    onError: () => toast.error('Failed to update customer status'),
  });

  const updateAssignmentMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => customersApi.adminUpdate(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-summary', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      toast.success('Assignment updated successfully');
      setEditingAssignment(false);
    },
    onError: () => toast.error('Failed to update assignment'),
  });

  const resetTempPasswordMut = useMutation({
    mutationFn: () => {
      if (!customer?.userId) {
        throw new Error('Customer user id is missing');
      }
      return authApi.adminResetUserTempPassword(customer.userId);
    },
    onSuccess: (res: any) => {
      setGeneratedTempPassword(res.data.data.temporaryPassword);
      queryClient.invalidateQueries({ queryKey: ['admin-customer-summary', id] });
      toast.success('New temporary password generated');
    },
    onError: () => toast.error('Failed to generate temporary password'),
  });

  const copyTempPassword = async () => {
    const value = generatedTempPassword || customer?.temporaryPassword || '';
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Temporary password copied');
    } catch {
      toast.error('Could not copy password');
    }
  };

  const handleSaveAssignment = () => {
    updateAssignmentMut.mutate({
      regionId: selectedRegionId || null,
      subRegionId: selectedSubRegionId || null,
      assignedCoordinatorId: selectedCoordinatorId || null,
    });
  };
  const visibleTempPassword = generatedTempPassword || customer?.temporaryPassword || '';

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Customer not found</p>
        <button onClick={() => navigate('/admin/customers')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 pb-20">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(customersBasePath)}
          className="p-2 hover:bg-slate-100 rounded-lg transition mt-0.5"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">{customer.shopName}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              customer.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}>
              {customer.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Joined {customer.createdAt ? formatDate(customer.createdAt) : '—'} &nbsp;·&nbsp; Customer Details
          </p>
        </div>
        {!isCoordinatorView && (
          <>
            <button
              onClick={() => navigate(`/admin/customers/${id}/special-prices`)}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <DollarSign className="w-5 h-5" />
              Special Prices
            </button>

            <button
              onClick={() => toggleStatusMut.mutate(!customer.isActive)}
              disabled={toggleStatusMut.isPending}
              className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition ${
                customer.isActive
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              {customer.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {customer.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </>
        )}
      </div>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-5">

          {/* General Information */}
          <Section title="General Information" icon={<Building2 className="w-4 h-4" />}>
            <InfoRow label="Business Reg #" value={customer.businessRegistrationNumber} />
            <InfoRow label="Email" value={customer.email} />
            <InfoRow label="Phone" value={customer.phoneNumber} />
            <InfoRow label="Username" value={customer.username} />
            <InfoRow label="Street" value={customer.street} />
            <InfoRow label="City" value={customer.city} />
            <InfoRow label="State / Province" value={customer.state} />
          </Section>

          {!isCoordinatorView && (
          <Section title="Credentials" icon={<KeyRound className="w-4 h-4" />}>
            <InfoRow label="Username" value={customer.username} />
            <InfoRow label="Password Status" value={customer.mustChangePassword ? 'Temporary password pending' : 'Updated by user'} />
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500">Current password cannot be shown for security.</p>
                <button
                  onClick={() => resetTempPasswordMut.mutate()}
                  disabled={resetTempPasswordMut.isPending}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {resetTempPasswordMut.isPending ? 'Generating…' : 'Generate New'}
                </button>
              </div>
              {visibleTempPassword && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                  <span className="text-sm font-mono font-semibold text-indigo-700">{visibleTempPassword}</span>
                  <button
                    onClick={copyTempPassword}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                </div>
              )}
            </div>
          </Section>
          )}

          {/* Current Assignment */}
          <Section title="Current Assignment" icon={<UserCheck className="w-4 h-4" />}>
            <InfoRow label="Region" value={customer.regionName || '—'} />
            <InfoRow label="Sub-Region" value={customer.subRegionName || '—'} />
            <InfoRow label="Coordinator" value={customer.assignedCoordinatorName || '—'} />
          </Section>

          {/* Registration and professional details from submitted customer form */}
          {summary.registrationRequest && (
            <Section title="Registration & Professional Details" icon={<FileTextIcon className="w-4 h-4" />}>
              <InfoRow label="Customer Type" value={summary.registrationRequest.customerType} />
              <InfoRow label="Owner Name" value={summary.registrationRequest.customerName} />
              <InfoRow label="Incorporate Date" value={summary.registrationRequest.incorporateDate ? formatDate(summary.registrationRequest.incorporateDate) : undefined} />
              <InfoRow label="Registered Address" value={summary.registrationRequest.registeredAddress} />
              <InfoRow label="Business Name" value={summary.registrationRequest.businessName} />
              <InfoRow label="Business Location" value={summary.registrationRequest.businessLocation} />
              <InfoRow label="Telephone" value={summary.registrationRequest.telephone} />
              <InfoRow label="Email" value={summary.registrationRequest.email} />
              <InfoRow label="Bank Branch" value={summary.registrationRequest.bankBranch} />
              <InfoRow label="Province" value={summary.registrationRequest.province} />
              <InfoRow label="Town" value={summary.registrationRequest.town} />
              <div className="pt-2 mt-1 border-t border-slate-100">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Professional Contacts</p>
              </div>
              {(summary.registrationRequest.proprietorName || summary.registrationRequest.proprietorTp || summary.registrationRequest.proprietorEmail) && (
                <InfoRow
                  label="Proprietor"
                  value={[
                    summary.registrationRequest.proprietorName,
                    summary.registrationRequest.proprietorTp,
                    summary.registrationRequest.proprietorEmail,
                  ].filter(Boolean).join(' — ')}
                />
              )}
              {(summary.registrationRequest.managerName || summary.registrationRequest.managerTp || summary.registrationRequest.managerEmail) && (
                <InfoRow
                  label="Manager"
                  value={[
                    summary.registrationRequest.managerName,
                    summary.registrationRequest.managerTp,
                    summary.registrationRequest.managerEmail,
                  ].filter(Boolean).join(' — ')}
                />
              )}
              {(summary.registrationRequest.chefName || summary.registrationRequest.chefTp || summary.registrationRequest.chefEmail) && (
                <InfoRow
                  label="Chef"
                  value={[
                    summary.registrationRequest.chefName,
                    summary.registrationRequest.chefTp,
                    summary.registrationRequest.chefEmail,
                  ].filter(Boolean).join(' — ')}
                />
              )}
              {(summary.registrationRequest.purchasingName || summary.registrationRequest.purchasingTp || summary.registrationRequest.purchasingEmail) && (
                <InfoRow
                  label="Purchasing Officer"
                  value={[
                    summary.registrationRequest.purchasingName,
                    summary.registrationRequest.purchasingTp,
                    summary.registrationRequest.purchasingEmail,
                  ].filter(Boolean).join(' — ')}
                />
              )}
              {(summary.registrationRequest.accountantName || summary.registrationRequest.accountantTp || summary.registrationRequest.accountantEmail) && (
                <InfoRow
                  label="Accountant"
                  value={[
                    summary.registrationRequest.accountantName,
                    summary.registrationRequest.accountantTp,
                    summary.registrationRequest.accountantEmail,
                  ].filter(Boolean).join(' — ')}
                />
              )}
              {/* Documents */}
              {(summary.registrationRequest.businessRegDocPath || summary.registrationRequest.businessAddressDocPath || summary.registrationRequest.vatDocPath) && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Submitted Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.registrationRequest.businessRegDocPath && (
                      <a href={summary.registrationRequest.businessRegDocPath} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200 hover:bg-indigo-100 transition">
                        <FileTextIcon className="w-3.5 h-3.5" /> Business Reg Doc
                      </a>
                    )}
                    {summary.registrationRequest.businessAddressDocPath && (
                      <a href={summary.registrationRequest.businessAddressDocPath} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200 hover:bg-indigo-100 transition">
                        <FileTextIcon className="w-3.5 h-3.5" /> Business Address Doc
                      </a>
                    )}
                    {summary.registrationRequest.vatDocPath && (
                      <a href={summary.registrationRequest.vatDocPath} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200 hover:bg-indigo-100 transition">
                        <FileTextIcon className="w-3.5 h-3.5" /> VAT Doc
                      </a>
                    )}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Order Statistics */}
          <Section title="Order Statistics" icon={<TrendingUp className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs text-indigo-600 font-medium uppercase">Total Orders</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{summary.totalOrders}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-600 font-medium uppercase">Total Purchases</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{formatCurrency(summary.totalPurchases)}</p>
              </div>
              {summary.lastOrderDate && (
                <div className="p-4 bg-gradient-to-br from-orange-50 to-rose-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-orange-600 font-medium uppercase">Last Order</span>
                  </div>
                  <p className="text-sm font-bold text-orange-900">{formatDate(summary.lastOrderDate)}</p>
                </div>
              )}
            </div>
            {summary.frequentProducts?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Frequent Products</p>
                <div className="flex flex-wrap gap-2">
                  {summary.frequentProducts.map((p: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      <Package className="w-3 h-3" /> {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-5">

          {/* Status Card */}
          <div className={`rounded-xl p-5 border ${customer.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`font-bold text-sm mb-1 flex items-center gap-2 ${customer.isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
              {customer.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {customer.isActive ? 'Active Customer' : 'Inactive Customer'}
            </p>
            <p className="text-xs text-slate-400 mb-3">
              Joined {customer.createdAt ? formatDate(customer.createdAt) : '—'}
            </p>

            {/* Mobile toggle */}
            {!isCoordinatorView && (
              <>
                <button
                  onClick={() => toggleStatusMut.mutate(!customer.isActive)}
                  disabled={toggleStatusMut.isPending}
                  className={`lg:hidden w-full mt-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                    customer.isActive
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {customer.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={() => navigate(`/admin/customers/${id}/special-prices`)}
                  className="lg:hidden w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
                >
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Special Prices
                </button>
              </>
            )}
          </div>

          {/* Change Assignment Panel */}
          {!isCoordinatorView && (
            <Section title="Change Assignment" icon={<UserCheck className="w-4 h-4" />}>
              {!editingAssignment ? (
                <button
                  onClick={() => setEditingAssignment(true)}
                  className="w-full py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                >
                  Edit Region / Coordinator
                </button>
              ) : (
                <div className="space-y-3">
                {/* Region */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" /> Region
                  </label>
                  <select
                    value={selectedRegionId}
                    onChange={e => handleRegionChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                  >
                    <option value="">Select region…</option>
                    {(regions || []).map((reg: any) => (
                      <option key={reg.id} value={reg.id}>{reg.name}</option>
                    ))}
                  </select>
                </div>

                {/* Sub-Region */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    <MapPin className="w-3.5 h-3.5 inline mr-1" /> Sub-Region
                  </label>
                  <select
                    value={selectedSubRegionId}
                    onChange={e => setSelectedSubRegionId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                  >
                    <option value="">Select sub-region…</option>
                    {filteredSubRegions.map((sr: any) => (
                      <option key={sr.id} value={sr.id}>{sr.name}</option>
                    ))}
                  </select>
                </div>

                {/* Coordinator */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Coordinator
                  </label>
                  <select
                    value={selectedCoordinatorId}
                    onChange={e => setSelectedCoordinatorId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-300 transition"
                  >
                    <option value="">Select coordinator…</option>
                    {filteredCoordinators.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                  {selectedRegionId && filteredCoordinators.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No coordinators in this region</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingAssignment(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignment}
                    disabled={updateAssignmentMut.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition disabled:opacity-40"
                  >
                    {updateAssignmentMut.isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
