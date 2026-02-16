import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api/notificationsApi';
import {
  LayoutDashboard, Package, ShoppingCart, Users, UserCheck,
  BarChart3, Bell, Settings, LogOut, Menu, X, ChevronLeft, Search,
  DollarSign, MessageSquare
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/reps', icon: UserCheck, label: 'Sales Reps' },
  { to: '/admin/payments', icon: DollarSign, label: 'Payments' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/support', icon: MessageSquare, label: 'Support' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  useSignalR();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentPage = navItems.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="flex h-screen bg-slate-50/50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center h-16 border-b border-slate-100 ${sidebarOpen ? 'px-5 gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <span className="text-white font-black text-sm">D</span>
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-bold text-slate-900 text-sm">Distribution<span className="text-indigo-500">MS</span></span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-500/5'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                } ${!sidebarOpen ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`}>
                    <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-indigo-600' : ''}`} />
                  </div>
                  {sidebarOpen && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.username}</p>
                <p className="text-[10px] text-slate-400">Administrator</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 animate-slide-in shadow-2xl">
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-black text-sm">D</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">Distribution<span className="text-indigo-500">MS</span></span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="p-3 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-100">
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full rounded-xl transition">
                <LogOut className="w-[18px] h-[18px]" /><span className="font-medium">Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition" onClick={() => setMobileOpen(true)}>
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <button className="hidden lg:flex p-2 hover:bg-slate-100 rounded-xl transition" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-slate-800">{currentPage?.label || 'Dashboard'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/notifications')}
              className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <Bell className="w-[18px] h-[18px]" />

              {(unreadCount ?? 0) > 0 ? (
                <span className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1 shadow-lg shadow-orange-500/30 animate-scale-in">
                  {unreadCount}
                </span>
              ) : (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2.5 ml-1 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">{user?.username}</p>
                <p className="text-[10px] text-slate-400">Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
