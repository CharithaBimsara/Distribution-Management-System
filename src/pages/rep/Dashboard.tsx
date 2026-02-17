import { useQuery } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import { ShoppingCart, Users, MapPin, TrendingUp, Target, Clock, ChevronRight, Zap, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RepDashboard() {
  const navigate = useNavigate();

  const { data: performance } = useQuery({
    queryKey: ['rep-performance'],
    queryFn: () => repsApi.repGetPerformance().then(r => r.data.data),
  });

  const { data: todayVisits } = useQuery({
    queryKey: ['rep-today-visits'],
    queryFn: () => repsApi.repGetTodayVisits().then(r => r.data.data),
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['rep-recent-orders'],
    queryFn: () => ordersApi.repGetAll({ page: 1, pageSize: 5 }).then(r => r.data.data),
  });

  // Fallback: if backend doesn't return totalCustomers, fetch rep customers (pageSize=1) to get totalCount
  const { data: customersCount } = useQuery({
    queryKey: ['rep-customers-count'],
    queryFn: () => customersApi.repGetCustomers({ page: 1, pageSize: 1 }).then(r => r.data.data),
    enabled: performance?.totalCustomers === undefined,
  });

  return (
    <div className="animate-fade-in">
      {/* Hero Section — full bleed mobile, card on desktop */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-5 pb-8 relative z-0 overflow-hidden lg:rounded-2xl lg:pb-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <p className="text-emerald-200 text-sm font-medium">Good {getGreeting()} 👋</p>
          <h1 className="text-white text-xl font-bold mt-1">Ready to sell today?</h1>
        </div>

        {/* Stat Cards — 2x2 mobile, 4-col desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Total Sales', value: formatCurrency(performance?.totalSales || 0), icon: TrendingUp },
            { label: 'Orders', value: performance?.totalOrders || 0, icon: ShoppingCart },
            { label: 'Customers', value: performance?.totalCustomers ?? customersCount?.totalCount ?? 0, icon: Users },
            { label: 'Target', value: `${(performance?.achievementPercentage || 0).toFixed(0)}%`, icon: Target },
          ].map((stat) => (
            <div key={stat.label} className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 hover:from-white/20 hover:to-white/10 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <stat.icon className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-[11px] font-medium text-emerald-200">{stat.label}</span>
              </div>
              <p className="text-white text-lg font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-0 space-y-4 lg:space-y-6 -mt-3 lg:mt-6 pb-6 lg:pb-0 relative z-10">
        {/* Target Progress + Quick Actions — side by side on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
          {/* Target Progress */}
          {performance && performance.targetAmount > 0 && (
            <div className="card p-4 shadow-lg shadow-slate-200/50 lg:shadow-sm relative z-20">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">Monthly Target</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  performance.achievementPercentage >= 100 ? 'bg-emerald-100 text-emerald-700' :
                  performance.achievementPercentage >= 70 ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{performance.achievementPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    performance.achievementPercentage >= 100
                      ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                      : performance.achievementPercentage >= 70
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  }`}
                  style={{ width: `${Math.min(100, performance.achievementPercentage)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] text-slate-400">{formatCurrency(performance.achievedAmount)}</span>
                <span className="text-[11px] text-slate-400">{formatCurrency(performance.targetAmount)}</span>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 relative z-20">
            <button
              onClick={() => navigate('/rep/orders/new')}
              className="card p-4 text-left group active:scale-[0.97] hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-sm text-slate-800">New Order</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Create for customer</p>
            </button>
            <button
              onClick={() => navigate('/rep/routes')}
              className="card p-4 text-left group active:scale-[0.97] hover:shadow-md hover:border-slate-200 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <p className="font-semibold text-sm text-slate-800">My Routes</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Today&apos;s visits</p>
            </button>
          </div>
        </div>

        {/* Visits + Recent Orders — side by side on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-4 lg:space-y-0">
          {/* Today's Visits */}
          <div className="card overflow-hidden relative z-20">
            <div className="flex items-center justify-between p-4 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Today&apos;s Visits</h2>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">{todayVisits?.length || 0} visits</span>
            </div>
            {todayVisits && todayVisits.length > 0 ? (
              <>
                {/* Desktop table header */}
                <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50/70 border-y border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="w-3" />
                  <div className="flex-1">Customer</div>
                  <div className="w-24 text-right">Status</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {todayVisits.slice(0, 5).map((visit: any) => (
                    <div key={visit.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ring-4 ${
                        visit.status === 'Completed' ? 'bg-emerald-500 ring-emerald-500/10' :
                        visit.checkInTime ? 'bg-blue-500 ring-blue-500/10' :
                        'bg-slate-300 ring-slate-300/10'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{visit.customerName || 'Customer'}</p>
                        <p className="text-[11px] text-slate-400 lg:hidden">{visit.status}</p>
                      </div>
                      <span className="hidden lg:inline text-xs font-medium text-slate-500 w-24 text-right">{visit.status}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 lg:hidden" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-4 pb-4">
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No visits scheduled today</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="card overflow-hidden relative z-20">
            <div className="flex items-center justify-between p-4 pb-3">
              <h2 className="text-sm font-bold text-slate-800">Recent Orders</h2>
              <button onClick={() => navigate('/rep/orders')} className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {recentOrders?.items?.length ? (
              <>
                {/* Desktop table header */}
                <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50/70 border-y border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="flex-1">Customer</div>
                  <div className="w-24 text-right">Amount</div>
                  <div className="w-20 text-right">Status</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {recentOrders.items.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{order.customerName}</p>
                        <p className="text-[11px] text-slate-400">{order.orderNumber}</p>
                      </div>
                      <div className="text-right ml-3 flex items-center gap-3">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(order.totalAmount)}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block w-fit ${
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>{order.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="px-4 pb-4">
                <div className="bg-slate-50 rounded-xl p-6 text-center">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No recent orders</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
