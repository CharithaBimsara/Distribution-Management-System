import { useQuery } from '@tanstack/react-query';
import { repsApi } from '../../services/api/repsApi';
import { customersApi } from '../../services/api/customersApi';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import {
  ShoppingCart,
  Users,
  MapPin,
  TrendingUp,
  Target,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RepDashboard() {
  const navigate = useNavigate();

  const { data: performance } = useQuery({
    queryKey: ['rep-performance'],
    queryFn: () => repsApi.repGetPerformance().then(r => r.data.data),
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

  const targetAmount = performance?.targetAmount || 0;
  const achievedAmount = performance?.achievedAmount || 0;
  const remainingAmount = Math.max(0, targetAmount - achievedAmount);
  const achievement = performance?.achievementPercentage || 0;
  const avgOrderValue = performance?.totalOrders
    ? (performance.totalSales || 0) / performance.totalOrders
    : 0;
  const salesValue = formatCurrency(performance?.totalSales || 0);
  const ordersValue = performance?.totalOrders || 0;
  const customersValue = performance?.totalCustomers ?? customersCount?.totalCount ?? 0;

  return (
    <div className="animate-fade-in pb-6">
      <section className="relative overflow-hidden rounded-none md:rounded-3xl lg:rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 px-4 md:px-6 lg:px-7 pt-5 md:pt-7 lg:pt-7 pb-7 md:pb-9 lg:pb-9">
        <div className="absolute -top-16 -right-8 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative">
          <p className="text-emerald-100 text-xs md:text-sm font-medium tracking-wide">Good {getGreeting()}</p>
          <h1 className="text-white text-[26px] leading-8 md:text-3xl lg:text-3xl font-semibold mt-1">Sales Command Center</h1>
          <p className="text-emerald-100/90 text-xs md:text-sm mt-1">Track progress, act fast, and keep momentum high.</p>

          <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:hidden">
            <MiniPill label="Achieved" value={formatCurrency(achievedAmount)} />
            <MiniPill label="Remaining" value={formatCurrency(remainingAmount)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5 md:gap-3 mt-5 md:mt-6">
          {[
            { label: 'Total Sales', value: salesValue, icon: TrendingUp },
            { label: 'Orders', value: ordersValue, icon: ShoppingCart },
            { label: 'Customers', value: customersValue, icon: Users },
            { label: 'Target Hit', value: `${achievement.toFixed(0)}%`, icon: Target },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-3 py-3 md:px-3.5 md:py-3.5"
            >
              <div className="flex items-center gap-2 text-emerald-100">
                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-[11px] font-semibold tracking-wide uppercase">{stat.label}</span>
              </div>
              <p className="text-white text-base md:text-lg lg:text-xl font-bold mt-2 truncate">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="px-4 md:px-0 lg:px-0 mt-4 lg:mt-6 space-y-4 lg:space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-6">
          <div className="md:col-span-2 lg:col-span-7 card p-4 lg:p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-sm lg:text-base font-semibold text-slate-800">Target Progress</h2>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                achievement >= 100 ? 'bg-emerald-100 text-emerald-700' :
                achievement >= 70 ? 'bg-teal-100 text-teal-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {achievement.toFixed(0)}%
              </span>
            </div>

            {targetAmount > 0 ? (
              <>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      achievement >= 100
                        ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                        : achievement >= 70
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${Math.min(100, achievement)}%` }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                  <MetricChip label="Achieved" value={formatCurrency(achievedAmount)} tone="emerald" />
                  <MetricChip label="Remaining" value={formatCurrency(remainingAmount)} tone="amber" />
                  <MetricChip label="Avg Order" value={formatCurrency(avgOrderValue)} tone="teal" />
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                No monthly target configured yet.
              </div>
            )}
          </div>

          <div className="md:col-span-2 lg:col-span-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3">
            <QuickActionCard
              title="New Order"
              subtitle="Create in seconds"
              icon={ShoppingCart}
              iconClass="from-emerald-500 to-teal-600"
              onClick={() => navigate('/rep/orders/new')}
            />
            <QuickActionCard
              title="Customers"
              subtitle="Manage accounts"
              icon={Users}
              iconClass="from-emerald-500 to-green-600"
              onClick={() => navigate('/rep/customers')}
            />
            <QuickActionCard
              title="Quotations"
              subtitle="Create & track"
              icon={FileText}
              iconClass="from-teal-500 to-emerald-600"
              onClick={() => navigate('/rep/quotations')}
            />
            <QuickActionCard
              title="My Routes"
              subtitle="Plan your day"
              icon={MapPin}
              iconClass="from-emerald-500 to-lime-600"
              onClick={() => navigate('/rep/routes')}
            />
          </div>
        </section>

        <section className="card overflow-hidden border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
            <h2 className="text-sm font-bold text-slate-800">Recent Orders</h2>
            <button
              onClick={() => navigate('/rep/orders')}
              className="text-xs text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentOrders?.items?.length ? (
            <>
              <div className="hidden lg:flex items-center gap-3 px-4 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <div className="flex-1">Customer</div>
                <div className="w-28 text-right">Amount</div>
                <div className="w-24 text-right">Status</div>
              </div>
              <div className="lg:hidden p-3 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/30">
                {recentOrders.items.slice(0, 6).map((order: any) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/rep/orders/${order.id}`)}
                    className="text-left rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{order.customerName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{order.orderNumber}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block w-fit ${
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                      <span className="text-xs font-medium text-emerald-700">Open</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {recentOrders.items.slice(0, 6).map((order: any) => (
                  <div key={order.id} className="hidden lg:flex items-center justify-between px-4 py-3 hover:bg-slate-50/70 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{order.customerName}</p>
                      <p className="text-[11px] text-slate-400">{order.orderNumber}</p>
                    </div>
                    <div className="text-right ml-3 flex items-center gap-3">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block w-fit ${
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-teal-50 text-teal-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-6">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No recent orders</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: any;
  iconClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card p-4 md:p-3.5 lg:p-4 text-left border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all active:scale-[0.98] min-h-[132px] md:min-h-[118px] lg:min-h-0"
    >
      <div className={`w-10 h-10 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br ${iconClass} flex items-center justify-center shadow-lg mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
    </button>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 border border-white/20 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wide text-emerald-100/90">{label}</p>
      <p className="text-sm font-bold text-white mt-0.5 truncate">{value}</p>
    </div>
  );
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'amber' | 'teal';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-700 border-amber-100'
      : 'bg-teal-50 text-teal-700 border-teal-100';

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
      <p className="text-xs lg:text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}
