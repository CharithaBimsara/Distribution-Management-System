import { Settings as SettingsIcon, User, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">System configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-indigo-50 rounded-lg"><User className="w-5 h-5 text-indigo-600" /></span>
            <h2 className="font-semibold text-slate-900">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
              <p className="text-sm text-slate-900 font-medium">{user?.username}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <p className="text-sm text-slate-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
              <p className="text-sm text-slate-900">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-red-50 rounded-lg"><Shield className="w-5 h-5 text-red-600" /></span>
            <h2 className="font-semibold text-slate-900">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
              <input type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
              <input type="password" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="Enter new password" />
            </div>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition">
              Change Password
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-yellow-50 rounded-lg"><Bell className="w-5 h-5 text-yellow-600" /></span>
            <h2 className="font-semibold text-slate-900">Notification Preferences</h2>
          </div>
          <div className="space-y-3">
            {['New Orders', 'Low Stock Alerts', 'Payment Updates', 'System Updates'].map((item) => (
              <label key={item} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-700">{item}</span>
                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500/20" />
              </label>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-slate-100 rounded-lg"><SettingsIcon className="w-5 h-5 text-slate-600" /></span>
            <h2 className="font-semibold text-slate-900">System Info</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Version</span><span className="text-slate-900">1.0.0</span></div>
            <div className="flex justify-between"><span className="text-slate-500">API Backend</span><span className="text-slate-900">.NET 10</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Database</span><span className="text-slate-900">PostgreSQL 16</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Frontend</span><span className="text-slate-900">React + TypeScript</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
