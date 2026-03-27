import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../services/api/customersApi';
import { authApi } from '../../services/api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { 
  User, MapPin, Store, LogOut, Shield, Phone, Mail, 
  Edit3, Lock, X, Loader2, ChevronRight, Package, 
  Wallet, Sparkles, Headset 
} from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: () => customersApi.customerGetProfile().then(r => r.data.data),
  });

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
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
      setEditOpen(false);
    },
    onError: () => toast.error('Update failed'),
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const pwMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => authApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
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
  const displayName = profile?.shopName || user?.username || 'Customer';

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:outline-none focus:ring-0 focus:border-orange-500 transition-all placeholder-gray-400";

  return (
    <div className="animate-fade-in pb-24 bg-[#FDFDFD]">
      
      {/* Premium Orange Header Section */}
      <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 px-6 pt-10 pb-20 text-white overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-4">
             <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] flex items-center justify-center border border-white/30 shadow-2xl">
                <span className="text-4xl font-black text-white">{displayName?.[0]?.toUpperCase()}</span>
             </div>
             <button 
               onClick={openEdit}
               className="absolute -bottom-1 -right-1 w-8 h-8 bg-white text-orange-600 rounded-full flex items-center justify-center shadow-lg border-2 border-orange-500 active:scale-90 transition-transform"
             >
               <Edit3 className="w-4 h-4" />
             </button>
          </div>
          <div className="flex items-center gap-2">
             <Sparkles className="w-4 h-4 text-orange-200" />
             <h2 className="font-black text-2xl tracking-tight leading-none uppercase">{displayName}</h2>
          </div>
          <p className="text-orange-100/80 text-xs font-medium mt-1.5 flex items-center gap-1">
             <Mail className="w-3 h-3" /> {user?.email}
          </p>
        </div>
      </div>

      <div className="px-5 -mt-10 relative z-20 space-y-6">
        
        {/* Business Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-orange-100 flex flex-col items-center text-center group active:scale-95 transition-all">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Orders</p>
            <p className="text-xl font-black text-black mt-0.5">{profile?.totalOrders || 0}</p>
          </div>
          
          <div className="bg-white rounded-[24px] p-5 shadow-sm border border-orange-100 flex flex-col items-center text-center group active:scale-95 transition-all">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Value</p>
            <p className="text-lg font-black text-black mt-0.5">{profile ? formatCurrency(profile.totalOrderValue || 0).split('.')[0] : 'LKR 0'}</p>
          </div>
        </div>

        {/* Info Tiles - Shop & Region */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-2">
          <div className="p-4 flex items-center gap-2 border-b border-gray-50 mb-2">
             <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
             <h3 className="font-black text-black text-xs uppercase tracking-[2px]">Shop Information</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-1">
            {[
              { label: 'Shop Name', val: profile?.shopName, icon: Store, bg: 'bg-orange-50', color: 'text-orange-600' },
              { label: 'Phone Number', val: profile?.phoneNumber, icon: Phone, bg: 'bg-blue-50', color: 'text-blue-600' },
              { label: 'Location', val: addressStr, icon: MapPin, bg: 'bg-rose-50', color: 'text-rose-600' },
              { label: 'Region', val: profile?.regionName, icon: Shield, bg: 'bg-indigo-50', color: 'text-indigo-600' },
              { label: 'Assigned Sales Rep', val: profile?.assignedRepName, icon: User, bg: 'bg-emerald-50', color: 'text-emerald-600' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{item.label}</p>
                  <p className="text-sm font-bold text-black truncate">{item.val || '---'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Menu */}
        <div className="space-y-3">
          <button
            onClick={() => setPwOpen(true)}
            className="w-full bg-white flex items-center justify-between p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                 <span className="block text-sm font-black text-black">Security Settings</span>
                 <span className="block text-[10px] text-gray-400 font-medium">Update your account password</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
          </button>
          
          <button
            onClick={() => navigate('/shop/support')}
            className="w-full bg-white flex items-center justify-between p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                <Headset className="w-5 h-5" />
              </div>
              <div className="text-left">
                 <span className="block text-sm font-black text-black">Support Center</span>
                 <span className="block text-[10px] text-gray-400 font-medium">Need help? Chat with our team</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
          </button>
        </div>

        {/* Logout Section */}
        <div className="pt-4 flex flex-col items-center gap-4">
           <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full h-14 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-[12px] font-black tracking-[2px] flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" /> SIGN OUT ACCOUNT
          </button>
          <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Janasiri Distributors v1.2.0</p>
        </div>
      </div>

      {/* Modern Drawers / Bottom Sheets */}
      {(editOpen || pwOpen) && (
        <div className="fixed inset-0 z-[100] flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in" onClick={() => { setEditOpen(false); setPwOpen(false); }} />
          <div className="relative w-full bg-white rounded-t-[40px] shadow-2xl animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="p-8">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
              
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-2xl font-black text-black tracking-tight">{editOpen ? 'Edit Profile' : 'Change Password'}</h2>
                 <button onClick={() => { setEditOpen(false); setPwOpen(false); }} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                   <X className="w-5 h-5 text-gray-400" />
                 </button>
              </div>

              {editOpen ? (
                <div className="space-y-5">
                   {[
                    { label: 'Shop Name', key: 'shopName' as const, placeholder: 'Enter Shop Name' },
                    { label: 'Phone Number', key: 'phoneNumber' as const, placeholder: '07X XXX XXXX' },
                    { label: 'Street', key: 'street' as const, placeholder: 'Street Address' },
                    { label: 'City', key: 'city' as const, placeholder: 'City' },
                    { label: 'State', key: 'state' as const, placeholder: 'Province' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2 ml-1">{field.label}</label>
                      <input
                        value={editForm[field.key]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className={inputClass}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => editMut.mutate(editForm)}
                    disabled={editMut.isPending}
                    className="w-full h-14 bg-orange-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-orange-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 hover:bg-black"
                  >
                    {editMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SAVE CHANGES'}
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                   {[
                    { label: 'Current Password', key: 'currentPassword' as const },
                    { label: 'New Password', key: 'newPassword' as const },
                    { label: 'Confirm Password', key: 'confirmPassword' as const },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-2 ml-1">{field.label}</label>
                      <input
                        type="password"
                        value={pwForm[field.key]}
                        onChange={(e) => setPwForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  ))}
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={pwMut.isPending}
                    className="w-full h-14 bg-orange-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-orange-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 hover:bg-black"
                  >
                    {pwMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'UPDATE PASSWORD'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {logoutConfirmOpen && (
        <ConfirmModal
          open={logoutConfirmOpen}
          title="Sign out account"
          description="Are you sure you want to sign out? You will need to login again to manage your orders."
          confirmLabel="SIGN OUT"
          confirmVariant="orange"
          onConfirm={() => { setLogoutConfirmOpen(false); logout().then(() => navigate('/login')); }}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </div>
  );
}