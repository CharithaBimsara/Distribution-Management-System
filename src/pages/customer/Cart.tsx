import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store/store';
import { updateQuantity, removeFromCart, clearCart } from '../../store/slices/cartSlice';
import { formatCurrency } from '../../utils/formatters';
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShoppingBag, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerCart() {
  const { items } = useSelector((state: RootState) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-rose-100 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9 text-orange-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Your cart is empty</h2>
        <p className="text-sm text-slate-400 mb-6 text-center">Browse our products and add items to get started</p>
        <button
          onClick={() => navigate('/shop/products')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-95 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-32">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cart</h1>
          <p className="text-xs text-slate-400 mt-0.5">{items.length} item{items.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => dispatch(clearCart())}
          className="text-xs text-red-500 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
        >
          Clear All
        </button>
      </div>

      {/* Cart Items */}
      <div className="px-4 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-slate-50 to-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-slate-200" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.unit} &bull; {formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <button
                    onClick={() => dispatch(removeFromCart(item.productId))}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-0.5 bg-slate-50 rounded-xl p-0.5">
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity - 1 }))}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm transition active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold w-8 text-center text-slate-900">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ productId: item.productId, quantity: item.quantity + 1 }))}
                      className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20 hover:shadow-md transition active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-3">
          <h3 className="font-semibold text-slate-900 text-sm">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Subtotal ({items.length} items)</span><span className="text-slate-700">{formatCurrency(total)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tax (est.)</span><span className="text-slate-700">{formatCurrency(total * 0.08)}</span></div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="flex justify-between font-bold text-base"><span className="text-slate-900">Total</span><span className="text-orange-600">{formatCurrency(total * 1.08)}</span></div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Checkout */}
      <div className="fixed bottom-14 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-4 z-40 pb-safe">
        <button
          onClick={() => navigate('/shop/checkout')}
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all"
        >
          Checkout &bull; {formatCurrency(total * 1.08)} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
