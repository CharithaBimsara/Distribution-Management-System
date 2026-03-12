import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, User, Shield, Bell, Building2, Palette, Save } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { systemConfigApi } from '../../services/api/systemConfigApi';
import { authApi } from '../../services/api/authApi';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';

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

  // Initialize config form when data loads
  if (config && !configForm) {
    setConfigForm({
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
      defaultPaymentTermsDays: config.defaultPaymentTermsDays || 30,
      defaultCreditLimit: config.defaultCreditLimit || 50000,
    });
  }

  const updateConfigMut = useMutation({
    mutationFn: (data: any) => systemConfigApi.updateConfig(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-config'] }); toast.success('Settings saved'); },
    onError: () => toast.error('Failed to save settings'),
  });

  const changePasswordMut = useMutation({
    mutationFn: (data: any) => authApi.changePassword(data),
    onSuccess: () => { setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password changed'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to change password'),
  });

  const handleSaveConfig = () => {
    if (!configForm) return;
    updateConfigMut.mutate({
      ...configForm,
      defaultPaymentTermsDays: Number(configForm.defaultPaymentTermsDays),
      defaultCreditLimit: Number(configForm.defaultCreditLimit),
    });
  };

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    changePasswordMut.mutate({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
  };

  const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300';

  return (
    <div className="animate-fade-in space-y-4 lg:space-y-6">
      <PageHeader title="Settings" subtitle="System configuration and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 bg-indigo-50 rounded-xl"><User className="w-5 h-5 text-indigo-600" /></span>
            <h2 className="font-semibold text-slate-900">Profile</h2>
          </div>
          <div className="space-y-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Username</label><p className="text-sm text-slate-900 font-medium">{user?.username}</p></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><p className="text-sm text-slate-900">{user?.email}</p></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Role</label><p className="text-sm text-slate-900">{user?.role}</p></div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 bg-red-50 rounded-xl"><Shield className="w-5 h-5 text-red-600" /></span>
            <h2 className="font-semibold text-slate-900">Security</h2>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label><input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} className={inputCls} placeholder="Enter current password" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label><input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} className={inputCls} placeholder="Enter new password" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label><input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} className={inputCls} placeholder="Confirm new password" /></div>
            <button onClick={handleChangePassword} disabled={changePasswordMut.isPending || !passwordForm.currentPassword || !passwordForm.newPassword} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">
              {changePasswordMut.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        {/* Company Info */}
        {configForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="p-2.5 bg-emerald-50 rounded-xl"><Building2 className="w-5 h-5 text-emerald-600" /></span>
              <h2 className="font-semibold text-slate-900">Company Info</h2>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label><input value={configForm.companyName} onChange={e => setConfigForm((p: any) => ({ ...p, companyName: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label><input value={configForm.companyEmail} onChange={e => setConfigForm((p: any) => ({ ...p, companyEmail: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><input value={configForm.companyPhone} onChange={e => setConfigForm((p: any) => ({ ...p, companyPhone: e.target.value }))} className={inputCls} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label><textarea value={configForm.companyAddress} onChange={e => setConfigForm((p: any) => ({ ...p, companyAddress: e.target.value }))} rows={2} className={inputCls + ' resize-none'} /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Number</label><input value={configForm.taxNumber} onChange={e => setConfigForm((p: any) => ({ ...p, taxNumber: e.target.value }))} className={inputCls} /></div>
            </div>
          </div>
        )}

        {/* Business Settings */}
        {configForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="p-2.5 bg-amber-50 rounded-xl"><SettingsIcon className="w-5 h-5 text-amber-600" /></span>
              <h2 className="font-semibold text-slate-900">Business Settings</h2>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label><input value={configForm.currency} onChange={e => setConfigForm((p: any) => ({ ...p, currency: e.target.value }))} className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Default Payment Terms (days)</label><input type="number" value={configForm.defaultPaymentTermsDays} onChange={e => setConfigForm((p: any) => ({ ...p, defaultPaymentTermsDays: e.target.value }))} className={inputCls} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Default Credit Limit</label><input type="number" value={configForm.defaultCreditLimit} onChange={e => setConfigForm((p: any) => ({ ...p, defaultCreditLimit: e.target.value }))} className={inputCls} /></div>
              </div>
              <label className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700">Require Customer Approval</span>
                <input type="checkbox" checked={configForm.requireCustomerApproval} onChange={e => setConfigForm((p: any) => ({ ...p, requireCustomerApproval: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500/20" />
              </label>
              <label className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700">Require Quotation Approval</span>
                <input type="checkbox" checked={configForm.requireQuotationApproval} onChange={e => setConfigForm((p: any) => ({ ...p, requireQuotationApproval: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500/20" />
              </label>
            </div>
          </div>
        )}

        {/* Branding */}
        {configForm && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="p-2.5 bg-purple-50 rounded-xl"><Palette className="w-5 h-5 text-purple-600" /></span>
              <h2 className="font-semibold text-slate-900">Branding</h2>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Logo URL</label><input value={configForm.companyLogo} onChange={e => setConfigForm((p: any) => ({ ...p, companyLogo: e.target.value }))} className={inputCls} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Primary Color</label>
                  <div className="flex items-center gap-2"><input type="color" value={configForm.brandPrimaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandPrimaryColor: e.target.value }))} className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer" /><input value={configForm.brandPrimaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandPrimaryColor: e.target.value }))} className={inputCls} /></div>
                </div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Secondary Color</label>
                  <div className="flex items-center gap-2"><input type="color" value={configForm.brandSecondaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandSecondaryColor: e.target.value }))} className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer" /><input value={configForm.brandSecondaryColor} onChange={e => setConfigForm((p: any) => ({ ...p, brandSecondaryColor: e.target.value }))} className={inputCls} /></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2.5 bg-slate-100 rounded-xl"><SettingsIcon className="w-5 h-5 text-slate-600" /></span>
            <h2 className="font-semibold text-slate-900">System Info</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-900 font-medium">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-slate-500">API Backend</span><span className="text-slate-900">.NET 8</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-slate-900">PostgreSQL</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Frontend</span><span className="text-slate-900">React 19 + TypeScript</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Real-time</span><span className="text-slate-900">SignalR</span></div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {configForm && (
        <div className="flex justify-end pb-8">
          <button onClick={handleSaveConfig} disabled={updateConfigMut.isPending} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm disabled:opacity-50">
            <Save className="w-4 h-4" /> {updateConfigMut.isPending ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
