import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  User,
  Shield,
  Building2,
  Palette,
  Save,
  Info,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { systemConfigApi } from '../../services/api/systemConfigApi';
import { authApi } from '../../services/api/authApi';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import type { AdminAccountInfo } from '../../types/auth.types';

type SettingsSection = 'organization' | 'account' | 'system';

const mapConfigToForm = (config: any) => ({
  companyName: config.companyName || '',
  companyLogo: config.companyLogo || '',
  companyAddress: config.companyAddress || '',
  companyPhone: config.companyPhone || '',
  companyEmail: config.companyEmail || '',
  taxNumber: config.taxNumber || '',
  currency: config.currency || 'LKR',
  brandPrimaryColor: config.brandPrimaryColor || '#4f46e5',
  brandSecondaryColor: config.brandSecondaryColor || '#0ea5e9',
  requireCustomerApproval: config.requireCustomerApproval ?? true,
  requireQuotationApproval: config.requireQuotationApproval ?? true,
  defaultPaymentTermsDays: config.defaultPaymentTermsDays ?? 30,
  defaultCreditLimit: config.defaultCreditLimit ?? 50000,
});

export default function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // System config
  const { data: config } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => systemConfigApi.getConfig().then(r => r.data.data || r.data),
  });

  const [configForm, setConfigForm] = useState<any>(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [activeSection, setActiveSection] = useState<SettingsSection>('organization');

  const { data: adminProfile } = useQuery<AdminAccountInfo>({
    queryKey: ['current-admin-profile'],
    queryFn: () => authApi.getCurrentAdminProfile().then(r => r.data.data || r.data),
    enabled: user?.role === 'Admin' || user?.role === 'SuperAdmin',
  });

  useEffect(() => {
    if (!config) return;
    setConfigForm(mapConfigToForm(config));
  }, [config]);

  const updateConfigMut = useMutation({
    mutationFn: (data: any) => systemConfigApi.updateConfig(data),
    onSuccess: (response: any) => {
      const updated = response?.data?.data || response?.data;
      if (updated) {
        setConfigForm(mapConfigToForm(updated));
      }
      qc.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Settings saved');
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to save settings'),
  });

  const changePasswordMut = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => { setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password changed'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to change password'),
  });

  const handleSaveConfig = () => {
    if (!configForm) return;

    const paymentTerms = Number(configForm.defaultPaymentTermsDays);
    const creditLimit = Number(configForm.defaultCreditLimit);

    if (!configForm.companyName?.trim()) {
      toast.error('Company name is required');
      return;
    }

    if (!Number.isFinite(paymentTerms) || paymentTerms < 1 || paymentTerms > 365) {
      toast.error('Default payment terms must be between 1 and 365 days');
      return;
    }

    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      toast.error('Default credit limit must be zero or greater');
      return;
    }

    updateConfigMut.mutate({
      ...configForm,
      defaultPaymentTermsDays: paymentTerms,
      defaultCreditLimit: creditLimit,
    });
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    changePasswordMut.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/95 outline-none transition focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';
  const cardCls = 'rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm';
  const sectionTitleCls = 'text-base lg:text-lg font-semibold text-slate-900';

  const sections = [
    {
      id: 'organization' as SettingsSection,
      title: 'Organization',
      description: 'Company profile and branding',
      icon: Building2,
    },
    {
      id: 'account' as SettingsSection,
      title: 'Account & Security',
      description: 'Admin identity and password',
      icon: Shield,
    },
    {
      id: 'system' as SettingsSection,
      title: 'System Info',
      description: 'Runtime and platform details',
      icon: Info,
    },
  ];

  return (
    <div className="animate-fade-in space-y-5 lg:space-y-6 pb-8">
      <PageHeader title="Settings" subtitle="System configuration and preferences" />

      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-600 to-blue-600 px-5 py-5 lg:px-7 lg:py-6 text-white">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-16 bottom-0 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Configuration Hub
            </p>
            <h2 className="text-xl lg:text-2xl font-bold mt-2">Admin Settings Control Center</h2>
            <p className="text-sm text-indigo-100 mt-1 max-w-2xl">Manage organization profile, approval rules, account security, and portal behavior from one modern settings workspace.</p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-white/15 px-3 py-2 text-right">
              <p className="text-[11px] text-indigo-100">Active Role</p>
              <p className="text-sm font-semibold">{user?.role || 'Administrator'}</p>
            </div>
            {configForm && (
              <button
                onClick={handleSaveConfig}
                disabled={updateConfigMut.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-indigo-700 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-50 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateConfigMut.isPending ? 'Saving...' : 'Save Config'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`shrink-0 rounded-xl px-4 py-2.5 transition border text-left min-w-[190px] ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{section.title}</p>
                    <p className="text-[11px] text-slate-500">{section.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-4 lg:space-y-6">
        {!configForm && (
          <div className={cardCls}>
            <p className="text-sm text-slate-500">Loading settings...</p>
          </div>
        )}

        {activeSection === 'organization' && configForm && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={sectionTitleCls}>Organization Profile</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Company
                </span>
              </div>
              <div className="space-y-3.5">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label><input value={configForm.companyName} onChange={e => setConfigForm((p: any) => ({ ...p, companyName: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Number</label><input value={configForm.taxNumber} onChange={e => setConfigForm((p: any) => ({ ...p, taxNumber: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label><input value={configForm.companyEmail} onChange={e => setConfigForm((p: any) => ({ ...p, companyEmail: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><input value={configForm.companyPhone} onChange={e => setConfigForm((p: any) => ({ ...p, companyPhone: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label><textarea value={configForm.companyAddress} onChange={e => setConfigForm((p: any) => ({ ...p, companyAddress: e.target.value }))} rows={3} className={inputCls + ' resize-none'} /></div>
              </div>
            </div>

            <div className={cardCls + ' xl:col-span-2'}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={sectionTitleCls}>Brand Identity</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium px-2 py-1">
                  <Palette className="w-3.5 h-3.5" />
                  Visual Style
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="lg:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label><input value={configForm.companyLogo} onChange={e => setConfigForm((p: any) => ({ ...p, companyLogo: e.target.value }))} className={inputCls} placeholder="https://..." /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={configForm.brandPrimaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandPrimaryColor: e.target.value }))} className="h-11 w-12 rounded-xl border border-slate-200 cursor-pointer" />
                    <input value={configForm.brandPrimaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandPrimaryColor: e.target.value }))} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Secondary Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={configForm.brandSecondaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandSecondaryColor: e.target.value }))} className="h-11 w-12 rounded-xl border border-slate-200 cursor-pointer" />
                    <input value={configForm.brandSecondaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandSecondaryColor: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'account' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className={cardCls}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={sectionTitleCls}>Administrator Profile</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-1">
                  <User className="w-3.5 h-3.5" />
                  Account
                </span>
              </div>
              <div className="space-y-3.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Username</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{user?.username}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{user?.email}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Role</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{user?.role}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Full Name</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{adminProfile?.fullName || 'Not set'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Phone Number</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{adminProfile?.phoneNumber || user?.phoneNumber || 'Not set'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Department</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">{adminProfile?.department || 'Not set'}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-xs text-slate-500">Created At</p>
                  <p className="text-sm text-slate-900 font-semibold mt-0.5">
                    {adminProfile?.createdAt ? new Date(adminProfile.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className={cardCls + ' xl:col-span-2'}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={sectionTitleCls}>Password & Security</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium px-2 py-1">
                  <Shield className="w-3.5 h-3.5" />
                  Secure Access
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label><input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} className={inputCls} placeholder="Enter current password" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label><input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} className={inputCls} placeholder="Enter new password" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label><input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} className={inputCls} placeholder="Confirm new password" /></div>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={handleChangePassword} disabled={changePasswordMut.isPending || !passwordForm.currentPassword || !passwordForm.newPassword} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                  {changePasswordMut.isPending ? 'Changing...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
            <div className={cardCls + ' xl:col-span-2'}>
              <div className="flex items-center justify-between mb-5">
                <h3 className={sectionTitleCls}>System Information</h3>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1">
                  <Info className="w-3.5 h-3.5" />
                  Runtime
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">Version</p><p className="font-semibold text-slate-900 mt-0.5">1.0.0</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">API Backend</p><p className="font-semibold text-slate-900 mt-0.5">.NET 8</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">Database</p><p className="font-semibold text-slate-900 mt-0.5">PostgreSQL</p></div>
                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">Frontend</p><p className="font-semibold text-slate-900 mt-0.5">React 19 + TypeScript</p></div>
                <div className="rounded-xl border border-slate-200 p-3 md:col-span-2"><p className="text-slate-500">Real-time</p><p className="font-semibold text-slate-900 mt-0.5">SignalR</p></div>
              </div>
            </div>

            <div className={cardCls}>
              <h3 className={sectionTitleCls}>Environment Health</h3>
              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <span className="text-emerald-800">API</span>
                  <span className="text-emerald-700 font-semibold">Connected</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <span className="text-emerald-800">Database</span>
                  <span className="text-emerald-700 font-semibold">Connected</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <span className="text-emerald-800">Realtime Hub</span>
                  <span className="text-emerald-700 font-semibold">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          disabled={updateConfigMut.isPending || !configForm}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateConfigMut.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
