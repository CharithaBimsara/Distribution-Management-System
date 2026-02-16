import { useSelector, useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import type { RootState } from '../../store/store';
import { clearCart } from '../../store/slices/cartSlice';
import { ordersApi } from '../../services/api/ordersApi';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Loader2, CheckCircle, ShoppingCart, ShoppingBag, MapPin, MessageSquare, Package } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerCheckout() {
  const { items } = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const placeOrderMut = useMutation({
    mutationFn: () => ordersApi.customerCreate({
      customerId: user?.id || '',
      deliveryAddress: address || undefined,
      deliveryNotes: notes || undefined,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    }),
    onSuccess: () => {
      dispatch(clearCart());
      setSuccess(true);
      toast.success('Order placed successfully!');
    },
    onError: () => {
      toast.error('Failed to place order. Please try again.');
    },
  });

  if (success) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mb-5 animate-scale-in">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Placed!</h2>
        <p className="text-sm text-slate-400 mb-8 text-center max-w-xs">Your order has been submitted successfully and is pending approval.</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/shop/orders')}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
          >
            View Orders
          </button>
          <button
            onClick={() => navigate('/shop/products')}
            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium mb-4">Your cart is empty</p>
        <button
          onClick={() => navigate('/shop/products')}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/25 active:scale-95 transition-all flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-32">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white px-5 pt-5 pb-10">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="text-orange-100 text-sm mt-0.5">{items.length} item{items.length > 1 ? 's' : ''} in your order</p>
      </div>

      <div className="px-4 -mt-5 space-y-4 relative z-10">
        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5">
          <h2 className="font-bold text-slate-900 mb-3 text-sm">Order Summary</h2>
          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item.productId} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-700">{item.productName}</span>
                    <span className="text-xs text-slate-400 ml-1">x{item.quantity}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span className="text-slate-600">{formatCurrency(total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-400">Tax (8%)</span><span className="text-slate-600">{formatCurrency(total * 0.08)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-100"><span className="text-slate-900">Total</span><span className="text-orange-600">{formatCurrency(total * 1.08)}</span></div>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 p-5 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm">Delivery Details</h2>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Delivery Address
              <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition"
              placeholder="Enter delivery address"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Notes
              <span className="text-xs text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none resize-none transition"
              placeholder="Special instructions..."
            />
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-14 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 p-4 z-40 pb-safe">
        <button
          onClick={() => placeOrderMut.mutate()}
          disabled={placeOrderMut.isPending}
          className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-60 disabled:shadow-none"
        >
          {placeOrderMut.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order...</>
          ) : (
            <>Place Order &bull; {formatCurrency(total * 1.08)}</>
          )}
        </button>
      </div>
    </div>
  );
}
