import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api/productsApi';
import { ordersApi } from '../../services/api/ordersApi';
import { offersApi } from '../../services/api/offersApi';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  ShoppingBag, Clock, ChevronRight, Package, Sparkles, ArrowRight, 
  TrendingUp, Tag, HeadphonesIcon,
  Boxes, Truck, CheckCircle2, Receipt, Grid3x3, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { addToCart } from '../../store/slices/cartSlice';
import type { Product, Category } from '../../types/product.types';
import type { Order } from '../../types/order.types';
import type { SpecialOffer } from '../../types/offer.types';
import { useMemo, useState } from 'react';

export default function CustomerHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [flippedOfferId, setFlippedOfferId] = useState<string | null>(null);

  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ['customer-popular'],
    queryFn: () => productsApi.customerTopSelling({ top: 8 }).then(r => r.data.data),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['customer-categories'],
    queryFn: () => productsApi.customerCategories().then(r => r.data.data),
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-recent-orders'],
    queryFn: () => ordersApi.customerGetAll({ page: 1, pageSize: 3 }).then(r => r.data.data),
  });

  const { data: specialOffers = [] } = useQuery({
    queryKey: ['special-offers-public'],
    queryFn: () => offersApi.getPublic().then(r => r.data.data || []),
  });

  const movingOffers = useMemo(
    () => (specialOffers.length > 1 ? [...specialOffers, ...specialOffers] : specialOffers),
    [specialOffers]
  );

  // Calculate account stats from orders
  const accountStats = useMemo(() => {
    if (!recentOrders?.items) return { totalOrders: 0, pendingOrders: 0, deliveredOrders: 0 };
    
    const pending = recentOrders.items.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
    const delivered = recentOrders.items.filter(o => o.status === 'Delivered').length;
    
    return {
      totalOrders: recentOrders.totalCount || 0,
      pendingOrders: pending,
      deliveredOrders: delivered,
    };
  }, [recentOrders]);

  const handleQuickAdd = (product: Product) => {
    dispatch(addToCart({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sellingPrice,
      quantity: 1,
      sku: product.sku,
      lineTotal: (product.sellingPrice || 0) * 1,
    }));
  }; 

  return (
    <div className="animate-fade-in pb-6">
      {/* Hero Section with Personalized Greeting */}
      <div className="relative bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 text-white px-5 pt-8 pb-24 lg:pb-12 overflow-hidden lg:rounded-2xl mb-6">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-400/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-pink-300/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-orange-200 animate-pulse" />
            <span className="text-sm text-orange-100 font-medium">Welcome back</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-2">
            Hi, {user?.username || 'there'}! 👋
          </h1>
          <p className="text-orange-50/90 text-sm lg:text-base max-w-lg">
            Discover fresh products, track your orders, and shop with ease
          </p>
          
          <button
            onClick={() => navigate('/shop/products')}
            className="mt-6 bg-white text-orange-600 px-6 py-3 rounded-xl text-sm font-bold shadow-xl shadow-orange-900/30 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group"
          >
            <ShoppingBag className="w-4 h-4" />
            Start Shopping
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-0 space-y-6 -mt-20 lg:-mt-8 relative z-20">
        {/* Account Stats Cards */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/80 border border-slate-100 p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
                <Receipt className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{accountStats.totalOrders}</p>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">Total Orders</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/80 border border-slate-100 p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{accountStats.pendingOrders}</p>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">Pending</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/80 border border-slate-100 p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{accountStats.deliveredOrders}</p>
            <p className="text-xs lg:text-sm text-slate-500 mt-1">Delivered</p>
          </div>
        </div>

        {/* Quick Actions  */}
        <div>
          <h2 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-orange-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: ShoppingBag, label: 'Shop Products', to: '/shop/products', gradient: 'from-orange-500 to-rose-500', bg: 'bg-orange-50' },
              { icon: Clock, label: 'My Orders', to: '/shop/orders', gradient: 'from-orange-500 to-amber-600', bg: 'bg-orange-50' },
              { icon: HeadphonesIcon, label: 'Support', to: '/shop/support', gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`${action.bg} rounded-2xl border border-slate-100 p-4 lg:p-5 text-left hover:shadow-lg hover:scale-105 active:scale-95 transition-all group`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm lg:text-base font-bold text-slate-900">{action.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Categories Quick Nav */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Boxes className="w-5 h-5 text-orange-600" />
              Shop by Category
            </h2>
            <button onClick={() => navigate('/shop/products')} className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 hover:text-orange-700">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {categoriesLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-28 h-24 bg-white rounded-2xl border border-slate-100 skeleton" />
              ))}
            </div>
          ) : categories?.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.slice(0, 8).map((cat: Category) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/shop/products?category=${cat.id}`)}
                  className="flex-shrink-0 w-28 lg:w-32 bg-white rounded-2xl border border-slate-100 p-4 text-center hover:shadow-lg hover:border-orange-200 hover:scale-105 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <Tag className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">{cat.name}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Moving Special Offers Chain */}
        <div className="relative bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 rounded-2xl p-4 lg:p-5 overflow-hidden border border-rose-300/50 shadow-lg shadow-rose-200/60">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-white" />
            <span className="text-sm text-white/95 font-semibold">Special Offers</span>
            <span className="text-xs text-white/80">Tap a card to flip and read the offer</span>
          </div>

          {specialOffers.length > 0 ? (
            <div className="relative overflow-hidden rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 py-3">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-rose-500/70 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-amber-500/70 to-transparent z-10" />

              <div className={`flex w-max gap-3 px-3 ${specialOffers.length > 1 ? 'animate-marquee' : ''}`}>
                {movingOffers.map((offer: SpecialOffer, idx: number) => (
                  <button
                    key={`${offer.id}-${idx}`}
                    onClick={() => setFlippedOfferId(prev => (prev === offer.id ? null : offer.id))}
                    className="offer-flip-card flex-shrink-0 w-52 h-28 rounded-2xl focus-visible:outline-white"
                  >
                    <span className={`offer-flip-inner ${flippedOfferId === offer.id ? 'is-flipped' : ''}`}>
                      <span className="offer-flip-face offer-flip-front bg-white border border-rose-100 shadow-sm">
                        <span className="text-2xl leading-none" aria-hidden="true">✨</span>
                        <span className="text-[10px] uppercase tracking-wide font-bold text-rose-500">Special Offer</span>
                        <span className="text-sm font-bold text-slate-900 line-clamp-2">{offer.productName}</span>
                      </span>
                      <span className="offer-flip-face offer-flip-back bg-rose-600 border border-rose-500 text-white shadow-sm">
                        <span className="text-[10px] uppercase tracking-wide font-bold text-rose-100">Offer Brief</span>
                        <span className="text-xs font-medium leading-relaxed line-clamp-3">{offer.offerBrief}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/shop/products')}
              className="w-full text-left bg-white/20 hover:bg-white/25 rounded-xl border border-white/35 p-4 text-white transition"
            >
              <p className="font-semibold text-sm">No active offers right now</p>
              <p className="text-xs text-white/85 mt-1">Browse products to discover the latest arrivals</p>
            </button>
          )}
        </div>

        {/* Popular Products & Recent Orders Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Popular Products - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Trending Products
              </h2>
              <button onClick={() => navigate('/shop/products')} className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 hover:text-orange-700">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {popularLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="h-32 bg-slate-100 skeleton" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded-full w-3/4 skeleton" />
                      <div className="h-3 bg-slate-100 rounded-full w-1/2 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : popular?.length ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {popular.slice(0, 8).map((product: Product, idx: number) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:border-orange-200 hover:scale-105 active:scale-95 transition-all group"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div 
                      onClick={() => navigate(`/shop/products?search=${encodeURIComponent(product.name)}`)}
                      className="h-32 bg-gradient-to-br from-slate-50 to-orange-50/50 flex items-center justify-center overflow-hidden cursor-pointer"
                    >
                      <Package className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="p-3">
                      <p 
                        onClick={() => navigate(`/shop/products?search=${encodeURIComponent(product.name)}`)}
                        className="text-sm font-semibold text-slate-900 truncate mb-1 cursor-pointer hover:text-orange-600"
                      >
                        {product.name}
                      </p>
                              <div className="flex items-center justify-between mt-2">
                        <p className="text-base font-bold text-orange-600">{formatCurrency(product.sellingPrice)}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAdd(product);
                          }}

                          className="w-7 h-7 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white flex items-center justify-center active:scale-90 transition-all shadow-sm"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No products available</p>
              </div>
            )}
          </div>

          {/* Recent Orders - 1 column */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Recent Orders
              </h2>
              <button onClick={() => navigate('/shop/orders')} className="text-xs text-orange-600 font-semibold flex items-center gap-0.5 hover:text-orange-700">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {ordersLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-3">
                    <div className="space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded-full w-28 skeleton" />
                      <div className="h-3 bg-slate-100 rounded-full w-20 skeleton" />
                    </div>
                    <div className="h-5 bg-slate-100 rounded-full w-16 skeleton" />
                  </div>
                ))}
              </div>
            ) : recentOrders?.items?.length ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
                {recentOrders.items.map((order: Order) => (
                  <div 
                    key={order.id} 
                    onClick={() => navigate(`/shop/orders/${order.id}`)} 
                    className="p-4 hover:bg-slate-50 active:bg-slate-50 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900 mb-1">{order.orderNumber}</p>
                        <p className="text-xs text-slate-400">{formatDate(order.orderDate)}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                        order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-2">No recent orders</p>
                <button 
                  onClick={() => navigate('/shop/products')}
                  className="text-xs text-orange-600 font-semibold hover:text-orange-700"
                >
                  Start shopping
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
