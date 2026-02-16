import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSignalR } from '../../hooks/useSignalR';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import type { RootState } from '../../store/store';
import { notificationsApi } from '../../services/api/notificationsApi';
import {
  Home, ShoppingBag, ClipboardList,
  Wallet, User, ShoppingCart, Bell, LogOut, Menu, X, ChevronLeft,
  MessageSquare, Sparkles
} from 'lucide-react';
import FloatingCartButton from '../../components/cart/FloatingCartButton';

const navItems = [
  { to: '/shop', icon: Home, label: 'Home', end: true },
  { to: '/shop/products', icon: ShoppingBag, label: 'Shop' },
  { to: '/shop/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/shop/ledger', icon: Wallet, label: 'Ledger' },
  { to: '/shop/notifications', icon: Bell, label: 'Notifications' },
  { to: '/shop/support', icon: MessageSquare, label: 'Support' },
  { to: '/shop/profile', icon: User, label: 'Profile' },
];

// Bottom nav only shows a subset of items
const bottomNavItems = [
  { to: '/shop', icon: Home, label: 'Home', end: true },
  { to: '/shop/products', icon: ShoppingBag, label: 'Shop' },
  { to: '/shop/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/shop/ledger', icon: Wallet, label: 'Ledger' },
  { to: '/shop/profile', icon: User, label: 'Profile' },
];

export default function CustomerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  useSignalR();
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = useSelector((state: RootState) => state.cart.items.length);

  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const currentPage = navItems.find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {/* ========== DESKTOP SIDEBAR (lg+) ========== */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-60' : 'w-[68px]'
        }`}
      >
        {/* Sidebar Header */}
        <div className={`flex items-center h-14 border-b border-slate-100 ${sidebarOpen ? 'px-4 gap-3' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <span className="font-bold text-slate-900 text-sm">Janasiri<span className="text-orange-500">Shop</span></span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Customer Portal</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 shadow-sm shadow-orange-500/5'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                } ${!sidebarOpen ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`}>
                    <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-orange-600' : ''}`} />
                  </div>
                  {sidebarOpen && (
                    <span className="flex-1">{item.label}</span>
                  )}
                  {sidebarOpen && item.to === '/shop/notifications' && (unreadCount ?? 0) > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2.5 border-t border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.username}</p>
                <p className="text-[10px] text-slate-400">Customer</p>
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

      {/* ========== MOBILE SIDEBAR OVERLAY ========== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 animate-slide-in shadow-2xl">
            <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm">Janasiri<span className="text-orange-500">Shop</span></span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <nav className="p-3 space-y-0.5">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      isActive ? 'bg-orange-50 text-orange-700' : 'text-slate-500 hover:bg-slate-50'
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

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 lg:px-6 h-14 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile: hamburger menu on left */}
            <button className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            {/* Desktop: sidebar toggle */}
            <button className="hidden lg:flex p-2 hover:bg-slate-100 rounded-xl transition" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <ChevronLeft className="w-5 h-5 text-slate-400" /> : <Menu className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Mobile: brand */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-sm">{user?.username || 'Shop'}</span>
            </div>
            {/* Desktop: page title */}
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-slate-800">{currentPage?.label || 'Home'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => navigate('/shop/cart')}
              className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <ShoppingCart className="w-[18px] h-[18px]" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg shadow-orange-500/30 animate-scale-in">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/shop/notifications')}
              className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              <Bell className="w-[18px] h-[18px]" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute top-1 right-1 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-lg shadow-orange-500/30 animate-scale-in">
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Desktop: user info + logout */}
            <div className="hidden lg:flex items-center gap-2.5 ml-1 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">{user?.username}</p>
                <p className="text-[10px] text-slate-400">Customer</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition ml-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            {/* Mobile: small logout */}
            <button onClick={handleLogout} className="lg:hidden p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="lg:p-6 lg:max-w-6xl lg:mx-auto">
            <Outlet />
          </div>
        </main>

        {/* ========== MOBILE BOTTOM NAV (hidden on lg+) ========== */}
        <nav className="lg:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/60 flex-shrink-0 pb-safe">
          <div className="flex justify-around px-2">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center py-2 px-3 min-w-[56px] transition-all duration-200 ${
                    isActive ? 'text-orange-600' : 'text-slate-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1 rounded-xl transition-all duration-200 ${isActive ? 'bg-orange-50' : ''}`}>
                      <item.icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                    </div>
                    <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-orange-700' : ''}`}>{item.label}</span>
                    {isActive && <div className="w-4 h-0.5 bg-orange-500 rounded-full mt-0.5" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Floating cart button (responsive) */}
        <div className="pointer-events-none">
          <div className="pointer-events-auto">
            <FloatingCartButton />
          </div>
        </div>
      </div>
    </div>
  );
}
