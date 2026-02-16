import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ShoppingBag, Clock, Wallet, ChevronRight, Package, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '../../types/product.types';
import type { Order } from '../../types/order.types';

export default function CustomerHome() {
  const navigate = useNavigate();

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ['customer-featured'],
    queryFn: () => productsApi.customerCatalog({ pageSize: 6 }).then(r => r.data.data),
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-recent-orders'],
    queryFn: () => ordersApi.customerGetAll({ page: 1, pageSize: 5 }).then(r => r.data.data),
  });

  return (
    <div className="animate-fade-in">
      {/* Hero — full bleed on mobile, card on desktop */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-rose-500 text-white px-5 pt-6 pb-14 lg:pb-8 overflow-hidden lg:rounded-2xl lg:mx-0 lg:mt-0">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
        <div className="relative z-10 lg:flex lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-orange-200" />
              <span className="text-xs text-orange-100 font-medium">Welcome back</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Ready to shop?</h1>
            <p className="text-orange-100/90 text-sm mb-4 lg:mb-0">Browse fresh products and place orders easily</p>
          </div>
          <button
            onClick={() => navigate('/shop/products')}
            className="bg-white text-orange-600 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-orange-700/20 hover:shadow-xl active:scale-95 transition-all flex items-center gap-2 lg:flex-shrink-0"
          >
            Browse Catalog <ArrowRight className="w-4 h-4 hidden lg:block" />
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-0 space-y-6 -mt-6 lg:mt-6 relative z-10 pb-6 lg:pb-0">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 lg:grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, label: 'Shop Now', desc: 'Browse catalog', to: '/shop/products', color: 'from-orange-500 to-rose-500' },
            { icon: Clock, label: 'My Orders', desc: 'Track orders', to: '/shop/orders', color: 'from-blue-500 to-indigo-500' },
            { icon: Wallet, label: 'Payments', desc: 'View ledger', to: '/shop/ledger', color: 'from-emerald-500 to-teal-500' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.to)}
              className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4 text-center lg:text-left lg:flex lg:items-center lg:gap-4 hover:shadow-md hover:border-slate-200 active:scale-95 transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto lg:mx-0 mb-2 lg:mb-0 shadow-sm group-hover:scale-110 transition-transform flex-shrink-0`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs lg:text-sm font-semibold text-slate-700">{action.label}</p>
                <p className="text-[10px] text-slate-400 hidden lg:block">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Two-column layout on desktop: products left, orders right */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          {/* Featured Products — 2/3 width on desktop */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Popular Products</h2>
              <button onClick={() => navigate('/shop/products')} className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 hover:text-orange-700">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {featuredLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="h-28 lg:h-32 bg-slate-100 skeleton" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded-full w-3/4 skeleton" />
                      <div className="h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : featured?.items?.length ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {featured.items.slice(0, 6).map((product: Product, idx: number) => (
                  <div
                    key={product.id}
                    onClick={() => navigate('/shop/products')}
                    className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 active:scale-[0.98] transition-all cursor-pointer group"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="h-28 lg:h-32 bg-gradient-to-br from-slate-50 to-orange-50/50 flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-200" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{product.unit}</p>
                      <p className="text-sm font-bold text-orange-600 mt-1.5">{formatCurrency(product.sellingPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
                <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No products available</p>
              </div>
            )}
          </div>

          {/* Recent Orders — 1/3 width on desktop */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Recent Orders</h2>
              <button onClick={() => navigate('/shop/orders')} className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 hover:text-orange-700">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {ordersLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-slate-100 rounded-full w-24 skeleton" />
                      <div className="h-3 bg-slate-100 rounded-full w-16 skeleton" />
                    </div>
                    <div className="h-5 bg-slate-100 rounded-full w-16 skeleton" />
                  </div>
                ))}
              </div>
            ) : recentOrders?.items?.length ? (
              <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 divide-y divide-slate-50">
                {recentOrders.items.map((order: Order) => (
                  <div key={order.id} onClick={() => navigate('/shop/orders')} className="p-4 hover:bg-slate-50/80 active:bg-slate-50/80 transition cursor-pointer">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">{order.orderNumber}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                        order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' :
                        order.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>{order.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{formatDate(order.orderDate)}</span>
                      <span className="font-bold text-slate-900 text-sm">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-slate-100">
                <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No recent orders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
