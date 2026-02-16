import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { authApi } from '../../services/api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { User, MapPin, CreditCard, Store, LogOut, Shield, Phone, Mail, Edit3, Lock, X, Loader2, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: () => customersApi.customerGetProfile().then(r => r.data.data),
  });

  // Edit profile state
  const [editForm, setEditForm] = useState({ shopName: '', phoneNumber: '', street: '', city: '', state: '' });

  const openEdit = () => {
    if (profile) {
      setEditForm({
        shopName: profile.shopName || '',
        phoneNumber: profile.phoneNumber || '',
        street: profile.street || '',
        city: profile.city || '',
        state: profile.state || '',
      });
    }
    setEditOpen(true);
  };

  const editMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => customersApi.customerUpdateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated');
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
      setEditOpen(false);
    },
    onError: () => toast.error('Update failed'),
  });

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const pwMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed');
      setPwOpen(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: () => toast.error('Password change failed'),
  });

  const handlePasswordSubmit = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    pwMut.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const addressStr = [profile?.street, profile?.city, profile?.state].filter(Boolean).join(', ');

  return (
    <div className="animate-fade-in">
      {/* Hero Profile */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 text-white px-5 pt-8 pb-16 text-center overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative z-10">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/20">
            <span className="text-white font-bold text-3xl">{user?.username?.[0]?.toUpperCase()}</span>
          </div>
          <h2 className="font-bold text-lg">{user?.username}</h2>
          <p className="text-orange-100 text-sm mt-0.5">{user?.email}</p>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-4 pb-6">
        {/* Shop Details */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div className="h-4 bg-slate-100 rounded-full w-32 skeleton" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl skeleton" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-slate-100 rounded-full w-16 skeleton" />
                    <div className="h-3.5 bg-slate-100 rounded-full w-32 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : profile && (
          <>
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-rose-500 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900">Shop Details</h3>
                </div>
                <button onClick={openEdit} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Shop Name</p>
                    <p className="text-sm font-semibold text-slate-900">{profile.shopName}</p>
                  </div>
                </div>
                {profile.phoneNumber && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Phone</p>
                      <p className="text-sm text-slate-700">{profile.phoneNumber}</p>
                    </div>
                  </div>
                )}
                {addressStr && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Location</p>
                      <p className="text-sm text-slate-700">{addressStr}</p>
                    </div>
                  </div>
                )}
                {profile.customerSegment && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Segment</p>
                      <p className="text-sm text-slate-700">{profile.customerSegment}</p>
                    </div>
                  </div>
                )}
                {profile.assignedRepName && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Sales Rep</p>
                      <p className="text-sm text-slate-700">{profile.assignedRepName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Info */}
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-900">Financial</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Credit Limit', value: formatCurrency(profile.creditLimit), color: 'from-orange-50 to-rose-50', textColor: 'text-slate-900' },
                  { label: 'Balance', value: formatCurrency(profile.currentBalance), color: profile.currentBalance > profile.creditLimit * 0.8 ? 'from-red-50 to-rose-50' : 'from-emerald-50 to-teal-50', textColor: profile.currentBalance > profile.creditLimit * 0.8 ? 'text-red-600' : 'text-slate-900' },
                  { label: 'Payment Terms', value: `${profile.paymentTermsDays} days`, color: 'from-blue-50 to-indigo-50', textColor: 'text-slate-900' },
                  { label: 'Total Orders', value: `${profile.totalOrders || 0}`, color: 'from-violet-50 to-purple-50', textColor: 'text-slate-900' },
                ].map(stat => (
                  <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-xl p-3.5`}>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-sm font-bold mt-1 ${stat.textColor}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Credit Usage Bar */}
              {profile.creditLimit > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">Credit Usage</span>
                    <span className="font-semibold text-slate-600">{Math.round((profile.currentBalance / profile.creditLimit) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        profile.currentBalance / profile.creditLimit > 0.8
                          ? 'bg-gradient-to-r from-red-500 to-rose-500'
                          : profile.currentBalance / profile.creditLimit > 0.5
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}
                      style={{ width: `${Math.min((profile.currentBalance / profile.creditLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <button
            onClick={() => setPwOpen(true)}
            className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-between px-5"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-400" /> Change Password
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => navigate('/shop/support')}
            className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-between px-5"
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400" /> Support & Complaints
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          className="w-full py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Edit Profile Bottom Sheet */}
      {editOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Edit Profile</h2>
                <button onClick={() => setEditOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Shop Name', key: 'shopName' as const, placeholder: 'Your shop name' },
                { label: 'Phone Number', key: 'phoneNumber' as const, placeholder: 'Phone number' },
                { label: 'Street', key: 'street' as const, placeholder: 'Street address' },
                { label: 'City', key: 'city' as const, placeholder: 'City' },
                { label: 'State', key: 'state' as const, placeholder: 'State' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">{field.label}</label>
                  <input
                    value={editForm[field.key]}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                  />
                </div>
              ))}
              <button
                onClick={() => editMut.mutate(editForm)}
                disabled={editMut.isPending}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {editMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Bottom Sheet */}
      {pwOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPwOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-5 py-4 z-10">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Change Password</h2>
                <button onClick={() => setPwOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
                />
              </div>
              <button
                onClick={handlePasswordSubmit}
                disabled={pwMut.isPending || !pwForm.currentPassword || !pwForm.newPassword}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {pwMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Changing...</> : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
